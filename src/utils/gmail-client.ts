import 'dotenv/config';

/**
 * GmailClient — reads emails from the test inbox through the Gmail API, so tests can follow
 * links that the app sends by email (password reset, account activation…).
 *
 * Auth is a stored OAuth refresh token (GMAIL_CLIENT_ID / GMAIL_CLIENT_SECRET /
 * GMAIL_REFRESH_TOKEN, created once with `npm run auth:gmail`). Unlike a browser session it is
 * not tied to a machine, so the same credentials work locally and in CI. Read-only scope: it
 * never sends, changes or deletes mail.
 *
 * Every test user is a `+` alias of the one inbox (e.g. testautobb+reset@gmail.com), so
 * `waitForEmail` filters by recipient and by arrival time — that keeps a run from picking up an
 * older email, or one meant for a different test.
 */

const API = 'https://gmail.googleapis.com/gmail/v1/users/me';

/** Allowance for the local clock and Gmail's clock disagreeing slightly. */
const CLOCK_SKEW_MS = 30_000;

export interface GmailMessage {
    id: string;
    subject: string;
    receivedAt: Date;
    html: string;
}

export interface WaitForEmailCriteria {
    to: string;
    subject: string;
    receivedAfter: Date;
    timeoutMs?: number;
    pollIntervalMs?: number;
}

interface GmailPart {
    mimeType?: string;
    body?: { data?: string };
    parts?: GmailPart[];
}

export class GmailClient {
    private accessToken?: { value: string; expiresAt: number };

    private constructor(
        private readonly clientId: string,
        private readonly clientSecret: string,
        private readonly refreshToken: string,
    ) {}

    static isConfigured(): boolean {
        return Boolean(process.env.GMAIL_CLIENT_ID && process.env.GMAIL_CLIENT_SECRET && process.env.GMAIL_REFRESH_TOKEN);
    }

    static fromEnv(): GmailClient {
        if (!GmailClient.isConfigured()) {
            throw new Error(
                'Gmail API credentials are missing — set GMAIL_CLIENT_ID and GMAIL_CLIENT_SECRET in .env, ' +
                'then run "npm run auth:gmail" to create GMAIL_REFRESH_TOKEN.',
            );
        }
        return new GmailClient(process.env.GMAIL_CLIENT_ID!, process.env.GMAIL_CLIENT_SECRET!, process.env.GMAIL_REFRESH_TOKEN!);
    }

    /**
     * Polls the inbox until an email matching the criteria arrives, and returns the newest one.
     * Throws if none arrives within the timeout.
     */
    async waitForEmail(criteria: WaitForEmailCriteria): Promise<GmailMessage> {
        const { to, subject, receivedAfter, timeoutMs = 90_000, pollIntervalMs = 3_000 } = criteria;
        const earliest = receivedAfter.getTime() - CLOCK_SKEW_MS;
        const query = `to:${to} subject:"${subject}" after:${Math.floor(earliest / 1000)}`;
        const deadline = Date.now() + timeoutMs;

        while (Date.now() < deadline) {
            const list = await this.get<{ messages?: { id: string }[] }>(`/messages?q=${encodeURIComponent(query)}&maxResults=5`);
            for (const { id } of list.messages ?? []) {
                const message = await this.readMessage(id);
                if (message.receivedAt.getTime() >= earliest) return message;
            }
            await new Promise(resolve => setTimeout(resolve, pollIntervalMs));
        }

        throw new Error(`No email "${subject}" for ${to} arrived within ${timeoutMs / 1000}s of ${receivedAfter.toISOString()}.`);
    }

    /** Returns the first link in the email whose URL matches the pattern. */
    static extractLink(message: GmailMessage, pattern: RegExp): string {
        const links = [...message.html.matchAll(/https?:\/\/[^\s"'<>]+/g)].map(match => match[0].replace(/&amp;/g, '&'));
        const link = links.find(url => pattern.test(url));
        if (!link) {
            throw new Error(`Email "${message.subject}" has no link matching ${pattern}.`);
        }
        return link;
    }

    private async readMessage(id: string): Promise<GmailMessage> {
        const raw = await this.get<{
            id: string;
            internalDate: string;
            payload: GmailPart & { headers: { name: string; value: string }[] };
        }>(`/messages/${id}?format=full`);

        const collectHtml = (part: GmailPart): string[] => [
            ...(part.mimeType === 'text/html' && part.body?.data ? [Buffer.from(part.body.data, 'base64url').toString('utf8')] : []),
            ...(part.parts ?? []).flatMap(collectHtml),
        ];

        return {
            id: raw.id,
            subject: raw.payload.headers.find(h => h.name.toLowerCase() === 'subject')?.value ?? '',
            receivedAt: new Date(Number(raw.internalDate)),
            html: collectHtml(raw.payload).join('\n'),
        };
    }

    private async get<T>(path: string): Promise<T> {
        const response = await fetch(`${API}${path}`, {
            headers: { Authorization: `Bearer ${await this.getAccessToken()}` },
        });
        if (!response.ok) {
            throw new Error(`Gmail API ${response.status} on ${path.split('?')[0]}: ${await response.text()}`);
        }
        return response.json() as Promise<T>;
    }

    private async getAccessToken(): Promise<string> {
        if (this.accessToken && Date.now() < this.accessToken.expiresAt) return this.accessToken.value;

        const response = await fetch('https://oauth2.googleapis.com/token', {
            method: 'POST',
            headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
            body: new URLSearchParams({
                client_id: this.clientId,
                client_secret: this.clientSecret,
                refresh_token: this.refreshToken,
                grant_type: 'refresh_token',
            }),
        });
        const token = await response.json() as { access_token?: string; expires_in?: number; error?: string; error_description?: string };
        if (!token.access_token) {
            // invalid_grant = the refresh token was revoked or expired; it has to be re-issued.
            const hint = token.error === 'invalid_grant' ? ' Re-run "npm run auth:gmail".' : '';
            throw new Error(`Gmail token refresh failed: ${token.error_description ?? token.error}.${hint}`);
        }

        this.accessToken = {
            value: token.access_token,
            // Refresh a minute early rather than risk using a token mid-expiry.
            expiresAt: Date.now() + ((token.expires_in ?? 3600) - 60) * 1000,
        };
        return this.accessToken.value;
    }
}
