import { request as playwrightRequest, APIRequestContext } from '@playwright/test';
import { AdvancedAPIHelper } from './advanced-api-helper';

/**
 * ForecastApiClient — API-side test setup for forecasts (financial_plans).
 *
 * Mirrors the Postman collection "BznsBuilder — Forecast (Auth, Create, Delete)":
 *   POST /api/auth/login       → access_token
 *   GET  /api/auth/user        → companies[0].id
 *   POST /api/financial_plans  → forecast id
 *   DEL  /api/financial_plans/{id}
 *
 * Plus one endpoint the collection doesn't cover:
 *   GET  /api/companies/{id}   → data.financial_plans[] (listing forecasts)
 * `GET /api/financial_plans` answers 200 with an empty body, so it cannot be used to list.
 *
 * Used from `test.beforeAll` hooks to seed a forecast before the UI test runs,
 * so the browser flow doesn't have to create one through the app.
 *
 * Base URL comes from `API_BASE_URL` (default: https://stgapi.bznsbuilder.com).
 * Response language comes from `API_LANG` (default: en).
 */
export interface CreatedForecast {
    id: number | string;
    name: string;
    companyId: number | string;
}

/** A forecast as returned inside `GET /api/companies/{id}` → `data.financial_plans[]`. */
export interface ForecastSummary {
    id: number | string;
    name: string;
    default?: number;
    has_entries?: boolean;
}

export class ForecastApiClient {
    private readonly baseURL: string;
    private readonly lang: string;

    /** Unauthenticated context — used for login only. */
    private anonContext?: APIRequestContext;
    /** Bearer-authenticated context — created after a successful login. */
    private authContext?: APIRequestContext;
    private authApi?: AdvancedAPIHelper;

    private accessToken?: string;
    private companyId?: number | string;

    constructor(baseURL = process.env.API_BASE_URL || 'https://stgapi.bznsbuilder.com',
                lang = process.env.API_LANG || 'en') {
        this.baseURL = baseURL.replace(/\/+$/, '');
        this.lang = lang;
    }

    // ===================== Actions =====================

    /**
     * Authenticates and stores the returned access token, then opens a
     * bearer-authenticated request context for all subsequent calls.
     * @returns the access token
     */
    async login(email: string, password: string): Promise<string> {
        this.anonContext = await playwrightRequest.newContext({
            baseURL: this.baseURL,
            extraHTTPHeaders: {
                Accept: 'application/json',
                'Content-Type': 'application/json',
                'Accept-Language': this.lang,
            },
        });

        const anonApi = new AdvancedAPIHelper(this.anonContext, 'ForecastSetup');
        const response = await anonApi.post('/api/auth/login', { email, password }, 'Login');
        const body = await this.readJson(response.status(), await response.text(), 'login');

        const token = body?.access_token ?? body?.data?.access_token;
        if (!token) {
            throw new Error(`Login failed (${response.status()}): ${body?.message ?? 'no access_token returned'}`);
        }

        this.accessToken = token;
        this.authContext = await playwrightRequest.newContext({
            baseURL: this.baseURL,
            extraHTTPHeaders: {
                Accept: 'application/json',
                'Content-Type': 'application/json',
                'Accept-Language': this.lang,
                Authorization: `Bearer ${token}`,
            },
        });
        this.authApi = new AdvancedAPIHelper(this.authContext, 'ForecastSetup');

        return token;
    }

    /**
     * Fetches the current user and resolves a company id.
     * @param companyName optional company name to match (falls back to the first company)
     */
    async resolveCompanyId(companyName?: string): Promise<number | string> {
        const api = this.requireAuth();
        const response = await api.get('/api/auth/user', 'Get current user & companies');
        const body = await this.readJson(response.status(), await response.text(), 'get user');

        const user = body?.data ?? body;
        const companies: Array<{ id: number | string; name?: string }> = user?.companies ?? [];
        if (!companies.length) {
            throw new Error('Cannot create a forecast: the authenticated user has no companies.');
        }

        const match = companyName
            ? companies.find(c => c.name?.trim().toLowerCase() === companyName.trim().toLowerCase())
            : undefined;
        this.companyId = (match ?? companies[0]).id;

        return this.companyId;
    }

    /**
     * Lists the forecasts belonging to a company.
     *
     * Reads them off `GET /api/companies/{id}` — the dedicated
     * `GET /api/financial_plans` endpoint answers 200 with an empty body.
     */
    async listForecasts(companyId: number | string | undefined = this.companyId): Promise<ForecastSummary[]> {
        const api = this.requireAuth();
        if (companyId === undefined) {
            throw new Error('listForecasts requires a companyId — call resolveCompanyId() first.');
        }

        const response = await api.get(`/api/companies/${companyId}`, `List forecasts for company ${companyId}`);
        const body = await this.readJson(response.status(), await response.text(), 'list forecasts');

        return (body?.data ?? body)?.financial_plans ?? [];
    }

    /**
     * Creates a forecast (financial_plan) for the given company.
     * @param name forecast name
     * @param companyId defaults to the id resolved by {@link resolveCompanyId}
     * @param isDefault marks the forecast as the company default. Off by default — the Postman
     *                  collection sends `default: 1`, but re-pointing the company's default forecast
     *                  is a side effect on shared staging data that outlives the test run.
     */
    async createForecast(name: string,
                         companyId: number | string | undefined = this.companyId,
                         isDefault = false): Promise<CreatedForecast> {
        const api = this.requireAuth();
        if (companyId === undefined) {
            throw new Error('createForecast requires a companyId — call resolveCompanyId() first.');
        }

        const response = await api.post(
            '/api/financial_plans',
            { name, company_id: companyId, default: isDefault ? 1 : 0 },
            `Create forecast "${name}"`,
        );
        const body = await this.readJson(response.status(), await response.text(), 'create forecast');

        const id = body?.data?.id ?? body?.id;
        if (!id) {
            throw new Error(`Forecast creation failed (${response.status()}): ${body?.message ?? 'no id returned'}`);
        }

        return { id, name, companyId };
    }

    /** Deletes a forecast by id. Safe to call in cleanup hooks. */
    async deleteForecast(forecastId: number | string): Promise<void> {
        const api = this.requireAuth();
        await api.delete(`/api/financial_plans/${forecastId}`, `Delete forecast ${forecastId}`);
    }

    /**
     * Convenience one-shot: login → resolve company → create forecast.
     */
    static async seedForecast(email: string,
                              password: string,
                              forecastName: string,
                              companyName?: string): Promise<{ client: ForecastApiClient; forecast: CreatedForecast }> {
        const client = new ForecastApiClient();
        await client.login(email, password);
        await client.resolveCompanyId(companyName);
        const forecast = await client.createForecast(forecastName);
        return { client, forecast };
    }

    /** Disposes both request contexts. Always call this in `test.afterAll`. */
    async dispose(): Promise<void> {
        await this.anonContext?.dispose();
        await this.authContext?.dispose();
        this.anonContext = undefined;
        this.authContext = undefined;
        this.authApi = undefined;
    }

    // ===================== Accessors =====================

    get token(): string | undefined {
        return this.accessToken;
    }

    get company(): number | string | undefined {
        return this.companyId;
    }

    // ===================== Internals =====================

    private requireAuth(): AdvancedAPIHelper {
        if (!this.authApi) {
            throw new Error('Not authenticated — call login() first.');
        }
        return this.authApi;
    }

    /** Parses a JSON body, surfacing the raw payload when the endpoint returns HTML/plain text. */
    private async readJson(status: number, text: string, step: string): Promise<any> {
        try {
            return JSON.parse(text);
        } catch {
            throw new Error(`Unexpected non-JSON response on ${step} (${status}): ${text.substring(0, 300)}`);
        }
    }
}
