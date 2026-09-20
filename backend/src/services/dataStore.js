/**
 * SourceFlow In-Memory Data Store
 * Provides default records and state management for development & testing.
 */

export const defaultUser = {
  id: 'USR-802',
  name: 'K. Varma',
  email: 'operator@sourceflow.demo',
  role: 'Reviewer',
  designation: 'Content Verification Specialist',
  department: 'Content Verification Operations',
  avatar: 'KV',
  lastActive: new Date().toISOString()
};

export let userProfile = { ...defaultUser };

export function updateUserProfile(updates) {
  userProfile = {
    ...userProfile,
    ...updates,
    id: userProfile.id // prevent ID overwrite
  };
  return userProfile;
}

export let documents = [
  {
    id: 'DOC-8821',
    title: 'Cybersecurity Threat Intelligence Research Report.pdf',
    fileName: 'Cybersecurity Threat Intelligence Research Report.pdf',
    source_hash: '3f78a2c98d61e4b95f02c7b41e8901ad39485721c08e541b6d87f92a10b4278e',
    sha256: '3f78a2c98d61e4b95f02c7b41e8901ad39485721c08e541b6d87f92a10b4278e',
    status: 'ANALYZED',
    storage_path: '/storage/documents/DOC-8821.pdf',
    pages: 42,
    size: '4.8 MB',
    uploaded_at: '2026-09-18T14:20:00Z',
    uploadedAt: '2026-09-18T14:20:00Z'
  },
  {
    id: 'DOC-8822',
    title: 'Q3 Enterprise Architecture & Compliance Audit.docx',
    fileName: 'Q3 Enterprise Architecture & Compliance Audit.docx',
    source_hash: '9a8b7c6d5e4f3a2b1c0d9e8f7a6b5c4d3e2f1a0b9c8d7e6f5a4b3c2d1e0f9a8b',
    sha256: '9a8b7c6d5e4f3a2b1c0d9e8f7a6b5c4d3e2f1a0b9c8d7e6f5a4b3c2d1e0f9a8b',
    status: 'ANALYZED',
    storage_path: '/storage/documents/DOC-8822.docx',
    pages: 28,
    size: '2.1 MB',
    uploaded_at: '2026-09-17T09:15:00Z',
    uploadedAt: '2026-09-17T09:15:00Z'
  }
];

export let claims = [
  {
    id: 'CLM-001',
    transformation_id: 'SF-2026-00124',
    jobId: 'SF-2026-00124',
    claim_index: 1,
    claimIndex: 1,
    section_title: 'Executive Summary',
    sectionTitle: 'Executive Summary',
    claim_text: 'Enterprise boundary firewalls and perimeter sensors mitigated 1,420,000 intrusion attempts.',
    claimText: 'Enterprise boundary firewalls and perimeter sensors mitigated 1,420,000 intrusion attempts.',
    original_draft_text: 'Enterprise boundary firewalls and perimeter sensors mitigated 1,420,000 intrusion attempts.',
    originalDraftText: 'Enterprise boundary firewalls and perimeter sensors mitigated 1,420,000 intrusion attempts.',
    evidence: {
      anchor_passage: 'During the evaluated 90-day operational window, enterprise perimeter firewalls mitigated 1,420,000 intrusion attempts.',
      anchorPassage: 'During the evaluated 90-day operational window, enterprise perimeter firewalls mitigated 1,420,000 intrusion attempts.',
      page_number: 1,
      pageNumber: 1,
      exact_match: true,
      exactMatch: true,
      similarity_score: 99,
      similarityScore: 99,
      is_ai_generated: false,
      isAiGenerated: false
    },
    source_reference: 'Cybersecurity Threat Intelligence Research Report.pdf • Page 1',
    sourceReference: 'Cybersecurity Threat Intelligence Research Report.pdf • Page 1',
    source_document: 'Cybersecurity Threat Intelligence Research Report.pdf',
    sourceDocument: 'Cybersecurity Threat Intelligence Research Report.pdf',
    pageNumber: 1,
    anchorPassage: 'During the evaluated 90-day operational window, enterprise perimeter firewalls mitigated 1,420,000 intrusion attempts.',
    status: 'supported',
    confidenceScore: 99,
    created_at: '2026-09-18T14:20:00Z',
    updated_at: '2026-09-18T14:20:00Z'
  },
  {
    id: 'CLM-005',
    transformation_id: 'SF-2026-00124',
    jobId: 'SF-2026-00124',
    claim_index: 5,
    claimIndex: 5,
    section_title: 'Operational Telemetry',
    sectionTitle: 'Operational Telemetry',
    claim_text: 'Mean dwell time of malicious probes decreased by 38.4% across industrial SCADA sensor nodes.',
    claimText: 'Mean dwell time of malicious probes decreased by 38.4% across industrial SCADA sensor nodes.',
    original_draft_text: 'Mean dwell time of malicious probes decreased by 38.4% across industrial SCADA sensor nodes.',
    originalDraftText: 'Mean dwell time of malicious probes decreased by 38.4% across industrial SCADA sensor nodes.',
    evidence: {
      anchor_passage: 'SCADA monitoring gateways recorded an estimated 38.4% reduction in dwell time across regional nodes.',
      anchorPassage: 'SCADA monitoring gateways recorded an estimated 38.4% reduction in dwell time across regional nodes.',
      page_number: 4,
      pageNumber: 4,
      exact_match: false,
      exactMatch: false,
      similarity_score: 68,
      similarityScore: 68,
      is_ai_generated: true,
      isAiGenerated: true
    },
    source_reference: 'Cybersecurity Threat Intelligence Research Report.pdf • Page 4',
    sourceReference: 'Cybersecurity Threat Intelligence Research Report.pdf • Page 4',
    source_document: 'Cybersecurity Threat Intelligence Research Report.pdf',
    sourceDocument: 'Cybersecurity Threat Intelligence Research Report.pdf',
    pageNumber: 4,
    anchorPassage: 'SCADA monitoring gateways recorded an estimated 38.4% reduction in dwell time across regional nodes.',
    status: 'needs_review',
    flag_reason: 'Estimated reduction metrics require manual telemetry verification',
    confidenceScore: 68,
    created_at: '2026-09-18T14:20:00Z',
    updated_at: '2026-09-18T14:20:00Z'
  },
  {
    id: 'CLM-017',
    transformation_id: 'SF-2026-00124',
    jobId: 'SF-2026-00124',
    claim_index: 17,
    claimIndex: 17,
    section_title: 'Incident Containment',
    sectionTitle: 'Incident Containment',
    claim_text: 'Adversary dwell time inside the isolated honeypot perimeter was measured at exactly 4 hours and 18 minutes.',
    claimText: 'Adversary dwell time inside the isolated honeypot perimeter was measured at exactly 4 hours and 18 minutes.',
    original_draft_text: 'Adversary dwell time inside the isolated honeypot perimeter was measured at exactly 4 hours and 18 minutes.',
    originalDraftText: 'Adversary dwell time inside the isolated honeypot perimeter was measured at exactly 4 hours and 18 minutes.',
    evidence: {
      anchor_passage: 'Dwell time telemetry recorded an isolation window of approximately 4 hours prior to automated quarantine.',
      anchorPassage: 'Dwell time telemetry recorded an isolation window of approximately 4 hours prior to automated quarantine.',
      page_number: 19,
      pageNumber: 19,
      exact_match: false,
      exactMatch: false,
      similarity_score: 55,
      similarityScore: 55,
      is_ai_generated: true,
      isAiGenerated: true
    },
    source_reference: 'Cybersecurity Threat Intelligence Research Report.pdf • Page 19',
    sourceReference: 'Cybersecurity Threat Intelligence Research Report.pdf • Page 19',
    source_document: 'Cybersecurity Threat Intelligence Research Report.pdf',
    sourceDocument: 'Cybersecurity Threat Intelligence Research Report.pdf',
    pageNumber: 19,
    anchorPassage: 'Dwell time telemetry recorded an isolation window of approximately 4 hours prior to automated quarantine.',
    status: 'needs_review',
    flag_reason: 'Exact 18-minute metric discrepancy with source text passage',
    confidenceScore: 55,
    created_at: '2026-09-18T14:20:00Z',
    updated_at: '2026-09-18T14:20:00Z'
  }
];

export let workspaces = [
  {
    id: 'workspace-001',
    name: 'SourceFlow Operations',
    description: 'Content Transformation & Verification',
    type: 'operations',
    members: 3,
    createdAt: '2026-08-15T08:00:00Z',
    dashboards: [
      {
        id: 'dashboard-001',
        workspaceId: 'workspace-001',
        name: 'Operations Overview',
        description: 'Monitor transformations, reviews and deliveries.',
        type: 'operations',
        modules: ['transformations', 'reviews', 'documents', 'activity', 'deliveries'],
        createdAt: '2026-09-01T09:00:00Z'
      },
      {
        id: 'dashboard-002',
        workspaceId: 'workspace-001',
        name: 'Verification Center',
        description: 'Review claims and source evidence.',
        type: 'verification',
        modules: ['claims', 'evidence', 'reviews'],
        createdAt: '2026-09-02T10:30:00Z'
      }
    ]
  },
  {
    id: 'workspace-002',
    name: 'Content Intelligence',
    description: 'Research & Communication',
    type: 'communications',
    members: 5,
    createdAt: '2026-08-20T11:30:00Z',
    dashboards: [
      {
        id: 'dashboard-004',
        workspaceId: 'workspace-002',
        name: 'Research & Briefings',
        description: 'Deep investigative research summaries.',
        type: 'research',
        modules: ['documents', 'transformations', 'activity'],
        createdAt: '2026-09-04T11:00:00Z'
      }
    ]
  }
];

export let auditRecords = [
  {
    id: 'AUD-001',
    timestamp: '2026-09-18T14:20:00Z',
    actor: 'K. Varma',
    actorRole: 'Reviewer',
    action: 'DOCUMENT_UPLOADED',
    details: 'Uploaded Cybersecurity Threat Intelligence Research Report.pdf with SHA-256 fingerprint.',
    jobId: 'SF-2026-00124',
    previousHash: 'GENESIS_0000000000000000000000000000000000000000000000000000000000000000',
    hash: '01a2b3c4d5e6f708192a3b4c5d6e7f8091a2b3c4d5e6f708192a3b4c5d6e7f80'
  }
];

export let ocrResults = [];

export let aiRequests = [];

export let outputs = [];

export let transformations = [
  {
    id: 'SF-2026-00124',
    workspace_id: 'workspace-001',
    file_id: 'DOC-8821',
    created_by: 'USR-802',
    title: 'Cybersecurity Threat Intelligence Research Report',
    status: 'review',
    configuration: {
      analysis: {
        findings: 23,
        risks: 4,
        recommendations: 3,
        entities: 18,
        evidence: 23,
        importantData: 1420000,
        keySummary: [
          'Critical infrastructure targeting observed across 14 financial and utility sector entities.',
          'Adversary leveraged modified commodity Cobalt Strike beacons with chained CVE-2025-4127.',
          'Automated isolation protocols prevented lateral movement past boundary DMZ firewalls.'
        ]
      },
      profiles: [
        {
          id: 'prof-exec',
          name: 'Executive Leadership',
          role: 'C-Suite / Board',
          deliverableType: 'Executive Brief',
          tone: 'Strategic & High-Level',
          defaultRecipients: ['director-office@agency.gov', 'ciso-board@agency.gov'],
          isSelected: true
        },
        {
          id: 'prof-cyber',
          name: 'Cyber Threat Analysis',
          role: 'Technical Analyst',
          deliverableType: 'Technical Advisory',
          tone: 'Detailed Technical & Telemetry',
          defaultRecipients: ['soc-leads@agency.gov'],
          isSelected: true
        },
        {
          id: 'prof-media',
          name: 'Public & Communications',
          role: 'Press / External',
          deliverableType: 'Communication Package',
          tone: 'Clear, Transparent, Non-Alarmist',
          defaultRecipients: ['media-relations@agency.gov'],
          isSelected: true
        }
      ],
      outputs: {
        selectedTypes: ['Executive Brief', 'Technical Advisory', 'Communication Package'],
        options: { summary: true, advisory: true, presentation: true, comm_package: true }
      },
      review: {
        status: 'PENDING',
        reviewer: null,
        approvedAt: null
      },
      delivery: {
        status: 'NOT_SENT',
        recipients: [
          { id: 'REC-1', name: 'Director Office', email: 'director-office@agency.gov', role: 'Executive', type: 'TO' },
          { id: 'REC-2', name: 'CISO Board', email: 'ciso-board@agency.gov', role: 'Governance', type: 'TO' },
          { id: 'REC-3', name: 'SOC Incident Leads', email: 'soc-leads@agency.gov', role: 'Technical', type: 'TO' }
        ],
        sentAt: null,
        subject: 'Cybersecurity Threat Intelligence Update',
        message: 'Please find attached the formally verified Cybersecurity Threat Intelligence briefing and remediation directives, attested through 23 claims verified against primary source telemetry.'
      }
    },
    created_at: '2026-09-18T14:20:00Z',
    updated_at: '2026-09-18T14:20:00Z'
  }
];

export function getTransformationById(id) {
  return transformations.find(t => t.id === id) || null;
}

export function saveTransformation(data) {
  const index = transformations.findIndex(t => t.id === data.id);
  if (index >= 0) {
    transformations[index] = {
      ...transformations[index],
      ...data,
      updated_at: new Date().toISOString()
    };
    return transformations[index];
  } else {
    const record = {
      ...data,
      created_at: data.created_at || new Date().toISOString(),
      updated_at: new Date().toISOString()
    };
    transformations.push(record);
    return record;
  }
}

export let translations = [];

export function getTranslationById(id) {
  return translations.find(t => t.id === id) || null;
}

export function saveTranslation(data) {
  const index = translations.findIndex(t => t.id === data.id);
  if (index >= 0) {
    translations[index] = {
      ...translations[index],
      ...data,
      updated_at: new Date().toISOString()
    };
    return translations[index];
  } else {
    const record = {
      ...data,
      id: data.id || `trans-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
      created_at: data.created_at || new Date().toISOString(),
      updated_at: new Date().toISOString()
    };
    translations.push(record);
    return record;
  }
}

export function listTranslations(filter = {}) {
  let list = [...translations];
  if (filter.workspaceId) {
    list = list.filter(t => t.workspace_id === filter.workspaceId || t.workspaceId === filter.workspaceId);
  }
  if (filter.fileId) {
    list = list.filter(t => t.file_id === filter.fileId || t.fileId === filter.fileId);
  }
  if (filter.status) {
    list = list.filter(t => (t.status || '').toLowerCase() === filter.status.toLowerCase());
  }
  const offset = parseInt(filter.offset || '0', 10);
  const limit = parseInt(filter.limit || '50', 10);
  return list.slice(offset, offset + limit);
}

