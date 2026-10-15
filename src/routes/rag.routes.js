import { Router } from 'express';
import ragController from '../controllers/rag.controller.js';
import authenticateToken from '../middlewares/auth.js';
import validateBody from '../middlewares/validate.js';

const router = Router();

// Validation rules
const queryValidation = {
  query: { required: true, type: 'string', minLength: 2, message: 'Query must be at least 2 characters long' },
};

// All RAG routes require authenticated user
router.use(authenticateToken);

// Document indexing
router.post('/documents/:documentId/index', ragController.indexDocument);

// Semantic Q&A queries
router.post('/organizations/:orgId/query', validateBody(queryValidation), ragController.queryOrganization);
router.post('/documents/:documentId/query', validateBody(queryValidation), ragController.queryDocument);

// Audit inquiry history & Cloud Firestore Vector status
router.get('/organizations/:orgId/history', ragController.getQueryHistory);
router.get('/organizations/:orgId/status', ragController.getVectorStatus);

export default router;
