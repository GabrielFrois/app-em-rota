import { Router } from 'express';
import { register, login, refreshToken, me, searchUsers, savePushToken, removePushToken } from '../controllers/authController';
import { authMiddleware } from '../middleware/auth';
import { authLimiter, searchLimiter } from '../middleware/rateLimiter';

const router = Router();

router.post('/register',     authLimiter,  register);
router.post('/login',        authLimiter,  login);
router.post('/refresh',      authLimiter,  refreshToken);
router.get('/me',            authMiddleware, me);
router.get('/search',        authMiddleware, searchLimiter, searchUsers);
router.post('/push-token',   authMiddleware, savePushToken);
router.delete('/push-token', authMiddleware, removePushToken);

export default router;