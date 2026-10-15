import { db } from '../config/firebase.js';

/**
 * Data Access Layer for User entity using Cloud Firestore
 */
class UserRepository {
  constructor() {
    this.collection = db.collection('users');
  }

  /**
   * Safe user projection (strips password_hash)
   */
  _toSafeUser(doc) {
    if (!doc.exists) return null;
    const data = doc.data();
    const { password_hash, ...safeData } = data;
    return {
      id: doc.id,
      ...safeData,
    };
  }

  /**
   * Find all users with pagination and optional search
   * @param {Object} options
   */
  async findAll({ limit = 10, offset = 0, search = '' } = {}) {
    let query = this.collection.orderBy('created_at', 'desc');

    if (offset > 0) {
      query = query.offset(offset);
    }

    query = query.limit(limit);

    const snapshot = await query.get();
    let users = snapshot.docs.map((doc) => this._toSafeUser(doc));

    if (search) {
      const q = search.toLowerCase();
      users = users.filter(
        (u) =>
          u.email?.toLowerCase().includes(q) ||
          u.first_name?.toLowerCase().includes(q) ||
          u.last_name?.toLowerCase().includes(q)
      );
    }

    return users;
  }

  /**
   * Count total users
   */
  async count({ search = '' } = {}) {
    const countSnapshot = await this.collection.count().get();
    return countSnapshot.data().count || 0;
  }

  /**
   * Find safe user record by ID (excludes password_hash)
   * @param {string|number} id 
   */
  async findById(id) {
    if (!id) return null;
    const doc = await this.collection.doc(String(id)).get();
    return this._toSafeUser(doc);
  }

  /**
   * Find full user record by ID including password_hash
   * @param {string|number} id 
   */
  async findByIdWithPassword(id) {
    if (!id) return null;
    const doc = await this.collection.doc(String(id)).get();
    if (!doc.exists) return null;
    return {
      id: doc.id,
      ...doc.data(),
    };
  }

  /**
   * Find safe user record by Email
   * @param {string} email 
   */
  async findByEmail(email) {
    if (!email) return null;
    const snapshot = await this.collection
      .where('email', '==', email.trim().toLowerCase())
      .limit(1)
      .get();

    if (snapshot.empty) return null;
    return this._toSafeUser(snapshot.docs[0]);
  }

  /**
   * Find user by Email including password_hash (for login verification)
   * @param {string} email 
   */
  async findByEmailWithPassword(email) {
    if (!email) return null;
    const snapshot = await this.collection
      .where('email', '==', email.trim().toLowerCase())
      .limit(1)
      .get();

    if (snapshot.empty) return null;
    const doc = snapshot.docs[0];
    return {
      id: doc.id,
      ...doc.data(),
    };
  }

  /**
   * Create a new user in Cloud Firestore
   * @param {Object} userData 
   */
  async create({ email, password_hash, first_name, last_name, role = 'user' }) {
    const docRef = this.collection.doc();
    const now = new Date().toISOString();

    const userData = {
      id: docRef.id,
      email: email.trim().toLowerCase(),
      password_hash,
      first_name,
      last_name,
      role,
      is_active: true,
      avatar_url: null,
      created_at: now,
      updated_at: now,
    };

    await docRef.set(userData);

    const { password_hash: _, ...safeUser } = userData;
    return safeUser;
  }

  /**
   * Update user profile information
   * @param {string|number} id 
   * @param {Object} updates 
   */
  async update(id, { first_name, last_name, avatar_url, role, is_active }) {
    const docRef = this.collection.doc(String(id));
    const doc = await docRef.get();
    if (!doc.exists) return null;

    const updates = {
      updated_at: new Date().toISOString(),
    };

    if (first_name !== undefined) updates.first_name = first_name;
    if (last_name !== undefined) updates.last_name = last_name;
    if (avatar_url !== undefined) updates.avatar_url = avatar_url;
    if (role !== undefined) updates.role = role;
    if (is_active !== undefined) updates.is_active = is_active;

    await docRef.update(updates);
    return this.findById(id);
  }

  /**
   * Update user password
   * @param {string|number} id 
   * @param {string} password_hash 
   */
  async updatePassword(id, password_hash) {
    const docRef = this.collection.doc(String(id));
    await docRef.update({
      password_hash,
      updated_at: new Date().toISOString(),
    });
    return true;
  }

  /**
   * Delete user by ID
   * @param {string|number} id 
   */
  async delete(id) {
    const docRef = this.collection.doc(String(id));
    const doc = await docRef.get();
    if (!doc.exists) return false;
    await docRef.delete();
    return true;
  }
}

export default new UserRepository();
