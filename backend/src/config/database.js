import pg from 'pg';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import path from 'path';

// Ensure we load the .env from the backend directory explicitly
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const envPath = path.resolve(__dirname, '../../.env');
dotenv.config({ path: envPath, override: true });

const { Pool } = pg;

// Resolve database URL (avoid silent fallback to localhost)
const databaseUrl = (process.env.DATABASE_URL || '').trim();
if (!databaseUrl) {
  console.error('❌ DATABASE_URL is not set. Please configure it in backend/.env');
}

// (debug log removed)

// Create connection pool optimized for Supabase
const pool = new Pool({
  connectionString: databaseUrl || undefined,
  // Use SSL for hosted databases like Supabase; disable for local only
  ssl: databaseUrl && !databaseUrl.includes('localhost') && !databaseUrl.includes('127.0.0.1') && !databaseUrl.includes('::1')
    ? { rejectUnauthorized: false }
    : false,
  max: 5, // Reduced to 5 for Supabase free tier limits
  min: 0,  // Start with 0 to avoid holding connections
  idleTimeoutMillis: 10000, // Close idle connections after 10s
  connectionTimeoutMillis: 20000, // 20s timeout
  statement_timeout: 20000, // 20s query timeout
  allowExitOnIdle: true, // Allow pool to close when idle
});

// Connection lifecycle logs
pool.on('connect', () => {
  try {
    const { hostname } = new URL(databaseUrl);
    console.log(`✅ Database connected (host: ${hostname})`);
  } catch {
    console.log('✅ Database connected');
  }
});

pool.on('error', (err) => {
  console.error('❌ Database pool error:', err.message);
  // Don't exit - let the pool try to recover
  // Supabase may close idle connections, which is normal
});

// Test query function
export const testConnection = async () => {
  try {
    const result = await pool.query('SELECT NOW()');
    console.log('✅ Database test query successful:', result.rows[0]);
    return true;
  } catch (error) {
    console.error('❌ Database connection test failed:', error.message);
    return false;
  }
};

// Query function for use in routes
export const query = async (text, params) => {
  try {
    const result = await pool.query(text, params);
    return result;
  } catch (error) {
    console.error('Database query error:', error);
    throw error;
  }
};

export default pool;

