/**
 * Official OpenAI Client Service
 * STEP 7: Official OpenAI SDK integration for SourceFlow AI Operations
 * 
 * Encapsulates all OpenAI API calls using the official OpenAI Node.js SDK.
 * Features:
 * - Structured Outputs with strict JSON Schemas
 * - Centralized model configuration (env.OPENAI_MODEL)
 * - Configurable timeout handling with AI_TIMEOUT (504)
 * - Rate limiting handling with AI_RATE_LIMITED (429)
 * - Transient retry logic (5xx only, never retrying 4xx auth/validation errors)
 * - Zero credentials exposed to logs or client responses
 */

import OpenAI from 'openai';
import { env } from '../../config/env.js';
import { logger } from '../../utils/logger.js';

export const DEFAULT_AI_MODEL = env.OPENAI_MODEL || 'gpt-4o-mini';
export const DEFAULT_TIMEOUT_MS = env.OPENAI_TIMEOUT_MS || 60000;

export class OpenAIService {
  constructor(apiKey = env.OPENAI_API_KEY, model = DEFAULT_AI_MODEL) {
    this.apiKey = apiKey ? apiKey.trim() : '';
    this.model = model;
    this.client = null;

    if (this.apiKey) {
      this.client = new OpenAI({
        apiKey: this.apiKey,
        timeout: env.OPENAI_TIMEOUT_MS || DEFAULT_TIMEOUT_MS,
        maxRetries: 0 // We manage retries explicitly and conservatively
      });
    }
  }

  /**
   * Reconfigures client if key or model changes dynamically
   */
  getClient(overrideKey) {
    const key = overrideKey || this.apiKey || env.OPENAI_API_KEY;
    if (!key) {
      const err = new Error('OpenAI API key is not configured on the server. Please set OPENAI_API_KEY in backend/.env.');
      err.code = 'AI_AUTH_FAILED';
      err.statusCode = 503;
      throw err;
    }
    return new OpenAI({
      apiKey: key.trim(),
      timeout: env.OPENAI_TIMEOUT_MS || DEFAULT_TIMEOUT_MS,
      maxRetries: 0
    });
  }

  /**
   * Executes a structured chat completion call with defensive timeout and error handling.
   * @param {Object} params - Prompt messages and response_format
   * @param {Array} params.messages - Chat messages (system + user)
   * @param {Object} params.response_format - Structured Outputs json_schema definition
   * @param {string} [params.operation] - Operation name (summarize, analyze, extract, generate)
   * @param {Object} [options] - Overrides (model, temperature, timeoutMs, apiKey)
   */
  async executeStructuredPrompt(params, options = {}) {
    const model = options.model || env.OPENAI_MODEL || this.model || DEFAULT_AI_MODEL;
    const timeoutMs = options.timeoutMs || env.OPENAI_TIMEOUT_MS || DEFAULT_TIMEOUT_MS;
    const client = this.getClient(options.apiKey);

    const startTime = Date.now();
    let attempt = 0;
    const maxAttempts = 2; // Maximum 1 retry for transient 5xx failures only

    while (attempt < maxAttempts) {
      attempt++;
      try {
        const response = await client.chat.completions.create(
          {
            model,
            messages: params.messages,
            response_format: params.response_format,
            temperature: options.temperature !== undefined ? options.temperature : 0.1
          },
          {
            timeout: timeoutMs
          }
        );

        const choice = response.choices && response.choices[0];
        if (!choice || !choice.message || !choice.message.content) {
          const err = new Error('OpenAI returned an empty response.');
          err.code = 'AI_REQUEST_FAILED';
          err.statusCode = 502;
          throw err;
        }

        // Parse structured JSON
        let parsedData;
        try {
          parsedData = JSON.parse(choice.message.content);
        } catch (jsonErr) {
          const err = new Error(`Failed to parse structured JSON from OpenAI: ${jsonErr.message}`);
          err.code = 'AI_REQUEST_FAILED';
          err.statusCode = 502;
          throw err;
        }

        const executionTimeMs = Date.now() - startTime;
        const usage = response.usage || {};

        return {
          success: true,
          data: parsedData,
          model: response.model || model,
          usage: {
            promptTokens: usage.prompt_tokens || 0,
            completionTokens: usage.completion_tokens || 0,
            totalTokens: usage.total_tokens || 0
          },
          executionTimeMs
        };
      } catch (err) {
        // 1. Timeout handling
        if (
          err.name === 'APIConnectionTimeoutError' ||
          err.code === 'ETIMEDOUT' ||
          err.message?.toLowerCase().includes('timeout') ||
          err.message?.toLowerCase().includes('timed out')
        ) {
          const timeoutErr = new Error(`OpenAI request timed out after ${timeoutMs}ms.`);
          timeoutErr.code = 'AI_TIMEOUT';
          timeoutErr.statusCode = 504;
          throw timeoutErr;
        }

        // 2. Rate Limiting (429) - Do not aggressively retry
        if (err.status === 429 || err.code === 'rate_limit_exceeded') {
          const rateErr = new Error('OpenAI API rate limit exceeded. Please retry after a brief delay.');
          rateErr.code = 'AI_RATE_LIMITED';
          rateErr.statusCode = 429;
          throw rateErr;
        }

        // 3. Authentication / Key failure (401) - Permanent, never retry
        if (err.status === 401 || err.code === 'invalid_api_key' || err.message?.toLowerCase().includes('api key')) {
          const authErr = new Error('Invalid or unauthorized OpenAI credentials configured on the server.');
          authErr.code = 'AI_AUTH_FAILED';
          authErr.statusCode = 503;
          throw authErr;
        }

        // 4. Invalid Request (400, 404, 422) - Permanent, never retry
        if (err.status && err.status >= 400 && err.status < 500) {
          const clientErr = new Error(`OpenAI request rejected: ${err.message}`);
          clientErr.code = 'AI_REQUEST_FAILED';
          clientErr.statusCode = 400;
          throw clientErr;
        }

        // 5. Transient Server Errors (500, 502, 503) - Retry once if attempts remain
        const isTransient = err.status >= 500 || err.name === 'APIConnectionError';
        if (isTransient && attempt < maxAttempts) {
          logger.warn(`Transient OpenAI error on attempt ${attempt}. Retrying in 500ms...`);
          await new Promise(r => setTimeout(r, 500));
          continue;
        }

        // Final failure
        const serverErr = new Error('OpenAI external processing failed. Please try again later.');
        serverErr.code = 'AI_REQUEST_FAILED';
        serverErr.statusCode = 502;
        serverErr.technicalDetails = err.message;
        throw serverErr;
      }
    }
  }
}

export const openaiService = new OpenAIService();
export default openaiService;
