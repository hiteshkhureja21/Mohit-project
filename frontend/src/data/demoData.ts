import { Transformation, SourceDocument, AudienceProfile, EmailRecipient } from '../types/transformation';
import { GroundingClaim } from '../types/claim';
import { OutputDeliverable } from '../types/output';
import { AuditRecord } from '../types/audit';

export const initialAudienceProfiles: AudienceProfile[] = [
  {
    id: 'prof-exec',
    name: 'Executive Leadership',
    tone: 'Formal · Concise · English',
    detailLevel: 'High-level Strategic Risk & Governance',
    language: 'English (Standard)',
    objective: 'Decision Making & Resource Allocation',
    deliverableType: 'Executive Brief',
    defaultRecipients: ['director-office@agency.gov', 'ciso-board@agency.gov'],
    isSelected: true,
  },
  {
    id: 'prof-cyber',
    name: 'Cybersecurity Department',
    tone: 'Technical · Detailed · English',
    detailLevel: 'Deep Telemetry & Attack Surface Analysis',
    language: 'English (Technical)',
    objective: 'Threat Remediation & Perimeter Hardening',
    deliverableType: 'Technical Advisory',
    defaultRecipients: ['soc-leads@agency.gov', 'incident-response@agency.gov'],
    isSelected: true,
  },
  {
    id: 'prof-media',
    name: 'Media & Communications',
    tone: 'Public · Clear · Non-alarmist',
    detailLevel: 'Accessible Stakeholder Advisory',
    language: 'English (Plain Language)',
    objective: 'Public Safety & Stakeholder Transparency',
    deliverableType: 'Communication Package',
    defaultRecipients: ['press-bureau@agency.gov', 'spokesperson@agency.gov'],
    isSelected: true,
  }
];

export const initialClaims23: GroundingClaim[] = [
  {
    id: 'CLM-001',
    jobId: 'SF-2026-00124',
    claimIndex: 1,
    sectionTitle: 'Executive Summary',
    claimText: 'Enterprise boundary firewalls and perimeter sensors mitigated 1,420,000 intrusion attempts over the 90-day assessment window.',
    status: 'SUPPORTED',
    confidenceScore: 99,
    sourceDocument: 'Cybersecurity Threat Intelligence Research Report.pdf',
    pageNumber: 1,
    anchorPassage: 'During the evaluated 90-day operational window, enterprise perimeter firewalls and boundary intrusion prevention systems successfully filtered and mitigated 1,420,000 unauthorized intrusion attempts without ingress compromise.',
    sourceReference: 'Section 1.1, Perimeter Telemetry Summary',
  },
  {
    id: 'CLM-002',
    jobId: 'SF-2026-00124',
    claimIndex: 2,
    sectionTitle: 'Perimeter Defense',
    claimText: 'Zero unauthorized lateral movements were recorded across the air-gapped core data enclaves.',
    status: 'SUPPORTED',
    confidenceScore: 98,
    sourceDocument: 'Cybersecurity Threat Intelligence Research Report.pdf',
    pageNumber: 2,
    anchorPassage: 'Zero unauthorized lateral movements were detected across the air-gapped mission-critical database enclaves during synchronized continuous packet inspection.',
    sourceReference: 'Section 2.1, Enclave Isolation Audit',
  },
  {
    id: 'CLM-003',
    jobId: 'SF-2026-00124',
    claimIndex: 3,
    sectionTitle: 'Endpoint Telemetry',
    claimText: 'Endpoint Detection and Response (EDR) agent coverage remained at 99.94% across 14,200 managed institutional endpoints.',
    status: 'SUPPORTED',
    confidenceScore: 97,
    sourceDocument: 'Cybersecurity Threat Intelligence Research Report.pdf',
    pageNumber: 4,
    anchorPassage: 'Active telemetry confirmed that EDR sensor agents maintained a 99.94% operational heartbeat across all 14,200 fleet workstations and servers.',
    sourceReference: 'Section 3.2, EDR Fleet Telemetry',
  },
  {
    id: 'CLM-004',
    jobId: 'SF-2026-00124',
    claimIndex: 4,
    sectionTitle: 'Vulnerability Management',
    claimText: 'Critical vulnerabilities identified in external-facing services were remediated within a mean time to patch (MTTP) of 4.2 hours.',
    status: 'SUPPORTED',
    confidenceScore: 98,
    sourceDocument: 'Cybersecurity Threat Intelligence Research Report.pdf',
    pageNumber: 7,
    anchorPassage: 'Vulnerability response metrics established a mean time to patch (MTTP) of 4.2 hours for CVSS 9.0+ vulnerabilities across external-facing DMZ hosts.',
    sourceReference: 'Section 4.3, Patch Cadence Log',
  },
  {
    id: 'CLM-005',
    jobId: 'SF-2026-00124',
    claimIndex: 5,
    sectionTitle: 'Threat Actor Attribution',
    claimText: 'The threat actor utilized exclusively custom zero-day kernel exploits with zero known commodity tooling detected during ingress.',
    status: 'NEEDS_REVIEW',
    confidenceScore: 58,
    sourceDocument: 'Cybersecurity Threat Intelligence Research Report.pdf',
    pageNumber: 19,
    anchorPassage: 'Forensic memory dumps revealed that the adversary leveraged modified commodity Cobalt Strike beacons and PowerShell scripts alongside a single chained CVE-2025-4127 privilege escalation flaw.',
    sourceReference: 'Section 6.2, Forensic Binary Analysis',
    flagReason: 'Contradiction: Source Page 19 confirms the adversary utilized modified commodity Cobalt Strike beacons and PowerShell scripts, contradicting the claim of exclusively custom zero-day tooling.',
    reviewerNote: 'Requires phrasing alignment with primary forensic memory dump telemetry.'
  },
  {
    id: 'CLM-006',
    jobId: 'SF-2026-00124',
    claimIndex: 6,
    sectionTitle: 'Compliance & Framework',
    claimText: 'Threat response workflows complied with the NIST Cybersecurity Framework (CSF 2.0) and ISO/IEC 27001 standards.',
    status: 'SUPPORTED',
    confidenceScore: 96,
    sourceDocument: 'Cybersecurity Threat Intelligence Research Report.pdf',
    pageNumber: 3,
    anchorPassage: 'All security incident escalation workflows adhered strictly to the statutory directives defined in NIST CSF 2.0 and ISO/IEC 27001 Annex A controls.',
    sourceReference: 'Section 1.4, Statutory Compliance',
  },
  {
    id: 'CLM-007',
    jobId: 'SF-2026-00124',
    claimIndex: 7,
    sectionTitle: 'Identity & Access',
    claimText: 'Multi-factor authentication (FIDO2/WebAuthn) blocked 100% of credential stuffing and spray attacks against enterprise single sign-on.',
    status: 'SUPPORTED',
    confidenceScore: 99,
    sourceDocument: 'Cybersecurity Threat Intelligence Research Report.pdf',
    pageNumber: 5,
    anchorPassage: 'FIDO2 hardware security keys and WebAuthn protocols successfully prevented 100% of unauthorized credential stuffing attempts across the centralized SSO portal.',
    sourceReference: 'Section 2.4, IAM Telemetry',
  },
  {
    id: 'CLM-008',
    jobId: 'SF-2026-00124',
    claimIndex: 8,
    sectionTitle: 'SOC Incident Response',
    claimText: 'Security Operations Center (SOC) mean time to detect (MTTD) for high-severity alerts was clocked at 3.8 minutes.',
    status: 'SUPPORTED',
    confidenceScore: 95,
    sourceDocument: 'Cybersecurity Threat Intelligence Research Report.pdf',
    pageNumber: 8,
    anchorPassage: 'Automated SIEM alert correlation achieved a verified mean time to detect (MTTD) of 3.8 minutes across high-severity security incidents.',
    sourceReference: 'Section 3.6, SOC Metrics',
  },
  {
    id: 'CLM-009',
    jobId: 'SF-2026-00124',
    claimIndex: 9,
    sectionTitle: 'Cryptography & TLS',
    claimText: 'All internal microservice communication channels enforced TLS 1.3 encryption with ECDSA certificates.',
    status: 'SUPPORTED',
    confidenceScore: 97,
    sourceDocument: 'Cybersecurity Threat Intelligence Research Report.pdf',
    pageNumber: 9,
    anchorPassage: 'Service mesh mutual TLS (mTLS) enforcement confirmed 100% compliance using TLS 1.3 with Curve25519 and ECDSA certificate validation.',
    sourceReference: 'Section 4.1, Cryptographic Transport',
  },
  {
    id: 'CLM-010',
    jobId: 'SF-2026-00124',
    claimIndex: 10,
    sectionTitle: 'Cloud Workload Protection',
    claimText: 'Container runtime monitoring detected zero unauthorized privilege escalations in Kubernetes production clusters.',
    status: 'SUPPORTED',
    confidenceScore: 98,
    sourceDocument: 'Cybersecurity Threat Intelligence Research Report.pdf',
    pageNumber: 10,
    anchorPassage: 'eBPF-based container security agents recorded zero unverified root privilege escalations across 850 active microservice container pods.',
    sourceReference: 'Section 4.5, Cloud Runtime Audit',
  },
  {
    id: 'CLM-011',
    jobId: 'SF-2026-00124',
    claimIndex: 11,
    sectionTitle: 'Data Loss Prevention',
    claimText: 'DLP inspection systems prevented unauthorized exfiltration of sensitive personnel and customer records.',
    status: 'SUPPORTED',
    confidenceScore: 99,
    sourceDocument: 'Cybersecurity Threat Intelligence Research Report.pdf',
    pageNumber: 11,
    anchorPassage: 'Automated egress deep packet inspection blocked 14 unauthorized bulk database export attempts, preventing data exfiltration.',
    sourceReference: 'Section 5.1, DLP Ingress/Egress Logs',
  },
  {
    id: 'CLM-012',
    jobId: 'SF-2026-00124',
    claimIndex: 12,
    sectionTitle: 'Workforce Security',
    claimText: 'Institutional workforce phishing simulation click rates decreased from 8.4% to 1.2% following quarterly training.',
    status: 'SUPPORTED',
    confidenceScore: 94,
    sourceDocument: 'Cybersecurity Threat Intelligence Research Report.pdf',
    pageNumber: 12,
    anchorPassage: 'Workforce behavioral assessments demonstrated a reduction in phishing susceptibility from 8.4% to 1.2% across 3,200 administrative personnel.',
    sourceReference: 'Section 5.2, Human Risk Assessment',
  },
  {
    id: 'CLM-013',
    jobId: 'SF-2026-00124',
    claimIndex: 13,
    sectionTitle: 'Threat Intelligence Ingestion',
    claimText: 'Threat intelligence feeds ingested 84,000 indicators of compromise (IoCs) with automated perimeter firewall distribution.',
    status: 'SUPPORTED',
    confidenceScore: 97,
    sourceDocument: 'Cybersecurity Threat Intelligence Research Report.pdf',
    pageNumber: 13,
    anchorPassage: 'STIX/TAXII threat feeds ingested 84,000 unique malicious indicators of compromise (IoCs) with automated dynamic firewall rule generation.',
    sourceReference: 'Section 5.4, Threat Feed Integration',
  },
  {
    id: 'CLM-014',
    jobId: 'SF-2026-00124',
    claimIndex: 14,
    sectionTitle: 'Supply Chain Assurance',
    claimText: 'Third-party vendor software supply chain audits achieved 100% compliance with SBOM verification guidelines.',
    status: 'SUPPORTED',
    confidenceScore: 96,
    sourceDocument: 'Cybersecurity Threat Intelligence Research Report.pdf',
    pageNumber: 14,
    anchorPassage: 'All 48 critical software suppliers delivered cryptographically signed Software Bill of Materials (SBOM) compliant with CycloneDX specifications.',
    sourceReference: 'Section 5.5, Vendor Assurance',
  },
  {
    id: 'CLM-015',
    jobId: 'SF-2026-00124',
    claimIndex: 15,
    sectionTitle: 'Automated Containment',
    claimText: 'Automated network micro-segmentation successfully isolated 3 infected test workstations within 12 seconds.',
    status: 'SUPPORTED',
    confidenceScore: 98,
    sourceDocument: 'Cybersecurity Threat Intelligence Research Report.pdf',
    pageNumber: 15,
    anchorPassage: 'During simulated endpoint compromise drills, zero-trust network policy engines isolated 3 target machines within 12 seconds of anomalous beacon detection.',
    sourceReference: 'Section 5.7, SOAR Playbook Execution',
  },
  {
    id: 'CLM-016',
    jobId: 'SF-2026-00124',
    claimIndex: 16,
    sectionTitle: 'Adversary Simulation',
    claimText: 'Annual red-team adversary simulation validated resilience against automated credential replay attacks.',
    status: 'SUPPORTED',
    confidenceScore: 95,
    sourceDocument: 'Cybersecurity Threat Intelligence Research Report.pdf',
    pageNumber: 16,
    anchorPassage: 'Red-team penetration exercise #RT-2025-Q3 confirmed that automated Kerberos ticket harvesting and pass-the-hash attacks were completely mitigated.',
    sourceReference: 'Section 6.1, Red Team Report',
  },
  {
    id: 'CLM-017',
    jobId: 'SF-2026-00124',
    claimIndex: 17,
    sectionTitle: 'Adversary Dwell Time',
    claimText: 'Adversary dwell time inside the staging perimeter exceeded 45 days prior to automated heuristic detection.',
    status: 'NEEDS_REVIEW',
    confidenceScore: 62,
    sourceDocument: 'Cybersecurity Threat Intelligence Research Report.pdf',
    pageNumber: 14,
    anchorPassage: 'Adversary dwell time inside the isolated honeypot perimeter was measured at exactly 4 hours and 18 minutes before automated heuristic rules triggered quarantine.',
    sourceReference: 'Section 5.3, Dwell Time Telemetry',
    flagReason: 'Contradiction: Source Page 14 states dwell time was 4 hours and 18 minutes in an isolated honeypot, not 45 days.',
    reviewerNote: 'Requires correction to reflect accurate honeypot containment telemetry.'
  },
  {
    id: 'CLM-018',
    jobId: 'SF-2026-00124',
    claimIndex: 18,
    sectionTitle: 'SIEM Log Telemetry',
    claimText: 'SIEM ingestion pipelines processed 4.2 billion log events per day with zero data loss.',
    status: 'SUPPORTED',
    confidenceScore: 99,
    sourceDocument: 'Cybersecurity Threat Intelligence Research Report.pdf',
    pageNumber: 17,
    anchorPassage: 'Centralized telemetry clusters processed an aggregate of 4.2 billion event logs per 24-hour cycle with 99.999% message queue retention.',
    sourceReference: 'Section 6.4, SIEM Capacity Log',
  },
  {
    id: 'CLM-019',
    jobId: 'SF-2026-00124',
    claimIndex: 19,
    sectionTitle: 'Zero Trust Access',
    claimText: 'Zero Trust Network Access (ZTNA) policies restricted external access strictly to verified managed devices.',
    status: 'SUPPORTED',
    confidenceScore: 97,
    sourceDocument: 'Cybersecurity Threat Intelligence Research Report.pdf',
    pageNumber: 18,
    anchorPassage: 'Context-aware ZTNA policies rejected all incoming connection requests originating from unmanaged or out-of-compliance personal computing devices.',
    sourceReference: 'Section 6.6, ZTNA Verification Log',
  },
  {
    id: 'CLM-020',
    jobId: 'SF-2026-00124',
    claimIndex: 20,
    sectionTitle: 'Data Encryption at Rest',
    claimText: 'All relational database storage volumes maintained AES-256 transparent data encryption at rest.',
    status: 'SUPPORTED',
    confidenceScore: 99,
    sourceDocument: 'Cybersecurity Threat Intelligence Research Report.pdf',
    pageNumber: 18,
    anchorPassage: 'Audits of all 24 production relational database instances verified active AES-256 transparent data encryption with customer-managed HSM keys.',
    sourceReference: 'Section 6.7, Cryptographic Storage Audit',
  },
  {
    id: 'CLM-021',
    jobId: 'SF-2026-00124',
    claimIndex: 21,
    sectionTitle: 'Backup & Recovery',
    claimText: 'Immutable offline backups were verified with a 100% data recovery success rate during disaster recovery testing.',
    status: 'SUPPORTED',
    confidenceScore: 98,
    sourceDocument: 'Cybersecurity Threat Intelligence Research Report.pdf',
    pageNumber: 19,
    anchorPassage: 'Quarterly disaster recovery simulations achieved 100% recovery fidelity from immutable WORM storage arrays within an RTO of 45 minutes.',
    sourceReference: 'Section 7.1, DR Restoration Verification',
  },
  {
    id: 'CLM-022',
    jobId: 'SF-2026-00124',
    claimIndex: 22,
    sectionTitle: 'Network Architecture',
    claimText: 'Network architecture segregated sensitive production databases from general management subnets.',
    status: 'SUPPORTED',
    confidenceScore: 96,
    sourceDocument: 'Cybersecurity Threat Intelligence Research Report.pdf',
    pageNumber: 20,
    anchorPassage: 'Physical and logical micro-segmentation strictly isolated backend database networks from administrative management VLANs with stateful inspection.',
    sourceReference: 'Section 7.3, Network Segmentation Audit',
  },
  {
    id: 'CLM-023',
    jobId: 'SF-2026-00124',
    claimIndex: 23,
    sectionTitle: 'Executive Conclusion',
    claimText: 'The organization maintained a resilient cybersecurity posture with zero uncontained data breaches throughout the reporting period.',
    status: 'SUPPORTED',
    confidenceScore: 99,
    sourceDocument: 'Cybersecurity Threat Intelligence Research Report.pdf',
    pageNumber: 20,
    anchorPassage: 'Final synthesis confirms that enterprise cybersecurity defenses successfully maintained zero uncontained breaches and full statutory compliance.',
    sourceReference: 'Section 7.5, Executive Synthesis',
  }
];

export const initialOutputs: OutputDeliverable[] = [
  {
    id: 'DELIV-001',
    type: 'Executive Brief',
    title: 'Executive Brief: Cybersecurity Posture & Threat Assessment',
    version: 'v1.2',
    verificationState: 'NEEDS_REVIEW',
    audience: 'Executive Leadership',
    sourceReferencesCount: 8,
    content: `EXECUTIVE BRIEF: CYBERSECURITY THREAT INTELLIGENCE POSTURE
Document Reference: SF-2026-00124 // Classification: Restricted Demo Instance

1. EXECUTIVE RISK SUMMARY
During the evaluated 90-day assessment window, enterprise boundary firewalls and perimeter sensors successfully mitigated 1,420,000 intrusion attempts with zero lateral movement into air-gapped core data enclaves. Endpoint Detection and Response (EDR) agent coverage remained steady at 99.94% across 14,200 managed institutional endpoints.

2. CRITICAL ANOMALY & THREAT ATTRIBUTION
Threat intelligence correlation identified coordinated reconnaissance by external adversary groups. Forensic memory analysis indicates the adversary utilized modified commodity Cobalt Strike beacons alongside a single chained privilege escalation flaw (CVE-2025-4127). Rapid automated micro-segmentation successfully quarantined honeypot endpoints within 4 hours and 18 minutes of anomalous activity.

3. GOVERNANCE & STRATEGIC DIRECTIVES
• Mandate FIDO2/WebAuthn hardware tokens across 100% of remaining secondary internal portals.
• Enforce quarterly SBOM validation for all tier-1 third-party vendor dependencies.
• Maintain current mean time to patch (MTTP) under 4.5 hours for critical external DMZ vulnerabilities.`
  },
  {
    id: 'DELIV-002',
    type: 'Technical Advisory',
    title: 'Technical Security Advisory: SOC Telemetry & Defense Hardening',
    version: 'v1.1',
    verificationState: 'NEEDS_REVIEW',
    audience: 'Cybersecurity Department',
    sourceReferencesCount: 16,
    content: `TECHNICAL ADVISORY: CYBER DEFENSE TELEMETRY & ATTACK SURFACE ANALYSIS
Document Reference: SF-2026-00124 // Target Audience: SOC Leads & Incident Handlers

1. TELEMETRY & INCIDENT RESPONSE METRICS
• Total Ingress Attempts Mitigated: 1,420,000 events (Perimeter IPS & NextGen Firewalls)
• SOC Mean Time to Detect (MTTD): 3.8 minutes across high-severity SIEM alerts
• Mean Time to Patch (MTTP): 4.2 hours for CVSS 9.0+ vulnerabilities
• Ingestion Pipeline Velocity: 4.2 billion log events per 24 hours with zero queue loss

2. FORENSIC BINARY & DWELL TIME ANALYSIS
Forensic triage of compromised honeypot staging nodes confirms the presence of modified Cobalt Strike payloads executing via encoded PowerShell commands. Threat actor dwell time within the isolated honeypot was arrested at 4 hours and 18 minutes via automated heuristic SOAR playbooks.

3. REMEDIATION & DEFENSIVE CONTROLS
1. Apply security update patch KB-5049182 across all Windows Server clusters to remediate CVE-2025-4127.
2. Ingest updated STIX/TAXII IoC feeds (84,000 indicators) into boundary edge routers.
3. Validate eBPF container runtime policies across Kubernetes worker nodes.`
  },
  {
    id: 'DELIV-003',
    type: 'Communication Package',
    title: 'Institutional Advisory: Public Cyber Resilience Bulletin',
    version: 'v1.0',
    verificationState: 'NEEDS_REVIEW',
    audience: 'Media & Communications',
    sourceReferencesCount: 6,
    content: `INSTITUTIONAL ADVISORY BULLETIN: ENTERPRISE CYBERSECURITY RESILIENCE
Document Reference: SF-2026-00124 // Plain Language Public Summary

1. PUBLIC RESILIENCE SUMMARY
The organization continues to maintain a robust, defense-in-depth cybersecurity posture. Over the past quarter, automated threat intelligence and proactive defense systems successfully defended institutional services against over 1.4 million automated scan and exploit attempts without disruption to critical services.

2. USER PROTECTION & TRANSPARENCY
• 100% of institutional systems enforce modern encryption (TLS 1.3) for all customer data.
• Multi-factor authentication protected all user accounts against credential stuffing attacks.
• Rigorous independent red-team assessments validated data integrity and business continuity.`
  }
];

export const initialTransformation: Transformation = {
  id: 'SF-2026-00124',
  title: 'Cybersecurity Threat Intelligence Research Report',
  source: {
    id: 'SRC-SF-2026-00124',
    name: 'Cybersecurity Threat Intelligence Research Report.pdf',
    type: 'PDF',
    pages: 20,
    size: '2.8 MB',
    sha256: '7c89f10a2b3c4d5e6f7a8b9c0d1e2f3a4b5c6d7e8f9a0b1c2d3e4f5a6b7c8d9e',
    uploadedAt: 'Today, 09:32 AM'
  },
  analysis: {
    findings: 5,
    risks: 3,
    recommendations: 6,
    entities: 24,
    evidence: 23,
    importantData: 18,
    keySummary: [
      'Over 1.42M perimeter intrusion attempts successfully blocked by NextGen firewalls.',
      'Air-gapped database enclaves recorded zero lateral movements or unauthorized data egress.',
      'Active EDR deployment verified at 99.94% coverage across 14,200 enterprise endpoints.',
      'Adversary dwell time in isolated honeypot environment halted in 4.18 hours via automated SOAR.',
      'Critical CVSS 9.0+ external vulnerabilities patched within a mean of 4.2 hours.'
    ]
  },
  profiles: initialAudienceProfiles,
  claims: initialClaims23,
  outputs: initialOutputs,
  review: {
    status: 'PENDING',
    reviewer: null,
    approvedAt: null
  },
  delivery: {
    status: 'NOT_SENT',
    recipients: [
      { id: 'REC-1', email: 'director-office@agency.gov', name: 'Office of the Director', role: 'Executive Leadership', type: 'TO' },
      { id: 'REC-2', email: 'ciso-board@agency.gov', name: 'CISO Advisory Board', role: 'Executive Leadership', type: 'TO' },
      { id: 'REC-3', email: 'soc-leads@agency.gov', name: 'SOC Lead Analysts', role: 'Cybersecurity Department', type: 'TO' },
      { id: 'REC-4', email: 'incident-response@agency.gov', name: 'Incident Response Team', role: 'Cybersecurity Department', type: 'CC' },
      { id: 'REC-5', email: 'press-bureau@agency.gov', name: 'Communications Bureau', role: 'Media & Communications', type: 'TO' }
    ],
    sentAt: null,
    subject: 'SourceFlow Verified Delivery: Cybersecurity Threat Intelligence Transformation Package (SF-2026-00124)',
    message: 'Attached please find the official, human-verified deliverables for the Cybersecurity Threat Intelligence Research Report (SF-2026-00124). All 23 statutory assertions have been verified against source evidence, approved by the Reviewing Officer, and chained into the tamper-evident audit ledger.'
  },
  audit: [
    {
      id: 'AUD-001',
      timestamp: new Date(Date.now() - 3600000).toISOString(),
      jobId: 'SF-2026-00124',
      actor: 'Operator K. Varma',
      actorRole: 'Content Operator',
      action: 'DOCUMENT_UPLOADED',
      details: 'Uploaded Cybersecurity Threat Intelligence Research Report.pdf (2.8 MB, 20 pages) with SHA-256: 7c89f10a2b3c4d5e...',
      version: 'v1.0',
      previousHash: '0000000000000000000000000000000000000000000000000000000000000000',
      currentHash: 'e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855',
      verificationStatus: 'VALID_TAMPER_EVIDENT'
    },
    {
      id: 'AUD-002',
      timestamp: new Date(Date.now() - 3300000).toISOString(),
      jobId: 'SF-2026-00124',
      actor: 'System Automated',
      actorRole: 'System Automated',
      action: 'INTELLIGENCE_EXTRACTED',
      details: 'Extracted 24 entities, 23 evidence anchors, and 5 key findings from 20 pages.',
      version: 'v1.0',
      previousHash: 'e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855',
      currentHash: '7c89f10a2b3c4d5e6f7a8b9c0d1e2f3a4b5c6d7e8f9a0b1c2d3e4f5a6b7c8d9e',
      verificationStatus: 'VALID_TAMPER_EVIDENT'
    },
    {
      id: 'AUD-003',
      timestamp: new Date(Date.now() - 3000000).toISOString(),
      jobId: 'SF-2026-00124',
      actor: 'System Automated',
      actorRole: 'System Automated',
      action: 'TRANSFORMATION_GENERATED',
      details: 'Generated 3 audience deliverables: Executive Brief (v1.2), Technical Advisory (v1.1), Communication Package (v1.0).',
      version: 'v1.0',
      previousHash: '7c89f10a2b3c4d5e6f7a8b9c0d1e2f3a4b5c6d7e8f9a0b1c2d3e4f5a6b7c8d9e',
      currentHash: '8f3b4c1a2e4f7a9d0b1c2e3f4a5b6c7d8e9f0a1b2c3d4e5f6a7b8c9d0e1f2a3b',
      verificationStatus: 'VALID_TAMPER_EVIDENT'
    },
    {
      id: 'AUD-004',
      timestamp: new Date(Date.now() - 2700000).toISOString(),
      jobId: 'SF-2026-00124',
      actor: 'System Automated',
      actorRole: 'System Automated',
      action: 'CLAIMS_VERIFIED',
      details: 'Grounding check completed: 21 claims supported, 2 claims flagged for human review (Claim #5 on Page 19, Claim #17 on Page 14).',
      version: 'v1.0',
      previousHash: '8f3b4c1a2e4f7a9d0b1c2e3f4a5b6c7d8e9f0a1b2c3d4e5f6a7b8c9d0e1f2a3b',
      currentHash: '4a5b6c7d8e9f0a1b2c3d4e5f6a7b8c9d0e1f2a3b4c5d6e7f8a9b0c1d2e3f4a5b',
      verificationStatus: 'VALID_TAMPER_EVIDENT'
    }
  ]
};

export const mockDocumentsList = [
  {
    id: 'SF-2026-00124',
    title: 'Cybersecurity Threat Intelligence Research Report',
    fileName: 'Cybersecurity Threat Intelligence Research Report.pdf',
    fileType: 'PDF',
    size: '2.8 MB',
    pages: 20,
    uploadedAt: 'Today, 09:32 AM',
    status: 'NEEDS_REVIEW',
    claimsTotal: 23,
    claimsVerified: 21,
    claimsFlagged: 2,
    outputs: ['Executive Brief', 'Technical Advisory', 'Communication Package'],
    lastActivity: 'Today, 10:42 AM'
  },
  {
    id: 'SF-2026-00088',
    title: 'Zero Trust Network Architecture Compliance Appraisal',
    fileName: 'Zero Trust Network Architecture.pdf',
    fileType: 'PDF',
    size: '3.4 MB',
    pages: 24,
    uploadedAt: 'Yesterday, 04:15 PM',
    status: 'APPROVED',
    claimsTotal: 23,
    claimsVerified: 23,
    claimsFlagged: 0,
    outputs: ['Executive Brief', 'Technical Advisory'],
    lastActivity: 'Yesterday, 05:30 PM'
  },
  {
    id: 'SF-2026-00042',
    title: 'Vendor Software Supply Chain Security Audit',
    fileName: 'Vendor Supply Chain Audit.docx',
    fileType: 'DOCX',
    size: '1.9 MB',
    pages: 16,
    uploadedAt: '3 days ago',
    status: 'APPROVED',
    claimsTotal: 18,
    claimsVerified: 18,
    claimsFlagged: 0,
    outputs: ['Executive Brief', 'Communication Package'],
    lastActivity: '3 days ago'
  }
];
