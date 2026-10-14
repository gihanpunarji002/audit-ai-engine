import HttpStatus from '../constants/httpStatus.js';

export class ApiError extends Error {
  /**
   * @param {number} statusCode - HTTP status code
   * @param {string} message - Error description
   * @param {Array} [errors=[]] - Detailed errors (e.g., validation fields)
   * @param {string} [stack=''] - Optional stack trace override
   */
  constructor(statusCode = HttpStatus.INTERNAL_SERVER_ERROR, message = 'Something went wrong', errors = [], stack = '') {
    super(message);
    this.statusCode = statusCode;
    this.data = null;
    this.message = message;
    this.success = false;
    this.errors = errors;
    this.isOperational = true;

    if (stack) {
      this.stack = stack;
    } else {
      Error.captureStackTrace(this, this.constructor);
    }
  }

  static badRequest(message = 'Bad Request', errors = []) {
    return new ApiError(HttpStatus.BAD_REQUEST, message, errors);
  }

  static unauthorized(message = 'Unauthorized') {
    return new ApiError(HttpStatus.UNAUTHORIZED, message);
  }

  static forbidden(message = 'Forbidden') {
    return new ApiError(HttpStatus.FORBIDDEN, message);
  }

  static notFound(message = 'Resource not found') {
    return new ApiError(HttpStatus.NOT_FOUND, message);
  }

  static conflict(message = 'Conflict') {
    return new ApiError(HttpStatus.CONFLICT, message);
  }

  static unprocessableEntity(message = 'Validation failed', errors = []) {
    return new ApiError(HttpStatus.UNPROCESSABLE_ENTITY, message, errors);
  }

  static internal(message = 'Internal server error') {
    return new ApiError(HttpStatus.INTERNAL_SERVER_ERROR, message);
  }
}

export default ApiError;
