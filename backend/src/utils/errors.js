/**
 * Centralized Application Error Hierarchy & Standard Error Codes
 * Provides consistent HTTP status codes and domain error codes across SourceFlow.
 */

export const ErrorCodes = {
  // Authentication & Authorization
  AUTH_REQUIRED: 'AUTH_REQUIRED',
  ACCESS_DENIED: 'ACCESS_DENIED',
  INVALID_TOKEN: 'INVALID_TOKEN',

  // Files & Storage
  FILE_NOT_FOUND: 'FILE_NOT_FOUND',
  FILE_TOO_LARGE: 'FILE_TOO_LARGE',
  INVALID_FILE_TYPE: 'INVALID_FILE_TYPE',
  UPLOAD_FAILED: 'UPLOAD_FAILED',
  DOWNLOAD_FAILED: 'DOWNLOAD_FAILED',
  DELETE_FAILED: 'DELETE_FAILED',
  STORAGE_ERROR: 'STORAGE_ERROR',

  // OCR Processing
  OCR_FAILED: 'OCR_FAILED',
  OCR_TIMEOUT: 'OCR_TIMEOUT',

  // AI Generation & Operations
  AI_REQUEST_FAILED: 'AI_REQUEST_FAILED',
  AI_TIMEOUT: 'AI_TIMEOUT',
  AI_RATE_LIMITED: 'AI_RATE_LIMITED',

  // Translation
  TRANSLATION_FAILED: 'TRANSLATION_FAILED',
  TRANSLATION_TIMEOUT: 'TRANSLATION_TIMEOUT',

  // Generic & Infrastructure
  VALIDATION_ERROR: 'VALIDATION_ERROR',
  BAD_REQUEST: 'BAD_REQUEST',
  NOT_FOUND: 'NOT_FOUND',
  CONFLICT: 'CONFLICT',
  RATE_LIMIT_EXCEEDED: 'RATE_LIMIT_EXCEEDED',
  DATABASE_ERROR: 'DATABASE_ERROR',
  EXTERNAL_API_ERROR: 'EXTERNAL_API_ERROR',
  INTERNAL_SERVER_ERROR: 'INTERNAL_SERVER_ERROR'
};

/**
 * Base Application Error
 */
export class AppError extends Error {
  constructor(message, statusCode = 500, code = ErrorCodes.INTERNAL_SERVER_ERROR, details = null) {
    super(message);
    this.name = this.constructor.name;
    this.statusCode = statusCode;
    this.status = statusCode;
    this.code = code;
    this.details = details;
    this.isOperational = true;

    Error.captureStackTrace(this, this.constructor);
  }
}

// 400 Bad Request
export class BadRequestError extends AppError {
  constructor(message = 'Invalid request parameters.', code = ErrorCodes.BAD_REQUEST, details = null) {
    super(message, 400, code, details);
  }
}

// 401 Unauthorized
export class UnauthorizedError extends AppError {
  constructor(message = 'Authentication required.', code = ErrorCodes.AUTH_REQUIRED, details = null) {
    super(message, 401, code, details);
  }
}

// 403 Forbidden
export class ForbiddenError extends AppError {
  constructor(message = 'Access denied.', code = ErrorCodes.ACCESS_DENIED, details = null) {
    super(message, 403, code, details);
  }
}

// 404 Not Found
export class NotFoundError extends AppError {
  constructor(message = 'The requested resource could not be found.', code = ErrorCodes.NOT_FOUND, details = null) {
    super(message, 404, code, details);
  }
}

// 409 Conflict
export class ConflictError extends AppError {
  constructor(message = 'A conflict occurred with the current state of the resource.', code = ErrorCodes.CONFLICT, details = null) {
    super(message, 409, code, details);
  }
}

// 422 Validation Error
export class ValidationError extends AppError {
  constructor(message = 'Validation failed for request payload.', code = ErrorCodes.VALIDATION_ERROR, details = null) {
    super(message, 422, code, details);
  }
}

// 429 Rate Limited
export class RateLimitError extends AppError {
  constructor(message = 'Too many requests. Please try again later.', code = ErrorCodes.RATE_LIMIT_EXCEEDED, details = null) {
    super(message, 429, code, details);
  }
}

// 500 Internal Error
export class InternalServerError extends AppError {
  constructor(message = 'An unexpected internal error occurred.', code = ErrorCodes.INTERNAL_SERVER_ERROR, details = null) {
    super(message, 500, code, details);
  }
}

// 500 Database Error
export class DatabaseError extends AppError {
  constructor(message = 'A database operation failed.', code = ErrorCodes.DATABASE_ERROR, details = null) {
    super(message, 500, code, details);
  }
}

// 502 External Provider Error
export class ExternalProviderError extends AppError {
  constructor(message = 'External service provider error.', code = ErrorCodes.EXTERNAL_API_ERROR, details = null) {
    super(message, 502, code, details);
  }
}

// 504 Provider Timeout Error
export class ProviderTimeoutError extends AppError {
  constructor(message = 'Upstream provider request timed out.', code = ErrorCodes.AI_TIMEOUT, details = null) {
    super(message, 504, code, details);
  }
}
