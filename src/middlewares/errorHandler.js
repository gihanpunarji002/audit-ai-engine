import config from '../config/index.js';
import HttpStatus from '../constants/httpStatus.js';
import ApiError from '../utils/ApiError.js';
import logger from '../utils/logger.js';

/**
 * Global error handling middleware
 */
export const errorHandler = (err, req, res, next) => {
  let error = err;

  // Handle malformed JSON body
  if (err instanceof SyntaxError && err.status === 400 && 'body' in err) {
    error = ApiError.badRequest('Invalid JSON payload');
  }

  // Handle common PostgreSQL errors
  if (err.code) {
    switch (err.code) {
      case '23505': // unique_violation
        error = ApiError.conflict('A record with this identifier already exists', [
          { detail: err.detail },
        ]);
        break;
      case '23503': // foreign_key_violation
        error = ApiError.badRequest('Referenced record does not exist', [
          { detail: err.detail },
        ]);
        break;
      case '22P02': // invalid_text_representation (e.g. invalid UUID/int)
        error = ApiError.badRequest('Invalid input syntax format');
        break;
      default:
        break;
    }
  }

  // If error is not an instance of ApiError, create a generic ApiError
  if (!(error instanceof ApiError)) {
    const statusCode = error.statusCode || HttpStatus.INTERNAL_SERVER_ERROR;
    const message = error.message || 'Internal Server Error';
    error = new ApiError(statusCode, message, [], error.stack);
  }

  const { statusCode, message, errors } = error;

  // Log error details
  if (statusCode >= 500) {
    logger.error(`[${req.method}] ${req.originalUrl} - ${message}`, {
      stack: error.stack,
      errors,
    });
  } else {
    logger.warn(`[${req.method}] ${req.originalUrl} - ${message}`, { errors });
  }

  // Send standardized JSON response
  res.status(statusCode).json({
    success: false,
    statusCode,
    message,
    errors,
    ...(config.isDevelopment && { stack: error.stack }),
  });
};

export default errorHandler;
