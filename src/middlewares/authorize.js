import ApiError from '../utils/ApiError.js';

/**
 * Role-Based Access Control (RBAC) middleware for system roles
 * @param  {...string} roles - Allowed system roles (e.g. 'superadmin', 'auditor')
 */
export const authorizeRoles = (...roles) => {
  return (req, res, next) => {
    if (!req.user) {
      return next(ApiError.unauthorized('User is not authenticated'));
    }

    if (!roles.includes(req.user.role)) {
      return next(
        ApiError.forbidden(
          `Access denied. Requires one of the following roles: [${roles.join(', ')}]`
        )
      );
    }

    next();
  };
};

export default authorizeRoles;
