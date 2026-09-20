import 'dotenv/config';
import { spawn } from 'child_process';
import { createHash, randomBytes } from 'crypto';
import * as fs from 'fs';
import * as http from 'http';
import * as path from 'path';

/**
 * gmail-auth-setup.ts
 *
 * One-time: obtains a Gmail API refresh token for the test inbox, so tests can read emails
 * (e.g. the forgot-password reset email) with plain API calls — locally and in CI.
 *
 * Needs GMAIL_CLIENT_ID and GMAIL_CLIENT_SECRET in .env (a "Desktop app" OAuth client). The
 * approval happens in your normal browser, not an automated one, so Google does not block it.
 * The refresh token is written into .env as GMAIL_REFRESH_TOKEN and never printed.
 *
 * Re-run it if the token is ever revoked: the Google account password changed, access was
 * removed in the account's security settings, or the OAuth app went back to "Testing".
 *
 * Usage: npm run auth:gmail
 */

const CLIENT_ID = process.env.GMAIL_CLIENT_ID;
const CLIENT_SECRET = process.env.GMAIL_CLIENT_SECRET;
const EXPECTED_EMAIL = process.env.GMAIL_INBOX;
const SCOPE = 'https://www.googleapis.com/auth/gmail.readonly';
const ENV_FILE = path.resolve('.env');

function base64Url(buffer: Buffer): string {
    return buffer.toString('base64').replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

function openInBrowser(url: string): void {
    const child = process.platform === 'win32'
        ? spawn('cmd', ['/c', 'start', '""', `"${url}"`], { detached: true, stdio: 'ignore', windowsVerbatimArguments: true })
        : spawn(process.platform === 'darwin' ? 'open' : 'xdg-open', [url], { detached: true, stdio: 'ignore' });
    child.on('error', () => { /* the URL is printed as a fallback */ });
    child.unref();
}

function saveToEnvFile(key: string, value: string): void {
    const current = fs.existsSync(ENV_FILE) ? fs.readFileSync(ENV_FILE, 'utf8') : '';
    const line = `${key}=${value}`;
    const pattern = new RegExp(`^${key}=.*$`, 'm');
    const updated = pattern.test(current)
        ? current.replace(pattern, line)
        : `${current.replace(/\s*$/, '')}\n${line}\n`;
    fs.writeFileSync(ENV_FILE, updated);
}

async function main(): Promise<void> {
    if (!CLIENT_ID || !CLIENT_SECRET) {
        throw new Error('GMAIL_CLIENT_ID / GMAIL_CLIENT_SECRET are not set in .env — copy them from your Desktop OAuth client.');
    }

    const state = base64Url(randomBytes(16));
    const codeVerifier = base64Url(randomBytes(32));
    const codeChallenge = base64Url(createHash('sha256').update(codeVerifier).digest());

    let resolveCode!: (code: string) => void;
    let rejectCode!: (error: Error) => void;
    const codePromise = new Promise<string>((resolve, reject) => { resolveCode = resolve; rejectCode = reject; });

    const server = http.createServer((req, res) => {
        const url = new URL(req.url ?? '/', 'http://127.0.0.1');
        const code = url.searchParams.get('code');
        const error = url.searchParams.get('error');
        if (!code && !error) {
            res.writeHead(404).end();
            return;
        }
        res.writeHead(200, { 'Content-Type': 'text/html' });
        if (error || url.searchParams.get('state') !== state) {
            res.end('<h2>Authorization failed.</h2><p>Check the terminal.</p>');
            rejectCode(new Error(error ? `Google returned: ${error}` : 'State mismatch — ignoring an unexpected callback.'));
            return;
        }
        res.end('<h2>Done.</h2><p>You can close this tab and return to the terminal.</p>');
        resolveCode(code!);
    });

    // Desktop OAuth clients accept any loopback port, so let the OS pick a free one.
    await new Promise<void>(resolve => server.listen(0, '127.0.0.1', resolve));
    const redirectUri = `http://127.0.0.1:${(server.address() as { port: number }).port}`;

    const authUrl = new URL('https://accounts.google.com/o/oauth2/v2/auth');
    authUrl.search = new URLSearchParams({
        client_id: CLIENT_ID,
        redirect_uri: redirectUri,
        response_type: 'code',
        scope: SCOPE,
        // offline + consent together are what make Google issue a refresh token every time.
        access_type: 'offline',
        prompt: 'consent',
        state,
        code_challenge: codeChallenge,
        code_challenge_method: 'S256',
        ...(EXPECTED_EMAIL ? { login_hint: EXPECTED_EMAIL } : {}),
    }).toString();

    console.log('\n[GmailAuth] ──────────────────────────────────────────────');
    console.log('[GmailAuth] Your browser should open on Google\'s consent page. If not, open:');
    console.log(`\n${authUrl.toString()}\n`);
    console.log(`[GmailAuth]   1. Sign in as ${EXPECTED_EMAIL ?? 'the test inbox account'}`);
    console.log('[GmailAuth]   2. "Google hasn\'t verified this app" → Advanced → Go to app');
    console.log('[GmailAuth]   3. Allow read access to Gmail');
    console.log('[GmailAuth] ──────────────────────────────────────────────\n');
    openInBrowser(authUrl.toString());

    let code: string;
    try {
        code = await codePromise;
    } finally {
        server.close();
    }

    const tokenResponse = await fetch('https://oauth2.googleapis.com/token', {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: new URLSearchParams({
            code,
            client_id: CLIENT_ID,
            client_secret: CLIENT_SECRET,
            redirect_uri: redirectUri,
            grant_type: 'authorization_code',
            code_verifier: codeVerifier,
        }),
    });
    const tokens = await tokenResponse.json() as { access_token?: string; refresh_token?: string; error_description?: string };
    if (!tokenResponse.ok || !tokens.refresh_token || !tokens.access_token) {
        throw new Error(`Token exchange failed: ${tokens.error_description ?? tokenResponse.statusText}`);
    }

    // Confirm the approval came from the inbox the tests actually read.
    const profileResponse = await fetch('https://gmail.googleapis.com/gmail/v1/users/me/profile', {
        headers: { Authorization: `Bearer ${tokens.access_token}` },
    });
    const profile = await profileResponse.json() as { emailAddress?: string };
    if (EXPECTED_EMAIL && profile.emailAddress?.toLowerCase() !== EXPECTED_EMAIL.toLowerCase()) {
        throw new Error(
            `Approved as ${profile.emailAddress}, but GMAIL_INBOX is ${EXPECTED_EMAIL}. ` +
            'Re-run and sign in with the test inbox account.',
        );
    }

    saveToEnvFile('GMAIL_REFRESH_TOKEN', tokens.refresh_token);

    console.log(`[GmailAuth] Authorized for ${profile.emailAddress}.`);
    console.log('[GmailAuth] GMAIL_REFRESH_TOKEN saved to .env (not printed).');
    console.log('[GmailAuth] For CI, add GMAIL_CLIENT_ID, GMAIL_CLIENT_SECRET and GMAIL_REFRESH_TOKEN as GitHub secrets.\n');
}

main().catch((error) => {
    console.error('\n[GmailAuth] Failed:', error instanceof Error ? error.message : error);
    process.exit(1);
});
