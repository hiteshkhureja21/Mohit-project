/**
 * Central AI Pipeline Service
 * Coordinates document text retrieval, prompt formulation, OpenAI structured execution,
 * PostgreSQL database persistence in public.ai_requests, and format mapping for the SourceFlow UI.
 */

import crypto from 'crypto';
import { promptService } from './prompt.service.js';
import { openaiService } from './openai.service.js';
import { ocrService } from '../ocr/ocr.service.js';
import { storageService } from '../storage.service.js';
import { getSupabaseClient, isSupabaseConfigured } from '../../config/supabase.js';
import { aiRequests, documents } from '../dataStore.js';

export class AiPipelineService {
  constructor(aiClient = openaiService) {
    this.ai = aiClient;
  }

  /**
   * Resolves raw document text either from direct text input, ocr_results cache,
   * or by triggering the OCR pipeline on the stored document file.
   */
  async resolveDocumentText(params) {
    // 1. Direct text supplied in request body
    if (params.text && typeof params.text === 'string' && params.text.trim().length > 0) {
      return {
        text: params.text.trim(),
        fileId: params.fileId || null,
        sourceType: 'DIRECT_TEXT'
      };
    }

    const fileId = params.fileId || params.documentId;
    const workspaceId = params.workspaceId;

    if (!fileId) {
      const err = new Error('Either document text, fileId, or documentId must be provided.');
      err.code = 'MISSING_DOCUMENT_INPUT';
      err.statusCode = 400;
      throw err;
    }

    // 2. Check existing ocr_results record
    const existingOcr = await ocrService.getOcrResultByFileId(fileId);
    if (existingOcr && existingOcr.extracted_text && existingOcr.extracted_text.trim().length > 0) {
      return {
        text: existingOcr.extracted_text,
        fileId,
        sourceType: 'CACHED_OCR'
      };
    }

    // 3. Fallback to storage retrieval and on-demand extraction
    if (workspaceId) {
      try {
        const access = await storageService.getDownloadAccess(fileId, workspaceId);
        let buffer = access.buffer;
        if (!buffer && access.signedUrl) {
          const fetchRes = await fetch(access.signedUrl);
          if (fetchRes.ok) {
            buffer = Buffer.from(await fetchRes.arrayBuffer());
          }
        }

        if (buffer) {
          const originalName = access.file.original_name || access.file.fileName || access.file.name;
          const mimeType = access.file.mime_type || access.file.mimeType;

          const extraction = await ocrService.extractText({
            buffer,
            originalName,
            mimeType,
            id: fileId,
            workspaceId
          });

          return {
            text: extraction.extractedText,
            fileId,
            sourceType: 'EXTRACTED_ON_DEMAND'
          };
        }
      } catch (storageErr) {
        console.warn('[AiPipelineService] Storage access attempt notice:', storageErr.message);
      }
    }

    // 4. In-memory demo documents fallback
    const demoDoc = documents.find(d => d.id === fileId || d.stored_name === fileId);
    if (demoDoc) {
      const mockText = `SourceFlow Institutional Record: ${demoDoc.title || demoDoc.name}\n` +
        `Summary: Enterprise boundary firewalls and perimeter sensors mitigated 1,420,000 intrusion attempts.\n` +
        `Operational Telemetry: Scada monitoring gateways recorded an estimated 38.4% reduction in dwell time across regional nodes.\n` +
        `Risk: Critical CVE-2026-2144 identified in perimeter SCADA ingress telemetry.\n` +
        `Action: Mandatory cryptographic firmware signing v4.2 recommended within 72 hours.`;

      return {
        text: mockText,
        fileId,
        sourceType: 'MOCK_DOCUMENT_TEXT'
      };
    }

    const notFoundErr = new Error(`Could not find document or extracted text for ID '${fileId}'. Please upload or extract the file first.`);
    notFoundErr.code = 'DOCUMENT_TEXT_NOT_FOUND';
    notFoundErr.statusCode = 404;
    throw notFoundErr;
  }

  /**
   * Executes a named AI operation on document text.
   */
  async executeOperation(operation, params, context = {}) {
    const startTime = Date.now();
    const resolved = await this.resolveDocumentText(params);
    const documentText = resolved.text;
    const fileId = resolved.fileId;
    const userId = params.userId || 'usr-anonymous';
    const workspaceId = params.workspaceId || 'workspace-default';

    // 1. Build defensive prompt with structured output schema
    const promptPayload = promptService.buildPrompt(operation, documentText, context);

    let result;
    let status = 'completed';
    let errorMessage = null;

    try {
      // 2. Call OpenAI Structured Output Service
      result = await this.ai.executeStructuredPrompt(
        {
          ...promptPayload,
          operation
        },
        {
          model: params.model,
          temperature: params.temperature
        }
      );
    } catch (err) {
      status = 'failed';
      errorMessage = err.message;

      // Log failure in database
      await this.logAiRequest({
        userId,
        workspaceId,
        fileId,
        operation,
        model: params.model || 'gpt-4o-mini',
        inputText: documentText.slice(0, 1000),
        outputText: JSON.stringify({ error: err.message, code: err.code }),
        status: 'failed',
        tokensUsed: 0,
        metadata: {
          error: err.message,
          errorCode: err.code,
          executionTimeMs: Date.now() - startTime
        }
      }).catch(logErr => console.warn('[AiPipelineService] Log failure error:', logErr.message));

      throw err;
    }

    // 3. Log successful request in database
    const executionTimeMs = Date.now() - startTime;
    await this.logAiRequest({
      userId,
      workspaceId,
      fileId,
      operation,
      model: result.model,
      inputText: documentText.slice(0, 1000),
      outputText: JSON.stringify(result.data),
      status: 'completed',
      tokensUsed: result.usage.totalTokens,
      metadata: {
        promptTokens: result.usage.promptTokens,
        completionTokens: result.usage.completionTokens,
        executionTimeMs,
        isSimulated: result.isSimulated || false
      }
    });

    return {
      operation,
      data: result.data,
      model: result.model,
      usage: result.usage,
      executionTimeMs,
      fileId
    };
  }

  /**
   * Full document analysis mapped directly to the SourceFlow UI AnalysisSummary format.
   */
  async runAnalysis(params) {
    const rawResult = await this.executeOperation('analyze', params);
    const data = rawResult.data;

    // Map structured result into SourceFlow AnalysisSummary UI interface
    const keyPoints = data.key_points || [];
    const risks = data.risks || [];
    const recommendations = data.recommendations || [];
    const entities = data.entities || [];
    const importantDates = data.important_dates || [];
    const requirements = data.requirements || [];

    const mappedUiResult = {
      findings: keyPoints.length,
      risks: risks.length,
      recommendations: recommendations.length,
      entities: entities.length,
      evidence: requirements.length + importantDates.length,
      importantData: importantDates.length,
      keySummary: keyPoints.length > 0 ? keyPoints : [data.summary],
      summary: data.summary,
      riskList: risks,
      recommendationList: recommendations,
      entityList: entities,
      importantDates,
      requirements,
      metadata: {
        model: rawResult.model,
        tokensUsed: rawResult.usage?.totalTokens || 0,
        executionTimeMs: rawResult.executionTimeMs,
        analyzedAt: new Date().toISOString()
      }
    };

    return mappedUiResult;
  }

  /**
   * Audience Deliverables Generation mapped to SourceFlow Output Studio format.
   */
  async generateDeliverables(params, context = {}) {
    const rawResult = await this.executeOperation('generate', params, context);
    const deliverables = rawResult.data?.deliverables || [];

    return deliverables.map((deliv, idx) => ({
      id: deliv.id || `OUT-${String(idx + 1).padStart(2, '0')}`,
      title: deliv.title,
      audience: deliv.audience,
      format: deliv.format || 'PDF',
      readTime: deliv.readTime || '5 min',
      claimsCited: 12,
      verificationState: 'PENDING_APPROVAL',
      summary: deliv.summary,
      content: deliv.content
    }));
  }

  /**
   * Persists AI request log in PostgreSQL public.ai_requests and in-memory fallback.
   */
  async logAiRequest({ userId, workspaceId, fileId, operation, model, inputText, outputText, status, tokensUsed, metadata }) {
    const requestId = crypto.randomUUID ? crypto.randomUUID() : `ai-req-${Date.now()}`;
    const timestamp = new Date().toISOString();

    const record = {
      id: requestId,
      user_id: userId,
      workspace_id: workspaceId,
      file_id: fileId,
      operation,
      model,
      input_text: inputText,
      output_text: outputText,
      status,
      tokens_used: tokensUsed || 0,
      metadata: metadata || {},
      created_at: timestamp
    };

    aiRequests.unshift(record);

    if (isSupabaseConfigured()) {
      try {
        const supabase = getSupabaseClient();
        await supabase.from('ai_requests').insert(record);
      } catch (dbErr) {
        console.warn('[AiPipelineService] Supabase ai_requests log error:', dbErr.message);
      }
    }

    return record;
  }

  /**
   * Retrieves logged AI requests for a workspace or file.
   */
  async getAiRequests(workspaceId, fileId) {
    if (isSupabaseConfigured()) {
      try {
        const supabase = getSupabaseClient();
        let query = supabase.from('ai_requests').select('*');
        if (workspaceId) query = query.eq('workspace_id', workspaceId);
        if (fileId) query = query.eq('file_id', fileId);
        query = query.order('created_at', { ascending: false });

        const { data, error } = await query;
        if (!error && data) return data;
      } catch (err) {
        console.warn('[AiPipelineService] Query ai_requests notice:', err.message);
      }
    }

    return aiRequests.filter(r => (!workspaceId || r.workspace_id === workspaceId) && (!fileId || r.file_id === fileId));
  }
}

export const aiPipelineService = new AiPipelineService();
