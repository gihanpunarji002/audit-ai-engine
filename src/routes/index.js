import { Router } from 'express';
import healthRoutes from './health.routes.js';
import authRoutes from './auth.routes.js';
import userRoutes from './user.routes.js';
import organizationRoutes from './organization.routes.js';
import auditRoutes from './audit.routes.js';
import documentRoutes from './document.routes.js';
import ragRoutes from './rag.routes.js';

const router = Router();

// Mount individual feature routers
router.use('/health', healthRoutes);
router.use('/auth', authRoutes);
router.use('/users', userRoutes);
router.use('/organizations', organizationRoutes);
router.use('/audits', auditRoutes);
router.use('/documents', documentRoutes);
router.use('/rag', ragRoutes);

export default router;
