import config from '../config/index.js';

const LogLevels = {
  ERROR: 'ERROR',
  WARN: 'WARN',
  INFO: 'INFO',
  DEBUG: 'DEBUG',
};

const formatMessage = (level, message, meta) => {
  const timestamp = new Date().toISOString();
  const metaString = meta && Object.keys(meta).length ? ` | ${JSON.stringify(meta)}` : '';
  return `[${timestamp}] [${level}] ${message}${metaString}`;
};

export const logger = {
  info: (message, meta) => {
    console.log(formatMessage(LogLevels.INFO, message, meta));
  },
  warn: (message, meta) => {
    console.warn(formatMessage(LogLevels.WARN, message, meta));
  },
  error: (message, meta) => {
    console.error(formatMessage(LogLevels.ERROR, message, meta));
  },
  debug: (message, meta) => {
    if (config.isDevelopment) {
      console.debug(formatMessage(LogLevels.DEBUG, message, meta));
    }
  },
};

export default logger;
