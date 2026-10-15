import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';
import { query, pool } from '../config/db.js';
import logger from '../utils/logger.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

/**
 * Migration runner: reads schema.sql and runs it against PostgreSQL database.
 */
export const runMigration = async () => {
  const schemaPath = path.join(__dirname, 'schema.sql');
  logger.info(`Starting database migration from: ${schemaPath}`);

  try {
    const schemaSql = await fs.readFile(schemaPath, 'utf8');

    // Run the entire schema definition inside a transaction or query block
    await query(schemaSql);

    logger.info('Database migration executed successfully! All tables, indexes, and triggers created.');
  } catch (error) {
    logger.error('Failed to run database migration', {
      error: error.message,
      detail: error.detail,
    });
    throw error;
  }
};

// If run directly from CLI (npm run db:migrate)
if (process.argv[1] === fileURLToPath(import.meta.url)) {
  runMigration()
    .then(() => {
      logger.info('Migration finished successfully.');
      process.exit(0);
    })
    .catch((err) => {
      logger.error('Migration failed with error:', { message: err.message });
      process.exit(1);
    })
    .finally(() => {
      pool.end();
    });
}

export default runMigration;
