/**
 * Centralized Error Handling and Structured Logging Test Suite (STEP 13)
 * Validates:
 * 1. Consistent error response envelope: { success: false, error: { code, message } }
 * 2. HTTP status codes (400, 401, 403, 404, 409, 422, 429, 500, 502, 504)
 * 3. Canonical application error codes (AUTH_REQUIRED, ACCESS_DENIED, FILE_NOT_FOUND, etc.)
 * 4. Structured Request IDs (e.g. req_8a91f3) and end-to-end log tracing
 * 5. Transient failure retry mechanism (withRetry) and non-retry of permanent 4xx errors
 * 6. Protection against leaking credentials and stack traces to users
 */

import http from 'http';
import express from 'express';
import { createApp } from '../src/app.js';
import { errorMiddleware } from '../src/middleware/error.middleware.js';
import { requestIdMiddleware, logger, generateRequestId } from '../src/utils/logger.js';
import { withRetry, isTransientError } from '../src/utils/retry.js';
import {
  ErrorCodes,
  BadRequestError,
  UnauthorizedError,
  ForbiddenError,
  NotFoundError,
  ConflictError,
  ValidationError,
  RateLimitError,
  InternalServerError,
  DatabaseError,
  ExternalProviderError,
  ProviderTimeoutError
} from '../src/utils/errors.js';

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

async function runErrorHandlingTests() {
  console.log('\n========================================================');
  console.log('STEP 13: Centralized Error Handling & Structured Logging');
  console.log('========================================================\n');

  // -------------------------------------------------------------
  // TEST 1: Request ID Generation and Response Header Tracing
  // -------------------------------------------------------------
  console.log('Test 1: Request ID Generation & Propagation');
  {
    const generatedId = generateRequestId();
    assert(generatedId.startsWith('req_') && generatedId.length === 10, 'generateRequestId creates req_xxxxxx format');

    const app = express();
    app.use(requestIdMiddleware);
    app.get('/test-req-id', (req, res) => {
      res.json({ success: true, reqId: req.id });
    });

    const server = http.createServer(app);
    await new Promise((r) => server.listen(0, r));
    const port = server.address().port;

    // Auto-generated Request ID
    const autoRes = await fetch(`http://localhost:${port}/test-req-id`);
    const autoBody = await autoRes.json();
    const autoHeader = autoRes.headers.get('x-request-id');
    assert(autoHeader && autoHeader.startsWith('req_'), 'Server responds with X-Request-ID header');
    assert(autoBody.reqId === autoHeader, 'req.id matches X-Request-ID header');

    // Propagated Request ID
    const customId = 'req_institutional_trace_99';
    const propRes = await fetch(`http://localhost:${port}/test-req-id`, {
      headers: { 'x-request-id': customId }
    });
    const propBody = await propRes.json();
    assert(propRes.headers.get('x-request-id') === customId, 'Client-supplied X-Request-ID is propagated');
    assert(propBody.reqId === customId, 'req.id preserves propagated request ID');

    server.close();
  }

  // -------------------------------------------------------------
  // TEST 2: Structured Error Response Shape and Status Codes
  // -------------------------------------------------------------
  console.log('\nTest 2: Standard Error Responses and Status Codes');
  {
    const testApp = express();
    testApp.use(requestIdMiddleware);

    // Mount sample error triggers
    testApp.get('/err/400', () => { throw new BadRequestError('Invalid file format.', ErrorCodes.INVALID_FILE_TYPE); });
    testApp.get('/err/401', () => { throw new UnauthorizedError('Bearer token expired.', ErrorCodes.AUTH_REQUIRED); });
    testApp.get('/err/403', () => { throw new ForbiddenError('Editor permissions required.', ErrorCodes.ACCESS_DENIED); });
    testApp.get('/err/404', () => { throw new NotFoundError('Institutional document missing.', ErrorCodes.FILE_NOT_FOUND); });
    testApp.get('/err/409', () => { throw new ConflictError('Pipeline stage lock active.', ErrorCodes.CONFLICT); });
    testApp.get('/err/422', () => { throw new ValidationError('Schema validation failure.', ErrorCodes.VALIDATION_ERROR, [{ field: 'title', message: 'Required' }]); });
    testApp.get('/err/429', () => { throw new RateLimitError('AI quota reached.', ErrorCodes.AI_RATE_LIMITED); });
    testApp.get('/err/500-db', () => { throw new DatabaseError('PostgreSQL constraint violation.', ErrorCodes.DATABASE_ERROR); });
    testApp.get('/err/502-ocr', () => { throw new ExternalProviderError('OCR.Space API failed.', ErrorCodes.OCR_FAILED); });
    testApp.get('/err/504-ai', () => { throw new ProviderTimeoutError('OpenAI inference timeout.', ErrorCodes.AI_TIMEOUT); });

    testApp.use(errorMiddleware);

    const server = http.createServer(testApp);
    await new Promise((r) => server.listen(0, r));
    const port = server.address().port;

    const cases = [
      { path: '/err/400', expectedStatus: 400, expectedCode: ErrorCodes.INVALID_FILE_TYPE },
      { path: '/err/401', expectedStatus: 401, expectedCode: ErrorCodes.AUTH_REQUIRED },
      { path: '/err/403', expectedStatus: 403, expectedCode: ErrorCodes.ACCESS_DENIED },
      { path: '/err/404', expectedStatus: 404, expectedCode: ErrorCodes.FILE_NOT_FOUND },
      { path: '/err/409', expectedStatus: 409, expectedCode: ErrorCodes.CONFLICT },
      { path: '/err/422', expectedStatus: 422, expectedCode: ErrorCodes.VALIDATION_ERROR },
      { path: '/err/429', expectedStatus: 429, expectedCode: ErrorCodes.AI_RATE_LIMITED },
      { path: '/err/500-db', expectedStatus: 500, expectedCode: ErrorCodes.DATABASE_ERROR },
      { path: '/err/502-ocr', expectedStatus: 502, expectedCode: ErrorCodes.OCR_FAILED },
      { path: '/err/504-ai', expectedStatus: 504, expectedCode: ErrorCodes.AI_TIMEOUT }
    ];

    for (const c of cases) {
      const res = await fetch(`http://localhost:${port}${c.path}`);
      const body = await res.json();

      assert(res.status === c.expectedStatus, `${c.path} returns HTTP ${c.expectedStatus}`);
      assert(body.success === false, `${c.path} envelope has success=false`);
      assert(body.error && body.error.code === c.expectedCode, `${c.path} returns canonical code ${c.expectedCode}`);
      assert(typeof body.error.message === 'string' && body.error.message.length > 0, `${c.path} contains descriptive message`);
      assert(Boolean(body.requestId), `${c.path} includes requestId tracking token`);
    }

    server.close();
  }

  // -------------------------------------------------------------
  // TEST 3: Sensitive Technical Details Sanitization
  // -------------------------------------------------------------
  console.log('\nTest 3: Zero Exposure of Technical Credentials & Stack Traces');
  {
    const prevEnv = process.env.NODE_ENV;
    process.env.NODE_ENV = 'production';

    const secApp = express();
    secApp.use(requestIdMiddleware);
    secApp.get('/leak-test', () => {
      const sensitiveErr = new Error('Database connect error at postgres://admin:SuperSecretKey99@cluster.internal:5432 with token sk-abcdef12345678901234567890');
      sensitiveErr.status = 500;
      throw sensitiveErr;
    });
    secApp.use(errorMiddleware);

    const server = http.createServer(secApp);
    await new Promise((r) => server.listen(0, r));
    const port = server.address().port;

    const leakRes = await fetch(`http://localhost:${port}/leak-test`);
    const leakBody = await leakRes.json();

    assert(leakRes.status === 500, 'Production 500 error returns HTTP 500');
    assert(!JSON.stringify(leakBody).includes('SuperSecretKey99'), 'Database password is never exposed to user');
    assert(!JSON.stringify(leakBody).includes('sk-abcdef'), 'API key is never exposed to user');
    assert(leakBody.error.stack === undefined, 'Stack trace is completely suppressed in production');
    assert(leakBody.error.message === 'An internal server error occurred. Our engineering team has been notified.', 'Safe sanitized error message returned');

    server.close();
    process.env.NODE_ENV = prevEnv;
  }

  // -------------------------------------------------------------
  // TEST 4: Transient Retry Mechanism (withRetry)
  // -------------------------------------------------------------
  console.log('\nTest 4: Selective Transient Retry Mechanism');
  {
    // 4.1 Transient failure (503 Service Unavailable) should retry and succeed
    let attempts503 = 0;
    const transientResult = await withRetry(async () => {
      attempts503++;
      if (attempts503 < 3) {
        const transientErr = new Error('Upstream capacity temporarily exhausted');
        transientErr.status = 503;
        throw transientErr;
      }
      return { success: true, data: 'transient recovery' };
    }, {
      retries: 3,
      minTimeout: 20,
      operationName: 'Test503Retry'
    });

    assert(attempts503 === 3, 'Transient 503 retries until threshold or success');
    assert(transientResult.success === true, 'Transient operation recovers successfully');

    // 4.2 Transient network socket drop (ECONNRESET) should retry
    let attemptsNet = 0;
    const netResult = await withRetry(async () => {
      attemptsNet++;
      if (attemptsNet < 2) {
        const netErr = new Error('read ECONNRESET');
        netErr.code = 'ECONNRESET';
        throw netErr;
      }
      return { connected: true };
    }, {
      retries: 2,
      minTimeout: 20,
      operationName: 'TestNetRetry'
    });

    assert(attemptsNet === 2, 'Network socket drop (ECONNRESET) is retried');
    assert(netResult.connected === true, 'Network call recovers');

    // 4.3 Permanent 400 Bad Request should NEVER retry
    let attempts400 = 0;
    let caught400 = false;
    try {
      await withRetry(async () => {
        attempts400++;
        throw new BadRequestError('Malformed JSON syntax');
      }, {
        retries: 3,
        minTimeout: 20,
        operationName: 'Test400NoRetry'
      });
    } catch (err) {
      caught400 = true;
      assert(err.status === 400, 'BadRequestError preserves HTTP 400');
    }
    assert(caught400, 'Permanent 400 throws immediately');
    assert(attempts400 === 1, 'Permanent 400 is NOT retried (attempt count = 1)');

    // 4.4 Permanent 401 Unauthorized should NEVER retry
    let attempts401 = 0;
    try {
      await withRetry(async () => {
        attempts401++;
        throw new UnauthorizedError('Invalid credentials');
      }, {
        retries: 3,
        minTimeout: 20,
        operationName: 'Test401NoRetry'
      });
    } catch (err) {
      assert(err.status === 401, 'UnauthorizedError preserves HTTP 401');
    }
    assert(attempts401 === 1, 'Invalid credentials (401) is NOT retried');

    // 4.5 Permanent 403 Forbidden should NEVER retry
    let attempts403 = 0;
    try {
      await withRetry(async () => {
        attempts403++;
        throw new ForbiddenError('Insufficient permissions');
      }, {
        retries: 3,
        minTimeout: 20,
        operationName: 'Test403NoRetry'
      });
    } catch (err) {
      assert(err.status === 403, 'ForbiddenError preserves HTTP 403');
    }
    assert(attempts403 === 1, 'Forbidden access (403) is NOT retried');

    // 4.6 Permanent 404 Not Found should NEVER retry
    let attempts404 = 0;
    try {
      await withRetry(async () => {
        attempts404++;
        throw new NotFoundError('File not found');
      }, {
        retries: 3,
        minTimeout: 20,
        operationName: 'Test404NoRetry'
      });
    } catch (err) {
      assert(err.status === 404, 'NotFoundError preserves HTTP 404');
    }
    assert(attempts404 === 1, 'Not Found (404) is NOT retried');

    // 4.7 Permanent 422 Validation Error should NEVER retry
    let attempts422 = 0;
    try {
      await withRetry(async () => {
        attempts422++;
        throw new ValidationError('Validation failed');
      }, {
        retries: 3,
        minTimeout: 20,
        operationName: 'Test422NoRetry'
      });
    } catch (err) {
      assert(err.status === 422, 'ValidationError preserves HTTP 422');
    }
    assert(attempts422 === 1, 'Validation error (422) is NOT retried');
  }

  // -------------------------------------------------------------
  // TEST 5: App Integration with Standard Routes
  // -------------------------------------------------------------
  console.log('\nTest 5: Full Express App End-to-End Tracing');
  {
    const app = createApp();
    const server = http.createServer(app);
    await new Promise((r) => server.listen(0, r));
    const port = server.address().port;

    // 5.1 Route not found (404)
    const notFoundRes = await fetch(`http://localhost:${port}/api/non-existent-endpoint`);
    const notFoundBody = await notFoundRes.json();
    assert(notFoundRes.status === 404, 'Unknown route returns 404');
    assert(notFoundBody.error.code === 'NOT_FOUND', '404 error code is NOT_FOUND');
    assert(Boolean(notFoundRes.headers.get('x-request-id')), '404 response includes X-Request-ID');

    // 5.2 Missing auth token (401)
    const noAuthRes = await fetch(`http://localhost:${port}/api/files`);
    const noAuthBody = await noAuthRes.json();
    assert(noAuthRes.status === 401, 'Unauthenticated request returns 401');
    assert(noAuthBody.error.code === ErrorCodes.AUTH_REQUIRED, `401 error code is ${ErrorCodes.AUTH_REQUIRED}`);

    // 5.3 Zod validation failure (422)
    process.env.DEMO_MODE = 'true';
    const valRes = await fetch(`http://localhost:${port}/api/translate`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: 'Bearer demo-session-sourceflow-operator'
      },
      body: JSON.stringify({})
    });
    const valBody = await valRes.json();
    assert(valRes.status === 422, 'Zod validation error returns HTTP 422');
    assert(valBody.error.code === ErrorCodes.VALIDATION_ERROR, `Validation error code is ${ErrorCodes.VALIDATION_ERROR}`);
    assert(Array.isArray(valBody.error.details), 'Validation response contains error details array');

    server.close();
  }

  console.log('\n========================================================');
  console.log(`STEP 13 Test Results: ${passed} passed, ${failed} failed`);
  console.log('========================================================\n');

  if (failed > 0) {
    process.exit(1);
  }
}

runErrorHandlingTests().catch((err) => {
  console.error('Error handling test suite fatal exception:', err);
  process.exit(1);
});
