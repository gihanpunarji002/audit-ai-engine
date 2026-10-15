import app from './app.js';
import config from './config/index.js';
import { testFirebaseConnection } from './config/firebase.js';
import logger from './utils/logger.js';

let server;

const startServer = async () => {
  try {
    // Start HTTP server immediately
    server = app.listen(config.port, () => {
      logger.info(`Server running in ${config.env} mode on port ${config.port}`);
      logger.info(`API Base URL: http://localhost:${config.port}${config.apiPrefix}`);
      logger.info(`Database: Cloud Firestore (with KNN Vector Search)`);
      logger.info(`Storage: Firebase Cloud Storage`);
    });

    // Verify Firebase connectivity in background
    testFirebaseConnection().catch(() => {});
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
