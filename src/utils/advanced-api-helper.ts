import { APIRequestContext, APIResponse } from '@playwright/test';
import winston from "winston";
import { Logger } from "../utils/Logger";

/**
 * AdvancedAPIHelper - Provides automatic logging for API requests and responses.
 *
 * Similar to AdvancedActionsHelper but for API testing. Wraps Playwright's APIRequestContext
 * with automatic logging of request/response details for better traceability and debugging.
 *
 * Features:
 * - Logs every API request (method, URL, headers, body)
 * - Logs every API response (status, headers, body)
 * - Structured log output for easy parsing
 * - Automatic step counting
 * - Integration with log4js for file and console output
 *
 * Usage:
 *   const apiHelper = new AdvancedAPIHelper(request, 'UserAPITest');
 *   const response = await apiHelper.get('/users', 'Fetch all users');
 *   await apiHelper.post('/users', { name: 'John' }, 'Create new user');
 */
export class AdvancedAPIHelper {
    private readonly request: APIRequestContext;
    private readonly logger: winston.Logger;
    private stepCount: number = 0;

    /**
     * Creates a new AdvancedAPIHelper instance
     * @param request - Playwright APIRequestContext from test fixture
     * @param testName - Test name for log categorization
     */
    constructor(request: APIRequestContext, testName: string) {
        this.request = request;
        this.logger = Logger.getLogger(`API-${testName}`);
    }

    // ===================== Private Helper Methods =====================

    /**
     * Logs request details before making the API call
     */
    private logRequest(method: string, url: string, description: string, data?: any): void {
        this.stepCount++;
        this.logger.info(`[Step ${this.stepCount}] 🌐 API ${method.toUpperCase()}: ${description}`);
        this.logger.debug(`  URL: ${url}`);
        if (data) {
            this.logger.debug(`  Request Body: ${JSON.stringify(data, null, 2)}`);
        }
    }

    /**
     * Logs response details after receiving the API response
     */
    private async logResponse(response: APIResponse, description: string): Promise<void> {
        const status = response.status();
        const statusText = response.statusText();

        // Color-code based on status
        if (status >= 200 && status < 300) {
            this.logger.info(`  ✓ Response: ${status} ${statusText}`);
        } else if (status >= 400) {
            this.logger.error(`  ✗ Response: ${status} ${statusText}`);
        } else {
            this.logger.warn(`  ⚠ Response: ${status} ${statusText}`);
        }

        // Log response body if available
        try {
            const contentType = response.headers()['content-type'] || '';
            if (contentType.includes('application/json')) {
                const body = await response.json();
                this.logger.debug(`  Response Body: ${JSON.stringify(body, null, 2)}`);
            } else if (contentType.includes('text')) {
                const text = await response.text();
                this.logger.debug(`  Response Body: ${text.substring(0, 500)}${text.length > 500 ? '...' : ''}`);
            }
        } catch (error) {
            // Body already consumed or not JSON - skip logging body
            this.logger.debug(`  Response body not logged (${error instanceof Error ? error.message : 'unknown error'})`);
        }
    }

    // ===================== HTTP Methods =====================

    /**
     * Performs a GET request with automatic logging
     * @param url - API endpoint URL
     * @param description - Human-readable description of the request
     * @returns APIResponse object
     */
    async get(url: string, description: string): Promise<APIResponse> {
        this.logRequest('GET', url, description);
        const response = await this.request.get(url);
        await this.logResponse(response, description);
        return response;
    }

    /**
     * Performs a POST request with automatic logging
     * @param url - API endpoint URL
     * @param data - Request body data
     * @param description - Human-readable description of the request
     * @returns APIResponse object
     */
    async post(url: string, data: any, description: string): Promise<APIResponse> {
        this.logRequest('POST', url, description, data);
        const response = await this.request.post(url, { data });
        await this.logResponse(response, description);
        return response;
    }

    /**
     * Performs a PUT request with automatic logging
     * @param url - API endpoint URL
     * @param data - Request body data
     * @param description - Human-readable description of the request
     * @returns APIResponse object
     */
    async put(url: string, data: any, description: string): Promise<APIResponse> {
        this.logRequest('PUT', url, description, data);
        const response = await this.request.put(url, { data });
        await this.logResponse(response, description);
        return response;
    }

    /**
     * Performs a PATCH request with automatic logging
     * @param url - API endpoint URL
     * @param data - Request body data
     * @param description - Human-readable description of the request
     * @returns APIResponse object
     */
    async patch(url: string, data: any, description: string): Promise<APIResponse> {
        this.logRequest('PATCH', url, description, data);
        const response = await this.request.patch(url, { data });
        await this.logResponse(response, description);
        return response;
    }

    /**
     * Performs a DELETE request with automatic logging
     * @param url - API endpoint URL
     * @param description - Human-readable description of the request
     * @returns APIResponse object
     */
    async delete(url: string, description: string): Promise<APIResponse> {
        this.logRequest('DELETE', url, description);
        const response = await this.request.delete(url);
        await this.logResponse(response, description);
        return response;
    }

    /**
     * Performs a HEAD request with automatic logging
     * @param url - API endpoint URL
     * @param description - Human-readable description of the request
     * @returns APIResponse object
     */
    async head(url: string, description: string): Promise<APIResponse> {
        this.logRequest('HEAD', url, description);
        const response = await this.request.head(url);
        await this.logResponse(response, description);
        return response;
    }

    // ===================== Utility Methods =====================

    /**
     * Returns a summary of API calls made during the test
     */
    getSummary(): string {
        return `Total API Requests: ${this.stepCount}`;
    }

    /**
     * Resets the step counter (useful for beforeEach hooks)
     */
    resetStepCount(): void {
        this.stepCount = 0;
    }
}
