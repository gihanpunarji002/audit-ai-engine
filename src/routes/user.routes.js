import { Router } from 'express';
import userController from '../controllers/user.controller.js';
import authenticateToken from '../middlewares/auth.js';
import authorizeRoles from '../middlewares/authorize.js';
import { SystemRole } from '../constants/roles.js';

const router = Router();

// Protect all admin user routes with JWT authentication & superadmin authorization
router.use(authenticateToken);
router.use(authorizeRoles(SystemRole.SUPERADMIN));

router.get('/', userController.getUsers);
router.get('/:id', userController.getUserById);
router.post('/', userController.createUser);
router.put('/:id', userController.updateUser);
router.delete('/:id', userController.deleteUser);

export default router;
