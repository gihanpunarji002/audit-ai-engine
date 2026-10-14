import { Router } from 'express';
import healthRoutes from './health.routes.js';
import userRoutes from './user.routes.js';

const router = Router();

// Mount individual feature routers
router.use('/health', healthRoutes);
router.use('/users', userRoutes);

export default router;
