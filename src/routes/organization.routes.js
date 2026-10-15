import { Router } from 'express';
import organizationController from '../controllers/organization.controller.js';
import authenticateToken from '../middlewares/auth.js';
import validateBody from '../middlewares/validate.js';

const router = Router();

// Validation rules
const createOrgValidation = {
  name: { required: true, type: 'string', minLength: 2, message: 'Organization name is required (min 2 characters)' },
};

const inviteValidation = {
  email: { required: true, type: 'string', message: 'Valid recipient email is required' },
};

const acceptInviteValidation = {
  token: { required: true, type: 'string', message: 'Invitation token is required' },
};

// All organization routes require authenticated user
router.use(authenticateToken);

// Organization collection routes
router.post('/', validateBody(createOrgValidation), organizationController.createOrganization);
router.get('/', organizationController.getUserOrganizations);

// Accept invitation (can be called by any logged in user)
router.post('/invitations/accept', validateBody(acceptInviteValidation), organizationController.acceptInvitation);

// Single organization routes
router.get('/:id', organizationController.getOrganizationById);
router.get('/:id/members', organizationController.getMembers);
router.post('/:id/invitations', validateBody(inviteValidation), organizationController.inviteMember);
router.get('/:id/invitations', organizationController.getPendingInvitations);
router.post('/:id/members', validateBody(inviteValidation), organizationController.addMember);
router.put('/:id/members/:userId', organizationController.updateMemberRole);
router.delete('/:id/members/:userId', organizationController.removeMember);

export default router;
