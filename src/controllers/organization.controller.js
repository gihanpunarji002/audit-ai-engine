import organizationService from '../services/organization.service.js';
import ApiResponse from '../utils/ApiResponse.js';
import asyncHandler from '../utils/asyncHandler.js';
import HttpStatus from '../constants/httpStatus.js';

export class OrganizationController {
  /**
   * POST /api/v1/organizations
   * Create a new organization with the authenticated user as owner
   */
  createOrganization = asyncHandler(async (req, res) => {
    const { name, description } = req.body;
    const org = await organizationService.createOrganization({
      name,
      description,
      userId: req.user.id,
    });
    return res
      .status(HttpStatus.CREATED)
      .json(ApiResponse.created(org, 'Organization created successfully'));
  });

  /**
   * GET /api/v1/organizations
   * List all organizations the authenticated user belongs to
   */
  getUserOrganizations = asyncHandler(async (req, res) => {
    const orgs = await organizationService.getUserOrganizations(req.user.id);
    return res.json(ApiResponse.success(orgs, 'Organizations retrieved successfully'));
  });

  /**
   * GET /api/v1/organizations/:id
   * Get single organization details
   */
  getOrganizationById = asyncHandler(async (req, res) => {
    const { id } = req.params;
    const org = await organizationService.getOrganizationById(id, req.user.id);
    return res.json(ApiResponse.success(org, 'Organization retrieved successfully'));
  });

  /**
   * GET /api/v1/organizations/:id/members
   * List all members of an organization
   */
  getMembers = asyncHandler(async (req, res) => {
    const { id } = req.params;
    const members = await organizationService.getMembers(id, req.user.id);
    return res.json(ApiResponse.success(members, 'Organization members retrieved successfully'));
  });

  /**
   * POST /api/v1/organizations/:id/invitations
   * Send an invitation to join an organization
   */
  inviteMember = asyncHandler(async (req, res) => {
    const { id } = req.params;
    const { email, role } = req.body;
    const result = await organizationService.inviteMember({
      orgId: id,
      email,
      role,
      inviterId: req.user.id,
    });
    return res
      .status(HttpStatus.CREATED)
      .json(ApiResponse.created(result, 'Member invitation created successfully'));
  });

  /**
   * POST /api/v1/organizations/:id/members
   * Add a member directly by email
   */
  addMember = asyncHandler(async (req, res) => {
    const { id } = req.params;
    const { email, role } = req.body;
    const result = await organizationService.addMemberDirectly({
      orgId: id,
      email,
      role,
      requesterId: req.user.id,
    });
    return res
      .status(HttpStatus.CREATED)
      .json(ApiResponse.created(result, 'Member added successfully'));
  });

  /**
   * POST /api/v1/organizations/invitations/accept
   * Accept an invitation with token
   */
  acceptInvitation = asyncHandler(async (req, res) => {
    const { token } = req.body;
    const result = await organizationService.acceptInvitation({
      token,
      userId: req.user.id,
    });
    return res.json(ApiResponse.success(result, 'Invitation accepted successfully'));
  });

  /**
   * PUT /api/v1/organizations/:id/members/:userId
   * Update member role
   */
  updateMemberRole = asyncHandler(async (req, res) => {
    const { id, userId } = req.params;
    const { role } = req.body;
    const updated = await organizationService.updateMemberRole({
      orgId: id,
      targetUserId: userId,
      newRole: role,
      requesterId: req.user.id,
    });
    return res.json(ApiResponse.success(updated, 'Member role updated successfully'));
  });

  /**
   * DELETE /api/v1/organizations/:id/members/:userId
   * Remove member from organization
   */
  removeMember = asyncHandler(async (req, res) => {
    const { id, userId } = req.params;
    const result = await organizationService.removeMember({
      orgId: id,
      targetUserId: userId,
      requesterId: req.user.id,
    });
    return res.json(ApiResponse.success(result, 'Member removed successfully'));
  });

  /**
   * GET /api/v1/organizations/:id/invitations
   * List pending invitations
   */
  getPendingInvitations = asyncHandler(async (req, res) => {
    const { id } = req.params;
    const invites = await organizationService.getPendingInvitations(id, req.user.id);
    return res.json(ApiResponse.success(invites, 'Pending invitations retrieved successfully'));
  });
}

export default new OrganizationController();
