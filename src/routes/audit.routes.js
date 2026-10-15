import { Router } from 'express';
import auditController from '../controllers/audit.controller.js';
import authenticateToken from '../middlewares/auth.js';
import uploadMiddleware from '../middlewares/upload.js';

const router = Router();

// Protect all audit endpoints with JWT authentication
router.use(authenticateToken);

// Upload document and execute Google Gemini AI audit immediately
router.post('/upload', uploadMiddleware.single('document'), auditController.uploadDocument);

// Trigger AI audit analysis on an existing document
router.post('/:documentId/analyze', auditController.triggerAudit);

// Get audit report by audit ID
router.get('/:id', auditController.getAuditReport);

// Get audit report by document ID
router.get('/document/:documentId', auditController.getAuditByDocumentId);

// Get list of audit reports for an organization
router.get('/organization/:orgId', auditController.getOrganizationAudits);

export default router;
