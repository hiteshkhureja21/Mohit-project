/**
 * Centralized Application Error Middleware
 * Enforces unified error response format across SourceFlow:
 * {
 *   "success": false,
 *   "error": {
 *     "code": "FILE_NOT_FOUND",
 *     "message": "The requested file could not be found."
 *   }
 * }
 */

import { env } from '../config/env.js';
import { logger, sanitizeString } from '../utils/logger.js';
import { ErrorCodes } from '../utils/errors.js';

// Status code to default error code mapping
const STATUS_TO_CODE = {
  400: ErrorCodes.BAD_REQUEST,
  401: ErrorCodes.AUTH_REQUIRED,
  403: ErrorCodes.ACCESS_DENIED,
  404: ErrorCodes.NOT_FOUND,
  409: ErrorCodes.CONFLICT,
  422: ErrorCodes.VALIDATION_ERROR,
  429: ErrorCodes.RATE_LIMIT_EXCEEDED,
  500: ErrorCodes.INTERNAL_SERVER_ERROR,
  502: ErrorCodes.EXTERNAL_API_ERROR,
  504: ErrorCodes.AI_TIMEOUT
};

export function errorMiddleware(err, req, res, next) {
  const isProduction = env.NODE_ENV === 'production' || process.env.NODE_ENV === 'production';
  const requestId = req?.id || req?.headers?.['x-request-id'];

  // 1. Resolve HTTP Status Code
  const rawStatus = err.statusCode || err.status || 500;
  const statusCode = Number.isInteger(rawStatus) && rawStatus >= 400 && rawStatus <= 599
    ? rawStatus
    : 500;

  // 2. Resolve Error Code
  let errorCode = err.code || STATUS_TO_CODE[statusCode] || ErrorCodes.INTERNAL_SERVER_ERROR;

  // Standardize common legacy or provider codes to canonical SourceFlow error codes
  if (errorCode === 'UNAUTHORIZED' || errorCode === 'NO_TOKEN') errorCode = ErrorCodes.AUTH_REQUIRED;
  if (errorCode === 'FORBIDDEN') errorCode = ErrorCodes.ACCESS_DENIED;
  if (errorCode === 'LIMIT_FILE_SIZE') errorCode = ErrorCodes.FILE_TOO_LARGE;
  if (errorCode === 'UNSUPPORTED_FILE_TYPE' || errorCode === 'DISALLOWED_EXTENSION' || errorCode === 'MIME_EXTENSION_MISMATCH') errorCode = ErrorCodes.INVALID_FILE_TYPE;
  if (errorCode === 'STORAGE_UPLOAD_ERROR') errorCode = ErrorCodes.UPLOAD_FAILED;
  if (errorCode === 'OCR_PROCESSING_FAILED' || errorCode === 'OCR_SPACE_ERROR') errorCode = ErrorCodes.OCR_FAILED;
  if (errorCode === 'OCR_TIMEOUT_EXCEEDED') errorCode = ErrorCodes.OCR_TIMEOUT;
  if (errorCode === 'AI_OPENAI_ERROR') errorCode = ErrorCodes.AI_REQUEST_FAILED;
  if (errorCode === 'AI_TIMEOUT_EXCEEDED') errorCode = ErrorCodes.AI_TIMEOUT;
  if (errorCode === 'AI_RATE_LIMIT') errorCode = ErrorCodes.AI_RATE_LIMITED;
  if (errorCode === 'TRANSLATION_PROVIDER_ERROR') errorCode = ErrorCodes.TRANSLATION_FAILED;
  if (errorCode === 'TRANSLATION_TIMEOUT') errorCode = ErrorCodes.TRANSLATION_TIMEOUT;
  if (errorCode === 'POSTGRES_ERROR' || errorCode === 'SUPABASE_DB_ERROR') errorCode = ErrorCodes.DATABASE_ERROR;
  if (req?.originalUrl?.includes('/files') && errorCode === 'NOT_FOUND') errorCode = ErrorCodes.FILE_NOT_FOUND;

  // 3. Resolve and Sanitize Error Message
  let errorMessage = err.message || 'An unexpected error occurred.';
  errorMessage = sanitizeString(errorMessage);

  // 4. Log server-side with structured Request ID
  const logData = {
    code: errorCode,
    statusCode,
    url: req.originalUrl || req.url,
    method: req.method,
    stack: isProduction ? undefined : sanitizeString(err.stack)
  };

  if (statusCode >= 500) {
    logger.error(`[API Exception] ${req.method} ${req.originalUrl}: ${errorMessage}`, logData, requestId);
  } else if (statusCode >= 400) {
    logger.warn(`[Client Error] ${req.method} ${req.originalUrl} (${statusCode} ${errorCode}): ${errorMessage}`, logData, requestId);
  }

  // 5. In production, shield technical details on 500 errors
  if (isProduction && statusCode >= 500) {
    errorMessage = 'An internal server error occurred. Our engineering team has been notified.';
    errorCode = ErrorCodes.INTERNAL_SERVER_ERROR;
  }

  // 6. Build consistent error payload
  const errorPayload = {
    code: errorCode,
    message: errorMessage
  };

  // Attach validation issues if present
  if (err.details && (Array.isArray(err.details) || typeof err.details === 'object')) {
    errorPayload.details = err.details;
  }

  const responseJson = {
    success: false,
    error: errorPayload
  };

  // Add requestId at top level if present
  if (requestId) {
    responseJson.requestId = requestId;
  }

  res.status(statusCode).json(responseJson);
}

export default errorMiddleware;
