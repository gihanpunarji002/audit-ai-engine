import authService from '../services/auth.service.js';
import ApiResponse from '../utils/ApiResponse.js';
import asyncHandler from '../utils/asyncHandler.js';
import HttpStatus from '../constants/httpStatus.js';

export class AuthController {
  /**
   * POST /api/v1/auth/register
   * Register a new user with email, password, first_name, last_name
   */
  register = asyncHandler(async (req, res) => {
    const { email, password, first_name, last_name } = req.body;
    const result = await authService.register({ email, password, first_name, last_name });
    return res
      .status(HttpStatus.CREATED)
      .json(ApiResponse.created(result, 'User registered successfully'));
  });

  /**
   * POST /api/v1/auth/login
   * Authenticate user and return JWT access token
   */
  login = asyncHandler(async (req, res) => {
    const { email, password } = req.body;
    const result = await authService.login({ email, password });
    return res.json(ApiResponse.success(result, 'Authentication successful'));
  });

  /**
   * GET /api/v1/auth/me
   * Get current authenticated user profile
   */
  getMe = asyncHandler(async (req, res) => {
    const user = await authService.getMe(req.user.id);
    return res.json(ApiResponse.success(user, 'User profile retrieved successfully'));
  });

  /**
   * PUT /api/v1/auth/profile
   * Update profile details (first_name, last_name, avatar_url)
   */
  updateProfile = asyncHandler(async (req, res) => {
    const { first_name, last_name, avatar_url } = req.body;
    const updated = await authService.updateProfile(req.user.id, {
      first_name,
      last_name,
      avatar_url,
    });
    return res.json(ApiResponse.success(updated, 'Profile updated successfully'));
  });

  /**
   * POST /api/v1/auth/change-password
   * Securely update password
   */
  changePassword = asyncHandler(async (req, res) => {
    const { currentPassword, newPassword } = req.body;
    const result = await authService.changePassword(req.user.id, {
      currentPassword,
      newPassword,
    });
    return res.json(ApiResponse.success(result, 'Password changed successfully'));
  });
}

export default new AuthController();
