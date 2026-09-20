export interface DocumentPage {
  pageNumber: number;
  sectionHeader: string;
  content: string;
  hasAnchor?: boolean;
  anchorClaimId?: string;
}

export interface MockSourceDocument {
  id: string;
  fileName: string;
  title: string;
  fileSize: string;
  fileType: 'PDF' | 'DOCX' | 'TXT' | 'IMAGE';
  sha256: string;
  classification: string;
  totalPages: number;
  pages: DocumentPage[];
}

export const primaryMockDocument: MockSourceDocument = {
  id: 'SRC-SF-2026-00124',
  fileName: 'Cybersecurity Threat Intelligence Research Report.pdf',
  title: 'Cybersecurity Threat Intelligence Research Report',
  fileSize: '2.8 MB',
  fileType: 'PDF',
  sha256: '7c89f10a2b3c4d5e6f7a8b9c0d1e2f3a4b5c6d7e8f9a0b1c2d3e4f5a6b7c8d9e',
  classification: 'RESTRICTED DEMO INSTANCE // INSTITUTIONAL WORKSPACE',
  totalPages: 20,
  pages: [
    {
      pageNumber: 1,
      sectionHeader: '1.0 EXECUTIVE THREAT INTELLIGENCE SUMMARY',
      content: `INSTITUTIONAL CYBERSECURITY THREAT ASSESSMENT
Document Reference: SF-2026-00124
Classification: Restricted Demo Instance // Content Verification Platform

1.1 SCOPE AND TELEMETRY OVERVIEW
This intelligence report analyzes perimeter telemetry, threat actor behaviors, and incident response metrics across the institutional infrastructure during the 90-day evaluation period.

During the evaluated 90-day operational window, enterprise perimeter firewalls and boundary intrusion prevention systems successfully filtered and mitigated 1,420,000 unauthorized intrusion attempts without ingress compromise. Centralized Security Operations Center (SOC) dashboards confirmed resilient defense-in-depth enforcement across all external entry points.`
    },
    {
      pageNumber: 2,
      sectionHeader: '2.0 CORE DATA ENCLAVE ISOLATION & LATERAL MOVEMENT',
      content: `2.1 DATA ENCLAVE INTEGRITY AUDIT
Network segmentation policies separating public-facing web services from internal databases were evaluated under automated vulnerability assessment tooling.

Zero unauthorized lateral movements were detected across the air-gapped mission-critical database enclaves during synchronized continuous packet inspection. Micro-segmentation firewalls enforced zero-trust access boundaries with continuous stateful session tracking.`
    },
    {
      pageNumber: 3,
      sectionHeader: '1.4 STATUTORY COMPLIANCE & FRAMEWORK ALIGNMENT',
      content: `1.4.1 REGULATORY FRAMEWORK VALIDATION
Security operations and data protection procedures were audited against internationally recognized governance frameworks.

All security incident escalation workflows adhered strictly to the statutory directives defined in NIST CSF 2.0 and ISO/IEC 27001 Annex A controls. Regular compliance reviews confirmed 100% adherence to institutional reporting mandates.`
    },
    {
      pageNumber: 4,
      sectionHeader: '3.0 ENDPOINT SENSOR COVERAGE & HEALTH',
      content: `3.2 EDR FLEET TELEMETRY
Real-time endpoint protection sensors were audited across all enterprise laptop, desktop, and virtualized server assets.

Active telemetry confirmed that EDR sensor agents maintained a 99.94% operational heartbeat across all 14,200 fleet workstations and servers. Isolated sensor outages were automatically flagged and restored by centralized endpoint management controllers.`
    },
    {
      pageNumber: 5,
      sectionHeader: '2.4 IDENTITY & ACCESS MANAGEMENT RESILIENCE',
      content: `2.4.2 CREDENTIAL ATTACK MITIGATION
Identity provider logs were reviewed to evaluate authentication security and brute-force mitigation effectiveness.

FIDO2 hardware security keys and WebAuthn protocols successfully prevented 100% of unauthorized credential stuffing attempts across the centralized SSO portal. Legacy password-only fallbacks remained completely disabled.`
    },
    {
      pageNumber: 7,
      sectionHeader: '4.0 VULNERABILITY MANAGEMENT & PATCH CADENCE',
      content: `4.3 PATCH CADENCE & REMEDIATION VELOCITY
Vulnerability scanner telemetry and patch management cycles were tracked across external and internal server environments.

Vulnerability response metrics established a mean time to patch (MTTP) of 4.2 hours for CVSS 9.0+ vulnerabilities across external-facing DMZ hosts. Automated deployment pipelines expedited the release of critical vendor security updates.`
    },
    {
      pageNumber: 8,
      sectionHeader: '3.6 SECURITY OPERATIONS CENTER PERFORMANCE',
      content: `3.6.1 SOC INCIDENT RESPONSE VELOCITY
Incident triage, correlation, and response metrics were evaluated across Tier 1 through Tier 3 analyst teams.

Automated SIEM alert correlation achieved a verified mean time to detect (MTTD) of 3.8 minutes across high-severity security incidents. SOAR playbooks automatically enriched alerts with contextual threat intelligence.`
    },
    {
      pageNumber: 9,
      sectionHeader: '4.1 CRYPTOGRAPHIC TRANSPORT & TLS ENFORCEMENT',
      content: `4.1.2 SERVICE MESH ENCRYPTION
Microservice communication backbones and inter-service API traffic were audited for cryptographic transport compliance.

Service mesh mutual TLS (mTLS) enforcement confirmed 100% compliance using TLS 1.3 with Curve25519 and ECDSA certificate validation. Deprecated TLS 1.0/1.1 protocols remained strictly blocked at the ingress gateway.`
    },
    {
      pageNumber: 10,
      sectionHeader: '4.5 CLOUD RUNTIME & CONTAINER SECURITY',
      content: `4.5.1 KUBERNETES RUNTIME AUDIT
Production container clusters running across private cloud nodes were monitored for abnormal process execution.

eBPF-based container security agents recorded zero unverified root privilege escalations across 850 active microservice container pods. Immutable container image policies prevented in-flight binary modification.`
    },
    {
      pageNumber: 11,
      sectionHeader: '5.1 DATA LOSS PREVENTION (DLP) TELEMETRY',
      content: `5.1.3 EGRESS FILTERING & DATA INTEGRITY
DLP content inspection engines analyzed outbound network streams for unauthorized transfers of classified or personally identifiable data.

Automated egress deep packet inspection blocked 14 unauthorized bulk database export attempts, preventing data exfiltration. Automated quarantine protocols alerted the data privacy officer within 60 seconds.`
    },
    {
      pageNumber: 12,
      sectionHeader: '5.2 WORKFORCE SECURITY & PHISHING SUSCEPTIBILITY',
      content: `5.2.1 WORKFORCE AWARENESS METRICS
Quarterly social engineering and simulated spear-phishing campaigns were administered to evaluate employee security vigilance.

Workforce behavioral assessments demonstrated a reduction in phishing susceptibility from 8.4% to 1.2% across 3,200 administrative personnel. Mandatory interactive micro-trainings reinforced secure link handling.`
    },
    {
      pageNumber: 13,
      sectionHeader: '5.4 THREAT INTELLIGENCE INGESTION & IoC DISTRIBUTION',
      content: `5.4.2 AUTOMATED IoC SYNCHRONIZATION
Automated threat intelligence feeds from national CERT and commercial telemetry partners were ingested into edge defenses.

STIX/TAXII threat feeds ingested 84,000 unique malicious indicators of compromise (IoCs) with automated dynamic firewall rule generation. Malicious IP and domain blocks were propagated to perimeter firewalls in under 30 seconds.`
    },
    {
      pageNumber: 14,
      sectionHeader: '5.3 ADVERSARY DWELL TIME & HONEYPOT CONTAINMENT',
      content: `5.3.1 DWELL TIME & DECEPTION NETWORK TELEMETRY
Telemetry from external threat deception nodes (honeypots) was recorded to measure adversary reconnaissance speed and containment velocity.

Adversary dwell time inside the isolated honeypot perimeter was measured at exactly 4 hours and 18 minutes before automated heuristic rules triggered quarantine. Contrary to third-party claims asserting a 45-day persistent intrusion, the adversary remained strictly confined to isolated deception subnets with zero lateral ingress into operational environments.

5.5 THIRD-PARTY SOFTWARE SUPPLY CHAIN ASSURANCE
All 48 critical software suppliers delivered cryptographically signed Software Bill of Materials (SBOM) compliant with CycloneDX specifications.`,
      hasAnchor: true,
      anchorClaimId: 'CLM-017'
    },
    {
      pageNumber: 15,
      sectionHeader: '5.7 AUTOMATED NETWORK MICRO-SEGMENTATION',
      content: `5.7.1 SOAR PLAYBOOK DRILL RESULTS
Simulated endpoint infection exercises tested the automated isolation capabilities of the network access controller.

During simulated endpoint compromise drills, zero-trust network policy engines isolated 3 target machines within 12 seconds of anomalous beacon detection. Host isolation severed all outbound gateway connectivity while preserving forensic capture channels.`
    },
    {
      pageNumber: 16,
      sectionHeader: '6.1 RED TEAM ADVERSARY SIMULATION',
      content: `6.1.2 CREDENTIAL REPLAY RESILIENCE
Annual red-team exercises simulated Advanced Persistent Threat (APT) credential harvesting and replay techniques.

Red-team penetration exercise #RT-2025-Q3 confirmed that automated Kerberos ticket harvesting and pass-the-hash attacks were completely mitigated. Endpoint Credential Guard and restricted admin modes successfully blocked LSASS process memory dumping.`
    },
    {
      pageNumber: 17,
      sectionHeader: '6.4 SIEM CAPACITY & LOG PIPELINE INTEGRITY',
      content: `6.4.1 CENTRALIZED TELEMETRY CLUSTER CAPACITY
Central log management clusters ingested event streams from firewalls, servers, databases, and endpoint agents.

Centralized telemetry clusters processed an aggregate of 4.2 billion event logs per 24-hour cycle with 99.999% message queue retention. Real-time stream processing ensured sub-second indexing for threat correlation.`
    },
    {
      pageNumber: 18,
      sectionHeader: '6.6 ZERO TRUST ACCESS & STORAGE ENCRYPTION',
      content: `6.6.1 CONTEXT-AWARE DEVICE POSTURE EVALUATION
Context-aware ZTNA policies rejected all incoming connection requests originating from unmanaged or out-of-compliance personal computing devices.

6.7 CRYPTOGRAPHIC ENCRYPTION AT REST
Audits of all 24 production relational database instances verified active AES-256 transparent data encryption with customer-managed HSM keys. Key rotation was verified on a statutory 90-day cycle.`
    },
    {
      pageNumber: 19,
      sectionHeader: '6.2 FORENSIC BINARY ANALYSIS & THREAT ATTRIBUTION',
      content: `6.2.1 INTRUSION ARTIFACT REVERSE ENGINEERING
Forensic triage of captured malware samples from perimeter staging directories was conducted in isolated sandbox environments.

Forensic memory dumps revealed that the adversary leveraged modified commodity Cobalt Strike beacons and PowerShell scripts alongside a single chained CVE-2025-4127 privilege escalation flaw. Contrary to early draft reports claiming the exclusive use of custom zero-day kernel exploits, binary disassembly confirmed the threat actor adapted readily available post-exploitation toolkits with customized configuration headers.

7.1 DISASTER RECOVERY & IMMUTABLE BACKUPS
Quarterly disaster recovery simulations achieved 100% recovery fidelity from immutable WORM storage arrays within an RTO of 45 minutes.`,
      hasAnchor: true,
      anchorClaimId: 'CLM-005'
    },
    {
      pageNumber: 20,
      sectionHeader: '7.5 EXECUTIVE CONCLUSION & POSTURE CERTIFICATION',
      content: `7.3 PRODUCTION DATABASE NETWORK SEGREGATION
Physical and logical micro-segmentation strictly isolated backend database networks from administrative management VLANs with stateful inspection.

7.5 FORMAL ATTESTATION & SUMMARY
Final synthesis confirms that enterprise cybersecurity defenses successfully maintained zero uncontained breaches and full statutory compliance throughout the 90-day evaluation window. All derived communication deliverables must be formally verified against this primary intelligence record prior to external dissemination.`
    }
  ]
};
