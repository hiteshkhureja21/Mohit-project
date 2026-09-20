/**
 * Authentication Controller
 * Handles auth verification, login proxy, session retrieval, and profile updates.
 */

import { getSupabaseClient, isSupabaseConfigured } from '../config/supabase.js';
import { env } from '../config/env.js';
import { DEMO_ACCESS_TOKEN } from '../services/auth.service.js';
import { userProfile, updateUserProfile } from '../services/dataStore.js';

export class AuthController {
  /**
   * GET /api/auth/me
   * Returns current authenticated user from req.user
   */
  async getMe(req, res) {
    return res.json({
      success: true,
      data: req.user,
      message: 'Authenticated user profile retrieved.',
      timestamp: new Date().toISOString()
    });
  }

  /**
   * GET /api/auth/session
   * Validates active session
   */
  async getSession(req, res) {
    return res.json({
      success: true,
      data: {
        user: req.user
      },
      message: 'Active session is valid.',
      timestamp: new Date().toISOString()
    });
  }

  /**
   * POST /api/auth/login
   * Supports Supabase Auth or explicit DEMO_MODE login
   */
  async login(req, res) {
    const { email, password } = req.body || {};

    // 1. Production Supabase Auth flow
    if (isSupabaseConfigured()) {
      const supabase = getSupabaseClient();
      if (!email || !password) {
        return res.status(400).json({
          success: false,
          error: { code: 'BAD_REQUEST', message: 'Email and password are required.' },
          timestamp: new Date().toISOString()
        });
      }

      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password
      });

      if (error || !data?.session) {
        const isNetworkErr = error?.message?.includes('fetch failed') || error?.status === 0;
        const statusCode = isNetworkErr ? 502 : 401;
        const code = isNetworkErr ? 'SUPABASE_UNREACHABLE' : 'INVALID_CREDENTIALS';
        const msg = isNetworkErr
          ? `Unable to connect to Supabase Auth at ${env.SUPABASE_URL}. Network or DNS resolution failed.`
          : (error?.message || 'Invalid credentials.');
        return res.status(statusCode).json({
          success: false,
          error: { code, message: msg },
          timestamp: new Date().toISOString()
        });
      }

      const supaUser = data.user;
      const user = {
        id: supaUser.id,
        email: supaUser.email,
        role: supaUser.user_metadata?.role || 'Reviewer',
        name: supaUser.user_metadata?.name || supaUser.email.split('@')[0],
        designation: supaUser.user_metadata?.designation || 'Verification Specialist',
        avatar: (supaUser.user_metadata?.name || 'SF').slice(0, 2).toUpperCase(),
        isDemo: false
      };

      return res.json({
        success: true,
        data: {
          user,
          token: data.session.access_token,
          refreshToken: data.session.refresh_token
        },
        message: 'Login successful via Supabase Auth.',
        timestamp: new Date().toISOString()
      });
    }

    // 2. Controlled DEMO_MODE fallback
    if (env.DEMO_MODE) {
      const updated = updateUserProfile({
        email: email || userProfile.email,
        lastActive: new Date().toISOString()
      });

      return res.json({
        success: true,
        data: {
          user: {
            ...updated,
            isDemo: true
          },
          token: DEMO_ACCESS_TOKEN
        },
        message: 'Login successful (DEMO_MODE).',
        timestamp: new Date().toISOString()
      });
    }

    return res.status(503).json({
      success: false,
      error: { code: 'SERVICE_UNAVAILABLE', message: 'Supabase authentication is not configured.' },
      timestamp: new Date().toISOString()
    });
  }

  /**
   * POST /api/auth/logout
   */
  async logout(req, res) {
    if (isSupabaseConfigured()) {
      const supabase = getSupabaseClient();
      try {
        await supabase.auth.signOut();
      } catch {}
    }

    return res.json({
      success: true,
      data: null,
      message: 'Logged out successfully.',
      timestamp: new Date().toISOString()
    });
  }

  /**
   * GET /api/users/me
   */
  async getProfile(req, res) {
    return res.json({
      success: true,
      data: req.user,
      message: 'User profile retrieved.',
      timestamp: new Date().toISOString()
    });
  }

  /**
   * PATCH /api/users/me
   */
  async updateProfile(req, res) {
    if (isSupabaseConfigured()) {
      const supabase = getSupabaseClient();
      const { name, role, designation } = req.body || {};
      const { data, error } = await supabase.auth.updateUser({
        data: { name, role, designation }
      });

      if (error) {
        return res.status(400).json({
          success: false,
          error: { code: 'UPDATE_FAILED', message: error.message },
          timestamp: new Date().toISOString()
        });
      }

      return res.json({
        success: true,
        data: {
          ...req.user,
          ...data.user.user_metadata
        },
        message: 'Profile updated in Supabase.',
        timestamp: new Date().toISOString()
      });
    }

    // Demo mode fallback
    const updated = updateUserProfile(req.body);
    return res.json({
      success: true,
      data: {
        ...updated,
        isDemo: true
      },
      message: 'Profile updated (DEMO_MODE).',
      timestamp: new Date().toISOString()
    });
  }
}

export const authController = new AuthController();
