/**
 * Authentication Service
 * Manages Supabase Auth lifecycle, session persistence, and role switching.
 * Integrates directly with Supabase client when configured, with controlled DEMO_MODE fallback.
 */

import { UserSession, UserRole } from '../types/user';
import { supabase, isSupabaseConfigured, isDemoMode } from '../config/supabase';
import { createApiResponse, ApiResponse, apiClient } from './api';

const AUTH_STORAGE_KEY = 'sourceflow_auth_session';

export const defaultUserSession: UserSession = {
  id: 'USR-802',
  name: 'K. Varma',
  email: 'operator@sourceflow.demo',
  role: 'Reviewer',
  designation: 'Content Verification Specialist',
  department: 'Content Verification Operations',
  avatar: 'KV',
  isDemo: true,
  lastActive: new Date().toISOString()
};

export class AuthService {
  private currentSession: UserSession | null = null;
  private authStateListeners: Array<(session: UserSession | null) => void> = [];

  constructor() {
    this.initSessionListener();
  }

  private initSessionListener() {
    // 1. Listen to real Supabase auth state changes if configured
    if (isSupabaseConfigured() && supabase) {
      supabase.auth.onAuthStateChange((event, session) => {
        if (session?.user) {
          const supaUser = session.user;
          const userSession: UserSession = {
            id: supaUser.id,
            name: supaUser.user_metadata?.name || supaUser.email?.split('@')[0] || 'User',
            email: supaUser.email || '',
            role: (supaUser.user_metadata?.role as UserRole) || 'Reviewer',
            designation: supaUser.user_metadata?.designation || 'Content Verification Specialist',
            department: supaUser.user_metadata?.department || 'Operations',
            avatar: (supaUser.user_metadata?.name || 'SF').slice(0, 2).toUpperCase(),
            sessionToken: session.access_token,
            isDemo: false,
            lastActive: new Date().toISOString()
          };
          this.currentSession = userSession;
          this.persistSession(userSession);
          this.notifyListeners(userSession);
        } else if (event === 'SIGNED_OUT') {
          this.currentSession = null;
          this.clearPersistedSession();
          this.notifyListeners(null);
        }
      });
    } else {
      // 2. Load persisted demo session if in DEMO_MODE
      this.loadPersistedSession();
    }
  }

  public onAuthStateChanged(listener: (session: UserSession | null) => void): () => void {
    this.authStateListeners.push(listener);
    return () => {
      this.authStateListeners = this.authStateListeners.filter(l => l !== listener);
    };
  }

  private notifyListeners(session: UserSession | null) {
    this.authStateListeners.forEach(fn => fn(session));
  }

  private loadPersistedSession(): UserSession | null {
    try {
      const stored = localStorage.getItem(AUTH_STORAGE_KEY) || sessionStorage.getItem(AUTH_STORAGE_KEY);
      if (stored) {
        this.currentSession = JSON.parse(stored);
        return this.currentSession;
      }
    } catch {
      this.currentSession = null;
    }
    return null;
  }

  private persistSession(session: UserSession, rememberMe = true) {
    try {
      const json = JSON.stringify(session);
      if (rememberMe) {
        localStorage.setItem(AUTH_STORAGE_KEY, json);
      } else {
        sessionStorage.setItem(AUTH_STORAGE_KEY, json);
      }
    } catch {}
  }

  private clearPersistedSession() {
    try {
      localStorage.removeItem(AUTH_STORAGE_KEY);
      sessionStorage.removeItem(AUTH_STORAGE_KEY);
    } catch {}
  }

  isAuthenticated(): boolean {
    return this.currentSession !== null;
  }

  async getAccessToken(): Promise<string | null> {
    if (isSupabaseConfigured() && supabase) {
      try {
        const { data } = await supabase.auth.getSession();
        if (data?.session?.access_token) {
          return data.session.access_token;
        }
      } catch {}
    }

    if (this.currentSession?.sessionToken) {
      return this.currentSession.sessionToken;
    }

    return null;
  }

  /**
   * Fetches the current authenticated user profile from GET /api/auth/me
   */
  async getMe(): Promise<ApiResponse<UserSession>> {
    const res = await apiClient.get<UserSession>('/auth/me');
    if (res.success && res.data) {
      this.currentSession = res.data;
      this.persistSession(res.data);
    }
    return res;
  }

  /**
   * Sign in using Supabase Auth or controlled DEMO_MODE login
   */
  async login(email: string, password?: string, rememberMe = true): Promise<ApiResponse<UserSession>> {
    // 1. Real Supabase Auth Flow
    if (isSupabaseConfigured() && supabase) {
      if (!password) {
        return {
          success: false,
          data: defaultUserSession,
          error: 'Password is required for production authentication.'
        };
      }

      try {
        const { data, error } = await supabase.auth.signInWithPassword({
          email,
          password
        });

        if (error || !data?.session || !data?.user) {
          const rawMsg = error?.message || 'Invalid email or password.';
          const friendlyError = rawMsg === 'Failed to fetch'
            ? `Unable to connect to Supabase Auth at ${import.meta.env.VITE_SUPABASE_URL || 'configured URL'} (Failed to fetch). Verify your Supabase project URL and network connectivity.`
            : rawMsg;
          return {
            success: false,
            data: defaultUserSession,
            error: friendlyError
          };
        }

        const supaUser = data.user;
        const session: UserSession = {
          id: supaUser.id,
          name: supaUser.user_metadata?.name || email.split('@')[0],
          email: supaUser.email || email,
          role: (supaUser.user_metadata?.role as UserRole) || 'Reviewer',
          designation: supaUser.user_metadata?.designation || 'Verification Specialist',
          department: supaUser.user_metadata?.department || 'Operations',
          avatar: (supaUser.user_metadata?.name || 'SF').slice(0, 2).toUpperCase(),
          sessionToken: data.session.access_token,
          isDemo: false,
          lastActive: new Date().toISOString()
        };

        this.currentSession = session;
        this.persistSession(session, rememberMe);
        this.notifyListeners(session);

        return createApiResponse(session, 'Login successful via Supabase Auth');
      } catch (err: any) {
        const rawMsg = err?.message || 'Authentication error.';
        const friendlyError = rawMsg.includes('fetch')
          ? `Unable to connect to Supabase Auth at ${import.meta.env.VITE_SUPABASE_URL || 'configured URL'} (Failed to fetch). Verify your Supabase project URL and network connectivity.`
          : rawMsg;
        return {
          success: false,
          data: defaultUserSession,
          error: friendlyError
        };
      }
    }

    // 2. Controlled DEMO_MODE Flow
    if (isDemoMode()) {
      try {
        const apiRes = await apiClient.post<any>('/auth/login', { email, password });
        if (apiRes.success && apiRes.data?.user) {
          const demoSession: UserSession = {
            ...apiRes.data.user,
            sessionToken: apiRes.data.token,
            isDemo: true
          };

          this.currentSession = demoSession;
          this.persistSession(demoSession, rememberMe);
          this.notifyListeners(demoSession);

          return createApiResponse(demoSession, 'Logged in (DEMO_MODE)');
        }
      } catch {}

      // Local fallback for offline demo development if backend is not yet started
      const localDemoSession: UserSession = {
        ...defaultUserSession,
        email: email || defaultUserSession.email,
        sessionToken: 'demo-session-sourceflow-operator',
        isDemo: true,
        lastActive: new Date().toISOString()
      };
      this.currentSession = localDemoSession;
      this.persistSession(localDemoSession, rememberMe);
      this.notifyListeners(localDemoSession);
      return createApiResponse(localDemoSession, 'Logged in (DEMO_MODE)');
    }

    return {
      success: false,
      data: defaultUserSession,
      error: 'Authentication service unavailable.'
    };
  }

  /**
   * Logs out the user from Supabase and the backend
   */
  async logout(): Promise<ApiResponse<boolean>> {
    if (isSupabaseConfigured() && supabase) {
      try {
        await supabase.auth.signOut();
      } catch {}
    }

    try {
      await apiClient.post('/auth/logout', {});
    } catch {}

    this.currentSession = null;
    this.clearPersistedSession();
    this.notifyListeners(null);

    return createApiResponse(true, 'Logged out successfully');
  }

  /**
   * Retrieves active session, verifying against Supabase or backend
   */
  async getSession(): Promise<ApiResponse<UserSession | null>> {
    // 1. Supabase Session Check
    if (isSupabaseConfigured() && supabase) {
      try {
        const { data, error } = await supabase.auth.getSession();
        if (!error && data?.session?.user) {
          const supaUser = data.session.user;
          const session: UserSession = {
            id: supaUser.id,
            name: supaUser.user_metadata?.name || supaUser.email?.split('@')[0] || 'User',
            email: supaUser.email || '',
            role: (supaUser.user_metadata?.role as UserRole) || 'Reviewer',
            designation: supaUser.user_metadata?.designation || 'Verification Specialist',
            department: supaUser.user_metadata?.department || 'Operations',
            avatar: (supaUser.user_metadata?.name || 'SF').slice(0, 2).toUpperCase(),
            sessionToken: data.session.access_token,
            isDemo: false,
            lastActive: new Date().toISOString()
          };
          this.currentSession = session;
          this.persistSession(session);
          return createApiResponse(session);
        }
      } catch {}
      return createApiResponse(null);
    }

    // 2. Demo Mode Session Check (Only when VITE_DEMO_MODE is true)
    if (isDemoMode()) {
      if (!this.currentSession) {
        this.loadPersistedSession();
      }

      if (!this.currentSession) {
        return createApiResponse(null);
      }

      // Verify token validity with backend GET /api/auth/me
      try {
        const meRes = await apiClient.get<UserSession>('/auth/me');
        if (meRes.success && meRes.data) {
          this.currentSession = {
            ...meRes.data,
            sessionToken: this.currentSession.sessionToken
          };
          return createApiResponse(this.currentSession);
        }
      } catch {
        // If backend rejected the token (401), clear invalid session
        this.currentSession = null;
        this.clearPersistedSession();
        return createApiResponse(null);
      }

      return createApiResponse(this.currentSession);
    }

    return createApiResponse(null);
  }

  async switchRole(role: UserRole): Promise<ApiResponse<UserSession>> {
    const designationMap: Record<UserRole, string> = {
      'Owner': 'Platform Sovereignty & Organization Owner',
      'Admin': 'Enterprise Workspace Administrator',
      'Reviewer': 'Content Verification Specialist',
      'Editor': 'Intelligence Generation Editor',
      'Viewer': 'Auditor & Compliance Observer',
      'Content Operator': 'Content Upload & Intelligence Operator',
      'Approver': 'Principal Content Approver'
    };

    const updatedSession: UserSession = {
      ...(this.currentSession || defaultUserSession),
      role,
      designation: designationMap[role] || 'Content Verification Specialist',
      lastActive: new Date().toISOString()
    };

    this.currentSession = updatedSession;
    this.persistSession(updatedSession);

    // Synchronize to backend PATCH /api/users/me
    try {
      await apiClient.patch('/users/me', { role, designation: updatedSession.designation });
    } catch {}

    return createApiResponse(updatedSession, `Switched role to ${role}`);
  }
}

export const authService = new AuthService();
