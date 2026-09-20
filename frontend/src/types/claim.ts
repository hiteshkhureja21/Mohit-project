export type ClaimStatus = 
  | 'SUPPORTED' 
  | 'UNSUPPORTED' 
  | 'NEEDS_REVIEW' 
  | 'PENDING'
  | 'EDITED' 
  | 'RESOLVED' 
  | 'HUMAN_APPROVED' 
  | 'REJECTED'
  | 'pending'
  | 'supported'
  | 'unsupported'
  | 'needs_review';

export interface ClaimEvidence {
  anchorPassage: string;
  pageNumber: number;
  similarityScore?: number;
  exactMatch?: boolean;
  isAiGenerated?: boolean;
  verified?: boolean;
}

export interface GroundingClaim {
  id: string;
  jobId: string;
  transformationId?: string;
  claimIndex: number;
  sectionTitle: string;
  claimText: string;
  originalDraftText?: string;
  status: ClaimStatus;
  rawStatus?: string;
  confidenceScore: number;
  sourceDocument: string;
  pageNumber: number;
  anchorPassage: string;
  sourceReference: string;
  evidence?: ClaimEvidence;
  flagReason?: string;
  reviewerNote?: string;
  modifiedBy?: string;
  modifiedAt?: string;
}
