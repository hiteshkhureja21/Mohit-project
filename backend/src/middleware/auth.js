/**
 * Authentication Middleware
 * Validates incoming Bearer token against Supabase and attaches the authenticated user to req.user.
 * Rejects missing, arbitrary, or invalid tokens with HTTP 401 and code AUTH_REQUIRED.
 */

import { authService } from '../services/auth.service.js';
import { UnauthorizedError, ForbiddenError, ErrorCodes } from '../utils/errors.js';

export async function authMiddleware(req, res, next) {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return next(new UnauthorizedError(
      'Authentication required. Authorization header must be: Bearer <access_token>',
      ErrorCodes.AUTH_REQUIRED
    ));
  }

  const token = authHeader.split(' ')[1];
  if (!token || token.trim() === '') {
    return next(new UnauthorizedError(
      'Access token cannot be empty.',
      ErrorCodes.AUTH_REQUIRED
    ));
  }

  const verification = await authService.verifyToken(token.trim());

  if (!verification.success) {
    return next(new UnauthorizedError(
      verification.message || 'Invalid or expired authentication token.',
      ErrorCodes.AUTH_REQUIRED
    ));
  }

  // Attach verified user and token
  req.user = verification.user;
  req.token = token.trim();

  next();
}

/**
 * Role-based authorization middleware
 */
export function requireRole(...allowedRoles) {
  return (req, res, next) => {
    if (!req.user) {
      return next(new UnauthorizedError('Authentication required.', ErrorCodes.AUTH_REQUIRED));
    }

    if (allowedRoles.length > 0 && !allowedRoles.includes(req.user.role)) {
      return next(new ForbiddenError(
        `Access denied. Requires one of the following roles: ${allowedRoles.join(', ')}`,
        ErrorCodes.ACCESS_DENIED
      ));
    }

    next();
  };
}

export default authMiddleware;
