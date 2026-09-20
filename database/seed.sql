-- ==============================================================================
-- SourceFlow Seed Data
-- Institutional Document Intelligence and Grounded Verification
-- NOTE: Contains ONLY safe demo data. Never insert production secrets or credentials.
-- ==============================================================================

DO $$
DECLARE
    v_workspace_id UUID := '11111111-1111-1111-1111-111111111111'::UUID;
    v_workspace_2_id UUID := '22222222-2222-2222-2222-222222222222'::UUID;
    v_file_id UUID := 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa'::UUID;
    v_trans_id UUID := 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb'::UUID;
BEGIN
    -- 1. Insert Demo Workspaces
    INSERT INTO public.workspaces (id, name, description, workspace_type)
    VALUES 
        (v_workspace_id, 'SourceFlow Operations', 'Content Transformation & Verification Operations', 'operations'),
        (v_workspace_2_id, 'Content Intelligence', 'Research & Executive Communication Intelligence', 'communications')
    ON CONFLICT (id) DO NOTHING;

    -- 2. Insert Ingested Source Document
    INSERT INTO public.files (
        id,
        workspace_id,
        original_name,
        stored_name,
        mime_type,
        file_size,
        storage_path,
        sha256,
        page_count,
        status
    )
    VALUES (
        v_file_id,
        v_workspace_id,
        'Cybersecurity Threat Intelligence Research Report.pdf',
        'SF-DOC-8821-threat-intelligence.pdf',
        'application/pdf',
        5033164,
        'documents/SF-DOC-8821.pdf',
        '3f78a2c98d61e4b95f02c7b41e8901ad39485721c08e541b6d87f92a10b4278e',
        42,
        'processed'
    )
    ON CONFLICT (id) DO NOTHING;

    -- 3. Insert Ingestion OCR Result
    INSERT INTO public.ocr_results (
        file_id,
        extracted_text,
        language,
        provider,
        status,
        confidence
    )
    VALUES (
        v_file_id,
        'CYBERSECURITY THREAT INTELLIGENCE RESEARCH REPORT - Q3 EVALUATION. During the evaluated 90-day operational window, enterprise perimeter firewalls mitigated 1,420,000 intrusion attempts.',
        'eng',
        'ocr_space',
        'completed',
        99.4
    )
    ON CONFLICT DO NOTHING;

    -- 4. Insert Transformation Workflow Instance
    INSERT INTO public.transformations (
        id,
        workspace_id,
        file_id,
        title,
        status,
        configuration
    )
    VALUES (
        v_trans_id,
        v_workspace_id,
        v_file_id,
        'Cybersecurity Threat Intelligence Assessment',
        'review',
        '{
            "analysis": {
                "findings": 42,
                "risks": 7,
                "recommendations": 11,
                "entities": 28,
                "evidence": 23,
                "importantData": 94,
                "keySummary": [
                    "Perimeter firewalls mitigated 1,420,000 intrusion attempts over 90 days.",
                    "Zero-day privilege escalation CVE-2025-4127 identified in unpatched staging nodes.",
                    "EDR sensor agents maintained 99.94% operational uptime across 14,200 fleet devices."
                ]
            },
            "profiles": [
                {"id": "prof-1", "name": "Executive Leadership", "deliverableType": "Executive Brief", "isSelected": true},
                {"id": "prof-2", "name": "Technical & Security Leads", "deliverableType": "Technical Advisory", "isSelected": true}
            ],
            "review": {
                "status": "READY_FOR_APPROVAL",
                "reviewer": null,
                "approvedAt": null
            },
            "delivery": {
                "status": "NOT_SENT",
                "recipients": [],
                "sentAt": null,
                "subject": "Cybersecurity Threat Intelligence Advisory & Executive Synthesis",
                "message": "Attached is the grounded intelligence assessment verified against primary telemetry."
            }
        }'::jsonb
    )
    ON CONFLICT (id) DO NOTHING;

    -- 5. Insert Grounded Claims
    INSERT INTO public.claims (
        transformation_id,
        claim_text,
        status,
        confidence,
        evidence
    )
    VALUES
        (
            v_trans_id,
            'Enterprise boundary firewalls and perimeter sensors mitigated 1,420,000 intrusion attempts.',
            'supported',
            99.00,
            '{"pageNumber": 1, "anchorPassage": "During the evaluated 90-day operational window, enterprise perimeter firewalls mitigated 1,420,000 intrusion attempts.", "sourceReference": "Section 1.1"}'::jsonb
        ),
        (
            v_trans_id,
            'Threat actors attempted to exploit CVE-2025-4127 to achieve unauthorized root privilege escalation.',
            'supported',
            97.50,
            '{"pageNumber": 3, "anchorPassage": "Adversaries deployed automated exploit payloads targeting CVE-2025-4127 within secondary staging clusters.", "sourceReference": "Section 2.1"}'::jsonb
        ),
        (
            v_trans_id,
            'Active telemetry confirmed that EDR sensor agents maintained a 99.94% operational heartbeat across all 14,200 fleet endpoints.',
            'supported',
            99.20,
            '{"pageNumber": 6, "anchorPassage": "Active telemetry confirmed that EDR sensor agents maintained a 99.94% operational heartbeat across all 14,200 fleet workstations and servers.", "sourceReference": "Section 3.2"}'::jsonb
        ),
        (
            v_trans_id,
            'Forensic memory analysis confirmed modified commodity Cobalt Strike beacons linked to advanced persistent adversary APT-41.',
            'supported',
            94.00,
            '{"pageNumber": 9, "anchorPassage": "Forensic memory captures identified customized Cobalt Strike malleable profiles matching documented APT-41 tradecraft.", "sourceReference": "Section 4.1"}'::jsonb
        ),
        (
            v_trans_id,
            'Mean dwell time of malicious probes decreased by 38.4% across industrial SCADA sensor nodes.',
            'needs_review',
            68.00,
            '{"pageNumber": 14, "anchorPassage": "SCADA monitoring gateways recorded an estimated 38.4% reduction in dwell time across regional nodes.", "sourceReference": "Section 5.3"}'::jsonb
        )
    ON CONFLICT DO NOTHING;

    -- 6. Insert Deliverables (Outputs)
    INSERT INTO public.outputs (
        transformation_id,
        type,
        storage_path,
        status
    )
    VALUES
        (
            v_trans_id,
            'Executive Brief',
            'outputs/executive-brief-threat-intel.pdf',
            'draft'
        ),
        (
            v_trans_id,
            'Technical Advisory',
            'outputs/technical-advisory-cve-remediation.pdf',
            'draft'
        )
    ON CONFLICT DO NOTHING;

    -- 7. Insert Audit Log Record
    INSERT INTO public.audit_logs (
        workspace_id,
        action,
        resource_type,
        resource_id,
        metadata
    )
    VALUES (
        v_workspace_id,
        'DOCUMENT_UPLOADED',
        'document',
        v_file_id::text,
        '{"details": "Source report ingested with cryptographic SHA-256 integrity digest.", "fileSize": 5033164}'::jsonb
    )
    ON CONFLICT DO NOTHING;

END $$;
