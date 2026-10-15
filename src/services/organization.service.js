import crypto from 'crypto';
import organizationRepository from '../repositories/organization.repository.js';
import userRepository from '../repositories/user.repository.js';
import ApiError from '../utils/ApiError.js';
import { OrganizationRole, InvitationStatus } from '../constants/roles.js';

class OrganizationService {
  /**
   * Helper: Generate a URL-friendly slug from an organization name
   * @param {string} name 
   * @returns {string} slug
   */
  generateSlug(name) {
    const baseSlug = name
      .toLowerCase()
      .trim()
      .replace(/[^\w\s-]/g, '')
      .replace(/[\s_-]+/g, '-')
      .replace(/^-+|-+$/g, '');

    const randomSuffix = crypto.randomBytes(3).toString('hex');
    return `${baseSlug}-${randomSuffix}`;
  }

  /**
   * Create an organization with user as OWNER
   * @param {Object} data 
   */
  async createOrganization({ name, description, userId }) {
    if (!name || name.trim().length === 0) {
      throw ApiError.badRequest('Organization name is required');
    }

    const slug = this.generateSlug(name);
    const org = await organizationRepository.createWithInitialOwner({
      name: name.trim(),
      slug,
      description: description?.trim() || null,
      owner_id: userId,
    });

    return org;
  }

  /**
   * Get all organizations the user belongs to
   * @param {number|string} userId 
   */
  async getUserOrganizations(userId) {
    return organizationRepository.findUserOrganizations(userId);
  }

  /**
   * Get organization by ID with membership check
   * @param {number|string} orgId 
   * @param {number|string} userId 
   */
  async getOrganizationById(orgId, userId) {
    const membership = await organizationRepository.findMember(orgId, userId);
    if (!membership) {
      throw ApiError.forbidden('You do not have access to this organization');
    }

    const org = await organizationRepository.findById(orgId);
    if (!org) {
      throw ApiError.notFound('Organization not found');
    }

    return {
      ...org,
      currentUserRole: membership.role,
    };
  }

  /**
   * List all members of an organization
   * @param {number|string} orgId 
   * @param {number|string} userId 
   */
  async getMembers(orgId, userId) {
    const membership = await organizationRepository.findMember(orgId, userId);
    if (!membership) {
      throw ApiError.forbidden('You do not have access to this organization');
    }

    return organizationRepository.findMembers(orgId);
  }

  /**
   * Invite a new member to an organization
   * @param {Object} inviteData 
   */
  async inviteMember({ orgId, email, role = OrganizationRole.MEMBER, inviterId }) {
    // 1. Verify inviter permissions (must be OWNER or ADMIN)
    const inviterMembership = await organizationRepository.findMember(orgId, inviterId);
    if (
      !inviterMembership ||
      ![OrganizationRole.OWNER, OrganizationRole.ADMIN].includes(inviterMembership.role)
    ) {
      throw ApiError.forbidden('Only organization owners and admins can invite new members');
    }

    const normalizedEmail = email.trim().toLowerCase();

    // 2. Check if user with email is already a member
    const existingUser = await userRepository.findByEmail(normalizedEmail);
    if (existingUser) {
      const existingMember = await organizationRepository.findMember(orgId, existingUser.id);
      if (existingMember) {
        throw ApiError.conflict('User is already a member of this organization');
      }
    }

    // 3. Generate invitation token & expiration (7 days)
    const token = crypto.randomBytes(32).toString('hex');
    const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);

    const invitation = await organizationRepository.createInvitation({
      organization_id: orgId,
      email: normalizedEmail,
      role,
      token,
      expires_at: expiresAt,
      invited_by: inviterId,
    });

    return {
      invitation,
      invitationUrl: `/invite/accept?token=${token}`,
    };
  }

  /**
   * Add a member directly to an organization by user email/ID (internal/admin)
   * @param {Object} data 
   */
  async addMemberDirectly({ orgId, email, role = OrganizationRole.MEMBER, requesterId }) {
    const requesterMembership = await organizationRepository.findMember(orgId, requesterId);
    if (
      !requesterMembership ||
      ![OrganizationRole.OWNER, OrganizationRole.ADMIN].includes(requesterMembership.role)
    ) {
      throw ApiError.forbidden('Only organization owners and admins can add members directly');
    }

    const targetUser = await userRepository.findByEmail(email.trim().toLowerCase());
    if (!targetUser) {
      throw ApiError.notFound(`No registered user found with email '${email}'`);
    }

    const existingMember = await organizationRepository.findMember(orgId, targetUser.id);
    if (existingMember) {
      throw ApiError.conflict('User is already a member of this organization');
    }

    const newMember = await organizationRepository.addMember({
      organization_id: orgId,
      user_id: targetUser.id,
      role,
    });

    return {
      ...newMember,
      user: targetUser,
    };
  }

  /**
   * Accept an invitation using the unique token
   * @param {Object} acceptData 
   */
  async acceptInvitation({ token, userId }) {
    const invitation = await organizationRepository.findInvitationByToken(token);
    if (!invitation) {
      throw ApiError.notFound('Invalid or non-existent invitation token');
    }

    if (invitation.status !== InvitationStatus.PENDING) {
      throw ApiError.badRequest(`This invitation has already been ${invitation.status}`);
    }

    if (new Date(invitation.expires_at) < new Date()) {
      await organizationRepository.updateInvitationStatus(invitation.id, InvitationStatus.EXPIRED);
      throw ApiError.badRequest('This invitation has expired. Please ask for a new invite.');
    }

    const user = await userRepository.findById(userId);
    if (!user) {
      throw ApiError.notFound('User not found');
    }

    // Check if already a member
    const existingMember = await organizationRepository.findMember(invitation.organization_id, userId);
    if (existingMember) {
      await organizationRepository.updateInvitationStatus(invitation.id, InvitationStatus.ACCEPTED);
      return { message: 'You are already a member of this organization' };
    }

    // Add to members
    await organizationRepository.addMember({
      organization_id: invitation.organization_id,
      user_id: userId,
      role: invitation.role,
    });

    // Mark invitation as accepted
    await organizationRepository.updateInvitationStatus(invitation.id, InvitationStatus.ACCEPTED);

    return {
      message: 'Successfully joined organization',
      organizationId: invitation.organization_id,
      role: invitation.role,
    };
  }

  /**
   * Update member role in organization
   * @param {Object} updateData 
   */
  async updateMemberRole({ orgId, targetUserId, newRole, requesterId }) {
    const requesterMembership = await organizationRepository.findMember(orgId, requesterId);
    if (!requesterMembership || requesterMembership.role !== OrganizationRole.OWNER) {
      throw ApiError.forbidden('Only organization owners can change member roles');
    }

    if (String(targetUserId) === String(requesterId)) {
      throw ApiError.badRequest('Owners cannot alter their own role directly');
    }

    const targetMembership = await organizationRepository.findMember(orgId, targetUserId);
    if (!targetMembership) {
      throw ApiError.notFound('Member not found in this organization');
    }

    return organizationRepository.updateMemberRole(orgId, targetUserId, newRole);
  }

  /**
   * Remove member from organization
   * @param {Object} removeData 
   */
  async removeMember({ orgId, targetUserId, requesterId }) {
    const requesterMembership = await organizationRepository.findMember(orgId, requesterId);
    if (
      !requesterMembership ||
      ![OrganizationRole.OWNER, OrganizationRole.ADMIN].includes(requesterMembership.role)
    ) {
      throw ApiError.forbidden('Only owners and admins can remove members');
    }

    const targetMembership = await organizationRepository.findMember(orgId, targetUserId);
    if (!targetMembership) {
      throw ApiError.notFound('Member not found in this organization');
    }

    if (targetMembership.role === OrganizationRole.OWNER) {
      throw ApiError.badRequest('Cannot remove the organization owner');
    }

    await organizationRepository.removeMember(orgId, targetUserId);
    return { message: 'Member removed successfully' };
  }

  /**
   * Get pending invitations for an organization
   * @param {number|string} orgId 
   * @param {number|string} userId 
   */
  async getPendingInvitations(orgId, userId) {
    const requesterMembership = await organizationRepository.findMember(orgId, userId);
    if (
      !requesterMembership ||
      ![OrganizationRole.OWNER, OrganizationRole.ADMIN].includes(requesterMembership.role)
    ) {
      throw ApiError.forbidden('Access denied');
    }

    return organizationRepository.findPendingInvitations(orgId);
  }
}

export default new OrganizationService();
