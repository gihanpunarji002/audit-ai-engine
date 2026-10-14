import app from './app.js';
import config from './config/index.js';
import { testDbConnection, closePool } from './config/db.js';
import logger from './utils/logger.js';

let server;

const startServer = async () => {
  try {
    // Verify database connectivity
    await testDbConnection();

    // Start HTTP server
    server = app.listen(config.port, () => {
      logger.info(`Server running in ${config.env} mode on port ${config.port}`);
      logger.info(`API Base URL: http://localhost:${config.port}${config.apiPrefix}`);
    });
  } catch (error) {
    logger.error('Failed to start server', { error: error.message, stack: error.stack });
    process.exit(1);
  }
};

/**
 * Graceful shutdown handler
 * @param {string} signal 
 */
const gracefulShutdown = async (signal) => {
  logger.info(`Received ${signal}. Starting graceful shutdown...`);

  if (server) {
    server.close(async () => {
      logger.info('HTTP server closed');

      // Close database connection pool
      await closePool();

      logger.info('Graceful shutdown complete');
      process.exit(0);
    });

    // Force shutdown after timeout if pending connections hang
    setTimeout(() => {
      logger.error('Forcefully terminating process after shutdown timeout');
      process.exit(1);
    }, 10000).unref();
  } else {
    process.exit(0);
  }
};

// Handle termination signals
process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
process.on('SIGINT', () => gracefulShutdown('SIGINT'));

// Handle unhandled exceptions & promise rejections
process.on('uncaughtException', (error) => {
  logger.error('Uncaught Exception thrown', { error: error.message, stack: error.stack });
  gracefulShutdown('uncaughtException');
});

process.on('unhandledRejection', (reason) => {
  logger.error('Unhandled Promise Rejection', { reason });
  gracefulShutdown('unhandledRejection');
});

startServer();
