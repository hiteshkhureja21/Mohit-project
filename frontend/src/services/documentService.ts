import { SourceDocument, AnalysisSummary, FileType } from '../types/transformation';
import { isDemoMode } from '../config/supabase';
import { simulateDelay, createApiResponse, ApiResponse, apiClient } from './api';

export class DocumentService {
  async computeSHA256(file: File): Promise<string> {
    try {
      const arrayBuffer = await file.arrayBuffer();
      const hashBuffer = await crypto.subtle.digest('SHA-256', arrayBuffer);
      const hashArray = Array.from(new Uint8Array(hashBuffer));
      const hashHex = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
      return hashHex;
    } catch {
      return 'e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855';
    }
  }

  /**
   * Uploads a document using standard multipart/form-data with FormData
   */
  async uploadDocument(file: File): Promise<ApiResponse<SourceDocument>> {
    const sha256 = await this.computeSHA256(file);
    const extension = (file.name.split('.').pop()?.toUpperCase() as FileType) || 'PDF';

    const localDoc: SourceDocument = {
      id: `SRC-${Date.now().toString().slice(-4)}`,
      name: file.name,
      type: extension,
      pages: Math.max(1, Math.floor(file.size / 150000)),
      size: `${(file.size / (1024 * 1024)).toFixed(1)} MB`,
      sha256,
      status: 'ANALYZED',
      uploadedAt: new Date().toISOString()
    };

    // Construct multipart/form-data payload
    const formData = new FormData();
    formData.append('file', file);
    formData.append('hash', sha256);
    formData.append('title', file.name);
    formData.append('pages', String(localDoc.pages));
    formData.append('size', localDoc.size);

    const res = await apiClient.upload<any>(
      '/files',
      formData,
      isDemoMode() ? localDoc : undefined
    );

    if (res.success && res.data) {
      const d = res.data;
      const mapped: SourceDocument = {
        id: d.id,
        name: d.original_name || d.name || file.name,
        type: extension,
        pages: d.page_count || localDoc.pages,
        size: `${((d.file_size || file.size) / (1024 * 1024)).toFixed(1)} MB`,
        sha256: d.sha256 || sha256,
        status: d.status?.toUpperCase() || 'UPLOADED',
        uploadedAt: d.created_at || d.uploaded_at || localDoc.uploadedAt,
        storage_path: d.storage_path
      };
      return createApiResponse(mapped, res.message);
    }

    return res as ApiResponse<SourceDocument>;
  }

  async ingestUrl(url: string): Promise<ApiResponse<SourceDocument>> {
    await simulateDelay(300);
    const domain = new URL(url).hostname;
    const sha256 = '4a8f9c2d1e0b7a6f5e4d3c2b1a0f9e8d7c6b5a4f3e2d1c0b9a8f7e6d5c4b3a21';

    const urlDoc: SourceDocument = {
      id: `SRC-${Date.now().toString().slice(-4)}`,
      name: `Web Source: ${domain}`,
      type: 'URL',
      url,
      pages: 8,
      size: '840 KB',
      sha256,
      status: 'ANALYZED',
      uploadedAt: new Date().toISOString()
    };

    return apiClient.post<SourceDocument>(
      '/documents/upload',
      {
        title: urlDoc.name,
        url,
        hash: sha256,
        size: urlDoc.size,
        pages: urlDoc.pages
      },
      isDemoMode() ? urlDoc : undefined
    );
  }

  async getDocuments(): Promise<ApiResponse<SourceDocument[]>> {
    if (!isDemoMode()) {
      const res = await apiClient.get<any[]>('/files');
      if (res.success && Array.isArray(res.data)) {
        const mapped: SourceDocument[] = res.data.map((d: any) => ({
          id: d.id,
          name: d.original_name || d.name || 'Untitled Document',
          type: (d.original_name?.split('.').pop()?.toUpperCase() as FileType) || 'PDF',
          pages: d.page_count || 1,
          size: `${((d.file_size || 0) / (1024 * 1024)).toFixed(1)} MB`,
          sha256: d.sha256 || 'e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855',
          status: d.status?.toUpperCase() || 'UPLOADED',
          uploadedAt: d.created_at || new Date().toISOString(),
          storage_path: d.storage_path
        }));
        return createApiResponse(mapped, res.message);
      }
      return res as ApiResponse<SourceDocument[]>;
    }
    return apiClient.get<SourceDocument[]>('/documents');
  }

  async getDocument(id: string): Promise<ApiResponse<SourceDocument>> {
    if (!isDemoMode()) {
      const res = await apiClient.get<any>(`/files/${id}`);
      if (res.success && res.data) {
        const d = res.data;
        const mapped: SourceDocument = {
          id: d.id,
          name: d.original_name || d.name || 'Untitled Document',
          type: (d.original_name?.split('.').pop()?.toUpperCase() as FileType) || 'PDF',
          pages: d.page_count || 1,
          size: `${((d.file_size || 0) / (1024 * 1024)).toFixed(1)} MB`,
          sha256: d.sha256 || 'e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855',
          status: d.status?.toUpperCase() || 'UPLOADED',
          uploadedAt: d.created_at || new Date().toISOString(),
          storage_path: d.storage_path
        };
        return createApiResponse(mapped, res.message);
      }
      return res as ApiResponse<SourceDocument>;
    }
    return apiClient.get<SourceDocument>(`/documents/${id}`);
  }

  async analyzeDocument(documentId: string): Promise<ApiResponse<AnalysisSummary>> {
    const localAnalysis: AnalysisSummary = {
      findings: 3,
      risks: 5,
      recommendations: 7,
      entities: 18,
      evidence: 12,
      importantData: 9,
      keySummary: [
        'Advanced persistent threat group (APT-44) identified targeting state energy infrastructure.',
        'Zero-day exploit chain detected affecting SCADA telemetry gateway firmware v4.1.',
        'Automatic isolation protocols prevented unauthorized control command execution.',
        'Mandatory patching and multi-factor hardware attestation recommended within 72 hours.'
      ],
      riskList: [
        { id: 'RSK-1', severity: 'CRITICAL', category: 'Infrastructure', description: 'Firmware unauthenticated deserialization exploit', mitigation: 'Deploy v4.2 hotfix firmware update' },
        { id: 'RSK-2', severity: 'HIGH', category: 'Access Control', description: 'Stale credential tokens in monitoring telemetry relay', mitigation: 'Force-rotate hardware session keys' },
        { id: 'RSK-3', severity: 'MEDIUM', category: 'Supply Chain', description: 'Third-party telemetry libraries missing integrity checksums', mitigation: 'Enforce cryptographic package attestation' }
      ],
      recommendationList: [
        { id: 'REC-1', priority: 'IMMEDIATE', action: 'Deploy SCADA Isolation Gateway v4.2 across all operational substations', targetAudience: 'Cybersecurity Leads' },
        { id: 'REC-2', priority: 'HIGH', action: 'Submit containment timeline to Executive Governance Board', targetAudience: 'Executive Leadership' },
        { id: 'REC-3', priority: 'SCHEDULED', action: 'Issue transparent public safety and grid stability bulletin', targetAudience: 'Media & Public Relations' }
      ],
      entityList: [
        { id: 'ENT-1', name: 'APT-44 Threat Group', category: 'ACTOR', occurrences: 14 },
        { id: 'ENT-2', name: 'SCADA Telemetry Mesh', category: 'SYSTEM', occurrences: 28 },
        { id: 'ENT-3', name: 'NIS-2 Directive', category: 'REGULATION', occurrences: 9 },
        { id: 'ENT-4', name: 'CVE-2026-2144', category: 'CVE', occurrences: 6 }
      ]
    };

    return apiClient.post<AnalysisSummary>(
      '/analysis/run',
      { documentId },
      isDemoMode() ? localAnalysis : undefined
    );
  }

  async getDownloadUrl(fileId: string): Promise<string> {
    try {
      const res = await apiClient.get<{ signedUrl: string }>(`/files/${fileId}/download?json=true`);
      if (res.data?.signedUrl) {
        return res.data.signedUrl;
      }
    } catch {}
    return `/api/files/${fileId}/download`;
  }

  async deleteFile(fileId: string): Promise<ApiResponse<{ deletedId: string }>> {
    return apiClient.delete<{ deletedId: string }>(`/files/${fileId}`);
  }
}

export const documentService = new DocumentService();
