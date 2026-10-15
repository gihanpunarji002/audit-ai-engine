/**
 * Audit Status & Verdict Constants
 */

export const AuditStatus = Object.freeze({
  PENDING: 'pending',
  PROCESSING: 'processing',
  COMPLETED: 'completed',
  FAILED: 'failed',
});

export const AuthenticityVerdict = Object.freeze({
  AUTHENTIC: 'authentic',
  SUSPICIOUS: 'suspicious',
  FAKE: 'fake',
  SPAM: 'spam',
  UNDETERMINED: 'undetermined',
});

export const RiskLevel = Object.freeze({
  LOW: 'low',
  MEDIUM: 'medium',
  HIGH: 'high',
  CRITICAL: 'critical',
});

export const DocumentStatus = Object.freeze({
  UPLOADED: 'uploaded',
  PROCESSING: 'processing',
  AUDITED: 'audited',
  FAILED: 'failed',
});

export const FileType = Object.freeze({
  IMAGE: 'image',
  DOCUMENT: 'document',
  TEXT: 'text',
});

export default {
  AuditStatus,
  AuthenticityVerdict,
  RiskLevel,
  DocumentStatus,
  FileType,
};
