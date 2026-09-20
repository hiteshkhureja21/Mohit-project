export type AuditAction = 
  | 'DOCUMENT_UPLOADED' 
  | 'INTELLIGENCE_EXTRACTED' 
  | 'TRANSFORMATION_GENERATED' 
  | 'CLAIMS_VERIFIED' 
  | 'CLAIM_EDITED'
  | 'CLAIM_RESOLVED'
  | 'HUMAN_EDITED' 
  | 'CLAIM_APPROVED'
  | 'REVIEWER_APPROVED'
  | 'OFFICER_APPROVED' 
  | 'DOCUMENT_EXPORTED'
  | 'COMMUNICATION_DELIVERED';

import { EnterpriseRole, UserRole } from './user';

export interface AuditRecord {
  id: string;
  timestamp: string;
  jobId: string;
  actor: string;
  actorRole: EnterpriseRole | UserRole | 'System Automated' | string;
  action: AuditAction;
  details: string;
  version: string;
  previousHash: string;
  currentHash: string;
  verificationStatus: 'VALID_TAMPER_EVIDENT';
}

export const verifyAuditChain = (records: AuditRecord[]): boolean => {
  if (records.length <= 1) return true;
  for (let i = 1; i < records.length; i++) {
    if (records[i].previousHash !== records[i - 1].currentHash) {
      return false;
    }
  }
  return true;
};
