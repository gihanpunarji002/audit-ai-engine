import ApiError from '../utils/ApiError.js';

/**
 * Middleware to catch 404 routes and forward to error handler
 */
export const notFound = (req, res, next) => {
  const error = ApiError.notFound(`Cannot ${req.method} ${req.originalUrl}`);
  next(error);
};

export default notFound;
