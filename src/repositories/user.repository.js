import { query } from '../config/db.js';

/**
 * Data Access Layer for User entity
 * Interacts directly with PostgreSQL database using parameterized queries.
 */
class UserRepository {
  /**
   * Find all users with pagination and optional search
   * @param {Object} options
   */
  async findAll({ limit = 10, offset = 0, search = '' } = {}) {
    let sql = `
      SELECT id, email, first_name, last_name, role, is_active, avatar_url, created_at, updated_at
      FROM users
    `;
    const params = [];

    if (search) {
      sql += ` WHERE (email ILIKE $1 OR first_name ILIKE $1 OR last_name ILIKE $1)`;
      params.push(`%${search}%`);
    }

    sql += ` ORDER BY created_at DESC LIMIT $${params.length + 1} OFFSET $${params.length + 2};`;
    params.push(limit, offset);

    const result = await query(sql, params);
    return result.rows;
  }

  /**
   * Count total users with optional search
   */
  async count({ search = '' } = {}) {
    let sql = `SELECT COUNT(*) AS total FROM users`;
    const params = [];

    if (search) {
      sql += ` WHERE (email ILIKE $1 OR first_name ILIKE $1 OR last_name ILIKE $1)`;
      params.push(`%${search}%`);
    }

    const result = await query(sql, params);
    return parseInt(result.rows[0].total, 10);
  }

  /**
   * Find safe user record by ID (excludes password_hash)
   * @param {string|number} id 
   */
  async findById(id) {
    const sql = `
      SELECT id, email, first_name, last_name, role, is_active, avatar_url, created_at, updated_at
      FROM users
      WHERE id = $1;
    `;
    const result = await query(sql, [id]);
    return result.rows[0] || null;
  }

  /**
   * Find full user record by ID including password_hash (for password operations)
   * @param {string|number} id 
   */
  async findByIdWithPassword(id) {
    const sql = `
      SELECT id, email, password_hash, first_name, last_name, role, is_active, avatar_url, created_at, updated_at
      FROM users
      WHERE id = $1;
    `;
    const result = await query(sql, [id]);
    return result.rows[0] || null;
  }

  /**
   * Find safe user record by Email
   * @param {string} email 
   */
  async findByEmail(email) {
    const sql = `
      SELECT id, email, first_name, last_name, role, is_active, avatar_url, created_at, updated_at
      FROM users
      WHERE LOWER(email) = LOWER($1);
    `;
    const result = await query(sql, [email]);
    return result.rows[0] || null;
  }

  /**
   * Find user by Email including password_hash (for login verification)
   * @param {string} email 
   */
  async findByEmailWithPassword(email) {
    const sql = `
      SELECT id, email, password_hash, first_name, last_name, role, is_active, avatar_url, created_at, updated_at
      FROM users
      WHERE LOWER(email) = LOWER($1);
    `;
    const result = await query(sql, [email]);
    return result.rows[0] || null;
  }

  /**
   * Create a new user with secure password hash
   * @param {Object} userData 
   */
  async create({ email, password_hash, first_name, last_name, role = 'user' }) {
    const sql = `
      INSERT INTO users (email, password_hash, first_name, last_name, role)
      VALUES (LOWER($1), $2, $3, $4, $5)
      RETURNING id, email, first_name, last_name, role, is_active, avatar_url, created_at, updated_at;
    `;
    const result = await query(sql, [email, password_hash, first_name, last_name, role]);
    return result.rows[0];
  }

  /**
   * Update user profile information
   * @param {string|number} id 
   * @param {Object} updates 
   */
  async update(id, { first_name, last_name, avatar_url, role, is_active }) {
    const sql = `
      UPDATE users
      SET first_name = COALESCE($1, first_name),
          last_name = COALESCE($2, last_name),
          avatar_url = COALESCE($3, avatar_url),
          role = COALESCE($4, role),
          is_active = COALESCE($5, is_active),
          updated_at = NOW()
      WHERE id = $6
      RETURNING id, email, first_name, last_name, role, is_active, avatar_url, created_at, updated_at;
    `;
    const result = await query(sql, [first_name, last_name, avatar_url, role, is_active, id]);
    return result.rows[0] || null;
  }

  /**
   * Update user password
   * @param {string|number} id 
   * @param {string} password_hash 
   */
  async updatePassword(id, password_hash) {
    const sql = `
      UPDATE users
      SET password_hash = $1,
          updated_at = NOW()
      WHERE id = $2
      RETURNING id;
    `;
    const result = await query(sql, [password_hash, id]);
    return result.rowCount > 0;
  }

  /**
   * Delete a user by ID
   * @param {string|number} id 
   */
  async delete(id) {
    const sql = `DELETE FROM users WHERE id = $1 RETURNING id;`;
    const result = await query(sql, [id]);
    return result.rowCount > 0;
  }
}

export default new UserRepository();
