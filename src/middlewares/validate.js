import ApiError from '../utils/ApiError.js';

/**
 * Higher-order middleware function to validate request bodies against simple validation schemas.
 * Keeps controllers clean and ensures all inputs meet requirements.
 */
export const validateBody = (rules) => {
  return (req, res, next) => {
    const errors = [];
    const body = req.body || {};

    for (const [field, rule] of Object.entries(rules)) {
      const val = body[field];

      if (rule.required && (val === undefined || val === null || val === '')) {
        errors.push({ field, message: rule.message || `${field} is required` });
        continue;
      }

      if (val !== undefined && val !== null && val !== '') {
        if (rule.type && typeof val !== rule.type) {
          errors.push({ field, message: `${field} must be of type ${rule.type}` });
        }

        if (rule.minLength && typeof val === 'string' && val.length < rule.minLength) {
          errors.push({ field, message: `${field} must be at least ${rule.minLength} characters long` });
        }

        if (rule.maxLength && typeof val === 'string' && val.length > rule.maxLength) {
          errors.push({ field, message: `${field} cannot exceed ${rule.maxLength} characters` });
        }

        if (rule.pattern && typeof val === 'string' && !rule.pattern.test(val)) {
          errors.push({ field, message: rule.patternMessage || `${field} format is invalid` });
        }
      }
    }

    if (errors.length > 0) {
      return next(ApiError.unprocessableEntity('Validation failed', errors));
    }

    next();
  };
};

export default validateBody;
