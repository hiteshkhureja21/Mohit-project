/**
 * Auth & User Profile Routes
 * Endpoints:
 * - GET   /api/auth/me
 * - GET   /api/auth/session
 * - POST  /api/auth/login
 * - POST  /api/auth/logout
 * - GET   /api/users/me
 * - PATCH /api/users/me
 */

import { Router } from 'express';
import { authMiddleware } from '../middleware/auth.js';
import { authController } from '../controllers/auth.controller.js';

export const authRouter = Router();

// GET /api/auth/me & /auth/me - Protected session check
authRouter.get(['/auth/me', '/api/auth/me'], authMiddleware, (req, res) => authController.getMe(req, res));

// GET /api/auth/session & /auth/session - Session validation
authRouter.get(['/auth/session', '/api/auth/session'], authMiddleware, (req, res) => authController.getSession(req, res));

// POST /api/auth/login & /auth/login
authRouter.post(['/auth/login', '/api/auth/login'], (req, res) => authController.login(req, res));

// POST /api/auth/logout & /auth/logout
authRouter.post(['/auth/logout', '/api/auth/logout'], (req, res) => authController.logout(req, res));

// GET /api/users/me & /users/me - Protected profile check
authRouter.get(['/users/me', '/api/users/me'], authMiddleware, (req, res) => authController.getProfile(req, res));

// PATCH /api/users/me & /users/me - Protected profile update
authRouter.patch(['/users/me', '/api/users/me'], authMiddleware, (req, res) => authController.updateProfile(req, res));
