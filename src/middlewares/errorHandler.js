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

  // Handle Firebase / gRPC errors
  if (err.code) {
    switch (err.code) {
      case 5: // NOT_FOUND
      case 'not-found':
        error = ApiError.notFound(err.message || 'Requested document was not found');
        break;
      case 6: // ALREADY_EXISTS
      case 'already-exists':
        error = ApiError.conflict('A record with this identifier already exists');
        break;
      case 7: // PERMISSION_DENIED
      case 'permission-denied':
        error = ApiError.forbidden('Access denied to this cloud resource');
        break;
      case 16: // UNAUTHENTICATED
      case 'unauthenticated':
        error = ApiError.unauthorized('Authentication credentials invalid or expired');
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
