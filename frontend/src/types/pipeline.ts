export type PipelineStage = 1 | 2 | 3 | 4;

export type JobStatus = 
  | 'ANALYZING' 
  | 'GENERATING' 
  | 'NEEDS_REVIEW' 
  | 'READY_FOR_APPROVAL'
  | 'HUMAN_APPROVED' 
  | 'EXPORTED';

export interface TransformationJob {
  id: string;
  title: string;
  classification: string;
  fileType: 'PDF' | 'DOCX' | 'TXT' | 'IMAGE';
  fileSize: string;
  sha256: string;
  stage: PipelineStage;
  stageLabel: string;
  progressPct: number;
  claimsTotal: number;
  claimsVerified: number;
  claimsFlagged: number;
  updatedAt: string;
  status: JobStatus;
  primaryAuthor: string;
  detectedEntitiesCount: number;
  topicSummary?: string;
  detectedLanguage?: string;
  totalPages?: number;
}
