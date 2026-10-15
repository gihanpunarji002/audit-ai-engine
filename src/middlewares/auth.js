import jwt from 'jsonwebtoken';
import config from '../config/index.js';
import userRepository from '../repositories/user.repository.js';
import ApiError from '../utils/ApiError.js';
import asyncHandler from '../utils/asyncHandler.js';

/**
 * Middleware to authenticate JWT Bearer token
 * Attaches decoded active user to req.user
 */
export const authenticateToken = asyncHandler(async (req, res, next) => {
  const authHeader = req.headers.authorization || req.headers.Authorization;

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    throw ApiError.unauthorized('Authentication token missing or invalid format. Please provide a Bearer token.');
  }

  const token = authHeader.split(' ')[1];

  let decoded;
  try {
    decoded = jwt.verify(token, config.jwt.secret);
  } catch (err) {
    if (err.name === 'TokenExpiredError') {
      throw ApiError.unauthorized('Your session has expired. Please log in again.');
    }
    throw ApiError.unauthorized('Invalid authentication token.');
  }

  const user = await userRepository.findById(decoded.id);

  if (!user) {
    throw ApiError.unauthorized('User account associated with this token no longer exists.');
  }

  if (!user.is_active) {
    throw ApiError.forbidden('Your account has been deactivated. Please contact support.');
  }

  req.user = user;
  next();
});

export default authenticateToken;
