/**
 * Central API Configuration for SourceFlow Frontend
 * Uses VITE_API_URL environment variable.
 * Fallback to empty string for relative paths in development/production proxies.
 */
export const API_URL: string = import.meta.env.VITE_API_URL || '';

export const API_CONFIG = {
  baseUrl: API_URL,
  timeoutMs: 15000,
  endpoints: {
    auth: {
      me: '/api/auth/me',
      login: '/api/auth/login',
      logout: '/api/auth/logout'
    },
    users: {
      me: '/api/users/me'
    },
    workspaces: {
      list: '/api/workspaces',
      detail: (id: string) => `/api/workspaces/${id}`
    },
    files: {
      upload: '/api/files/upload',
      list: '/api/files',
      detail: (id: string) => `/api/files/${id}`,
      download: (id: string) => `/api/files/${id}/download`
    },
    documents: {
      list: '/api/documents',
      upload: '/api/documents/upload',
      detail: (id: string) => `/api/documents/${id}`
    },
    analysis: {
      run: '/api/analysis/run',
      detail: (id: string) => `/api/analysis/${id}`
    },
    transform: {
      init: '/api/transform',
      detail: (id: string) => `/api/transform/${id}`,
      verify: (id: string) => `/api/transform/${id}/verify`,
      approve: (id: string) => `/api/transform/${id}/approve`
    },
    claims: {
      list: '/api/claims',
      detail: (id: string) => `/api/claims/${id}`
    },
    outputs: {
      generate: '/api/outputs/generate',
      approve: (id: string) => `/api/outputs/${id}/approve`
    },
    delivery: {
      send: '/api/delivery/send'
    },
    audit: {
      list: '/api/audit'
    }
  }
};
