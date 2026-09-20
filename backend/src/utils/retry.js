/**
 * Transient Failure Retry Utility
 * Implements exponential backoff with jitter for external network and upstream provider calls.
 * 
 * Rules:
 * - Retries only transient infrastructure failures (network timeouts, 502, 503, 504, 429).
 * - NEVER retries permanent client errors (400, 401, 403, 404, 422).
 * - Never returns fake or fallback responses.
 */

import { logger } from './logger.js';

const NON_RETRYABLE_STATUS_CODES = new Set([400, 401, 403, 404, 409, 422]);

const TRANSIENT_NETWORK_CODES = new Set([
  'ECONNRESET',
  'ETIMEDOUT',
  'ECONNREFUSED',
  'EPIPE',
  'ENOTFOUND',
  'EAI_AGAIN',
  'UND_ERR_CONNECT_TIMEOUT',
  'UND_ERR_SOCKET'
]);

/**
 * Determines whether an error is transient and eligible for retry.
 */
export function isTransientError(err) {
  if (!err) return false;

  const status = err.statusCode || err.status || (err.response && err.response.status);

  // 1. Never retry permanent client/authorization errors
  if (status && NON_RETRYABLE_STATUS_CODES.has(status)) {
    return false;
  }

  // 2. Retry transient server errors
  if (status === 429 || status === 502 || status === 503 || status === 504) {
    return true;
  }

  // 3. Retry transient low-level network errors
  const code = err.code || err.cause?.code;
  if (code && TRANSIENT_NETWORK_CODES.has(code)) {
    return true;
  }

  // 4. Retry standard fetch failures if caused by transient socket drop
  if (err.name === 'FetchError' || err.message?.includes('fetch failed') || err.message?.includes('network timeout')) {
    return true;
  }

  return false;
}

/**
 * Executes an async operation with selective exponential backoff retries.
 * 
 * @param {Function} fn - Async operation to execute
 * @param {Object} options - Configuration options
 * @param {number} [options.retries=2] - Maximum number of retries (total attempts = 1 + retries)
 * @param {number} [options.minTimeout=300] - Base delay in milliseconds
 * @param {number} [options.maxTimeout=2500] - Maximum delay in milliseconds
 * @param {number} [options.factor=2] - Exponential multiplier
 * @param {Function} [options.shouldRetry] - Custom retry filter function
 * @param {string} [options.operationName='Operation'] - Descriptive name for logging
 * @param {string} [options.requestId] - Tracing request ID
 */
export async function withRetry(fn, options = {}) {
  const {
    retries = 2,
    minTimeout = 300,
    maxTimeout = 2500,
    factor = 2,
    shouldRetry = isTransientError,
    operationName = 'UpstreamCall',
    requestId
  } = options;

  let attempt = 0;

  while (true) {
    attempt++;
    try {
      return await fn();
    } catch (err) {
      const isEligible = shouldRetry(err);

      if (attempt > retries || !isEligible) {
        if (!isEligible && attempt === 1) {
          logger.debug(`[${operationName}] Non-retryable failure (${err.code || err.message}), bypassing retry.`, {
            status: err.status || err.statusCode,
            code: err.code
          }, requestId);
        } else if (attempt > retries) {
          logger.warn(`[${operationName}] Exceeded maximum retry attempts (${retries}). Failing operation.`, {
            error: err.message
          }, requestId);
        }
        throw err;
      }

      // Calculate exponential backoff with jitter
      const delay = Math.min(
        maxTimeout,
        minTimeout * Math.pow(factor, attempt - 1) + Math.random() * 100
      );

      logger.warn(
        `[${operationName}] Transient failure on attempt ${attempt}/${retries + 1} (${err.code || err.message}). Retrying in ${Math.round(delay)}ms...`,
        undefined,
        requestId
      );

      await new Promise((resolve) => setTimeout(resolve, delay));
    }
  }
}
