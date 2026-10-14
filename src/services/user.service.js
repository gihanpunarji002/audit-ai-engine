import userRepository from '../repositories/user.repository.js';
import ApiError from '../utils/ApiError.js';

/**
 * Service layer containing business logic for User management
 */
class UserService {
  /**
   * Get paginated list of users
   */
  async getAllUsers(page = 1, limit = 10) {
    const parsedPage = Math.max(1, parseInt(page, 10));
    const parsedLimit = Math.max(1, Math.min(100, parseInt(limit, 10)));
    const offset = (parsedPage - 1) * parsedLimit;

    const [users, total] = await Promise.all([
      userRepository.findAll({ limit: parsedLimit, offset }),
      userRepository.count(),
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
   * Create new user
   */
  async createUser(userData) {
    const { name, email, role } = userData;

    if (!name || !email) {
      throw ApiError.badRequest('Name and email are required fields');
    }

    const existingUser = await userRepository.findByEmail(email);
    if (existingUser) {
      throw ApiError.conflict(`A user with email '${email}' already exists`);
    }

    return userRepository.create({ name, email, role });
  }

  /**
   * Update existing user
   */
  async updateUser(id, updateData) {
    // Check if user exists
    await this.getUserById(id);

    const updatedUser = await userRepository.update(id, updateData);
    return updatedUser;
  }

  /**
   * Delete user by ID
   */
  async deleteUser(id) {
    // Check if user exists
    await this.getUserById(id);

    return userRepository.delete(id);
  }
}

export default new UserService();
