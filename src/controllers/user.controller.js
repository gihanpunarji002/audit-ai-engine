import userService from '../services/user.service.js';
import ApiResponse from '../utils/ApiResponse.js';
import asyncHandler from '../utils/asyncHandler.js';

export class UserController {
  /**
   * GET /api/v1/users
   */
  getUsers = asyncHandler(async (req, res) => {
    const { page, limit } = req.query;
    const result = await userService.getAllUsers(page, limit);
    return res.json(ApiResponse.success(result, 'Users retrieved successfully'));
  });

  /**
   * GET /api/v1/users/:id
   */
  getUserById = asyncHandler(async (req, res) => {
    const { id } = req.params;
    const user = await userService.getUserById(id);
    return res.json(ApiResponse.success(user, 'User retrieved successfully'));
  });

  /**
   * POST /api/v1/users
   */
  createUser = asyncHandler(async (req, res) => {
    const newUser = await userService.createUser(req.body);
    return res.status(201).json(ApiResponse.created(newUser, 'User created successfully'));
  });

  /**
   * PUT /api/v1/users/:id
   */
  updateUser = asyncHandler(async (req, res) => {
    const { id } = req.params;
    const updatedUser = await userService.updateUser(id, req.body);
    return res.json(ApiResponse.success(updatedUser, 'User updated successfully'));
  });

  /**
   * DELETE /api/v1/users/:id
   */
  deleteUser = asyncHandler(async (req, res) => {
    const { id } = req.params;
    await userService.deleteUser(id);
    return res.json(ApiResponse.noContent('User deleted successfully'));
  });
}

export default new UserController();
