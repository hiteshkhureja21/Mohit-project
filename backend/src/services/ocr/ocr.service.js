/**
 * Central Document Text Extraction & OCR Service
 * Orchestrates the extraction pipeline:
 * 1. Determine file type
 * 2. Try direct text extraction for electronic documents (PDF, TXT, MD, CSV)
 * 3. Fallback to OCR.Space for scanned documents and images
 * 4. Normalize and clean extracted text
 * 5. Persist extraction record to ocr_results in database
 * 6. Return standardized extraction response
 */

import crypto from 'crypto';
import { normalizeText } from './textNormalizer.js';
import { tryDirectExtraction, classifyDocument } from './directExtractor.js';
import { ocrSpaceProvider } from './ocrSpace.provider.js';
import { getSupabaseClient, isSupabaseConfigured } from '../../config/supabase.js';
import { ocrResults } from '../dataStore.js';

export class OcrService {
  constructor(provider = ocrSpaceProvider) {
    this.ocrProvider = provider;
  }

  /**
   * Main text extraction interface.
   * @param {Object} file - File payload
   * @param {Buffer} file.buffer - Binary file content (or fileBuffer)
   * @param {string} file.originalName - Name of the file (or original_name / name / fileName)
   * @param {string} file.mimeType - MIME type of the file (or mime_type)
   * @param {string} [file.id] - Optional file ID from files table
   * @param {string} [file.workspaceId] - Optional workspace ID
   * @param {Object} [options] - Options (language, timeoutMs)
   * @returns {Promise<Object>} Standardized extraction result
   */
  async extractText(file, options = {}) {
    const fileBuffer = file.buffer || file.fileBuffer;
    const originalName = file.originalName || file.original_name || file.fileName || file.name || 'document';
    const mimeType = file.mimeType || file.mime_type || 'application/octet-stream';
    const fileId = file.id || file.fileId || `file-${Date.now()}`;
    const workspaceId = file.workspaceId || file.workspace_id;

    if (!fileBuffer || !Buffer.isBuffer(fileBuffer) || fileBuffer.length === 0) {
      const err = new Error('A valid, non-empty file buffer is required for text extraction.');
      err.code = 'EMPTY_FILE_BUFFER';
      err.statusCode = 400;
      throw err;
    }

    // 1. Classify file type
    const classification = classifyDocument(originalName, mimeType);
    if (classification.type === 'UNSUPPORTED') {
      const err = new Error(`Unsupported document format '${classification.ext || 'unknown'}'. Supported: PDF, Images (PNG, JPG), Text (TXT, MD, CSV, JSON).`);
      err.code = 'UNSUPPORTED_DOCUMENT_TYPE';
      err.statusCode = 400;
      throw err;
    }

    let rawText = '';
    let providerName = 'direct_text';
    let language = options.language || 'eng';
    let isScanned = false;
    let pageCount = 1;
    let confidence = 99.0;
    let executionError = null;

    try {
      // 2. Try direct text extraction where appropriate (Digital PDF, TXT, MD, CSV)
      const directResult = await tryDirectExtraction(fileBuffer, originalName, mimeType);

      if (directResult.success) {
        rawText = directResult.text;
        providerName = directResult.provider;
        isScanned = false;
        pageCount = directResult.pageCount || 1;
        confidence = 99.0;
      } else if (directResult.isScanned) {
        // 3. Document is scanned PDF or image → Route to OCR.Space
        isScanned = true;
        const ocrResult = await this.ocrProvider.processFile(fileBuffer, originalName, mimeType, {
          language,
          timeoutMs: options.timeoutMs
        });

        rawText = ocrResult.text;
        providerName = ocrResult.provider || 'ocr_space';
        language = ocrResult.language || language;
        confidence = ocrResult.confidence || 95.0;
        pageCount = directResult.pageCount || 1;
      } else {
        throw new Error(directResult.reason || 'Document extraction could not be completed.');
      }
    } catch (err) {
      executionError = err;
      // Persist failure state in database if fileId is tracked
      await this.saveOcrResult({
        fileId,
        extractedText: '',
        language,
        provider: providerName,
        status: 'failed',
        confidence: 0,
        metadata: {
          error: err.message,
          errorCode: err.code || 'EXTRACTION_ERROR',
          originalName,
          failedAt: new Date().toISOString()
        }
      }).catch(saveErr => console.warn('[OcrService] Failed to record failure state:', saveErr.message));

      throw err;
    }

    // 4. Clean & normalize extracted text
    const normalized = normalizeText(rawText);

    // 5. Save result in ocr_results table
    const savedRecord = await this.saveOcrResult({
      fileId,
      extractedText: normalized.text,
      language,
      provider: providerName,
      status: 'completed',
      confidence,
      metadata: {
        characterCount: normalized.characterCount,
        wordCount: normalized.wordCount,
        lineCount: normalized.lineCount,
        isScanned,
        pageCount,
        originalName,
        mimeType,
        extractedAt: new Date().toISOString()
      }
    });

    // 6. Return standardized processing result
    return {
      success: true,
      id: savedRecord.id,
      fileId,
      extractedText: normalized.text,
      language,
      provider: providerName,
      isScanned,
      pageCount,
      confidence,
      metrics: {
        characterCount: normalized.characterCount,
        wordCount: normalized.wordCount,
        lineCount: normalized.lineCount
      },
      status: 'completed',
      createdAt: savedRecord.created_at || new Date().toISOString()
    };
  }

  /**
   * Persists extraction result into database (or in-memory store).
   */
  async saveOcrResult({ fileId, extractedText, language, provider, status, confidence, metadata }) {
    const resultId = crypto.randomUUID ? crypto.randomUUID() : `ocr-${Date.now()}`;
    const timestamp = new Date().toISOString();

    const inMemoryRecord = {
      id: resultId,
      file_id: fileId,
      extracted_text: extractedText,
      language: language || 'eng',
      provider: provider || 'direct_text',
      status: status || 'completed',
      confidence: confidence || null,
      metadata: metadata || {},
      created_at: timestamp
    };

    ocrResults.unshift(inMemoryRecord);

    if (isSupabaseConfigured()) {
      try {
        const supabase = getSupabaseClient();
        const { data, error } = await supabase
          .from('ocr_results')
          .insert({
            id: resultId,
            file_id: fileId,
            extracted_text: extractedText,
            language: language || 'eng',
            provider: provider || 'direct_text',
            status: status || 'completed',
            confidence: confidence || null,
            metadata: metadata || {}
          })
          .select()
          .single();

        if (!error && data) {
          return data;
        }
        if (error) {
          console.warn('[OcrService] Supabase ocr_results insertion notice:', error.message);
        }
      } catch (dbErr) {
        console.warn('[OcrService] Database insertion error:', dbErr.message);
      }
    }

    return inMemoryRecord;
  }

  /**
   * Retrieves stored OCR results for a specific file.
   */
  async getOcrResultByFileId(fileId) {
    if (isSupabaseConfigured()) {
      const supabase = getSupabaseClient();
      const { data, error } = await supabase
        .from('ocr_results')
        .select('*')
        .eq('file_id', fileId)
        .order('created_at', { ascending: false })
        .limit(1)
        .single();

      if (!error && data) return data;
    }

    return ocrResults.find(r => r.file_id === fileId) || null;
  }
}

export const ocrService = new OcrService();
