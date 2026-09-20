/**
 * OCR.Space External Provider Integration
 * Communicates with the OCR.Space API to perform optical character recognition
 * on scanned documents and images with timeout, rate limit, and error handling.
 */

import { env } from '../../config/env.js';

export const OCR_SPACE_ENDPOINT = 'https://api.ocr.space/parse/image';
export const DEFAULT_TIMEOUT_MS = 25000;

export class OcrSpaceProvider {
  constructor(apiKey = env.OCR_API_KEY, endpoint = OCR_SPACE_ENDPOINT) {
    this.apiKey = apiKey || '';
    this.endpoint = endpoint;
  }

  /**
   * Performs OCR on a file buffer.
   * @param {Buffer} fileBuffer - Raw document or image buffer
   * @param {string} originalName - Filename for type detection
   * @param {string} mimeType - MIME type (image/png, application/pdf, etc.)
   * @param {Object} options - Custom options (language, timeoutMs)
   */
  async processFile(fileBuffer, originalName, mimeType, options = {}) {
    const timeoutMs = options.timeoutMs || env.OCR_TIMEOUT_MS || DEFAULT_TIMEOUT_MS;
    const language = options.language || 'eng';

    // 1. Validate API Key
    if (!this.apiKey) {
      if (env.DEMO_MODE) {
        // Safe simulated OCR for DEMO_MODE
        return {
          success: true,
          text: `[SIMULATED OCR RESULT - DEMO MODE]\nDocument: ${originalName}\nVerified optical character extraction completed without external network call.`,
          provider: 'ocr.space',
          language,
          confidence: 96.5,
          rawResponse: null
        };
      }

      const err = new Error('OCR.Space API key is not configured. Set OCR_API_KEY in backend/.env or enable DEMO_MODE=true.');
      err.code = 'OCR_KEY_MISSING';
      err.statusCode = 503;
      throw err;
    }

    // 2. Prepare payload
    const base64Data = `data:${mimeType || 'application/octet-stream'};base64,${fileBuffer.toString('base64')}`;
    const formData = new FormData();
    formData.append('base64Image', base64Data);
    formData.append('language', language);
    formData.append('isOverlayRequired', 'false');
    formData.append('detectOrientation', 'true');
    formData.append('scale', 'true');
    formData.append('OCREngine', '2');

    // 3. Setup timeout controller
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

    try {
      const response = await fetch(this.endpoint, {
        method: 'POST',
        headers: {
          apikey: this.apiKey
        },
        body: formData,
        signal: controller.signal
      });

      clearTimeout(timeoutId);

      // 4. Handle HTTP level status codes
      if (response.status === 429) {
        const rateLimitErr = new Error('OCR.Space rate limit exceeded. Please retry after some time.');
        rateLimitErr.code = 'OCR_RATE_LIMIT';
        rateLimitErr.statusCode = 429;
        throw rateLimitErr;
      }

      if (!response.ok) {
        const text = await response.text();
        const err = new Error(`OCR provider request failed with HTTP ${response.status}: ${text}`);
        err.code = 'OCR_PROVIDER_HTTP_ERROR';
        err.statusCode = response.status;
        throw err;
      }

      // 5. Parse JSON response safely
      let data;
      try {
        data = await response.json();
      } catch (jsonErr) {
        const malformedErr = new Error('OCR provider returned malformed, non-JSON response.');
        malformedErr.code = 'OCR_MALFORMED_RESPONSE';
        malformedErr.statusCode = 502;
        throw malformedErr;
      }

      // 6. Check OCR.Space error flags
      if (data.IsErroredOnProcessing) {
        const message =
          (Array.isArray(data.ErrorMessage) ? data.ErrorMessage.join('; ') : data.ErrorMessage) ||
          data.ErrorDetails ||
          'OCR processing error occurred on provider.';

        if (message.includes('E500') || message.toLowerCase().includes('rate limit') || message.toLowerCase().includes('maximum')) {
          const rateErr = new Error(`OCR provider limit reached: ${message}`);
          rateErr.code = 'OCR_RATE_LIMIT';
          rateErr.statusCode = 429;
          throw rateErr;
        }

        const procErr = new Error(`OCR processing failed: ${message}`);
        procErr.code = 'OCR_PROCESSING_FAILED';
        procErr.statusCode = 502;
        throw procErr;
      }

      // 7. Extract parsed text
      const parsedResults = data.ParsedResults;
      if (!Array.isArray(parsedResults) || parsedResults.length === 0) {
        const emptyErr = new Error('OCR provider returned no parsed results.');
        emptyErr.code = 'OCR_EMPTY_RESULTS';
        emptyErr.statusCode = 502;
        throw emptyErr;
      }

      const combinedText = parsedResults.map(r => r.ParsedText || '').join('\n\n');
      const exitCode = parsedResults[0]?.FileParseExitCode;

      if (exitCode !== 1 && exitCode !== 0 && !combinedText.trim()) {
        const pageErr = new Error(`OCR parse exit code failure (${exitCode}): ${parsedResults[0]?.ErrorMessage || 'Unknown error'}`);
        pageErr.code = 'OCR_PAGE_PARSE_ERROR';
        pageErr.statusCode = 502;
        throw pageErr;
      }

      return {
        success: true,
        text: combinedText,
        provider: 'ocr.space',
        language,
        confidence: 95.0,
        rawResponse: data
      };
    } catch (err) {
      clearTimeout(timeoutId);

      if (err.name === 'AbortError') {
        const timeoutErr = new Error(`OCR request timed out after ${timeoutMs}ms.`);
        timeoutErr.code = 'OCR_TIMEOUT';
        timeoutErr.statusCode = 504;
        throw timeoutErr;
      }

      throw err;
    }
  }
}

export const ocrSpaceProvider = new OcrSpaceProvider();
