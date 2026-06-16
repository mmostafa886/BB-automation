import { Pool, PoolClient, QueryResult, QueryResultRow } from 'pg';
import * as dotenv from 'dotenv';
import * as path from 'path';
import winston from 'winston';
import { Logger } from './Logger';

// Load db.env on first import — override: false so existing process.env values win
dotenv.config({ path: path.resolve(process.cwd(), 'db.env'), override: false });

/**
 * DbHelper - Typed, logged PostgreSQL query executor for test data management.
 *
 * Manages a single connection pool per instance, reading all connection parameters
 * from `db.env` (see `db.env.example` for required keys). Designed for test-lifecycle
 * operations such as setup inserts and cleanup deletes that cannot be performed through
 * the application UI.
 *
 * Usage:
 *   const db = new DbHelper('VesselConfig-Cleanup');
 *   const rows = await db.query<{ id: number }>('SELECT id FROM vessel_types WHERE name = $1', [name]);
 *   await db.execute('DELETE FROM vessel_types WHERE name = $1', [name]);
 *   await db.close();
 *
 * Always call `close()` in `test.afterAll` or a `finally` block to drain the pool.
 */
export class DbHelper {
    private readonly pool: Pool;
    private readonly logger: winston.Logger;
    private stepCount: number = 0;

    /**
     * Creates a new DbHelper and opens a connection pool using DB_* env vars from db.env.
     * @param testName - Test name for log categorisation (mirrors Actions/API helper convention)
     */
    constructor(testName?: string) {
        this.logger = Logger.getLogger(`DB-${testName ?? 'default'}`);

        const ssl = process.env.DB_SSL === 'true' ? { rejectUnauthorized: false } : false;

        this.pool = new Pool({
            host: process.env.DB_HOST ?? 'localhost',
            port: parseInt(process.env.DB_PORT ?? '5432', 10),
            database: process.env.DB_NAME,
            user: process.env.DB_USER,
            password: process.env.DB_PASSWORD,
            ssl: ssl || undefined,
            min: parseInt(process.env.DB_POOL_MIN ?? '1', 10),
            max: parseInt(process.env.DB_POOL_MAX ?? '5', 10),
        });

        this.pool.on('error', (err) => {
            this.logger.error(`Unexpected pool error: ${err.message}`);
        });

        this.logger.info(`=== DbHelper started (host: ${process.env.DB_HOST ?? 'localhost'}, db: ${process.env.DB_NAME ?? '(unset)'}) ===`);
    }

    // ===================== Public Query Methods =====================

    /**
     * Executes a SELECT query and returns all matching rows typed as T.
     * @param sql - Parameterised SQL string (use $1, $2, … placeholders)
     * @param params - Positional parameter values
     * @returns Array of rows (empty array if no results)
     */
    async query<T extends QueryResultRow = Record<string, unknown>>(sql: string, params?: unknown[]): Promise<T[]> {
        this.stepCount++;
        const step = `[Step ${this.stepCount}]`;
        this.logger.info(`${step} QUERY: ${this.truncate(sql)}`);
        if (params?.length) this.logger.debug(`  Params: ${JSON.stringify(params)}`);

        const start = Date.now();
        try {
            const result: QueryResult<T> = await this.pool.query<T>(sql, params);
            this.logger.info(`${step} QUERY OK — ${result.rowCount} row(s) (${Date.now() - start}ms)`);
            return result.rows;
        } catch (error) {
            this.logger.error(`${step} QUERY FAILED (${Date.now() - start}ms): ${(error as Error).message}`);
            throw error;
        }
    }

    /**
     * Executes a SELECT query and returns the first matching row, or null if none found.
     * @param sql - Parameterised SQL string
     * @param params - Positional parameter values
     * @returns First row typed as T, or null
     */
    async queryOne<T extends QueryResultRow = Record<string, unknown>>(sql: string, params?: unknown[]): Promise<T | null> {
        const rows = await this.query<T>(sql, params);
        return rows.length > 0 ? rows[0] : null;
    }

    /**
     * Executes an INSERT, UPDATE, or DELETE statement and returns the number of affected rows.
     * @param sql - Parameterised SQL string
     * @param params - Positional parameter values
     * @returns Number of rows affected (rowCount)
     */
    async execute(sql: string, params?: unknown[]): Promise<number> {
        this.stepCount++;
        const step = `[Step ${this.stepCount}]`;
        this.logger.info(`${step} EXECUTE: ${this.truncate(sql)}`);
        if (params?.length) this.logger.debug(`  Params: ${JSON.stringify(params)}`);

        const start = Date.now();
        try {
            const result = await this.pool.query(sql, params);
            const affected = result.rowCount ?? 0;
            this.logger.info(`${step} EXECUTE OK — ${affected} row(s) affected (${Date.now() - start}ms)`);
            return affected;
        } catch (error) {
            this.logger.error(`${step} EXECUTE FAILED (${Date.now() - start}ms): ${(error as Error).message}`);
            throw error;
        }
    }

    /**
     * Executes multiple statements inside a single transaction.
     * All statements are rolled back automatically if any one fails.
     * @param queries - Ordered list of { sql, params? } objects to execute
     */
    async executeInTransaction(queries: Array<{ sql: string; params?: unknown[] }>): Promise<void> {
        this.stepCount++;
        const step = `[Step ${this.stepCount}]`;
        this.logger.info(`${step} TRANSACTION START — ${queries.length} statement(s)`);

        const client: PoolClient = await this.pool.connect();
        const start = Date.now();
        try {
            await client.query('BEGIN');
            for (let i = 0; i < queries.length; i++) {
                const { sql, params } = queries[i];
                this.logger.debug(`  [${i + 1}/${queries.length}] ${this.truncate(sql)}`);
                await client.query(sql, params);
            }
            await client.query('COMMIT');
            this.logger.info(`${step} TRANSACTION COMMITTED (${Date.now() - start}ms)`);
        } catch (error) {
            await client.query('ROLLBACK');
            this.logger.error(`${step} TRANSACTION ROLLED BACK (${Date.now() - start}ms): ${(error as Error).message}`);
            throw error;
        } finally {
            client.release();
        }
    }

    /**
     * Drains and closes the connection pool.
     * Must be called in `test.afterAll` or a `finally` block to avoid open handles.
     */
    async close(): Promise<void> {
        this.logger.info(`=== DbHelper closing pool (total steps: ${this.stepCount}) ===`);
        await this.pool.end();
    }

    // ===================== Private Helpers =====================

    private truncate(sql: string, maxLength = 120): string {
        const single = sql.replace(/\s+/g, ' ').trim();
        return single.length > maxLength ? `${single.substring(0, maxLength)}…` : single;
    }
}
