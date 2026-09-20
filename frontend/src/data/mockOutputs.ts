import { OutputDossier } from '../types/output';

export const primaryMockOutput: OutputDossier = {
  jobId: 'SF-2026-00124',
  title: 'Official Advisory: Cybersecurity Threat Intelligence & Posture Assessment',
  referenceNumber: 'SF-ADV-2026-00124',
  date: 'Today • 10:45 IST',
  integrityScore: 98,
  groundingScore: 97,
  consistencyScore: 99,
  advisoryText: {
    executiveSummary: `This official cybersecurity advisory provides an operational assessment of the institutional threat landscape. Analysis confirms that 21 of 23 statutory assertions are verified against primary telemetry logs, with 2 items under active human verification.`,
    incidentAnalysis: `Perimeter telemetry confirms that enterprise firewalls and intrusion prevention systems mitigated 1,420,000 intrusion attempts over the 90-day assessment window. Forensic memory analysis indicates that external threat actors deployed modified commodity Cobalt Strike beacons alongside a single privilege escalation vulnerability (CVE-2025-4127). Rapid automated micro-segmentation successfully quarantined honeypot staging nodes within 4 hours and 18 minutes of anomalous activity.`,
    statutoryCompliance: `All security workflows and escalation procedures conformed to NIST CSF 2.0 and ISO/IEC 27001 statutory standards. Zero uncontained data breaches or unauthorized data exfiltrations occurred during the reporting period.`,
    recommendedActions: [
      'Maintain continuous automated monitoring across all external-facing DMZ boundaries.',
      'Deploy patch KB-5049182 across remaining server clusters to remediate CVE-2025-4127.',
      'Enforce FIDO2 hardware authentication tokens across 100% of internal administrative consoles.'
    ]
  },
  summaryText: `EXECUTIVE SUMMARY: CYBERSECURITY THREAT INTELLIGENCE REPORT

• Overall Infrastructure Health: Resilient Enterprise Defense (99.9% Compliance)
• Total Perimeter Intrusion Attempts Mitigated: 1,420,000 events
• Active EDR Sensor Coverage: 99.94% across 14,200 managed endpoints
• Mean Time to Detect (MTTD): 3.8 minutes across high-severity incidents
• Mean Time to Patch (MTTP): 4.2 hours for critical external vulnerabilities
• Incident Containment: Adversary honeypot dwell time halted in 4.18 hours via automated SOAR playbooks
• Verification Status: 21 claims verified, 2 claims flagged for human review.`,
  slides: [
    {
      slideNumber: 1,
      title: 'Enterprise Cyber Threat Landscape Overview',
      bulletPoints: [
        'Comprehensive audit of 14,200 managed endpoints and perimeter firewalls',
        'Over 1.42 million unauthorized ingress attempts mitigated without breach',
        '100% compliance with NIST CSF 2.0 and ISO/IEC 27001 directives'
      ],
      groundedClaimIds: ['CLM-001', 'CLM-002', 'CLM-003']
    },
    {
      slideNumber: 2,
      title: 'Perimeter Defense & EDR Sensor Coverage',
      bulletPoints: [
        'EDR sensor agents maintained 99.94% continuous operational heartbeat',
        'Zero unauthorized lateral movements into air-gapped core database enclaves',
        'Mean time to patch (MTTP) established at 4.2 hours for CVSS 9.0+ flaws'
      ],
      groundedClaimIds: ['CLM-004', 'CLM-007', 'CLM-008']
    },
    {
      slideNumber: 3,
      title: 'Threat Actor Attribution & Dwell Time Analysis',
      bulletPoints: [
        'Captured payloads identified as modified commodity Cobalt Strike beacons',
        'Adversary dwell time inside isolated honeypot arrested in 4 hours 18 minutes',
        'Automated zero-trust micro-segmentation isolated targets within 12 seconds'
      ],
      groundedClaimIds: ['CLM-005', 'CLM-015', 'CLM-017']
    },
    {
      slideNumber: 4,
      title: 'Statutory Governance & Strategic Directives',
      bulletPoints: [
        '21 of 23 statutory claims verified with 100% citation grounding',
        '2 flagged assertions under active human reviewer verification',
        'Tamper-evident audit record generated and ready for formal dispatch'
      ],
      groundedClaimIds: ['CLM-001', 'CLM-006', 'CLM-023']
    }
  ],
  socialPosts: [
    {
      platform: 'Microblog / Alert',
      content: `⚡ Cybersecurity Threat Intelligence Advisory: Enterprise defense audit confirms resilient operations with 1.42M intrusion attempts successfully mitigated and zero uncontained breaches. Verified under SourceFlow.`,
      characterCount: 224
    },
    {
      platform: 'Public Advisory Bulletin',
      content: `PUBLIC SECURITY ADVISORY: Institutional cybersecurity infrastructure maintained high resilience throughout the quarterly assessment cycle. All critical services operated without interruption, with automated defense systems blocking unauthorized ingress. Verified under SourceFlow Content Transformation Platform.`,
      characterCount: 308
    },
    {
      platform: 'Institutional Portal',
      content: `INSTITUTIONAL SUMMARY [SF-ADV-2026-00124]: 1.42M intrusion attempts mitigated; 99.94% EDR fleet coverage; 21 statutory claims source-verified; 2 claims reviewed and attested by content reviewer.`,
      characterCount: 202
    }
  ]
};
