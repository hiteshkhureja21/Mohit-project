/**
 * Backend Authentication Service
 * Verifies Supabase JWT access tokens and resolves user identities.
 * Enforces production security:
 * - Supabase token verification only
 * - Zero tolerance for fake or arbitrary tokens in production or when DEMO_MODE=false
 */

import { getSupabaseClient, isSupabaseConfigured } from '../config/supabase.js';
import { env } from '../config/env.js';
import { userProfile } from './dataStore.js';

// Explicit demo access token constant used only when DEMO_MODE is active in local development
export const DEMO_ACCESS_TOKEN = 'demo-session-sourceflow-operator';

export class AuthService {
  /**
   * Verifies an access token against Supabase.
   * Rejects invalid, arbitrary, fake, or expired tokens.
   */
  async verifyToken(token) {
    if (!token || typeof token !== 'string' || token.trim() === '') {
      return {
        success: false,
        statusCode: 401,
        errorCode: 'UNAUTHORIZED',
        message: 'Authentication token is required.'
      };
    }

    const cleanToken = token.trim();
    const isProduction = env.NODE_ENV === 'production' || process.env.NODE_ENV === 'production';

    // 1. Strict rejection of synthetic/demo tokens in production or when DEMO_MODE is disabled
    if (isProduction || !env.DEMO_MODE) {
      if (
        cleanToken.startsWith('demo-session-') ||
        cleanToken.startsWith('fake-') ||
        cleanToken.startsWith('mock-') ||
        cleanToken.startsWith('SEC-SESSION') ||
        cleanToken.startsWith('sec-session')
      ) {
        return {
          success: false,
          statusCode: 401,
          errorCode: 'INVALID_TOKEN',
          message: 'Invalid authentication token. Synthetic tokens are strictly rejected.'
        };
      }
    }

    const supabase = getSupabaseClient();

    // 2. Real Supabase Auth verification
    if (isSupabaseConfigured() && supabase && !(cleanToken.startsWith('demo-session-') && env.DEMO_MODE)) {
      try {
        const { data, error } = await supabase.auth.getUser(cleanToken);

        if (error || !data?.user) {
          return {
            success: false,
            statusCode: 401,
            errorCode: 'INVALID_TOKEN',
            message: error?.message || 'Invalid or expired Supabase authentication token.'
          };
        }

        const supaUser = data.user;
        const user = {
          id: supaUser.id,
          email: supaUser.email,
          role: supaUser.user_metadata?.role || supaUser.app_metadata?.role || 'Reviewer',
          name: supaUser.user_metadata?.name || supaUser.email?.split('@')[0] || 'SourceFlow User',
          designation: supaUser.user_metadata?.designation || 'Verification Specialist',
          avatar: (supaUser.user_metadata?.name || 'SF').slice(0, 2).toUpperCase(),
          isDemo: false
        };

        return {
          success: true,
          user
        };
      } catch (err) {
        return {
          success: false,
          statusCode: 401,
          errorCode: 'VERIFICATION_FAILED',
          message: 'Failed to verify token with Supabase.'
        };
      }
    }

    // 3. Controlled DEMO_MODE fallback (Only if strictly in local non-production development with DEMO_MODE=true)
    if (!isProduction && env.DEMO_MODE) {
      if (cleanToken === DEMO_ACCESS_TOKEN) {
        return {
          success: true,
          user: {
            ...userProfile,
            id: 'USR-802',
            role: 'Owner',
            isDemo: true
          }
        };
      }

      if (cleanToken === 'demo-session-sourceflow-editor') {
        return {
          success: true,
          user: {
            id: 'USR-EDITOR-1',
            name: 'Elena Rostova',
            email: 'editor@sourceflow.demo',
            role: 'Editor',
            isDemo: true
          }
        };
      }

      if (cleanToken === 'demo-session-sourceflow-viewer') {
        return {
          success: true,
          user: {
            id: 'USR-VIEWER-1',
            name: 'Marcus Vance',
            email: 'viewer@sourceflow.demo',
            role: 'Viewer',
            isDemo: true
          }
        };
      }

      if (cleanToken === 'demo-session-sourceflow-user-b') {
        return {
          success: true,
          user: {
            id: 'USR-USER-B',
            name: 'User B',
            email: 'userb@external.demo',
            role: 'Owner',
            isDemo: true
          }
        };
      }

      // Explicitly reject any arbitrary or unknown Bearer token in demo mode
      return {
        success: false,
        statusCode: 401,
        errorCode: 'INVALID_TOKEN',
        message: 'Invalid session token. Arbitrary tokens are rejected.'
      };
    }

    // 4. Supabase is not configured or token cannot be verified
    return {
      success: false,
      statusCode: 401,
      errorCode: 'INVALID_TOKEN',
      message: 'Invalid authentication token. Supabase verification failed.'
    };
  }
}

export const authService = new AuthService();
