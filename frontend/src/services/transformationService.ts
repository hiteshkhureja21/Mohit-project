/**
 * Transformation Service
 * Connects the 6-stage SourceFlow frontend workflow to the real backend pipeline.
 */

import { Transformation, AudienceProfile, OutputDeliverable, EmailRecipient } from '../types/transformation';
import { GroundingClaim, ClaimStatus } from '../types/claim';
import { initialTransformation, initialClaims23, initialOutputs } from '../data/demoData';
import { isDemoMode } from '../config/supabase';
import { apiClient, ApiResponse } from './api';

export interface GenerationResponse {
  transformation: Transformation;
  deliverables: OutputDeliverable[];
  claims: GroundingClaim[];
  analysis: any;
}

export interface ReviewResponse {
  transformationId: string;
  status: string;
  review: {
    status: 'PENDING' | 'READY_FOR_APPROVAL' | 'APPROVED';
    reviewer: string | null;
    approvedAt: string | null;
  };
  claims: GroundingClaim[];
  stats: {
    totalClaims: number;
    supportedClaimsCount: number;
    unsupportedClaimsCount: number;
    resolvedClaimsCount: number;
    isApprovalBlocked: boolean;
  };
}

export class TransformationService {
  /**
   * Stage 1: Initialize transformation with selected source file
   */
  async createTransformation(payload: {
    fileId?: string;
    documentId?: string;
    title?: string;
    profiles?: AudienceProfile[];
    outputs?: any;
  }): Promise<ApiResponse<Transformation>> {
    const fallback: Transformation = {
      ...initialTransformation,
      id: `SF-2026-${Date.now().toString().slice(-5)}`,
      title: payload.title || initialTransformation.title,
      source: {
        ...initialTransformation.source,
        id: payload.fileId || payload.documentId || initialTransformation.source.id,
        name: payload.title || initialTransformation.source.name
      }
    };

    return apiClient.post<Transformation>(
      '/transformations',
      payload,
      isDemoMode() ? fallback : undefined
    );
  }

  /**
   * Retrieve full transformation by ID
   */
  async getTransformation(id: string): Promise<ApiResponse<Transformation>> {
    return apiClient.get<Transformation>(
      `/transformations/${id}`,
      isDemoMode() ? initialTransformation : undefined
    );
  }

  /**
   * List all transformations in workspace
   */
  async listTransformations(): Promise<ApiResponse<Transformation[]>> {
    return apiClient.get<Transformation[]>(
      '/transformations',
      isDemoMode() ? [initialTransformation] : undefined
    );
  }

  /**
   * Stage 2: Store audience configuration
   */
  async updateAudience(
    id: string,
    payload: {
      profiles: AudienceProfile[];
      tone?: string;
      detailLevel?: string;
      language?: string;
    }
  ): Promise<ApiResponse<Transformation>> {
    const fallback: Transformation = {
      ...initialTransformation,
      id,
      profiles: payload.profiles
    };

    return apiClient.patch<Transformation>(
      `/transformations/${id}/audience`,
      payload,
      isDemoMode() ? fallback : undefined
    );
  }

  /**
   * Stage 3: Store requested output formats
   */
  async updateOutputConfig(
    id: string,
    payload: {
      selectedOutputs?: Record<string, boolean>;
      selectedTypes?: string[];
      options?: Record<string, boolean>;
    }
  ): Promise<ApiResponse<Transformation>> {
    return apiClient.patch<Transformation>(
      `/transformations/${id}/outputs-config`,
      payload,
      isDemoMode() ? initialTransformation : undefined
    );
  }

  /**
   * Stage 4: Run AI Generation & Claim Grounding
   */
  async generate(
    id: string,
    payload: {
      model?: string;
      text?: string;
    } = {}
  ): Promise<ApiResponse<GenerationResponse>> {
    const fallback: GenerationResponse = {
      transformation: {
        ...initialTransformation,
        id,
        status: 'review'
      } as any,
      deliverables: initialOutputs,
      claims: initialClaims23,
      analysis: initialTransformation.analysis
    };

    return apiClient.post<GenerationResponse>(
      `/transformations/${id}/generate`,
      payload,
      isDemoMode() ? fallback : undefined
    );
  }

  /**
   * Stage 5: Get claims and review data
   */
  async getReview(id: string): Promise<ApiResponse<ReviewResponse>> {
    const fallback: ReviewResponse = {
      transformationId: id,
      status: 'review',
      review: {
        status: 'PENDING',
        reviewer: null,
        approvedAt: null
      },
      claims: initialClaims23,
      stats: {
        totalClaims: 23,
        supportedClaimsCount: 19,
        unsupportedClaimsCount: 4,
        resolvedClaimsCount: 0,
        isApprovalBlocked: true
      }
    };

    return apiClient.get<ReviewResponse>(
      `/transformations/${id}/review`,
      isDemoMode() ? fallback : undefined
    );
  }

  /**
   * Stage 5: Update a claim's verification status or phrasing
   */
  async updateClaim(
    id: string,
    claimId: string,
    payload: {
      status?: ClaimStatus;
      claimText?: string;
      reviewerNote?: string;
    }
  ): Promise<ApiResponse<GroundingClaim>> {
    const matched = initialClaims23.find(c => c.id === claimId) || initialClaims23[0];
    const fallback: GroundingClaim = {
      ...matched,
      ...payload,
      id: claimId
    };

    return apiClient.patch<GroundingClaim>(
      `/transformations/${id}/claims/${claimId}`,
      payload,
      isDemoMode() ? fallback : undefined
    );
  }

  /**
   * Stage 5: Formal human review sign-off
   */
  async approveReview(id: string): Promise<ApiResponse<Transformation>> {
    const fallback: Transformation = {
      ...initialTransformation,
      id,
      review: {
        status: 'APPROVED',
        reviewer: 'Authorized Operator',
        approvedAt: new Date().toISOString()
      }
    };

    return apiClient.post<Transformation>(
      `/transformations/${id}/approve`,
      {},
      isDemoMode() ? fallback : undefined
    );
  }

  /**
   * Stage 6: Prepare final deliverables for delivery
   */
  async prepareDelivery(
    id: string,
    payload: {
      recipients: EmailRecipient[];
      subject: string;
      message: string;
    }
  ): Promise<ApiResponse<Transformation>> {
    const fallback: Transformation = {
      ...initialTransformation,
      id,
      status: 'completed' as any,
      delivery: {
        status: 'NOT_SENT',
        recipients: payload.recipients,
        sentAt: null,
        subject: payload.subject,
        message: payload.message
      }
    };

    return apiClient.post<Transformation>(
      `/transformations/${id}/prepare-delivery`,
      payload,
      isDemoMode() ? fallback : undefined
    );
  }
}

export const transformationService = new TransformationService();
