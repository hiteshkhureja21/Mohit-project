import { GroundingClaim, ClaimStatus } from '../types/claim';
import { initialClaims23 } from '../data/demoData';
import { isDemoMode } from '../config/supabase';
import { simulateDelay, createApiResponse, ApiResponse, apiClient } from './api';

export class VerificationService {
  private claims: GroundingClaim[] = [...initialClaims23];

  async getClaims(transformationId?: string): Promise<ApiResponse<GroundingClaim[]>> {
    const endpoint = transformationId ? `/claims?transformationId=${encodeURIComponent(transformationId)}` : '/claims';
    return apiClient.get<GroundingClaim[]>(
      endpoint,
      isDemoMode() ? [...this.claims] : undefined
    );
  }

  async verifyClaim(payload: {
    claimText: string;
    anchorPassage?: string;
    sourceText?: string;
    pageNumber?: number;
  }): Promise<ApiResponse<any>> {
    return apiClient.post(
      '/claims/verify',
      payload
    );
  }

  async updateClaimStatus(
    claimId: string,
    status: ClaimStatus,
    reviewerName: string,
    note?: string
  ): Promise<ApiResponse<GroundingClaim>> {
    const index = this.claims.findIndex(c => c.id === claimId);
    const existing = index !== -1 ? this.claims[index] : ({} as GroundingClaim);

    const updatedClaim: GroundingClaim = {
      ...existing,
      id: claimId,
      status,
      reviewerNote: note || existing.reviewerNote,
      modifiedBy: reviewerName,
      modifiedAt: new Date().toISOString()
    };

    if (index !== -1) {
      this.claims[index] = updatedClaim;
    }

    return apiClient.patch<GroundingClaim>(
      `/claims/${claimId}`,
      { status, reviewerNote: note, modifiedBy: reviewerName },
      isDemoMode() ? updatedClaim : undefined
    );
  }

  async editClaimPhrasing(
    claimId: string,
    newText: string,
    reviewerName: string,
    note?: string
  ): Promise<ApiResponse<GroundingClaim>> {
    const index = this.claims.findIndex(c => c.id === claimId);
    const existing = index !== -1 ? this.claims[index] : ({} as GroundingClaim);
    const originalDraftText = existing.originalDraftText || existing.claimText || '';

    const updatedClaim: GroundingClaim = {
      ...existing,
      id: claimId,
      claimText: newText,
      originalDraftText,
      status: 'SUPPORTED',
      confidenceScore: 99,
      reviewerNote: note || 'Phrasing edited by reviewer to match exact source anchor passage.',
      modifiedBy: reviewerName,
      modifiedAt: new Date().toISOString(),
      flagReason: undefined
    };

    if (index !== -1) {
      this.claims[index] = updatedClaim;
    }

    return apiClient.patch<GroundingClaim>(
      `/claims/${claimId}`,
      { claimText: newText, originalDraftText, reviewerNote: note, modifiedBy: reviewerName },
      isDemoMode() ? updatedClaim : undefined
    );
  }

  async deleteClaim(claimId: string): Promise<ApiResponse<string>> {
    if (isDemoMode()) {
      await simulateDelay(100);
      this.claims = this.claims.filter(c => c.id !== claimId);
      return createApiResponse(claimId);
    }

    const res = await apiClient.delete<{ deletedId: string }>(`/claims/${claimId}`);
    return createApiResponse(res.data?.deletedId || claimId);
  }
}

export const verificationService = new VerificationService();
