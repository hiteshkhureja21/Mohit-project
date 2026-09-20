/**
 * Translation Service
 * Orchestrates machine translation, provider abstraction, file text resolution,
 * validation, and database persistence (public.translations) with resilient fallback.
 */

import { libreTranslateService, STANDARD_LANGUAGES } from './libretranslate.service.js';
import { env } from '../../config/env.js';
import { isSupabaseConfigured, getSupabaseClient } from '../../config/supabase.js';
import { saveTranslation, getTranslationById as getStoredTranslation, listTranslations as listStoredTranslations } from '../dataStore.js';
import { storageService } from '../files/storage.service.js';
import { tryDirectExtraction } from '../ocr/directExtractor.js';
import { logger } from '../../utils/logger.js';

export class TranslationService {
  constructor(provider = libreTranslateService) {
    this.provider = provider;
  }

  /**
   * Hot-swaps or configures the active translation provider
   */
  setProvider(provider) {
    if (!provider || typeof provider.translate !== 'function') {
      throw new Error('Invalid provider: must implement translate() method.');
    }
    this.provider = provider;
  }

  /**
   * Returns current active provider
   */
  getProvider() {
    return this.provider;
  }

  /**
   * Helper to normalize language code across any provider implementation
   */
  normalizeLanguage(lang) {
    if (this.provider && typeof this.provider.normalizeLanguageCode === 'function') {
      return this.provider.normalizeLanguageCode(lang);
    }
    if (!lang || typeof lang !== 'string') return null;
    const clean = lang.trim().toLowerCase();
    const match = clean.match(/^[a-z]{2}(?:-[a-z]{2})?$/);
    return match ? match[0].substring(0, 2) : clean;
  }

  /**
   * Resolves document text from file (via OCR results or direct digital extraction)
   * 
   * @param {string} fileId
   * @param {string} workspaceId
   * @returns {Promise<string>}
   */
  async resolveFileText(fileId, workspaceId) {
    const file = await storageService.getFileById(fileId);
    if (!file) {
      const err = new Error(`File '${fileId}' not found.`);
      err.code = 'FILE_NOT_FOUND';
      err.statusCode = 404;
      throw err;
    }

    const fileWorkspaceId = file.workspace_id || file.workspaceId;
    if (workspaceId && fileWorkspaceId && fileWorkspaceId !== workspaceId) {
      const err = new Error('Access denied. File belongs to another workspace.');
      err.code = 'ACCESS_DENIED';
      err.statusCode = 403;
      throw err;
    }

    let documentText = '';

    // 1. Check existing OCR results in Supabase
    if (isSupabaseConfigured()) {
      try {
        const supabase = getSupabaseClient();
        const { data: ocrRow } = await supabase
          .from('ocr_results')
          .select('extracted_text')
          .eq('file_id', file.id)
          .eq('status', 'completed')
          .order('created_at', { ascending: false })
          .limit(1)
          .maybeSingle();

        if (ocrRow && ocrRow.extracted_text && ocrRow.extracted_text.trim().length > 0) {
          documentText = ocrRow.extracted_text.trim();
        }
      } catch (ocrErr) {
        logger.warn(`Could not query ocr_results: ${ocrErr.message}`);
      }
    }

    // 2. Direct extraction fallback if digital document
    if (!documentText) {
      try {
        const effectiveWsId = workspaceId || fileWorkspaceId;
        const access = await storageService.getDownloadAccess(file.id, effectiveWsId);
        let buffer = access.buffer;

        if (!buffer && access.signedUrl) {
          const fetchRes = await fetch(access.signedUrl);
          if (fetchRes.ok) {
            buffer = Buffer.from(await fetchRes.arrayBuffer());
          }
        }

        if (buffer) {
          const direct = await tryDirectExtraction(buffer, file.original_name || file.name, file.mime_type);
          if (direct && direct.extractedText && direct.extractedText.trim().length > 0) {
            documentText = direct.extractedText.trim();
          }
        }
      } catch (extractErr) {
        logger.warn(`Direct text extraction fallback failed: ${extractErr.message}`);
      }
    }

    if (!documentText || documentText.trim().length === 0) {
      const err = new Error(`No extractable text found in file '${fileId}'. Perform OCR extraction first or provide text directly.`);
      err.code = 'NO_EXTRACTABLE_TEXT';
      err.statusCode = 400;
      throw err;
    }

    return documentText.trim();
  }

  /**
   * Validates and executes text translation
   * 
   * @param {Object} params
   * @param {string} [params.text] - Source text to translate (optional if fileId provided)
   * @param {string} [params.fileId] - Optional file ID to extract text from
   * @param {string} [params.sourceLanguage='auto'] - Source language code or 'auto'
   * @param {string} params.targetLanguage - Target language code
   * @param {string} params.workspaceId - Workspace ID for RBAC & persistence
   * @param {string} params.userId - Authenticated User ID
   * @param {string} [params.format='text'] - 'text' | 'html'
   * @param {number} [params.timeoutMs] - Optional override timeout
   * 
   * @returns {Promise<Object>} TranslationResult conforming to Step 8 specification
   */
  async translateText({
    text,
    fileId = null,
    sourceLanguage = 'auto',
    targetLanguage,
    workspaceId,
    userId,
    format = 'text',
    timeoutMs
  }) {
    // 1. Resolve text from fileId if text not provided or empty
    let cleanText = typeof text === 'string' ? text.trim() : '';

    if (!cleanText && fileId) {
      cleanText = await this.resolveFileText(fileId, workspaceId);
    }

    if (!cleanText) {
      const err = new Error('Translation text is required. Provide non-empty "text" or a valid "fileId".');
      err.code = 'INVALID_INPUT_TEXT';
      err.statusCode = 400;
      throw err;
    }

    // 2. Validate maximum text length (TRANSLATION_MAX_CHARS = 20000)
    const maxChars = env.TRANSLATION_MAX_CHARS || 20000;
    if (cleanText.length > maxChars) {
      const err = new Error(`Translation text length (${cleanText.length} chars) exceeds maximum allowed limit of ${maxChars} characters.`);
      err.code = 'PAYLOAD_TOO_LARGE';
      err.statusCode = 400;
      throw err;
    }

    // 3. Validate target language
    if (!targetLanguage || typeof targetLanguage !== 'string' || targetLanguage.trim() === '') {
      const err = new Error('Target language is required for translation.');
      err.code = 'MISSING_TARGET_LANGUAGE';
      err.statusCode = 400;
      throw err;
    }

    const normTarget = this.normalizeLanguage(targetLanguage);
    if (!normTarget) {
      const err = new Error(`Target language '${targetLanguage}' is invalid or unsupported.`);
      err.code = 'INVALID_TARGET_LANGUAGE';
      err.statusCode = 400;
      throw err;
    }

    const normSource = sourceLanguage ? (this.normalizeLanguage(sourceLanguage) || 'auto') : 'auto';

    // Disallow translating to identical language when explicitly specified
    if (normSource !== 'auto' && normSource === normTarget) {
      const err = new Error(`Source language ('${normSource}') and target language ('${normTarget}') cannot be identical.`);
      err.code = 'IDENTICAL_LANGUAGES';
      err.statusCode = 400;
      throw err;
    }

    // 4. Execute translation with provider
    const startTime = Date.now();
    let result;
    try {
      result = await this.provider.translate({
        text: cleanText,
        sourceLanguage: normSource,
        targetLanguage: normTarget,
        format,
        timeoutMs: timeoutMs || env.TRANSLATION_TIMEOUT_MS || 30000
      });
    } catch (providerErr) {
      // Record failed translation metadata if database / store is active
      await this.persistTranslationRecord({
        workspaceId,
        userId,
        fileId,
        sourceText: cleanText,
        translatedText: '',
        sourceLanguage: normSource,
        targetLanguage: normTarget,
        provider: this.provider.name,
        status: 'failed'
      }).catch(() => {});

      throw providerErr;
    }

    // 4b. Integrity check: Do not silently return original text as if translation succeeded
    if (
      normTarget !== normSource &&
      result.translatedText &&
      result.translatedText.trim() === cleanText &&
      cleanText.length > 5 &&
      /[a-zA-Z]/.test(cleanText)
    ) {
      const err = new Error('Translation provider failed to alter text into target language.');
      err.code = 'TRANSLATION_VERIFICATION_FAILED';
      err.statusCode = 502;
      throw err;
    }

    // 5. Persist translation metadata
    const record = await this.persistTranslationRecord({
      workspaceId,
      userId,
      fileId,
      sourceText: cleanText,
      translatedText: result.translatedText,
      sourceLanguage: result.sourceLanguage || normSource,
      targetLanguage: result.targetLanguage || normTarget,
      provider: result.provider || this.provider.name,
      status: 'completed',
      characterCount: cleanText.length
    });

    const translationId = record.id;

    // 6. Return response conforming to Step 8 specification
    return {
      id: translationId,
      translationId,
      sourceLanguage: result.sourceLanguage || normSource,
      detectedLanguage: result.detectedLanguage || null,
      targetLanguage: result.targetLanguage || normTarget,
      translatedText: result.translatedText,
      provider: result.provider || this.provider.name,
      status: 'COMPLETED',
      fileId: fileId || null,
      workspaceId: workspaceId || null,
      characterCount: cleanText.length,
      durationMs: Date.now() - startTime,
      createdAt: record.created_at || new Date().toISOString()
    };
  }

  /**
   * Retrieves supported languages catalog
   */
  async getSupportedLanguages() {
    return this.provider.getSupportedLanguages();
  }

  /**
   * Retrieves a translation record by ID
   * 
   * @param {string} id - Translation UUID
   * @param {string} [workspaceId] - Optional workspace ID to verify
   * @returns {Promise<Object>}
   */
  async getTranslation(id, workspaceId = null) {
    if (isSupabaseConfigured() && !env.DEMO_MODE) {
      try {
        const supabase = getSupabaseClient();
        let query = supabase
          .from('translations')
          .select('*')
          .eq('id', id);

        if (workspaceId) {
          query = query.eq('workspace_id', workspaceId);
        }

        const { data, error } = await query.maybeSingle();
        if (!error && data) {
          return {
            id: data.id,
            translationId: data.id,
            userId: data.user_id,
            workspaceId: data.workspace_id,
            fileId: data.file_id,
            sourceLanguage: data.source_language,
            targetLanguage: data.target_language,
            sourceText: data.source_text,
            translatedText: data.translated_text,
            provider: data.provider,
            status: data.status ? data.status.toUpperCase() : 'COMPLETED',
            characterCount: data.character_count || (data.source_text ? data.source_text.length : 0),
            createdAt: data.created_at,
            updatedAt: data.updated_at
          };
        }
      } catch (err) {
        logger.warn(`Supabase getTranslation notice: ${err.message}`);
      }
    }

    const stored = getStoredTranslation(id);
    if (!stored) {
      const err = new Error(`Translation with ID '${id}' not found.`);
      err.code = 'TRANSLATION_NOT_FOUND';
      err.statusCode = 404;
      throw err;
    }

    if (workspaceId && (stored.workspace_id || stored.workspaceId) !== workspaceId) {
      const err = new Error(`Access denied. Translation belongs to another workspace.`);
      err.code = 'ACCESS_DENIED';
      err.statusCode = 403;
      throw err;
    }

    return {
      id: stored.id,
      translationId: stored.id,
      userId: stored.user_id || stored.userId,
      workspaceId: stored.workspace_id || stored.workspaceId,
      fileId: stored.file_id || stored.fileId,
      sourceLanguage: stored.source_language || stored.sourceLanguage,
      targetLanguage: stored.target_language || stored.targetLanguage,
      sourceText: stored.source_text || stored.sourceText,
      translatedText: stored.translated_text || stored.translatedText,
      provider: stored.provider,
      status: stored.status ? stored.status.toUpperCase() : 'COMPLETED',
      characterCount: stored.character_count || stored.characterCount || (stored.source_text || stored.sourceText || '').length,
      createdAt: stored.created_at || stored.createdAt,
      updatedAt: stored.updated_at || stored.updatedAt
    };
  }

  /**
   * Lists translation records with filtering and pagination
   * 
   * @param {Object} filter
   * @param {string} [filter.workspaceId]
   * @param {string} [filter.fileId]
   * @param {string} [filter.status]
   * @param {number} [filter.limit=50]
   * @param {number} [filter.offset=0]
   * @returns {Promise<Array>}
   */
  async listTranslations(filter = {}) {
    if (isSupabaseConfigured() && !env.DEMO_MODE) {
      try {
        const supabase = getSupabaseClient();
        let query = supabase
          .from('translations')
          .select('*')
          .order('created_at', { ascending: false });

        if (filter.workspaceId) {
          query = query.eq('workspace_id', filter.workspaceId);
        }
        if (filter.fileId) {
          query = query.eq('file_id', filter.fileId);
        }
        if (filter.status) {
          query = query.eq('status', filter.status.toLowerCase());
        }

        const offset = parseInt(filter.offset || '0', 10);
        const limit = parseInt(filter.limit || '50', 10);
        query = query.range(offset, offset + limit - 1);

        const { data, error } = await query;
        if (!error && Array.isArray(data)) {
          return data.map(row => ({
            id: row.id,
            translationId: row.id,
            userId: row.user_id,
            workspaceId: row.workspace_id,
            fileId: row.file_id,
            sourceLanguage: row.source_language,
            targetLanguage: row.target_language,
            sourceText: row.source_text,
            translatedText: row.translated_text,
            provider: row.provider,
            status: row.status,
            createdAt: row.created_at,
            updatedAt: row.updated_at
          }));
        }
      } catch (err) {
        logger.warn(`Supabase listTranslations notice: ${err.message}`);
      }
    }

    const storedList = listStoredTranslations(filter);
    return storedList.map(item => ({
      id: item.id,
      translationId: item.id,
      userId: item.user_id || item.userId,
      workspaceId: item.workspace_id || item.workspaceId,
      fileId: item.file_id || item.fileId,
      sourceLanguage: item.source_language || item.sourceLanguage,
      targetLanguage: item.target_language || item.targetLanguage,
      sourceText: item.source_text || item.sourceText,
      translatedText: item.translated_text || item.translatedText,
      provider: item.provider,
      status: item.status,
      createdAt: item.created_at || item.createdAt,
      updatedAt: item.updated_at || item.updatedAt
    }));
  }

  /**
   * Persists translation record to Supabase public.translations or fallback dataStore
   */
  async persistTranslationRecord(data) {
    const payload = {
      workspace_id: data.workspaceId,
      user_id: data.userId,
      file_id: data.fileId || null,
      source_text: data.sourceText,
      translated_text: data.translatedText || '',
      source_language: data.sourceLanguage,
      target_language: data.targetLanguage,
      provider: data.provider || 'libretranslate',
      status: data.status || 'completed',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };

    if (isSupabaseConfigured() && !env.DEMO_MODE) {
      try {
        const supabase = getSupabaseClient();
        const { data: inserted, error } = await supabase
          .from('translations')
          .insert(payload)
          .select()
          .single();

        if (!error && inserted) {
          return inserted;
        }
      } catch (err) {
        logger.warn(`Supabase persist translations notice: ${err.message}`);
      }
    }

    return saveTranslation(payload);
  }
}

export const translationService = new TranslationService();
