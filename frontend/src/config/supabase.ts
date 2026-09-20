/**
 * Supabase Frontend Client Configuration
 * Uses public publishable credentials only (VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY).
 * Never exposes private service role or secret keys to the browser.
 */

import { createClient, SupabaseClient } from '@supabase/supabase-js';

const supabaseUrl: string = import.meta.env.VITE_SUPABASE_URL || '';
const supabaseAnonKey: string = import.meta.env.VITE_SUPABASE_ANON_KEY || import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY || '';

export const isSupabaseConfigured = (): boolean => {
  return Boolean(
    supabaseUrl &&
    supabaseAnonKey &&
    !supabaseUrl.includes('your-project') &&
    supabaseUrl.startsWith('https://')
  );
};

export const isDemoMode = (): boolean => {
  if (import.meta.env.VITE_DEMO_MODE !== undefined) {
    return import.meta.env.VITE_DEMO_MODE === 'true';
  }
  return false;
};

export const supabase: SupabaseClient | null = isSupabaseConfigured()
  ? createClient(supabaseUrl, supabaseAnonKey, {
      auth: {
        persistSession: true,
        autoRefreshToken: true,
        detectSessionInUrl: true,
        storage: window.localStorage
      }
    })
  : null;
