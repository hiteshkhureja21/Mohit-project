/**
 * Backend Environment Configuration
 * Loads environment variables from local .env files.
 */

import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Attempt loading from backend directory, fallback to project root
dotenv.config({ path: path.resolve(__dirname, '../../.env') });
dotenv.config({ path: path.resolve(__dirname, '../../../.env') });

export const env = {
  PORT: parseInt(process.env.PORT || '5000', 10),
  FRONTEND_URL: process.env.FRONTEND_URL || 'http://localhost:5173',
  ALLOWED_ORIGINS: (process.env.ALLOWED_ORIGINS || process.env.FRONTEND_URL || 'http://localhost:5173')
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean),
  get NODE_ENV() {
    return process.env.NODE_ENV || 'development';
  },
  set NODE_ENV(val) {
    process.env.NODE_ENV = String(val);
  },
  get DEMO_MODE() {
    return process.env.DEMO_MODE === 'true';
  },
  set DEMO_MODE(val) {
    process.env.DEMO_MODE = String(val);
  },

  // Supabase Configuration (Server-Side)
  SUPABASE_URL: process.env.SUPABASE_URL || '',
  SUPABASE_ANON_KEY: process.env.SUPABASE_ANON_KEY || process.env.SUPABASE_PUBLISHABLE_KEY || '',
  SUPABASE_SERVICE_ROLE_KEY: process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SECRET_KEY || '',
  SUPABASE_STORAGE_BUCKET: process.env.SUPABASE_STORAGE_BUCKET || 'sourceflow-files',
  MAX_FILE_SIZE_MB: parseInt(process.env.MAX_FILE_SIZE_MB || '25', 10),
  get MAX_FILE_SIZE_BYTES() {
    return this.MAX_FILE_SIZE_MB * 1024 * 1024;
  },

  // External AI & OCR Services
  OPENAI_API_KEY: (process.env.OPENAI_API_KEY || '').trim(),
  OPENAI_MODEL: (process.env.OPENAI_MODEL || 'gpt-4o-mini').trim(),
  OPENAI_TIMEOUT_MS: parseInt(process.env.OPENAI_TIMEOUT_MS || '60000', 10),
  MAX_AI_INPUT_CHARS: parseInt(process.env.MAX_AI_INPUT_CHARS || '60000', 10),
  OCR_API_KEY: (process.env.OCR_API_KEY || '').trim(),
  OCR_TIMEOUT_MS: parseInt(process.env.OCR_TIMEOUT_MS || '30000', 10),

  // Translation Service (LibreTranslate)
  LIBRETRANSLATE_URL: process.env.LIBRETRANSLATE_URL || 'http://localhost:5001',
  LIBRETRANSLATE_API_KEY: (process.env.LIBRETRANSLATE_API_KEY || '').trim(),
  TRANSLATION_TIMEOUT_MS: parseInt(process.env.TRANSLATION_TIMEOUT_MS || '30000', 10),
  TRANSLATION_MAX_CHARS: parseInt(process.env.TRANSLATION_MAX_CHARS || process.env.MAX_TRANSLATION_CHARS || '20000', 10),
  get MAX_TRANSLATION_CHARS() {
    return this.TRANSLATION_MAX_CHARS;
  },
  set MAX_TRANSLATION_CHARS(val) {
    this.TRANSLATION_MAX_CHARS = val;
  },

  // Government Data & Services (data.gov.in & API Setu)
  DATA_GOV_IN_API_KEY: process.env.DATA_GOV_IN_API_KEY || '',
  DATA_GOV_IN_BASE_URL: process.env.DATA_GOV_IN_BASE_URL || 'https://api.data.gov.in',
  API_SETU_CLIENT_ID: process.env.API_SETU_CLIENT_ID || '',
  API_SETU_API_KEY: process.env.API_SETU_API_KEY || '',
  API_SETU_BASE_URL: process.env.API_SETU_BASE_URL || 'https://apisetu.gov.in',
  GOV_CACHE_TTL_MS: parseInt(process.env.GOV_CACHE_TTL_MS || '600000', 10) // 10 minutes
};
