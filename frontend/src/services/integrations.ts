/**
 * External Integrations Service Abstraction
 * 
 * Target Endpoints:
 * - OCR:             POST /api/ocr, GET /api/ocr/:fileId
 * - AI:              POST /api/ai/generate, POST /api/ai/summarize, POST /api/ai/analyze
 * - Translation:     POST /api/translate, GET /api/translate/:id
 * - Government Data: GET /api/gov/datasets, GET /api/gov/datasets/:id
 * - Email Campaigns: POST /api/email/campaigns, GET /api/email/campaigns, GET /api/email/campaigns/:id, POST /api/email/campaigns/:id/send
 * 
 * Note: These endpoints require backend external API key integrations (OpenAI, OCR vendor, Gov Data API, SMTP).
 * The client abstractions below are fully typed and ready to communicate with the backend as those services are deployed.
 */

import { apiClient, ApiResponse } from './api';

// ----------------------------------------------------
// OCR Abstraction
// ----------------------------------------------------
export interface OcrResult {
  id?: string;
  fileId: string;
  text?: string;
  extractedText?: string;
  provider?: string;
  status?: string;
  language?: string;
  confidence?: number;
  pages?: number;
  extractedAt?: string;
}

export const ocrService = {
  async processFile(fileId: string, options?: { language?: string }): Promise<ApiResponse<OcrResult>> {
    return apiClient.post<OcrResult>('/ocr', { fileId, ...options });
  },

  async getOcrStatus(fileId: string): Promise<ApiResponse<OcrResult>> {
    return apiClient.get<OcrResult>(`/ocr/${fileId}`);
  }
};

// ----------------------------------------------------
// AI Services Abstraction (OpenAI through backend)
// ----------------------------------------------------
export interface AiSummaryResult {
  summary: string;
  key_points: string[];
  important_dates: string[];
  requirements: string[];
  actions: string[];
}

export interface AiAnalysisResult {
  summary: string;
  key_points: string[];
  requirements: string[];
  important_dates: Array<{ date: string; context: string }>;
  actions: string[];
  risks: Array<{ id: string; severity: string; category: string; description: string; mitigation: string }>;
  entities: Array<{ id: string; name: string; category: string; occurrences: number }>;
}

export interface AiExtractResult {
  claims: Array<{ claimText: string; sectionTitle: string; confidenceScore: number; anchorPassage: string }>;
  important_dates: Array<{ date: string; event: string }>;
  requirements: string[];
}

export interface AiDeliverable {
  id: string;
  title: string;
  audience: string;
  format: string;
  readTime: string;
  summary: string;
  content: string;
}

export interface AiGenerateResult {
  deliverables: AiDeliverable[];
}

export const aiService = {
  async summarize(fileId: string): Promise<ApiResponse<AiSummaryResult>> {
    return apiClient.post<AiSummaryResult>('/ai/summarize', { fileId });
  },

  async analyze(fileId: string): Promise<ApiResponse<AiAnalysisResult>> {
    return apiClient.post<AiAnalysisResult>('/ai/analyze', { fileId });
  },

  async extract(fileId: string): Promise<ApiResponse<AiExtractResult>> {
    return apiClient.post<AiExtractResult>('/ai/extract', { fileId });
  },

  async generate(fileId: string, profiles?: any[]): Promise<ApiResponse<AiGenerateResult>> {
    return apiClient.post<AiGenerateResult>('/ai/generate', { fileId, profiles });
  },

  async getRequests(fileId?: string): Promise<ApiResponse<any[]>> {
    const query = fileId ? `?fileId=${encodeURIComponent(fileId)}` : '';
    return apiClient.get<any[]>(`/ai/requests${query}`);
  }
};

// ----------------------------------------------------
// Translation Abstraction
// ----------------------------------------------------
export interface TranslationRequest {
  text?: string;
  fileId?: string;
  workspaceId?: string;
  sourceLanguage?: string;
  targetLanguage: string;
}

export interface TranslationResult {
  id: string;
  translationId?: string;
  translatedText: string;
  sourceLanguage: string;
  detectedLanguage?: string | null;
  targetLanguage: string;
  status: string;
  fileId?: string | null;
  workspaceId?: string | null;
  characterCount?: number;
  provider?: string;
  durationMs?: number;
  createdAt?: string;
}

export const translationService = {
  async translate(payload: TranslationRequest): Promise<ApiResponse<TranslationResult>> {
    return apiClient.post<TranslationResult>('/translate', payload);
  },

  async getTranslation(id: string): Promise<ApiResponse<TranslationResult>> {
    return apiClient.get<TranslationResult>(`/translate/${id}`);
  },

  async listTranslations(params?: { workspaceId?: string; fileId?: string; status?: string; limit?: number; offset?: number }): Promise<ApiResponse<TranslationResult[]>> {
    const query = new URLSearchParams();
    if (params?.workspaceId) query.set('workspaceId', params.workspaceId);
    if (params?.fileId) query.set('fileId', params.fileId);
    if (params?.status) query.set('status', params.status);
    if (params?.limit !== undefined) query.set('limit', String(params.limit));
    if (params?.offset !== undefined) query.set('offset', String(params.offset));
    const qs = query.toString();
    return apiClient.get<TranslationResult[]>(`/translate${qs ? `?${qs}` : ''}`);
  },

  async getLanguages(): Promise<ApiResponse<Array<{ code: string; name: string }>>> {
    return apiClient.get<Array<{ code: string; name: string }>>('/translate/languages');
  }
};

// ----------------------------------------------------
// Government Data Abstraction
// ----------------------------------------------------
export interface GovDataset {
  id: string;
  title: string;
  agency: string;
  url: string;
  lastUpdated: string;
  summary: string;
  recordCount?: number;
  source?: string;
  category?: string;
  sampleTelemetry?: string;
}

export const govDataService = {
  async getDatasets(query?: string): Promise<ApiResponse<GovDataset[]>> {
    const endpoint = query ? `/gov/datasets?q=${encodeURIComponent(query)}` : '/gov/datasets';
    return apiClient.get<GovDataset[]>(endpoint);
  },

  async getDatasetById(id: string): Promise<ApiResponse<GovDataset>> {
    return apiClient.get<GovDataset>(`/gov/datasets/${id}`);
  },

  async getProviders(): Promise<ApiResponse<Array<{ id: string; name: string; isConfigured: boolean; requiresOnboarding?: boolean }>>> {
    return apiClient.get<Array<{ id: string; name: string; isConfigured: boolean; requiresOnboarding?: boolean }>>('/gov/providers');
  }
};

// ----------------------------------------------------
// Email Campaigns Abstraction
// ----------------------------------------------------
export interface EmailCampaign {
  id: string;
  name: string;
  subject: string;
  recipients: string[];
  deliverableId: string;
  status: 'DRAFT' | 'SENT' | 'SCHEDULED';
  sentAt?: string;
}

export const emailCampaignService = {
  async createCampaign(payload: Partial<EmailCampaign>): Promise<ApiResponse<EmailCampaign>> {
    return apiClient.post<EmailCampaign>('/email/campaigns', payload);
  },

  async getCampaigns(): Promise<ApiResponse<EmailCampaign[]>> {
    return apiClient.get<EmailCampaign[]>('/email/campaigns');
  },

  async getCampaign(id: string): Promise<ApiResponse<EmailCampaign>> {
    return apiClient.get<EmailCampaign>(`/email/campaigns/${id}`);
  },

  async sendCampaign(id: string): Promise<ApiResponse<{ campaignId: string; sentCount: number }>> {
    return apiClient.post(`/email/campaigns/${id}/send`);
  }
};
