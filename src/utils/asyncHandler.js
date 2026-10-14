/**
 * Wrapper for async route handlers to catch exceptions and pass to Express error middleware
 * @param {Function} requestHandler - Async route handler
 * @returns {Function} Express middleware function
 */
export const asyncHandler = (requestHandler) => {
  return (req, res, next) => {
    Promise.resolve(requestHandler(req, res, next)).catch((err) => next(err));
  };
};

export default asyncHandler;
