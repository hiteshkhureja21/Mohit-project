export type OutputVariant = 'advisory' | 'summary' | 'presentation' | 'social';

export interface PresentationSlide {
  slideNumber: number;
  title: string;
  bulletPoints: string[];
  groundedClaimIds: string[];
}

export interface SocialMediaPost {
  platform: 'Microblog / Alert' | 'Public Advisory Bulletin' | 'Institutional Portal';
  content: string;
  characterCount: number;
}

export type ExportFormat = 'PDF' | 'DOCX' | 'JSON' | 'MARKDOWN';

export interface OutputDeliverable {
  id: string;
  type: 'Executive Brief' | 'Technical Advisory' | 'Communication Package' | 'Presentation Deck';
  title: string;
  version: string;
  verificationState: 'VERIFIED' | 'NEEDS_REVIEW' | 'APPROVED';
  content: string;
  audience: string;
  sourceReferencesCount: number;
  wordCount?: number;
  availableFormats?: ExportFormat[];
}

export interface OutputDossier {
  jobId: string;
  title: string;
  referenceNumber: string;
  date: string;
  integrityScore: number;
  groundingScore: number;
  consistencyScore: number;
  advisoryText: {
    executiveSummary: string;
    incidentAnalysis: string;
    statutoryCompliance: string;
    recommendedActions: string[];
  };
  summaryText: string;
  slides: PresentationSlide[];
  socialPosts: SocialMediaPost[];
}
