import { query } from '../config/db.js';

/**
 * Data Access Layer for User entity
 * Interacts directly with PostgreSQL database using parameterized queries.
 */
class UserRepository {
  /**
   * Find all users with pagination
   * @param {number} limit 
   * @param {number} offset 
   */
  async findAll({ limit = 10, offset = 0 } = {}) {
    const sql = `
      SELECT id, name, email, role, created_at, updated_at
      FROM users
      ORDER BY created_at DESC
      LIMIT $1 OFFSET $2;
    `;
    const result = await query(sql, [limit, offset]);
    return result.rows;
  }

  /**
   * Count total users
   */
  async count() {
    const sql = `SELECT COUNT(*) AS total FROM users;`;
    const result = await query(sql);
    return parseInt(result.rows[0].total, 10);
  }

  /**
   * Find user by ID
   * @param {string|number} id 
   */
  async findById(id) {
    const sql = `
      SELECT id, name, email, role, created_at, updated_at
      FROM users
      WHERE id = $1;
    `;
    const result = await query(sql, [id]);
    return result.rows[0] || null;
  }

  /**
   * Find user by Email
   * @param {string} email 
   */
  async findByEmail(email) {
    const sql = `
      SELECT id, name, email, role, created_at, updated_at
      FROM users
      WHERE email = $1;
    `;
    const result = await query(sql, [email]);
    return result.rows[0] || null;
  }

  /**
   * Create a new user
   * @param {Object} userData 
   */
  async create({ name, email, role = 'user' }) {
    const sql = `
      INSERT INTO users (name, email, role)
      VALUES ($1, $2, $3)
      RETURNING id, name, email, role, created_at, updated_at;
    `;
    const result = await query(sql, [name, email, role]);
    return result.rows[0];
  }

  /**
   * Update an existing user
   * @param {string|number} id 
   * @param {Object} updates 
   */
  async update(id, { name, role }) {
    const sql = `
      UPDATE users
      SET name = COALESCE($1, name),
          role = COALESCE($2, role),
          updated_at = NOW()
      WHERE id = $3
      RETURNING id, name, email, role, created_at, updated_at;
    `;
    const result = await query(sql, [name, role, id]);
    return result.rows[0] || null;
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
