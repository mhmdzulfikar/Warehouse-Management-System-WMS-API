import { Router } from 'express';
import { register, login, getMe } from '../controllers/authController';
import { validateRequest } from '../middlewares/validateRequest';
import { checkIsLoggedIn } from '../middlewares/authMiddleware';
import { registerSchema, loginSchema } from '../validations/authValidation';

const router = Router();

// 1. POST /api/auth/register -> Register a new user
router.post('/register', validateRequest(registerSchema), register);

// 2. POST /api/auth/login -> Login with username/email and password
router.post('/login', validateRequest(loginSchema), login);

// 3. GET /api/auth/me -> Get current authenticated user profile
router.get('/me', checkIsLoggedIn, getMe);

export default router;
