import pg from 'pg';
import config from './index.js';
import logger from '../utils/logger.js';

const { Pool } = pg;

// Initialize PostgreSQL connection pool
export const pool = new Pool(config.db);

// Log pool events
pool.on('connect', () => {
  logger.debug('Database pool established a new client connection');
});

pool.on('error', (err) => {
  logger.error('Unexpected error on idle PostgreSQL client', { error: err.message, stack: err.stack });
});

/**
 * Execute a single query against the database pool
 * @param {string} text - SQL query string with parameterized placeholders ($1, $2, etc.)
 * @param {Array} [params] - Values for parameterized query
 * @returns {Promise<pg.QueryResult>}
 */
export const query = async (text, params = []) => {
  const start = Date.now();
  try {
    const res = await pool.query(text, params);
    const duration = Date.now() - start;
    logger.debug('Executed query', { text, duration: `${duration}ms`, rows: res.rowCount });
    return res;
  } catch (error) {
    logger.error('Database query error', { text, error: error.message });
    throw error;
  }
};

/**
 * Get a dedicated client from the pool (ideal for multi-step transactions)
 * @returns {Promise<pg.PoolClient>}
 */
export const getClient = async () => {
  const client = await pool.connect();
  return client;
};

/**
 * Test connectivity to PostgreSQL
 * @returns {Promise<boolean>}
 */
export const testDbConnection = async () => {
  try {
    const res = await query('SELECT NOW() AS current_time');
    logger.info('Database connected successfully', { serverTime: res.rows[0].current_time });
    return true;
  } catch (error) {
    logger.error('Database connection failed', { error: error.message });
    return false;
  }
};

/**
 * Gracefully close database pool
 */
export const closePool = async () => {
  try {
    await pool.end();
    logger.info('Database pool closed gracefully');
  } catch (error) {
    logger.error('Error closing database pool', { error: error.message });
  }
};

export default {
  pool,
  query,
  getClient,
  testDbConnection,
  closePool,
};
