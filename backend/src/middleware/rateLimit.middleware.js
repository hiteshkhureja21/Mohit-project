/**
 * In-Memory Sliding Window Rate Limiting Middleware
 * Protects endpoints against brute-force, scraping, and resource exhaustion.
 * Returns HTTP 429 Too Many Requests with standard Retry-After header.
 */

export function createRateLimiter({
  windowMs = 60 * 1000,
  max = 60,
  message = 'Too many requests. Please try again later.',
  keyGenerator = (req) => req.ip || req.headers['x-forwarded-for'] || req.socket?.remoteAddress || 'unknown-client'
} = {}) {
  // Map of clientKey -> Array of timestamps [t1, t2, ...]
  const hits = new Map();

  // Periodic cleanup of expired records every 5 minutes
  const cleanupInterval = setInterval(() => {
    const now = Date.now();
    for (const [key, timestamps] of hits.entries()) {
      const valid = timestamps.filter((t) => now - t < windowMs);
      if (valid.length === 0) {
        hits.delete(key);
      } else {
        hits.set(key, valid);
      }
    }
  }, Math.max(windowMs, 60 * 1000));

  // Allow Node process to exit without waiting on interval
  if (cleanupInterval.unref) {
    cleanupInterval.unref();
  }

  return (req, res, next) => {
    const clientKey = keyGenerator(req);
    const now = Date.now();
    const timestamps = (hits.get(clientKey) || []).filter((t) => now - t < windowMs);

    if (timestamps.length >= max) {
      const oldestHit = timestamps[0];
      const resetTimeMs = windowMs - (now - oldestHit);
      const retryAfterSeconds = Math.max(1, Math.ceil(resetTimeMs / 1000));

      res.setHeader('Retry-After', retryAfterSeconds);
      res.setHeader('X-RateLimit-Limit', max);
      res.setHeader('X-RateLimit-Remaining', 0);
      res.setHeader('X-RateLimit-Reset', Math.ceil((oldestHit + windowMs) / 1000));

      return res.status(429).json({
        success: false,
        error: {
          code: 'RATE_LIMIT_EXCEEDED',
          message,
          retryAfter: retryAfterSeconds
        },
        timestamp: new Date().toISOString()
      });
    }

    timestamps.push(now);
    hits.set(clientKey, timestamps);

    res.setHeader('X-RateLimit-Limit', max);
    res.setHeader('X-RateLimit-Remaining', max - timestamps.length);

    next();
  };
}

const isDevOrTest = process.env.NODE_ENV === 'test' || process.env.NODE_ENV === 'development' || !process.env.NODE_ENV;

// 1. Auth Rate Limiter (Brute-force protection: 10 requests per 15 minutes in prod, 500 in dev/test)
export const authLimiter = createRateLimiter({
  windowMs: 15 * 60 * 1000,
  max: isDevOrTest ? 500 : 10,
  message: 'Too many authentication attempts. Please try again after 15 minutes.'
});

// 2. AI Generation Rate Limiter (Cost protection: 20 requests per minute in prod)
export const aiLimiter = createRateLimiter({
  windowMs: 60 * 1000,
  max: isDevOrTest ? 200 : 20,
  message: 'AI request limit reached. Please wait a moment before sending new generation requests.'
});

// 3. OCR Processing Rate Limiter (15 requests per minute in prod)
export const ocrLimiter = createRateLimiter({
  windowMs: 60 * 1000,
  max: isDevOrTest ? 200 : 15,
  message: 'OCR processing limit reached. Please wait before submitting more documents.'
});

// 4. File Upload Rate Limiter (20 uploads per 15 minutes in prod, 500 in dev/test)
export const uploadLimiter = createRateLimiter({
  windowMs: 15 * 60 * 1000,
  max: isDevOrTest ? 500 : 20,
  message: 'File upload rate limit reached (max 20 files per 15 minutes).'
});

// 5. Translation Rate Limiter (30 requests per minute)
export const translateLimiter = createRateLimiter({
  windowMs: 60 * 1000,
  max: 30,
  message: 'Translation rate limit reached. Please wait a moment.'
});

// 6. General API Limiter (120 requests per minute)
export const apiLimiter = createRateLimiter({
  windowMs: 60 * 1000,
  max: 120,
  message: 'General API request rate exceeded.'
});
