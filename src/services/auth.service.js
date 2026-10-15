import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import config from '../config/index.js';
import userRepository from '../repositories/user.repository.js';
import ApiError from '../utils/ApiError.js';
import logger from '../utils/logger.js';

class AuthService {
  /**
   * Helper: Generate signed JWT token
   * @param {Object} user 
   * @returns {string} JWT Token
   */
  generateToken(user) {
    const payload = {
      id: user.id,
      email: user.email,
      role: user.role,
      first_name: user.first_name,
      last_name: user.last_name,
    };

    return jwt.sign(payload, config.jwt.secret, {
      expiresIn: config.jwt.expiresIn,
    });
  }

  /**
   * Register a new user with email, password, first_name, last_name
   * @param {Object} registrationData 
   * @returns {Promise<{ user: Object, token: string }>}
   */
  async register({ email, password, first_name, last_name }) {
    // 1. Sanitize & Normalize input
    const normalizedEmail = email ? email.trim().toLowerCase() : '';
    const cleanFirstName = first_name ? first_name.trim() : '';
    const cleanLastName = last_name ? last_name.trim() : '';

    // 2. Validate input fields
    if (!normalizedEmail || !password || !cleanFirstName || !cleanLastName) {
      throw ApiError.badRequest('First name, last name, email, and password are all required');
    }

    // Email format validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(normalizedEmail)) {
      throw ApiError.badRequest('Please provide a valid email address');
    }

    // Password strength check
    if (password.length < 8) {
      throw ApiError.badRequest('Password must be at least 8 characters long');
    }

    // 3. Check for existing user
    const existingUser = await userRepository.findByEmail(normalizedEmail);
    if (existingUser) {
      throw ApiError.conflict('An account with this email address already exists');
    }

    // 4. Hash password
    const saltRounds = config.bcrypt.saltRounds;
    const passwordHash = await bcrypt.hash(password, saltRounds);

    // 5. Create user in database
    const newUser = await userRepository.create({
      email: normalizedEmail,
      password_hash: passwordHash,
      first_name: cleanFirstName,
      last_name: cleanLastName,
      role: 'user',
    });

    logger.info(`User registered successfully: ${newUser.email} (ID: ${newUser.id})`);

    // 6. Generate JWT token
    const token = this.generateToken(newUser);

    return {
      user: newUser,
      token,
    };
  }

  /**
   * Authenticate user with email and password
   * @param {Object} credentials 
   * @returns {Promise<{ user: Object, token: string }>}
   */
  async login({ email, password }) {
    const normalizedEmail = email ? email.trim().toLowerCase() : '';

    if (!normalizedEmail || !password) {
      throw ApiError.badRequest('Email and password are required');
    }

    // 1. Fetch user by email with password hash
    const user = await userRepository.findByEmailWithPassword(normalizedEmail);
    if (!user) {
      throw ApiError.unauthorized('Invalid email or password');
    }

    // 2. Compare password hashes
    const isPasswordValid = await bcrypt.compare(password, user.password_hash);
    if (!isPasswordValid) {
      throw ApiError.unauthorized('Invalid email or password');
    }

    // 3. Verify active status
    if (!user.is_active) {
      throw ApiError.forbidden('Your account has been deactivated. Please contact an administrator.');
    }

    // 4. Strip sensitive password_hash before returning
    const { password_hash, ...sanitizedUser } = user;

    // 5. Generate JWT token
    const token = this.generateToken(sanitizedUser);

    logger.info(`User logged in successfully: ${sanitizedUser.email} (ID: ${sanitizedUser.id})`);

    return {
      user: sanitizedUser,
      token,
    };
  }

  /**
   * Get current authenticated user profile
   * @param {number|string} userId 
   * @returns {Promise<Object>}
   */
  async getMe(userId) {
    const user = await userRepository.findById(userId);
    if (!user) {
      throw ApiError.notFound('User profile not found');
    }
    return user;
  }

  /**
   * Update authenticated user profile
   * @param {number|string} userId 
   * @param {Object} profileData 
   * @returns {Promise<Object>}
   */
  async updateProfile(userId, { first_name, last_name, avatar_url }) {
    const updated = await userRepository.update(userId, {
      first_name: first_name?.trim(),
      last_name: last_name?.trim(),
      avatar_url: avatar_url?.trim(),
    });

    if (!updated) {
      throw ApiError.notFound('User not found');
    }

    return updated;
  }

  /**
   * Change user password securely
   * @param {number|string} userId 
   * @param {Object} passwords 
   */
  async changePassword(userId, { currentPassword, newPassword }) {
    if (!currentPassword || !newPassword) {
      throw ApiError.badRequest('Current password and new password are required');
    }

    if (newPassword.length < 8) {
      throw ApiError.badRequest('New password must be at least 8 characters long');
    }

    const user = await userRepository.findByIdWithPassword(userId);
    if (!user) {
      throw ApiError.notFound('User not found');
    }

    const isMatch = await bcrypt.compare(currentPassword, user.password_hash);
    if (!isMatch) {
      throw ApiError.badRequest('Current password does not match');
    }

    const saltRounds = config.bcrypt.saltRounds;
    const newPasswordHash = await bcrypt.hash(newPassword, saltRounds);

    await userRepository.updatePassword(userId, newPasswordHash);
    logger.info(`User ${user.email} (ID: ${userId}) changed their password`);

    return { message: 'Password updated successfully' };
  }
}

export default new AuthService();
