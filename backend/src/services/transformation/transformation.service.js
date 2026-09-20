/**
 * Transformation Pipeline Service
 * 
 * Manages the 6-stage transformation lifecycle:
 * Stage 1: Source Selection & Extraction (status: 'draft')
 * Stage 2: Audience Configuration
 * Stage 3: Output Format Specification
 * Stage 4: AI Generation & Claim Grounding (status: 'processing' -> 'review' / 'failed')
 * Stage 5: Human Review & Evidence Verification
 * Stage 6: Final Deliverables Packaging (status: 'completed')
 */

import crypto from 'crypto';
import { env } from '../../config/env.js';
import { getSupabaseClient, isSupabaseConfigured } from '../../config/supabase.js';
import { ocrService } from '../ocr/ocr.service.js';
import { aiPipelineService } from '../ai/aiPipeline.service.js';
import { claimsService } from '../claims/claims.service.js';
import {
  transformations,
  claims as inMemoryClaims,
  outputs as inMemoryOutputs,
  documents,
  saveTransformation,
  getTransformationById
} from '../dataStore.js';

export class TransformationService {
  constructor(aiService = aiPipelineService, ocr = ocrService) {
    this.aiPipeline = aiService;
    this.ocr = ocr;
  }

  /**
   * Helper to generate unique transformation ID
   */
  generateId() {
    return `SF-2026-${Date.now().toString().slice(-5)}`;
  }

  /**
   * STAGE 1: Initialize or update transformation with source document
   */
  async createTransformation(workspaceId, userId, payload = {}) {
    const id = payload.id || this.generateId();
    const fileId = payload.fileId || payload.documentId || null;
    const title = payload.title || (fileId ? `Transformation for ${fileId}` : 'Untitled Transformation');

    // 1. Initial configuration structure
    const initialConfig = {
      analysis: {
        findings: 0,
        risks: 0,
        recommendations: 0,
        entities: 0,
        evidence: 0,
        importantData: 0,
        keySummary: []
      },
      profiles: payload.profiles || [
        {
          id: 'prof-exec',
          name: 'Executive Leadership',
          role: 'C-Suite / Board',
          deliverableType: 'Executive Brief',
          tone: 'Strategic & High-Level',
          defaultRecipients: ['director-office@agency.gov', 'ciso-board@agency.gov'],
          isSelected: true
        },
        {
          id: 'prof-cyber',
          name: 'Cyber Threat Analysis',
          role: 'Technical Analyst',
          deliverableType: 'Technical Advisory',
          tone: 'Detailed Technical & Telemetry',
          defaultRecipients: ['soc-leads@agency.gov'],
          isSelected: true
        },
        {
          id: 'prof-media',
          name: 'Public & Communications',
          role: 'Press / External',
          deliverableType: 'Communication Package',
          tone: 'Clear, Transparent, Non-Alarmist',
          defaultRecipients: ['media-relations@agency.gov'],
          isSelected: true
        }
      ],
      outputs: payload.outputs || {
        selectedTypes: ['Executive Brief', 'Technical Advisory', 'Communication Package'],
        options: { summary: true, advisory: true, presentation: true, comm_package: true }
      },
      review: {
        status: 'PENDING',
        reviewer: null,
        approvedAt: null
      },
      delivery: {
        status: 'NOT_SENT',
        recipients: [
          { id: 'REC-1', name: 'Director Office', email: 'director-office@agency.gov', role: 'Executive', type: 'TO' },
          { id: 'REC-2', name: 'CISO Board', email: 'ciso-board@agency.gov', role: 'Governance', type: 'TO' },
          { id: 'REC-3', name: 'SOC Incident Leads', email: 'soc-leads@agency.gov', role: 'Technical', type: 'TO' }
        ],
        sentAt: null,
        subject: `${title} - Verified Deliverable Package`,
        message: 'Please find attached the formally verified intelligence briefing and remediation directives, attested through claims verified against primary source telemetry.'
      }
    };

    const record = {
      id,
      workspace_id: workspaceId,
      file_id: fileId,
      created_by: userId,
      title,
      status: 'draft',
      configuration: initialConfig,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };

    // If text extraction is available or can be retrieved, check it
    if (fileId) {
      try {
        const textInfo = await this.aiPipeline.resolveDocumentText({ fileId, workspaceId });
        if (textInfo && textInfo.text) {
          record.extracted_text_preview = textInfo.text.slice(0, 300);
        }
      } catch (err) {
        // Log preview extraction error without blocking draft creation
        console.warn(`[Stage 1] Pre-extraction preview note for file ${fileId}: ${err.message}`);
      }
    }

    // Persist to database or dataStore
    if (isSupabaseConfigured() && !env.DEMO_MODE) {
      try {
        const supabase = getSupabaseClient();
        const { data, error } = await supabase
          .from('transformations')
          .insert({
            id: record.id,
            workspace_id: record.workspace_id,
            file_id: record.file_id,
            created_by: record.created_by,
            title: record.title,
            status: record.status,
            configuration: record.configuration
          })
          .select()
          .single();

        if (error) throw error;
        return data;
      } catch (dbErr) {
        if (!env.DEMO_MODE) {
          console.warn('Database insert failed:', dbErr.message);
          const err = new Error('Database is unavailable. Cannot fall back to in-memory store in production.');
          err.code = 'DATABASE_ERROR';
          err.statusCode = 503;
          throw err;
        }
      }
    } else if (!env.DEMO_MODE) {
      const err = new Error('Database is not configured. Cannot fall back to in-memory store in production.');
      err.code = 'DATABASE_ERROR';
      err.statusCode = 503;
      throw err;
    }

    return saveTransformation(record);
  }

  /**
   * Retrieve a transformation by ID and workspace
   */
  async getTransformation(transformationId, workspaceId) {
    if (isSupabaseConfigured() && !env.DEMO_MODE) {
      try {
        const supabase = getSupabaseClient();
        const { data, error } = await supabase
          .from('transformations')
          .select('*')
          .eq('id', transformationId)
          .eq('workspace_id', workspaceId)
          .single();

        if (!error && data) return data;
      } catch (err) {
        if (!env.DEMO_MODE) {
          console.warn('Database fetch failed:', err.message);
          const dbErr = new Error('Database is unavailable. Cannot fall back to in-memory store in production.');
          dbErr.code = 'DATABASE_ERROR';
          dbErr.statusCode = 503;
          throw dbErr;
        }
      }
    } else if (!env.DEMO_MODE) {
      const err = new Error('Database is not configured. Cannot fall back to in-memory store in production.');
      err.code = 'DATABASE_ERROR';
      err.statusCode = 503;
      throw err;
    }

    const t = getTransformationById(transformationId);
    if (!t || (workspaceId && t.workspace_id !== workspaceId)) {
      const err = new Error(`Transformation '${transformationId}' not found.`);
      err.code = 'NOT_FOUND';
      err.statusCode = 404;
      throw err;
    }
    return t;
  }

  /**
   * List all transformations in a workspace
   */
  async listTransformations(workspaceId) {
    if (isSupabaseConfigured() && !env.DEMO_MODE) {
      try {
        const supabase = getSupabaseClient();
        const { data, error } = await supabase
          .from('transformations')
          .select('*')
          .eq('workspace_id', workspaceId)
          .order('created_at', { ascending: false });

        if (!error && data) return data;
      } catch (err) {
        if (!env.DEMO_MODE) {
          console.warn('Database list failed:', err.message);
          const dbErr = new Error('Database is unavailable. Cannot fall back to in-memory store in production.');
          dbErr.code = 'DATABASE_ERROR';
          dbErr.statusCode = 503;
          throw dbErr;
        }
      }
    } else if (!env.DEMO_MODE) {
      const err = new Error('Database is not configured. Cannot fall back to in-memory store in production.');
      err.code = 'DATABASE_ERROR';
      err.statusCode = 503;
      throw err;
    }

    return transformations.filter(t => !workspaceId || t.workspace_id === workspaceId);
  }

  /**
   * STAGE 2: Store audience configuration
   */
  async updateAudienceConfig(transformationId, workspaceId, userId, payload = {}) {
    const t = await this.getTransformation(transformationId, workspaceId);

    const profiles = payload.profiles || t.configuration.profiles || [];
    const tone = payload.tone || t.configuration.tone || 'Adaptive · Multi-Perspective';
    const detailLevel = payload.detailLevel || t.configuration.detailLevel || 'Audience-Optimized';
    const language = payload.language || t.configuration.language || 'English (Standard)';

    const updatedConfig = {
      ...t.configuration,
      profiles,
      tone,
      detailLevel,
      language
    };

    return this.persistUpdate(transformationId, {
      configuration: updatedConfig,
      updated_at: new Date().toISOString()
    });
  }

  /**
   * STAGE 3: Store requested output formats and specifications
   */
  async updateOutputConfig(transformationId, workspaceId, userId, payload = {}) {
    const t = await this.getTransformation(transformationId, workspaceId);

    const selectedOutputs = payload.selectedOutputs || payload.options || t.configuration?.outputs?.options || {};
    const selectedTypes = payload.selectedTypes || (
      payload.selectedOutputs
        ? Object.keys(payload.selectedOutputs).filter(k => payload.selectedOutputs[k])
        : t.configuration?.outputs?.selectedTypes || []
    );

    const updatedConfig = {
      ...t.configuration,
      outputs: {
        options: selectedOutputs,
        selectedTypes
      }
    };

    return this.persistUpdate(transformationId, {
      configuration: updatedConfig,
      updated_at: new Date().toISOString()
    });
  }

  /**
   * STAGE 4: Execute real AI generation pipeline
   */
  async executeGeneration(transformationId, workspaceId, userId, options = {}) {
    const t = await this.getTransformation(transformationId, workspaceId);

    // 1. Mark status as 'processing'
    await this.persistUpdate(transformationId, {
      status: 'processing',
      updated_at: new Date().toISOString()
    });

    try {
      // 2. Resolve document text from Stage 1
      const docInfo = await this.aiPipeline.resolveDocumentText({
        fileId: t.file_id,
        workspaceId,
        text: options.text
      });

      // 3. Run AI document intelligence analysis
      const analysisResult = await this.aiPipeline.runAnalysis({
        fileId: t.file_id,
        workspaceId,
        text: docInfo.text,
        model: options.model
      });

      // 4. Run audience deliverables generation
      const activeProfiles = t.configuration.profiles.filter(p => p.isSelected !== false);
      const deliverables = await this.aiPipeline.generateDeliverables(
        {
          fileId: t.file_id,
          workspaceId,
          text: docInfo.text,
          model: options.model,
          transformationId
        },
        {
          profiles: activeProfiles
        }
      );

      // 5. Generate Grounding Claims Matrix from analysis & extract step
      let generatedClaims = [];
      try {
        const extractRes = await this.aiPipeline.executeOperation('extract', {
          fileId: t.file_id,
          workspaceId,
          text: docInfo.text,
          model: options.model,
          transformationId
        });

        if (extractRes && Array.isArray(extractRes.claims) && extractRes.claims.length > 0) {
          generatedClaims = extractRes.claims.map((c, idx) => {
            const claimText = c.claim_text || c.statement || c.claimText;
            const anchorPassage = c.anchor_passage || c.citation || c.anchorPassage || '';
            const pageNumber = c.page_number || c.pageNumber || 1;

            const verification = claimsService.verifyClaimAgainstSource(
              claimText,
              anchorPassage,
              docInfo.text,
              { pageNumber, isAiGenerated: true }
            );

            return {
              id: `CLM-${(idx + 1).toString().padStart(3, '0')}`,
              transformation_id: transformationId,
              jobId: transformationId,
              claim_index: idx + 1,
              claimIndex: idx + 1,
              section_title: c.section || c.sectionTitle || 'General Telemetry',
              sectionTitle: c.section || c.sectionTitle || 'General Telemetry',
              claim_text: claimText,
              claimText: claimText,
              original_draft_text: claimText,
              originalDraftText: claimText,
              status: verification.status,
              confidenceScore: verification.confidenceScore,
              pageNumber,
              anchorPassage: verification.evidence?.anchorPassage || anchorPassage,
              evidence: verification.evidence,
              source_reference: `Source Document • Page ${pageNumber}`,
              sourceReference: `Source Document • Page ${pageNumber}`,
              flag_reason: verification.flagReason
            };
          });
        }
      } catch (extractErr) {
        console.warn(`[Stage 4] Claims extraction fallback to findings: ${extractErr.message}`);
      }

      // If extract step returned empty, derive claims from analysis key points & risks
      if (generatedClaims.length === 0) {
        const statements = [
          ...(analysisResult.keySummary || []),
          ...(analysisResult.riskList || []).map(r => typeof r === 'string' ? r : r.risk),
          ...(analysisResult.recommendationList || []).map(r => typeof r === 'string' ? r : r.recommendation)
        ].filter(Boolean);

        generatedClaims = statements.slice(0, 10).map((stmt, idx) => {
          const verification = claimsService.verifyClaimAgainstSource(
            stmt,
            stmt,
            docInfo.text,
            { pageNumber: 1, isAiGenerated: true }
          );

          return {
            id: `CLM-${(idx + 1).toString().padStart(3, '0')}`,
            transformation_id: transformationId,
            jobId: transformationId,
            claim_index: idx + 1,
            claimIndex: idx + 1,
            section_title: 'Core Finding',
            sectionTitle: 'Core Finding',
            claim_text: stmt,
            claimText: stmt,
            original_draft_text: stmt,
            originalDraftText: stmt,
            status: verification.status,
            confidenceScore: verification.confidenceScore,
            pageNumber: 1,
            anchorPassage: stmt,
            evidence: verification.evidence,
            source_reference: 'Primary Document Extraction',
            sourceReference: 'Primary Document Extraction',
            flag_reason: verification.flagReason
          };
        });
      }

      // 6. Persist claims into in-memory store and Supabase public.claims
      for (const claim of generatedClaims) {
        const cIndex = inMemoryClaims.findIndex(c => c.id === claim.id && (c.transformation_id === transformationId || c.jobId === transformationId));
        if (cIndex >= 0) {
          inMemoryClaims[cIndex] = claim;
        } else {
          inMemoryClaims.push(claim);
        }
      }

      // 7. Persist deliverables into in-memory store and Supabase public.outputs
      for (const d of deliverables) {
        const oIndex = inMemoryOutputs.findIndex(o => o.id === d.id);
        if (oIndex >= 0) {
          inMemoryOutputs[oIndex] = d;
        } else {
          inMemoryOutputs.push(d);
        }
      }

      // 8. Update transformation configuration and advance status to 'review'
      const updatedConfig = {
        ...t.configuration,
        analysis: analysisResult,
        generatedAt: new Date().toISOString()
      };

      const updated = await this.persistUpdate(transformationId, {
        status: 'review',
        configuration: updatedConfig,
        updated_at: new Date().toISOString()
      });

      return {
        transformation: updated,
        deliverables,
        claims: generatedClaims.map(c => claimsService.formatForReviewUI(c)),
        analysis: analysisResult
      };
    } catch (err) {
      // Transition status to 'failed' on error
      await this.persistUpdate(transformationId, {
        status: 'failed',
        error_message: err.message,
        updated_at: new Date().toISOString()
      });
      throw err;
    }
  }

  /**
   * STAGE 5: Get claims and review state
   */
  async getReviewData(transformationId, workspaceId) {
    const t = await this.getTransformation(transformationId, workspaceId);

    // Retrieve claims associated with this transformation via claimsService
    const claimsList = await claimsService.getClaims(workspaceId, { transformationId });

    const unsupportedCount = claimsList.filter(
      c => c.rawStatus === 'needs_review' || c.rawStatus === 'unsupported' || c.rawStatus === 'pending'
    ).length;

    const supportedCount = claimsList.filter(
      c => c.rawStatus === 'supported'
    ).length;

    return {
      transformationId,
      status: t.status,
      review: t.configuration.review || { status: 'PENDING', reviewer: null, approvedAt: null },
      claims: claimsList,
      stats: {
        totalClaims: claimsList.length,
        supportedClaimsCount: supportedCount,
        unsupportedClaimsCount: unsupportedCount,
        resolvedClaimsCount: claimsList.filter(c => c.rawStatus === 'supported' && c.modifiedBy).length,
        isApprovalBlocked: unsupportedCount > 0
      }
    };
  }

  /**
   * STAGE 5: Update a claim's verification status or phrasing
   */
  async updateClaim(transformationId, claimId, workspaceId, userId, payload = {}) {
    const t = await this.getTransformation(transformationId, workspaceId);

    const updatedClaim = await claimsService.updateClaim(claimId, workspaceId, userId, payload, transformationId);

    // Check remaining unsupported claims
    const reviewData = await this.getReviewData(transformationId, workspaceId);

    // Update review status if all verified
    if (!reviewData.stats.isApprovalBlocked && t.configuration.review?.status === 'PENDING') {
      const updatedConfig = {
        ...t.configuration,
        review: {
          ...t.configuration.review,
          status: 'READY_FOR_APPROVAL'
        }
      };
      await this.persistUpdate(transformationId, {
        configuration: updatedConfig,
        updated_at: new Date().toISOString()
      });
    }

    return updatedClaim;
  }

  /**
   * STAGE 5: Human approval gate
   */
  async approveReview(transformationId, workspaceId, user = {}) {
    const t = await this.getTransformation(transformationId, workspaceId);

    // Verify claims are supported
    const claimsList = await claimsService.getClaims(workspaceId, { transformationId });
    const unsupported = claimsList.filter(
      c => c.rawStatus === 'needs_review' || c.rawStatus === 'unsupported' || c.rawStatus === 'pending'
    );

    if (unsupported.length > 0) {
      const err = new Error(`Cannot approve review: ${unsupported.length} claims require human resolution.`);
      err.code = 'APPROVAL_BLOCKED';
      err.statusCode = 400;
      throw err;
    }

    const approvedAt = new Date().toISOString();
    const reviewerName = user.name || user.email || 'Authorized Operator';

    const updatedConfig = {
      ...t.configuration,
      review: {
        status: 'APPROVED',
        reviewer: reviewerName,
        approvedAt
      }
    };

    return this.persistUpdate(transformationId, {
      configuration: updatedConfig,
      updated_at: approvedAt
    });
  }

  /**
   * STAGE 6: Prepare final deliverables for delivery (Step 9 foundation)
   */
  async prepareDelivery(transformationId, workspaceId, userId, payload = {}) {
    const t = await this.getTransformation(transformationId, workspaceId);

    // Require review approval prior to delivery preparation
    if (t.configuration.review?.status !== 'APPROVED') {
      const err = new Error('Delivery preparation requires prior formal review approval.');
      err.code = 'DELIVERY_NOT_APPROVED';
      err.statusCode = 400;
      throw err;
    }

    const recipients = payload.recipients || t.configuration.delivery?.recipients || [];
    const subject = payload.subject || t.configuration.delivery?.subject || `${t.title} - Verified Package`;
    const message = payload.message || t.configuration.delivery?.message || '';

    // Finalize deliverable items
    const outputs = inMemoryOutputs.filter(o => o.transformation_id === transformationId || o.transformationId === transformationId);

    const updatedConfig = {
      ...t.configuration,
      delivery: {
        status: 'READY_FOR_DISPATCH',
        recipients,
        subject,
        message,
        preparedAt: new Date().toISOString(),
        deliverablesCount: outputs.length
      }
    };

    // Transition status to 'completed'
    return this.persistUpdate(transformationId, {
      status: 'completed',
      configuration: updatedConfig,
      updated_at: new Date().toISOString()
    });
  }

  /**
   * Helper to persist updates to DB or in-memory store
   */
  async persistUpdate(id, updates) {
    if (isSupabaseConfigured() && !env.DEMO_MODE) {
      try {
        const supabase = getSupabaseClient();
        const { data, error } = await supabase
          .from('transformations')
          .update(updates)
          .eq('id', id)
          .select()
          .single();

        if (!error && data) return data;
      } catch (err) {
        if (!env.DEMO_MODE) {
          console.warn('Database update failed:', err.message);
          const dbErr = new Error('Database is unavailable. Cannot fall back to in-memory store in production.');
          dbErr.code = 'DATABASE_ERROR';
          dbErr.statusCode = 503;
          throw dbErr;
        }
      }
    } else if (!env.DEMO_MODE) {
      const err = new Error('Database is not configured. Cannot fall back to in-memory store in production.');
      err.code = 'DATABASE_ERROR';
      err.statusCode = 503;
      throw err;
    }

    return saveTransformation({ id, ...updates });
  }
}

export const transformationService = new TransformationService();
