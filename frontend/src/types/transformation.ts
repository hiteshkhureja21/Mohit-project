import { GroundingClaim } from './claim';
import { OutputDeliverable } from './output';
import { AuditRecord } from './audit';

export type { GroundingClaim } from './claim';
export type { OutputDeliverable } from './output';
export type { AuditRecord } from './audit';

export type FileType = 'PDF' | 'DOCX' | 'XLSX' | 'TXT' | 'PNG' | 'JPG' | 'MP4' | 'URL';

export type DocumentStatus = 'UPLOADED' | 'PROCESSING' | 'ANALYZED' | 'FAILED';

export interface SourceDocument {
  id: string;
  name: string;
  type: FileType;
  pages: number;
  size: string;
  sha256: string;
  source_hash?: string;
  uploadedAt: string;
  url?: string;
  status?: DocumentStatus;
  storage_path?: string;
}

export interface RiskItem {
  id: string;
  severity: 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW';
  category: string;
  description: string;
  mitigation: string;
}

export interface RecommendationItem {
  id: string;
  priority: 'IMMEDIATE' | 'HIGH' | 'SCHEDULED';
  action: string;
  targetAudience: string;
}

export interface EntityItem {
  id: string;
  name: string;
  category: 'ORGANIZATION' | 'ACTOR' | 'SYSTEM' | 'REGULATION' | 'CVE';
  occurrences: number;
}

export interface AnalysisSummary {
  findings: number;
  risks: number;
  recommendations: number;
  entities: number;
  evidence: number;
  importantData: number;
  keySummary: string[];
  riskList?: RiskItem[];
  recommendationList?: RecommendationItem[];
  entityList?: EntityItem[];
}

export interface AudienceProfile {
  id: string;
  name: string;
  tone: string;
  detailLevel: string;
  language: string;
  objective: string;
  deliverableType: 'Executive Brief' | 'Technical Advisory' | 'Communication Package' | 'Presentation Deck';
  defaultRecipients: string[];
  isSelected: boolean;
}

export interface EmailRecipient {
  id: string;
  email: string;
  name: string;
  role: string;
  type: 'TO' | 'CC';
}

export type ReviewStatus = 'PENDING' | 'READY_FOR_APPROVAL' | 'APPROVED';
export type DeliveryStatus = 'NOT_SENT' | 'SENT';
export type TransformationStatus = 'draft' | 'processing' | 'review' | 'completed' | 'failed';

export interface Transformation {
  id: string; // e.g. "SF-2026-00124"
  title: string;
  status?: TransformationStatus;
  workspaceId?: string;
  fileId?: string;
  createdBy?: string;
  createdAt?: string;
  updatedAt?: string;
  source: SourceDocument;
  analysis: AnalysisSummary;
  profiles: AudienceProfile[];
  claims: GroundingClaim[];
  outputs: OutputDeliverable[];
  review: {
    status: ReviewStatus;
    reviewer: string | null;
    approvedAt: string | null;
  };
  delivery: {
    status: DeliveryStatus;
    recipients: EmailRecipient[];
    sentAt: string | null;
    subject: string;
    message: string;
  };
  audit: AuditRecord[];
}
