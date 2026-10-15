import { Router } from 'express';
import auditController from '../controllers/audit.controller.js';
import authenticateToken from '../middlewares/auth.js';

const router = Router();

// Protect all document endpoints with JWT authentication
router.use(authenticateToken);

// Single document endpoints
router.get('/:id', auditController.getDocumentById);
router.get('/:id/download', auditController.downloadDocument);

// Organization document collection
router.get('/organization/:orgId', auditController.getOrganizationDocuments);

export default router;
