import morgan from 'morgan';
import config from '../config/index.js';
import logger from '../utils/logger.js';

// Custom morgan stream redirecting output to structured logger
const stream = {
  write: (message) => logger.info(message.trim()),
};

// Choose format based on environment
const format = config.isDevelopment ? 'dev' : ':remote-addr :method :url :status :res[content-length] - :response-time ms';

export const requestLogger = morgan(format, {
  stream,
  skip: (req) => req.url === '/health' && config.isProduction, // Optionally suppress health check logs in prod
});

export default requestLogger;
