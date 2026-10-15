import { query, getClient } from '../config/db.js';
import { OrganizationRole } from '../constants/roles.js';

class OrganizationRepository {
  /**
   * Create an organization and automatically attach the creator as OWNER inside a transaction.
   * @param {Object} orgData 
   * @returns {Promise<Object>} Created organization
   */
  async createWithInitialOwner({ name, slug, description, owner_id }) {
    const client = await getClient();
    try {
      await client.query('BEGIN');

      const createOrgSql = `
        INSERT INTO organizations (name, slug, description, owner_id)
        VALUES ($1, $2, $3, $4)
        RETURNING id, name, slug, description, owner_id, created_at, updated_at;
      `;
      const orgRes = await client.query(createOrgSql, [name, slug, description, owner_id]);
      const org = orgRes.rows[0];

      const addOwnerMemberSql = `
        INSERT INTO organization_members (organization_id, user_id, role)
        VALUES ($1, $2, $3);
      `;
      await client.query(addOwnerMemberSql, [org.id, owner_id, OrganizationRole.OWNER]);

      await client.query('COMMIT');
      return org;
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }

  /**
   * Find organization by ID
   * @param {number|string} id 
   */
  async findById(id) {
    const sql = `
      SELECT o.id, o.name, o.slug, o.description, o.owner_id, o.created_at, o.updated_at,
             u.first_name AS owner_first_name, u.last_name AS owner_last_name, u.email AS owner_email
      FROM organizations o
      JOIN users u ON u.id = o.owner_id
      WHERE o.id = $1;
    `;
    const res = await query(sql, [id]);
    return res.rows[0] || null;
  }

  /**
   * Find organization by unique slug
   * @param {string} slug 
   */
  async findBySlug(slug) {
    const sql = `
      SELECT id, name, slug, description, owner_id, created_at, updated_at
      FROM organizations
      WHERE slug = $1;
    `;
    const res = await query(sql, [slug]);
    return res.rows[0] || null;
  }

  /**
   * Get all organizations a user belongs to with their role
   * @param {number|string} userId 
   */
  async findUserOrganizations(userId) {
    const sql = `
      SELECT o.id, o.name, o.slug, o.description, o.owner_id, om.role AS member_role,
             om.joined_at, o.created_at,
             (SELECT COUNT(*) FROM organization_members WHERE organization_id = o.id) AS member_count,
             (SELECT COUNT(*) FROM documents WHERE organization_id = o.id) AS document_count
      FROM organizations o
      JOIN organization_members om ON om.organization_id = o.id
      WHERE om.user_id = $1
      ORDER BY om.joined_at DESC;
    `;
    const res = await query(sql, [userId]);
    return res.rows;
  }

  /**
   * Get membership details for a specific user in an organization
   * @param {number|string} orgId 
   * @param {number|string} userId 
   */
  async findMember(orgId, userId) {
    const sql = `
      SELECT id, organization_id, user_id, role, joined_at
      FROM organization_members
      WHERE organization_id = $1 AND user_id = $2;
    `;
    const res = await query(sql, [orgId, userId]);
    return res.rows[0] || null;
  }

  /**
   * List all members of an organization with user profiles
   * @param {number|string} orgId 
   */
  async findMembers(orgId) {
    const sql = `
      SELECT om.id, om.organization_id, om.user_id, om.role, om.joined_at,
             u.email, u.first_name, u.last_name, u.avatar_url
      FROM organization_members om
      JOIN users u ON u.id = om.user_id
      WHERE om.organization_id = $1
      ORDER BY 
        CASE om.role
          WHEN 'owner' THEN 1
          WHEN 'admin' THEN 2
          WHEN 'auditor' THEN 3
          ELSE 4
        END,
        om.joined_at ASC;
    `;
    const res = await query(sql, [orgId]);
    return res.rows;
  }

  /**
   * Add a member to an organization
   * @param {Object} memberData 
   */
  async addMember({ organization_id, user_id, role = 'member' }) {
    const sql = `
      INSERT INTO organization_members (organization_id, user_id, role)
      VALUES ($1, $2, $3)
      RETURNING id, organization_id, user_id, role, joined_at;
    `;
    const res = await query(sql, [organization_id, user_id, role]);
    return res.rows[0];
  }

  /**
   * Update member role in organization
   * @param {number|string} orgId 
   * @param {number|string} userId 
   * @param {string} role 
   */
  async updateMemberRole(orgId, userId, role) {
    const sql = `
      UPDATE organization_members
      SET role = $1, updated_at = NOW()
      WHERE organization_id = $2 AND user_id = $3
      RETURNING id, organization_id, user_id, role, updated_at;
    `;
    const res = await query(sql, [role, orgId, userId]);
    return res.rows[0] || null;
  }

  /**
   * Remove member from organization
   * @param {number|string} orgId 
   * @param {number|string} userId 
   */
  async removeMember(orgId, userId) {
    const sql = `
      DELETE FROM organization_members
      WHERE organization_id = $1 AND user_id = $2
      RETURNING id;
    `;
    const res = await query(sql, [orgId, userId]);
    return res.rowCount > 0;
  }

  /**
   * Create member invitation
   * @param {Object} inviteData 
   */
  async createInvitation({ organization_id, email, role, token, expires_at, invited_by }) {
    const sql = `
      INSERT INTO organization_invitations (organization_id, email, role, token, expires_at, invited_by)
      VALUES ($1, LOWER($2), $3, $4, $5, $6)
      RETURNING id, organization_id, email, role, token, status, expires_at, invited_by, created_at;
    `;
    const res = await query(sql, [organization_id, email, role, token, expires_at, invited_by]);
    return res.rows[0];
  }

  /**
   * Find invitation by token
   * @param {string} token 
   */
  async findInvitationByToken(token) {
    const sql = `
      SELECT i.id, i.organization_id, i.email, i.role, i.token, i.status, i.expires_at, i.invited_by, i.created_at,
             o.name AS organization_name, o.slug AS organization_slug,
             u.first_name AS inviter_first_name, u.last_name AS inviter_last_name
      FROM organization_invitations i
      JOIN organizations o ON o.id = i.organization_id
      JOIN users u ON u.id = i.invited_by
      WHERE i.token = $1;
    `;
    const res = await query(sql, [token]);
    return res.rows[0] || null;
  }

  /**
   * Update invitation status (accepted, rejected, expired)
   * @param {number|string} id 
   * @param {string} status 
   */
  async updateInvitationStatus(id, status) {
    const sql = `
      UPDATE organization_invitations
      SET status = $1
      WHERE id = $2
      RETURNING id, status;
    `;
    const res = await query(sql, [status, id]);
    return res.rows[0] || null;
  }

  /**
   * List pending invitations for an organization
   * @param {number|string} orgId 
   */
  async findPendingInvitations(orgId) {
    const sql = `
      SELECT i.id, i.organization_id, i.email, i.role, i.token, i.status, i.expires_at, i.created_at,
             u.first_name AS inviter_first_name, u.last_name AS inviter_last_name
      FROM organization_invitations i
      JOIN users u ON u.id = i.invited_by
      WHERE i.organization_id = $1 AND i.status = 'pending' AND i.expires_at > NOW()
      ORDER BY i.created_at DESC;
    `;
    const res = await query(sql, [orgId]);
    return res.rows;
  }
}

export default new OrganizationRepository();
