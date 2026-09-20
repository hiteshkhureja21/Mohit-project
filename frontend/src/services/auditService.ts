import { AuditRecord, AuditAction } from '../types/audit';
import { initialTransformation } from '../data/demoData';
import { isDemoMode } from '../config/supabase';
import { calculateStringSHA256 } from '../utils/hash';
import { apiClient } from './api';

let auditLogsState: AuditRecord[] = isDemoMode() ? [...initialTransformation.audit] : [];

export const auditService = {
  async getAuditLogs(jobId?: string): Promise<AuditRecord[]> {
    if (!isDemoMode()) {
      try {
        const res = await apiClient.get<AuditRecord[]>('/audit');
        if (res.data) {
          return jobId ? res.data.filter(a => a.jobId === jobId) : res.data;
        }
      } catch (err) {
        console.warn('Failed to fetch audit logs from backend:', err);
      }
      return [];
    }
    await new Promise(r => setTimeout(r, 50));
    if (jobId) {
      return auditLogsState.filter(a => a.jobId === jobId || jobId === 'SF-2026-00124');
    }
    return [...auditLogsState];
  },

  async recordAuditEvent(params: {
    jobId: string;
    actor: string;
    actorRole: AuditRecord['actorRole'];
    action: AuditAction;
    details: string;
    version?: string;
  }): Promise<AuditRecord> {
    const lastRecord = auditLogsState[auditLogsState.length - 1];
    const previousHash = lastRecord ? lastRecord.currentHash : '0000000000000000000000000000000000000000000000000000000000000000';
    const timestamp = new Date().toISOString();
    
    // Calculate authentic cryptographic SHA-256 block hash for this event via Web Crypto API
    const blockPayload = `${previousHash}:${params.jobId}:${params.action}:${params.actor}:${timestamp}:${params.details}`;
    const currentHash = await calculateStringSHA256(blockPayload);

    const newRecord: AuditRecord = {
      id: `AUD-${String(auditLogsState.length + 1).padStart(3, '0')}`,
      timestamp,
      jobId: params.jobId,
      actor: params.actor,
      actorRole: params.actorRole,
      action: params.action,
      details: params.details,
      version: params.version || 'v1.0',
      previousHash,
      currentHash,
      verificationStatus: 'VALID_TAMPER_EVIDENT'
    };

    auditLogsState = [...auditLogsState, newRecord];
    return newRecord;
  },

  resetAuditLogs() {
    auditLogsState = [...initialTransformation.audit];
  }
};
