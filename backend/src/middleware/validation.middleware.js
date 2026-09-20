/**
 * Input Validation Middleware using Zod
 * Enforces declarative, schema-based validation on request bodies, queries, and params.
 * Returns HTTP 400 with structured validation details on failure.
 */

import { z } from 'zod';
import { ValidationError } from '../utils/errors.js';

/**
 * Creates an Express middleware to validate req.body against a Zod schema.
 */
export function validateBody(schema) {
  return (req, res, next) => {
    const result = schema.safeParse(req.body);
    if (!result.success) {
      const issues = result.error.issues || result.error.errors || [];
      const formattedErrors = issues.map((err) => ({
        field: Array.isArray(err.path) ? err.path.join('.') : String(err.path || ''),
        message: err.message,
        code: err.code
      }));

      return next(new ValidationError('Invalid request payload.', 'VALIDATION_ERROR', formattedErrors));
    }

    req.body = result.data;
    next();
  };
}

/**
 * Creates an Express middleware to validate req.query against a Zod schema.
 */
export function validateQuery(schema) {
  return (req, res, next) => {
    const result = schema.safeParse(req.query);
    if (!result.success) {
      const issues = result.error.issues || result.error.errors || [];
      const formattedErrors = issues.map((err) => ({
        field: Array.isArray(err.path) ? err.path.join('.') : String(err.path || ''),
        message: err.message,
        code: err.code
      }));

      return next(new ValidationError('Invalid query parameters.', 'VALIDATION_ERROR', formattedErrors));
    }

    req.query = result.data;
    next();
  };
}

/**
 * Standard Zod Schemas for SourceFlow Routes
 */

// 1. Translation Schema
export const translateRequestSchema = z.object({
  text: z.string().max(20000, 'Text exceeds maximum allowed limit of 20,000 characters.').optional(),
  targetLanguage: z.string({
    required_error: 'Target language is required.'
  }).min(1, 'Target language cannot be empty.').max(60, 'Invalid language code or name format.'),
  sourceLanguage: z.string().max(60, 'Invalid language code or name format.').optional().default('auto'),
  workspaceId: z.string().optional(),
  fileId: z.string().optional()
}).refine(data => (data.text && data.text.trim().length > 0) || (data.fileId && data.fileId.trim().length > 0), {
  message: 'Either "text" or "fileId" must be provided for translation.',
  path: ['text']
});

// 2. Claim Verification Schema
export const claimVerifySchema = z.object({
  claimText: z.string({
    required_error: 'claimText is required.'
  }).min(1, 'Claim text cannot be empty.'),
  anchorPassage: z.string().optional().default(''),
  sourceText: z.string().optional().default('')
});

// 3. Claim Create Schema
export const claimCreateSchema = z.object({
  claimText: z.string({
    required_error: 'claimText is required.'
  }).min(1, 'Claim text cannot be empty.'),
  transformationId: z.string().optional(),
  sourceFileId: z.string().optional(),
  evidence: z.string().optional().default(''),
  status: z.enum(['pending', 'supported', 'unsupported', 'needs_review']).optional().default('pending'),
  confidence: z.number().min(0).max(1).optional().default(0.8)
});

// 4. Workspace Member Add Schema
export const addMemberSchema = z.object({
  email: z.string().email('A valid email address is required.'),
  role: z.enum(['owner', 'editor', 'viewer'], {
    errorMap: () => ({ message: "Role must be one of: 'owner', 'editor', 'viewer'" })
  })
});

// 5. AI Prompt Schema
export const aiPromptSchema = z.object({
  operation: z.enum(['summarize', 'analyze', 'extract', 'generate', 'classify', 'claims', 'grounding']),
  prompt: z.string().optional(),
  documentText: z.string().optional(),
  fileId: z.string().optional(),
  workspaceId: z.string().optional(),
  format: z.string().optional(),
  audience: z.string().optional()
});
