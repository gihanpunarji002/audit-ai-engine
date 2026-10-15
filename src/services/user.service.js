import bcrypt from 'bcryptjs';
import config from '../config/index.js';
import userRepository from '../repositories/user.repository.js';
import ApiError from '../utils/ApiError.js';

/**
 * Service layer containing business logic for User administrative management
 */
class UserService {
  /**
   * Get paginated list of users
   */
  async getAllUsers(page = 1, limit = 10, search = '') {
    const parsedPage = Math.max(1, parseInt(page, 10));
    const parsedLimit = Math.max(1, Math.min(100, parseInt(limit, 10)));
    const offset = (parsedPage - 1) * parsedLimit;

    const [users, total] = await Promise.all([
      userRepository.findAll({ limit: parsedLimit, offset, search }),
      userRepository.count({ search }),
    ]);

    return {
      users,
      pagination: {
        total,
        page: parsedPage,
        limit: parsedLimit,
        totalPages: Math.ceil(total / parsedLimit),
      },
    };
  }

  /**
   * Get user by ID
   */
  async getUserById(id) {
    const user = await userRepository.findById(id);
    if (!user) {
      throw ApiError.notFound(`User with ID '${id}' not found`);
    }
    return user;
  }

  /**
   * Create new user (Admin-level)
   */
  async createUser(userData) {
    const { email, password, first_name, last_name, role = 'user' } = userData;

    if (!email || !first_name || !last_name) {
      throw ApiError.badRequest('Email, first name, and last name are required');
    }

    const existingUser = await userRepository.findByEmail(email);
    if (existingUser) {
      throw ApiError.conflict(`A user with email '${email}' already exists`);
    }

    const defaultPassword = password || 'User@123456';
    const password_hash = await bcrypt.hash(defaultPassword, config.bcrypt.saltRounds);

    return userRepository.create({
      email,
      password_hash,
      first_name,
      last_name,
      role,
    });
  }

  /**
   * Update existing user
   */
  async updateUser(id, updateData) {
    await this.getUserById(id);
    const updatedUser = await userRepository.update(id, updateData);
    return updatedUser;
  }

  /**
   * Delete user by ID
   */
  async deleteUser(id) {
    await this.getUserById(id);
    return userRepository.delete(id);
  }
}

export default new UserService();
