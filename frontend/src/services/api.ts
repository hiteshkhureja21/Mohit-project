/**
 * Central API Client
 * Provides a clean, conventional fetch wrapper for HTTP requests with Bearer token authentication.
 */

import { API_URL } from '../config/api';
import { isDemoMode } from '../config/supabase';

export interface ApiResponse<T> {
  success: boolean;
  data: T;
  message?: string;
  error?: string | { code?: string; message: string };
  timestamp?: string;
}

export const simulateDelay = (ms: number = 100): Promise<void> => {
  return new Promise(resolve => setTimeout(resolve, ms));
};

export const createApiResponse = <T>(data: T, message: string = 'Operation completed successfully'): ApiResponse<T> => ({
  success: true,
  data,
  message,
  timestamp: new Date().toISOString()
});

export const createApiError = <T>(error: string | { code?: string; message: string }, fallbackData: T): ApiResponse<T> => ({
  success: false,
  data: fallbackData,
  error: typeof error === 'string' ? error : error.message,
  timestamp: new Date().toISOString()
});

/**
 * Returns the Authorization header with Bearer token if logged in.
 * Never returns a fake or hardcoded fallback token.
 */
export function getAuthHeaders(): Record<string, string> {
  const headers: Record<string, string> = {};

  try {
    // 1. Check Supabase session from localStorage
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key && key.startsWith('sb-') && key.endsWith('-auth-token')) {
        const raw = localStorage.getItem(key);
        if (raw) {
          const item = JSON.parse(raw);
          if (item?.access_token) {
            headers['Authorization'] = `Bearer ${item.access_token}`;
            break;
          }
        }
      }
    }

    // 2. Check SourceFlow active session token if not already found
    if (!headers['Authorization']) {
      const sessionRaw = localStorage.getItem('sourceflow_auth_session') || sessionStorage.getItem('sourceflow_auth_session');
      if (sessionRaw) {
        const parsed = JSON.parse(sessionRaw);
        if (parsed?.sessionToken) {
          headers['Authorization'] = `Bearer ${parsed.sessionToken}`;
        }
      }
    }

    // 3. Attach active workspace ID if selected
    const activeWs = localStorage.getItem('sourceflow_active_workspace_id') || sessionStorage.getItem('sourceflow_active_workspace_id');
    if (activeWs) {
      headers['x-workspace-id'] = activeWs;
    }

    return headers;
  } catch (err) {
    console.warn('Could not read auth token from storage', err);
  }

  return {};
}

/**
 * Executes an HTTP request to the backend with standard JSON handling.
 */
export async function apiRequest<T = any>(
  endpoint: string,
  options: RequestInit = {},
  fallbackData?: T
): Promise<ApiResponse<T>> {
  let cleanEndpoint = endpoint.startsWith('/') ? endpoint : `/${endpoint}`;

  // Ensure /api prefix if not already present, so all services route to backend /api/* routes
  if (!cleanEndpoint.startsWith('/api/') && cleanEndpoint !== '/api') {
    cleanEndpoint = `/api${cleanEndpoint}`;
  }

  // Normalize base URL (strip trailing /api or slash to avoid duplication)
  const base = (API_URL || '').replace(/\/api\/?$/, '').replace(/\/+$/, '');
  const url = `${base}${cleanEndpoint}`;

  const headers: Record<string, string> = {
    'Accept': 'application/json',
    ...getAuthHeaders(),
    ...((options.headers as Record<string, string>) || {})
  };

  // Do not set Content-Type for FormData so browser computes multipart boundary
  const isFormData = typeof FormData !== 'undefined' && options.body instanceof FormData;
  if (!isFormData && !headers['Content-Type']) {
    headers['Content-Type'] = 'application/json';
  }

  try {
    const response = await fetch(url, {
      ...options,
      headers
    });

    let responseData: any;
    const contentType = response.headers.get('content-type');
    if (contentType && contentType.includes('application/json')) {
      responseData = await response.json();
    } else {
      const text = await response.text();
      responseData = { message: text };
    }

    if (!response.ok) {
      const message =
        responseData?.error?.message ||
        responseData?.message ||
        `Request failed with status ${response.status}`;
      throw new Error(message);
    }

    if (responseData && typeof responseData === 'object' && 'success' in responseData) {
      return responseData as ApiResponse<T>;
    }

    return createApiResponse<T>(responseData as T);
  } catch (err: any) {
    if (isDemoMode() && fallbackData !== undefined) {
      console.warn(`[DEMO_MODE] Mock fallback served for ${cleanEndpoint}:`, err?.message);
      return createApiResponse<T>(fallbackData);
    }
    // Network failure (e.g. backend offline or port mismatch)
    if (err?.name === 'TypeError' && err?.message?.includes('fetch')) {
      throw new Error(`Failed to connect to backend server at ${url}. Check if backend is running on port 5000.`);
    }
    // Production / Non-demo mode: throw real error so UI displays failure accurately
    throw err;
  }
}

/**
 * Clean HTTP helper methods
 */
export const api = {
  get: <T>(endpoint: string, fallbackData?: T) =>
    apiRequest<T>(endpoint, { method: 'GET' }, fallbackData),
  post: <T>(endpoint: string, body?: any, fallbackData?: T) =>
    apiRequest<T>(
      endpoint,
      {
        method: 'POST',
        body: body instanceof FormData ? body : (body ? JSON.stringify(body) : undefined)
      },
      fallbackData
    ),
  patch: <T>(endpoint: string, body?: any, fallbackData?: T) =>
    apiRequest<T>(
      endpoint,
      {
        method: 'PATCH',
        body: body ? JSON.stringify(body) : undefined
      },
      fallbackData
    ),
  delete: <T>(endpoint: string, fallbackData?: T) =>
    apiRequest<T>(endpoint, { method: 'DELETE' }, fallbackData),
  upload: <T>(endpoint: string, formData: FormData, fallbackData?: T) =>
    apiRequest<T>(
      endpoint,
      {
        method: 'POST',
        body: formData
      },
      fallbackData
    )
};

// Export apiClient alias for backwards compatibility
export const apiClient = api;
