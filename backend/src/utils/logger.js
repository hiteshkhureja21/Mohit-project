/**
 * Institutional Security & Audit Logger
 * Automatically sanitizes sensitive data:
 * - Redacts Bearer tokens and JWTs
 * - Redacts OpenAI, OCR, and external API keys
 * - Masks password and credential fields
 * - Truncates raw document text to prevent confidential data leakage in log sinks
 * - Formats logs with structured Request IDs (e.g. req_8a91f3) for end-to-end request tracing
 */

import crypto from 'crypto';

const SENSITIVE_KEYS = new Set([
  'password',
  'token',
  'refreshtoken',
  'access_token',
  'refresh_token',
  'apikey',
  'api_key',
  'secret',
  'service_role_key',
  'servicerolekey',
  'authorization',
  'cookie'
]);

/**
 * Generates an institutional request tracing ID (e.g. req_8a91f3)
 */
export function generateRequestId() {
  return `req_${crypto.randomBytes(3).toString('hex')}`;
}

/**
 * Express middleware to assign or propagate X-Request-ID
 */
export function requestIdMiddleware(req, res, next) {
  const incomingId = req.headers['x-request-id'];
  const requestId = incomingId && typeof incomingId === 'string' && incomingId.length <= 64
    ? sanitizeString(incomingId)
    : generateRequestId();

  req.id = requestId;
  req.requestId = requestId;
  res.setHeader('X-Request-ID', requestId);
  next();
}

/**
 * Sanitizes strings for sensitive tokens and keys.
 */
export function sanitizeString(str) {
  if (typeof str !== 'string') return str;

  return str
    // Redact Bearer tokens
    .replace(/Bearer\s+[A-Za-z0-9._~+/-]+=*/gi, 'Bearer [REDACTED]')
    // Redact OpenAI API keys
    .replace(/sk-[A-Za-z0-9_-]{20,}/g, 'sk-[REDACTED]')
    .replace(new RegExp(process.env.OPENAI_API_KEY ? process.env.OPENAI_API_KEY.trim() : '___NONE___', 'g'), '[REDACTED_OPENAI_KEY]')
    // Redact generic JWT tokens
    .replace(/eyJ[A-Za-z0-9_-]{10,}\.[A-Za-z0-9_-]{10,}\.[A-Za-z0-9_-]*/g, 'eyJ[REDACTED_JWT]')
    // Redact OCR.Space API keys (typically starts with K followed by digits/letters or dynamic env key)
    .replace(/K[0-9A-Za-z]{10,}/g, '[REDACTED_OCR_KEY]')
    // Redact specific configured OCR_API_KEY if present
    .replace(new RegExp(process.env.OCR_API_KEY ? process.env.OCR_API_KEY.trim() : '___NONE___', 'g'), '[REDACTED_OCR_KEY]')
    // Redact passwords in connection strings: postgres://user:password@host
    .replace(/(postgres(?:ql)?:\/\/[^:]+:)([^@]+)(@)/gi, '$1[REDACTED]$3');
}

/**
 * Alias for redactSecrets / sanitization
 */
export const redactSecrets = sanitizeString;


/**
 * Recursively sanitizes objects and arrays.
 */
export function sanitizeData(data, depth = 0) {
  if (depth > 6) return '[MAX_DEPTH_REACHED]';
  if (data === null || data === undefined) return data;

  if (typeof data === 'string') {
    // Truncate excessively long document text strings to prevent confidential data leakage
    if (data.length > 500) {
      return sanitizeString(data.slice(0, 150)) + `... [TRUNCATED ${data.length} chars]`;
    }
    return sanitizeString(data);
  }

  if (typeof data === 'number' || typeof data === 'boolean') {
    return data;
  }

  if (Array.isArray(data)) {
    return data.map((item) => sanitizeData(item, depth + 1));
  }

  if (typeof data === 'object') {
    const cleanObj = {};
    for (const [key, val] of Object.entries(data)) {
      const lowerKey = key.toLowerCase();
      if (SENSITIVE_KEYS.has(lowerKey)) {
        cleanObj[key] = '[REDACTED]';
      } else if (val instanceof Buffer) {
        cleanObj[key] = `[Buffer ${val.length} bytes]`;
      } else {
        cleanObj[key] = sanitizeData(val, depth + 1);
      }
    }
    return cleanObj;
  }

  return String(data);
}

function formatLog(level, message, meta, requestId) {
  const timestamp = new Date().toISOString();
  const reqPrefix = requestId ? ` [${requestId}]` : '';
  const cleanMsg = sanitizeString(String(message));
  const cleanMeta = meta !== undefined ? ` | meta: ${JSON.stringify(sanitizeData(meta))}` : '';
  return `[${timestamp}] [${level.toUpperCase()}]${reqPrefix} ${cleanMsg}${cleanMeta}`;
}

export const logger = {
  info(message, meta, requestId) {
    console.log(formatLog('info', message, meta, requestId));
  },
  warn(message, meta, requestId) {
    console.warn(formatLog('warn', message, meta, requestId));
  },
  error(message, meta, requestId) {
    console.error(formatLog('error', message, meta, requestId));
  },
  debug(message, meta, requestId) {
    if (process.env.NODE_ENV !== 'production') {
      console.debug(formatLog('debug', message, meta, requestId));
    }
  }
};

/**
 * Express middleware to log requests with sanitized headers, body, and Request ID correlation
 */
export function requestLogger(req, res, next) {
  const start = Date.now();
  const sanitizedPath = sanitizeString(req.originalUrl || req.url);

  res.on('finish', () => {
    const duration = Date.now() - start;
    const statusCode = res.statusCode;
    const level = statusCode >= 500 ? 'error' : statusCode >= 400 ? 'warn' : 'info';
    logger[level](`${req.method} ${sanitizedPath} -> ${statusCode} (${duration}ms)`, undefined, req.id);
  });

  next();
}

export default logger;
