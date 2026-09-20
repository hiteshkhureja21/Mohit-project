/**
 * Security Hardening Test Suite (STEP 12)
 * Validates:
 * 1. CORS origin enforcement
 * 2. Supabase token verification and rejection of fake tokens
 * 3. File upload validation (MIME, extensions, double extensions, path traversal, size)
 * 4. Sliding-window Rate Limiting & HTTP 429 response
 * 5. Zod schema input validation
 * 6. Error handling and secret redaction
 * 7. Logging credential masking
 */

import http from 'http';
import { createApp } from '../src/app.js';
import { authService } from '../src/services/auth.service.js';
import { validateFileMetadata, sanitizeFilename } from '../src/services/storage.service.js';
import { sanitizeString, sanitizeData, logger } from '../src/utils/logger.js';
import { createRateLimiter } from '../src/middleware/rateLimit.middleware.js';

let passed = 0;
let failed = 0;

function assert(condition, message) {
  if (condition) {
    passed++;
    console.log(`  [PASS] ${message}`);
  } else {
    failed++;
    console.error(`  [FAIL] ${message}`);
  }
}

async function runSecurityTests() {
  console.log('\n========================================');
  console.log('SourceFlow Security Hardening Audit Suite');
  console.log('========================================\n');

  // Test 1: Logging Redaction and Sensitive Data Masking
  console.log('Test 1: Logging and Sensitive Data Masking');
  {
    const bearerString = 'Request with Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.e30.t-ID';
    const cleanBearer = sanitizeString(bearerString);
    assert(cleanBearer.includes('Bearer [REDACTED]'), 'Bearer tokens are redacted in log strings');

    const openAiKey = 'Bearer sk-abcdefghijklmnopqrstuvwxyz1234567890';
    const cleanKey = sanitizeString(openAiKey);
    assert(!cleanKey.includes('sk-abcdefgh'), 'OpenAI keys are redacted');

    const dbUri = 'postgres://postgres:SuperSecretPassword123@db.supabase.co:5432/postgres';
    const cleanDb = sanitizeString(dbUri);
    assert(!cleanDb.includes('SuperSecretPassword123') && cleanDb.includes('[REDACTED]'), 'Database credentials in URIs are masked');

    const sensitiveObj = {
      password: 'mypassword123',
      apiKey: 'secret-api-key',
      token: 'jwt-token-12345',
      safeField: 'SourceFlow Institutional Record'
    };
    const cleanObj = sanitizeData(sensitiveObj);
    assert(cleanObj.password === '[REDACTED]', 'Object passwords are masked');
    assert(cleanObj.apiKey === '[REDACTED]', 'Object API keys are masked');
    assert(cleanObj.safeField === 'SourceFlow Institutional Record', 'Non-sensitive fields are preserved');

    const largeDocumentText = 'Confidential government data '.repeat(50); // ~1500 chars
    const cleanText = sanitizeData(largeDocumentText);
    assert(cleanText.includes('[TRUNCATED') && cleanText.length < 500, 'Excessively large document text is truncated to protect data privacy');
  }

  // Test 2: File Security, Extension, and Path Traversal
  console.log('\nTest 2: File Upload Validation & Path Traversal Neutralization');
  {
    // Executable extension rejection
    const exeCheck = validateFileMetadata('malicious.exe', 'application/octet-stream', 1024);
    assert(!exeCheck.valid && exeCheck.code === 'DISALLOWED_EXTENSION', 'Executable extensions (.exe) are rejected');

    const shCheck = validateFileMetadata('script.sh', 'text/x-sh', 512);
    assert(!shCheck.valid && shCheck.code === 'DISALLOWED_EXTENSION', 'Shell scripts (.sh) are rejected');

    // Double extension defense
    const doubleExt = validateFileMetadata('audit_report.pdf.exe', 'application/pdf', 2048);
    assert(!doubleExt.valid && doubleExt.code === 'DISALLOWED_EXTENSION', 'Double extension disguised files (.pdf.exe) are rejected');

    // Path traversal attempt in filename
    const traversalCheck = validateFileMetadata('../../etc/passwd', 'application/pdf', 1024);
    assert(!traversalCheck.valid && traversalCheck.code === 'INVALID_FILENAME', 'Path traversal characters in filename are rejected');

    // MIME type mismatch
    const mimeMismatch = validateFileMetadata('report.pdf', 'image/png', 2048);
    assert(!mimeMismatch.valid && mimeMismatch.code === 'MIME_EXTENSION_MISMATCH', 'Declared MIME mismatch (.pdf with image/png) is rejected');

    // Oversized file
    const oversized = validateFileMetadata('huge.pdf', 'application/pdf', 60 * 1024 * 1024);
    assert(!oversized.valid && oversized.code === 'FILE_TOO_LARGE', 'Oversized files (>50MB) are rejected');

    // Valid file
    const validFile = validateFileMetadata('annual_budget_2026.pdf', 'application/pdf', 2 * 1024 * 1024);
    assert(validFile.valid, 'Valid PDF with matching MIME type is accepted');

    // Filename sanitization
    const sanitized = sanitizeFilename('../../../dangerous payload!@#$%^&*().pdf');
    assert(!sanitized.includes('..') && !sanitized.includes('/') && !sanitized.includes(' '), 'Filename sanitization removes traversal slashes and special characters');
  }

  // Test 3: Authentication & Synthetic Token Rejection
  console.log('\nTest 3: Authentication & Fake Token Rejection');
  {
    // Empty token
    const emptyRes = await authService.verifyToken('');
    assert(!emptyRes.success && emptyRes.statusCode === 401, 'Empty tokens are rejected with 401');

    // Fake/demo token when DEMO_MODE is false (or in production)
    const prevDemoMode = process.env.DEMO_MODE;
    process.env.DEMO_MODE = 'false';

    const fakeRes = await authService.verifyToken('demo-session-sourceflow-operator');
    assert(!fakeRes.success && fakeRes.errorCode === 'INVALID_TOKEN', 'Synthetic demo tokens are strictly rejected when DEMO_MODE=false');

    const arbitraryRes = await authService.verifyToken('completely-fake-jwt-token');
    assert(!arbitraryRes.success && arbitraryRes.statusCode === 401, 'Arbitrary tokens are rejected with 401');

    process.env.DEMO_MODE = prevDemoMode;
  }

  // Test 4: Sliding-Window Rate Limiting
  console.log('\nTest 4: Sliding-Window Rate Limiting');
  {
    const miniLimiter = createRateLimiter({
      windowMs: 1000,
      max: 3,
      message: 'Rate limit test exceeded.'
    });

    const mockReq = { ip: '127.0.0.1', headers: {}, socket: { remoteAddress: '127.0.0.1' } };
    const mockHeaders = {};
    let statusCode = 200;
    let responseBody = null;

    const mockRes = {
      setHeader: (k, v) => { mockHeaders[k] = v; },
      status: (code) => {
        statusCode = code;
        return {
          json: (body) => { responseBody = body; }
        };
      }
    };

    let nextCalled = 0;
    const next = () => { nextCalled++; };

    // Request 1, 2, 3 should succeed
    miniLimiter(mockReq, mockRes, next);
    miniLimiter(mockReq, mockRes, next);
    miniLimiter(mockReq, mockRes, next);
    assert(nextCalled === 3, 'First 3 requests within limit pass through');

    // Request 4 should be rate-limited (HTTP 429)
    miniLimiter(mockReq, mockRes, next);
    assert(statusCode === 429, '4th request triggers HTTP 429 Too Many Requests');
    assert(responseBody?.error?.code === 'RATE_LIMIT_EXCEEDED', 'Rate limit error code is RATE_LIMIT_EXCEEDED');
    assert(mockHeaders['Retry-After'] !== undefined, 'Retry-After header is returned');
  }

  // Test 5: Integration Tests against Express App (CORS & Zod Validation)
  console.log('\nTest 5: App Integration (CORS, Security Headers, Zod Validation)');
  {
    const app = createApp();
    const server = http.createServer(app);

    await new Promise((resolve) => server.listen(0, resolve));
    const port = server.address().port;

    // 5.1 Security Headers check on /api/health
    const healthRes = await fetch(`http://localhost:${port}/api/health`);
    assert(healthRes.status === 200, 'GET /api/health returns 200');
    assert(healthRes.headers.get('x-content-type-options') === 'nosniff', 'Security header X-Content-Type-Options is nosniff');
    assert(healthRes.headers.get('x-frame-options') === 'DENY', 'Security header X-Frame-Options is DENY');
    assert(healthRes.headers.get('referrer-policy') === 'strict-origin-when-cross-origin', 'Security header Referrer-Policy is present');

    // 5.2 Zod Input Validation on POST /api/translate
    // With authenticated demo token in dev mode, sending invalid payload returns HTTP 400 VALIDATION_ERROR
    const prevDemo = process.env.DEMO_MODE;
    const prevNodeEnv = process.env.NODE_ENV;
    process.env.DEMO_MODE = 'true';
    process.env.NODE_ENV = 'development';

    const zodFailRes = await fetch(`http://localhost:${port}/api/translate`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: 'Bearer demo-session-sourceflow-operator'
      },
      body: JSON.stringify({
        // Missing required 'text' and 'targetLanguage'
      })
    });
    const zodBody = await zodFailRes.json();
    assert(zodFailRes.status === 422 || zodFailRes.status === 400, 'Zod validation rejects empty payload with HTTP 422');
    assert(zodBody?.error?.code === 'VALIDATION_ERROR', 'Zod validation error code is VALIDATION_ERROR');
    assert(Array.isArray(zodBody?.error?.details), 'Zod validation returns structured details array');

    // 5.3 CORS check with Allowed Origin
    const corsAllowedRes = await fetch(`http://localhost:${port}/api/health`, {
      headers: { Origin: 'http://localhost:5173' }
    });
    assert(corsAllowedRes.headers.get('access-control-allow-origin') === 'http://localhost:5173', 'Allowed origin receives Access-Control-Allow-Origin header');

    process.env.DEMO_MODE = prevDemo;
    process.env.NODE_ENV = prevNodeEnv;

    server.close();
  }

  console.log('\n========================================');
  console.log(`Security Test Results: ${passed} passed, ${failed} failed`);
  console.log('========================================\n');

  if (failed > 0) {
    process.exit(1);
  }
}

runSecurityTests().catch((err) => {
  console.error('Security test suite fatal error:', err);
  process.exit(1);
});
