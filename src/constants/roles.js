/**
 * Application Role Definitions
 */

export const SystemRole = Object.freeze({
  SUPERADMIN: 'superadmin',
  AUDITOR: 'auditor',
  USER: 'user',
});

export const OrganizationRole = Object.freeze({
  OWNER: 'owner',
  ADMIN: 'admin',
  AUDITOR: 'auditor',
  MEMBER: 'member',
});

export const InvitationStatus = Object.freeze({
  PENDING: 'pending',
  ACCEPTED: 'accepted',
  REJECTED: 'rejected',
  EXPIRED: 'expired',
});

export default {
  SystemRole,
  OrganizationRole,
  InvitationStatus,
};
