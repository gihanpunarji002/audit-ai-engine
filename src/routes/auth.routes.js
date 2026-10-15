import { Router } from 'express';
import authController from '../controllers/auth.controller.js';
import authenticateToken from '../middlewares/auth.js';
import validateBody from '../middlewares/validate.js';

const router = Router();

// Validation rules for registration
const registerValidation = {
  email: { required: true, type: 'string', message: 'Email address is required' },
  password: { required: true, minLength: 8, message: 'Password is required and must be at least 8 characters' },
  first_name: { required: true, type: 'string', minLength: 1, message: 'First name is required' },
  last_name: { required: true, type: 'string', minLength: 1, message: 'Last name is required' },
};

// Validation rules for login
const loginValidation = {
  email: { required: true, type: 'string', message: 'Email address is required' },
  password: { required: true, type: 'string', message: 'Password is required' },
};

// Public Authentication Endpoints
router.post('/register', validateBody(registerValidation), authController.register);
router.post('/login', validateBody(loginValidation), authController.login);

// Protected Authentication Endpoints
router.get('/me', authenticateToken, authController.getMe);
router.put('/profile', authenticateToken, authController.updateProfile);
router.post('/change-password', authenticateToken, authController.changePassword);

export default router;
