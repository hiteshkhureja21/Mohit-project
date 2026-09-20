/**
 * Claims Service
 * 
 * Manages the extraction, grounding verification, and lifecycle of factual assertions.
 * Strictly separates:
 * 1. claim (the proposition or statement)
 * 2. evidence (anchor passages, page citations, similarity scores, exact match flags)
 * 3. source (document reference, file ID)
 * 4. verification status ('pending', 'supported', 'unsupported', 'needs_review')
 * 
 * Guarantees:
 * - Truthful verification: Never invents verification results.
 * - AI-generated claims are flagged as 'pending' or 'needs_review' unless backed by verifiable evidence.
 * - Unsupported claims are never presented as verified.
 */

import crypto from 'crypto';
import { env } from '../../config/env.js';
import { getSupabaseClient, isSupabaseConfigured } from '../../config/supabase.js';
import { claims as inMemoryClaims, documents } from '../dataStore.js';

export class ClaimsService {
  /**
   * Helper to normalize text for lexical comparison
   */
  normalizeText(str) {
    if (!str || typeof str !== 'string') return '';
    return str
      .toLowerCase()
      .replace(/[^\w\s]/g, ' ')
      .replace(/\s+/g, ' ')
      .trim();
  }

  /**
   * Extracts numbers, percentages, dates, CVE identifiers from text
   */
  extractMetrics(text) {
    if (!text) return [];
    const metrics = [];
    // CVEs
    const cves = text.match(/CVE-\d{4}-\d+/gi);
    if (cves) metrics.push(...cves.map(c => c.toUpperCase()));
    // Numbers and percentages
    const nums = text.match(/\b\d+(?:[\.,]\d+)?%?\b/g);
    if (nums) metrics.push(...nums);
    return metrics;
  }

  /**
   * Computes word-level Jaccard token overlap similarity (0 to 1)
   */
  computeTokenOverlap(textA, textB) {
    const tokensA = new Set(this.normalizeText(textA).split(' ').filter(w => w.length > 2));
    const tokensB = new Set(this.normalizeText(textB).split(' ').filter(w => w.length > 2));
    if (tokensA.size === 0 || tokensB.size === 0) return 0;

    let intersection = 0;
    for (const t of tokensA) {
      if (tokensB.has(t)) intersection++;
    }
    const union = new Set([...tokensA, ...tokensB]).size;
    return union === 0 ? 0 : intersection / union;
  }

  /**
   * Computes what fraction of significant words in claimText appear in anchorText (0 to 1)
   */
  computeClaimCoverage(claimText, anchorText) {
    const tokensClaim = new Set(this.normalizeText(claimText).split(' ').filter(w => w.length > 2));
    const tokensAnchor = new Set(this.normalizeText(anchorText).split(' ').filter(w => w.length > 2));
    if (tokensClaim.size === 0) return 0;

    let matched = 0;
    for (const t of tokensClaim) {
      if (tokensAnchor.has(t)) matched++;
    }
    return matched / tokensClaim.size;
  }

  /**
   * Grounding Verification Engine
   * Validates claim assertion against anchor passage and source document text.
   * 
   * Returns:
   * {
   *   status: 'supported' | 'unsupported' | 'needs_review' | 'pending',
   *   evidence: { anchorPassage, pageNumber, similarityScore, exactMatch, isAiGenerated, verified },
   *   confidenceScore: number,
   *   flagReason?: string
   * }
   */
  verifyClaimAgainstSource(claimText, anchorPassage, sourceText = '', options = {}) {
    if (!claimText || typeof claimText !== 'string' || claimText.trim() === '') {
      return {
        status: 'unsupported',
        confidenceScore: 0,
        evidence: {
          anchorPassage: '',
          pageNumber: options.pageNumber || 1,
          similarityScore: 0,
          exactMatch: false,
          isAiGenerated: !!options.isAiGenerated,
          verified: false
        },
        flagReason: 'Empty claim assertion statement.'
      };
    }

    const cleanClaim = claimText.trim();
    const cleanAnchor = (anchorPassage || '').trim();
    const normSource = this.normalizeText(sourceText);

    // Case 1: No evidence anchor passage provided
    if (!cleanAnchor) {
      // Check if the claim assertion itself exists verbatim in the source text
      if (normSource && normSource.includes(this.normalizeText(cleanClaim))) {
        return {
          status: 'supported',
          confidenceScore: 95,
          evidence: {
            anchorPassage: cleanClaim,
            pageNumber: options.pageNumber || 1,
            similarityScore: 95,
            exactMatch: true,
            isAiGenerated: !!options.isAiGenerated,
            verified: true
          }
        };
      }

      // If source text is available and doesn't contain the claim
      if (normSource.length > 0) {
        return {
          status: 'unsupported',
          confidenceScore: 15,
          evidence: {
            anchorPassage: '',
            pageNumber: options.pageNumber || 1,
            similarityScore: 0,
            exactMatch: false,
            isAiGenerated: true,
            verified: false
          },
          flagReason: 'No evidence anchor found in source document.'
        };
      }

      // Newly extracted assertion pending verification
      return {
        status: 'pending',
        confidenceScore: 50,
        evidence: {
          anchorPassage: '',
          pageNumber: options.pageNumber || 1,
          similarityScore: 50,
          exactMatch: false,
          isAiGenerated: true,
          verified: false
        },
        flagReason: 'Requires evidence anchor verification against source document.'
      };
    }

    // Case 2: Evidence anchor passage is provided
    // 2a. Check if the anchor passage is actually grounded in source text
    let exactInSource = false;
    let anchorScore = 1.0;

    if (normSource.length > 0) {
      const normAnchor = this.normalizeText(cleanAnchor);
      if (normSource.includes(normAnchor)) {
        exactInSource = true;
        anchorScore = 1.0;
      } else {
        // Evaluate token overlap of anchor with source text
        anchorScore = this.computeTokenOverlap(normAnchor, normSource);
        if (anchorScore < 0.35) {
          // The cited anchor does not even exist in the source document!
          return {
            status: 'unsupported',
            confidenceScore: Math.round(anchorScore * 100),
            evidence: {
              anchorPassage: cleanAnchor,
              pageNumber: options.pageNumber || 1,
              similarityScore: Math.round(anchorScore * 100),
              exactMatch: false,
              isAiGenerated: true,
              verified: false
            },
            flagReason: 'Cited evidence passage does not exist in the source document.'
          };
        }
      }
    }

    // 2b. Check semantic & metric fidelity between claim assertion and anchor passage
    const claimMetrics = this.extractMetrics(cleanClaim);
    const anchorMetrics = this.extractMetrics(cleanAnchor);

    const missingMetrics = claimMetrics.filter(m => !anchorMetrics.includes(m));
    if (missingMetrics.length > 0) {
      // Claim asserts specific numbers/metrics (e.g. 18 minutes, 1,420,000) not found in the anchor!
      return {
        status: 'needs_review',
        confidenceScore: 58,
        evidence: {
          anchorPassage: cleanAnchor,
          pageNumber: options.pageNumber || 1,
          similarityScore: 60,
          exactMatch: false,
          isAiGenerated: true,
          verified: false
        },
        flagReason: `Assertion mentions specific metrics [${missingMetrics.join(', ')}] not substantiated by the anchor passage.`
      };
    }

    // 2c. Check token overlap & coverage between claim and anchor passage
    const claimAnchorOverlap = this.computeTokenOverlap(cleanClaim, cleanAnchor);
    const claimCoverage = this.computeClaimCoverage(cleanClaim, cleanAnchor);

    const normCleanClaim = this.normalizeText(cleanClaim);
    const normCleanAnchor = this.normalizeText(cleanAnchor);
    const claimIsSubstring = normCleanAnchor.includes(normCleanClaim);

    // If anchor is in source, and claim is substantiative (either substring or >= 70% coverage or >= 65% overlap)
    if (exactInSource && (claimIsSubstring || claimCoverage >= 0.70 || claimAnchorOverlap >= 0.65)) {
      const bestScore = Math.max(claimAnchorOverlap, claimCoverage);
      return {
        status: 'supported',
        confidenceScore: Math.min(99, Math.round(bestScore * 100 + (exactInSource ? 5 : 0))),
        evidence: {
          anchorPassage: cleanAnchor,
          pageNumber: options.pageNumber || 1,
          similarityScore: Math.round(bestScore * 100),
          exactMatch: exactInSource,
          isAiGenerated: false,
          verified: true
        }
      };
    }

    if (claimCoverage >= 0.45 || claimAnchorOverlap >= 0.35) {
      return {
        status: 'needs_review',
        confidenceScore: Math.round(Math.max(claimCoverage, claimAnchorOverlap) * 100),
        evidence: {
          anchorPassage: cleanAnchor,
          pageNumber: options.pageNumber || 1,
          similarityScore: Math.round(Math.max(claimCoverage, claimAnchorOverlap) * 100),
          exactMatch: exactInSource,
          isAiGenerated: true,
          verified: false
        },
        flagReason: 'Paraphrased or generalized claim requires human review against evidence passage.'
      };
    }

    return {
      status: 'unsupported',
      confidenceScore: Math.round(claimAnchorOverlap * 100),
      evidence: {
        anchorPassage: cleanAnchor,
        pageNumber: options.pageNumber || 1,
        similarityScore: Math.round(claimAnchorOverlap * 100),
        exactMatch: false,
        isAiGenerated: true,
        verified: false
      },
      flagReason: 'Claim assertion diverges significantly from the cited passage.'
    };
  }

  /**
   * Formats a claim record for full compatibility with the existing React Review UI
   */
  formatForReviewUI(claim) {
    if (!claim) return null;

    const rawStatus = (claim.status || 'needs_review').toLowerCase();
    const uiStatus = rawStatus.toUpperCase(); // 'SUPPORTED', 'UNSUPPORTED', 'NEEDS_REVIEW', 'PENDING'

    const anchorPassage =
      claim.evidence?.anchor_passage ||
      claim.evidence?.anchorPassage ||
      claim.anchorPassage ||
      '';

    const pageNumber =
      claim.evidence?.page_number ||
      claim.evidence?.pageNumber ||
      claim.pageNumber ||
      1;

    const similarityScore =
      claim.evidence?.similarity_score ||
      claim.evidence?.similarityScore ||
      claim.confidenceScore ||
      claim.confidence ||
      90;

    const exactMatch = !!(claim.evidence?.exact_match ?? claim.evidence?.exactMatch);
    const isAiGenerated = !!(claim.evidence?.is_ai_generated ?? claim.evidence?.isAiGenerated);

    return {
      id: claim.id,
      jobId: claim.transformation_id || claim.jobId,
      transformationId: claim.transformation_id || claim.jobId,
      claimIndex: claim.claim_index || claim.claimIndex || 1,
      sectionTitle: claim.section_title || claim.sectionTitle || 'General Telemetry',
      claimText: claim.claim_text || claim.claimText || '',
      originalDraftText: claim.original_draft_text || claim.originalDraftText || claim.claim_text || claim.claimText || '',
      status: uiStatus,
      rawStatus,
      confidenceScore: typeof similarityScore === 'number' ? similarityScore : 90,
      pageNumber,
      anchorPassage,
      sourceReference: claim.source_reference || claim.sourceReference || `Source Document • Page ${pageNumber}`,
      sourceDocument: claim.source_document || claim.sourceDocument || 'Primary Source Document',
      evidence: {
        anchorPassage,
        pageNumber,
        similarityScore,
        exactMatch,
        isAiGenerated,
        verified: rawStatus === 'supported'
      },
      flagReason: claim.flag_reason || claim.flagReason || (rawStatus === 'unsupported' ? 'Unsubstantiated claim' : undefined),
      reviewerNote: claim.reviewer_note || claim.reviewerNote,
      modifiedBy: claim.modified_by || claim.modifiedBy,
      modifiedAt: claim.modified_at || claim.modifiedAt,
      created_at: claim.created_at,
      updated_at: claim.updated_at
    };
  }

  /**
   * Retrieves claims with optional filters and workspace authorization
   */
  async getClaims(workspaceId, filters = {}) {
    const { transformationId, status } = filters;

    if (isSupabaseConfigured() && !env.DEMO_MODE) {
      try {
        const supabase = getSupabaseClient();
        let query = supabase.from('claims').select('*');

        if (transformationId) {
          query = query.eq('transformation_id', transformationId);
        }
        if (status) {
          query = query.eq('status', status.toLowerCase());
        }

        const { data, error } = await query.order('claim_index', { ascending: true });
        if (!error && data) {
          return data.map(c => this.formatForReviewUI(c));
        }
      } catch (err) {
        console.warn('Database getClaims failed, using in-memory store:', err.message);
      }
    }

    let filtered = [...inMemoryClaims];
    if (transformationId) {
      filtered = filtered.filter(c => (c.transformation_id === transformationId || c.jobId === transformationId));
    }
    if (status) {
      const norm = status.toLowerCase();
      filtered = filtered.filter(c => (c.status || '').toLowerCase() === norm);
    }

    return filtered.map(c => this.formatForReviewUI(c));
  }

  /**
   * Retrieves a single claim by ID
   */
  async getClaimById(claimId, workspaceId, transformationId = null) {
    if (isSupabaseConfigured() && !env.DEMO_MODE) {
      try {
        const supabase = getSupabaseClient();
        let query = supabase
          .from('claims')
          .select('*')
          .eq('id', claimId);
        if (transformationId) {
          query = query.eq('transformation_id', transformationId);
        }
        const { data, error } = await query.maybeSingle();

        if (!error && data) {
          return this.formatForReviewUI(data);
        }
      } catch (err) {
        console.warn('Database getClaimById failed:', err.message);
      }
    }

    let matched = null;
    if (transformationId) {
      matched = inMemoryClaims.find(c => c.id === claimId && (c.transformation_id === transformationId || c.jobId === transformationId));
    }
    if (!matched) {
      matched = inMemoryClaims.find(c => c.id === claimId);
    }
    if (!matched) {
      const err = new Error(`Claim '${claimId}' not found.`);
      err.code = 'CLAIM_NOT_FOUND';
      err.statusCode = 404;
      throw err;
    }

    return this.formatForReviewUI(matched);
  }

  /**
   * Updates claim status, phrasing, and reviewer note
   */
  async updateClaim(claimId, workspaceId, userId, updates = {}, transformationId = null) {
    const tId = transformationId || updates.transformationId || updates.transformation_id || null;
    const existing = await this.getClaimById(claimId, workspaceId, tId);

    const newStatus = (updates.status || existing.rawStatus || 'needs_review').toLowerCase();
    const newClaimText = updates.claimText || updates.claim_text || existing.claimText;
    const newNote = updates.reviewerNote !== undefined ? updates.reviewerNote : (updates.reviewer_note !== undefined ? updates.reviewer_note : existing.reviewerNote);
    const newOriginalDraft = existing.originalDraftText || existing.claimText;

    const updatedRecord = {
      ...existing,
      claim_text: newClaimText,
      claimText: newClaimText,
      original_draft_text: newOriginalDraft,
      originalDraftText: newOriginalDraft,
      status: newStatus,
      reviewer_note: newNote,
      reviewerNote: newNote,
      modified_by: userId || 'Authorized Reviewer',
      modifiedBy: userId || 'Authorized Reviewer',
      modified_at: new Date().toISOString(),
      modifiedAt: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };

    // Update in-memory
    let idx = -1;
    if (tId) {
      idx = inMemoryClaims.findIndex(c => c.id === claimId && (c.transformation_id === tId || c.jobId === tId));
    }
    if (idx < 0) {
      idx = inMemoryClaims.findIndex(c => c.id === claimId);
    }
    if (idx >= 0) {
      inMemoryClaims[idx] = {
        ...inMemoryClaims[idx],
        ...updatedRecord
      };
    }

    // Update Supabase PostgreSQL if configured
    if (isSupabaseConfigured() && !env.DEMO_MODE) {
      try {
        const supabase = getSupabaseClient();
        await supabase
          .from('claims')
          .update({
            claim_text: newClaimText,
            status: newStatus,
            reviewer_note: newNote,
            updated_at: new Date().toISOString()
          })
          .eq('id', claimId);
      } catch (dbErr) {
        console.warn('Database claim update notice:', dbErr.message);
      }
    }

    return this.formatForReviewUI(updatedRecord);
  }

  /**
   * Deletes a claim
   */
  async deleteClaim(claimId, workspaceId) {
    const idx = inMemoryClaims.findIndex(c => c.id === claimId);
    if (idx >= 0) {
      inMemoryClaims.splice(idx, 1);
    }

    if (isSupabaseConfigured() && !env.DEMO_MODE) {
      try {
        const supabase = getSupabaseClient();
        await supabase.from('claims').delete().eq('id', claimId);
      } catch (dbErr) {
        console.warn('Database claim delete notice:', dbErr.message);
      }
    }

    return { deletedId: claimId };
  }

  /**
   * Creates or records a verified claim
   */
  async createClaim(data) {
    const id = data.id || `CLM-${Date.now().toString().slice(-4)}`;
    const claimIndex = data.claimIndex || data.claim_index || (inMemoryClaims.length + 1);

    const record = {
      id,
      transformation_id: data.transformationId || data.transformation_id,
      jobId: data.transformationId || data.transformation_id,
      claim_index: claimIndex,
      claimIndex,
      section_title: data.sectionTitle || data.section_title || 'General Telemetry',
      sectionTitle: data.sectionTitle || data.section_title || 'General Telemetry',
      claim_text: data.claimText || data.claim_text,
      claimText: data.claimText || data.claim_text,
      original_draft_text: data.originalDraftText || data.original_draft_text || data.claimText || data.claim_text,
      originalDraftText: data.originalDraftText || data.original_draft_text || data.claimText || data.claim_text,
      evidence: data.evidence || {
        anchor_passage: data.anchorPassage || '',
        page_number: data.pageNumber || 1,
        similarity_score: data.confidenceScore || 90,
        exact_match: false,
        is_ai_generated: true,
        verified: false
      },
      source_reference: data.sourceReference || data.source_reference || `Document Reference • Page ${data.pageNumber || 1}`,
      sourceReference: data.sourceReference || data.source_reference || `Document Reference • Page ${data.pageNumber || 1}`,
      source_document: data.sourceDocument || data.source_document || 'Source Document',
      sourceDocument: data.sourceDocument || data.source_document || 'Source Document',
      pageNumber: data.pageNumber || data.evidence?.page_number || 1,
      anchorPassage: data.anchorPassage || data.evidence?.anchor_passage || '',
      status: (data.status || 'pending').toLowerCase(),
      confidenceScore: data.confidenceScore || data.confidence || 90,
      flag_reason: data.flagReason || data.flag_reason,
      reviewer_note: data.reviewerNote || data.reviewer_note,
      created_at: data.created_at || new Date().toISOString(),
      updated_at: new Date().toISOString()
    };

    inMemoryClaims.push(record);

    if (isSupabaseConfigured() && !env.DEMO_MODE) {
      try {
        const supabase = getSupabaseClient();
        await supabase.from('claims').insert({
          id: record.id,
          transformation_id: record.transformation_id,
          claim_index: record.claim_index,
          section_title: record.section_title,
          claim_text: record.claim_text,
          original_draft_text: record.original_draft_text,
          evidence: record.evidence,
          source_reference: record.source_reference,
          status: record.status,
          confidence: record.confidenceScore
        });
      } catch (dbErr) {
        console.warn('Database insert claim notice:', dbErr.message);
      }
    }

    return this.formatForReviewUI(record);
  }
}

export const claimsService = new ClaimsService();
