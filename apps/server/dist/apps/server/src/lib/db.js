import { Pool } from 'pg';
import dotenv from 'dotenv';
dotenv.config();
const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    max: 20,
    idleTimeoutMillis: 30000,
    connectionTimeoutMillis: 2000,
});
pool.on('error', (err) => {
    console.error('Unexpected error on idle client', err);
});
export async function query(text, params) {
    const start = Date.now();
    try {
        const result = await pool.query(text, params);
        const duration = Date.now() - start;
        console.log('[DB] Executed query', { text, duration, rows: result.rowCount });
        return result;
    }
    catch (error) {
        console.error('[DB] Query error', { text, error });
        throw error;
    }
}
export async function getClient() {
    return pool.connect();
}
export async function initialize() {
    try {
        const result = await query('SELECT NOW()');
        console.log('[DB] Connected successfully', result.rows[0]);
    }
    catch (error) {
        console.error('[DB] Failed to connect', error);
        process.exit(1);
    }
}
export default pool;
//# sourceMappingURL=db.js.map