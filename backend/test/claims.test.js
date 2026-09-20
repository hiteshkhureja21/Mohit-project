/**
 * Test Suite: Real Claim Extraction & Verification Data Model
 * 
 * Verifies:
 * 1. Distinction between claim, evidence, source reference, and verification status
 * 2. Grounding verification algorithm (exact match, metric fidelity, hallucination detection)
 * 3. Never inventing verification results; unsupported claims are never marked verified
 * 4. AI-generated claims without direct proof are marked pending/needs_review
 * 5. Review UI data formatting and compatibility
 * 6. Claim updating, phrasing correction, and reviewer notes
 * 7. HTTP REST API endpoints (/api/claims/*)
 */

import assert from 'node:assert';
import { createApp } from '../src/app.js';
import { claimsService } from '../src/services/claims/claims.service.js';
import { env } from '../src/config/env.js';

let passed = 0;
let failed = 0;

function reportPass(name) {
  console.log(`  ✓ PASS: ${name}`);
  passed++;
}

function reportFail(name, err) {
  console.error(`  ✗ FAIL: ${name}`);
  console.error(`    ${err.message}`);
  failed++;
}

async function runTests() {
  console.log('\n=============================================================');
  console.log('🧪 RUNNING CLAIMS & GROUNDING VERIFICATION TEST SUITE');
  console.log('=============================================================\n');

  const sourceDocumentText = `CYBERSECURITY THREAT INTELLIGENCE RESEARCH REPORT
Section 1.1 Executive Telemetry
During the evaluated 90-day operational window, enterprise perimeter firewalls mitigated 1,420,000 intrusion attempts.
Automated boundary filters repelled credential stuffing across all ingress DMZ routers.

Section 2.4 Industrial Sensor Telemetry
SCADA monitoring gateways recorded an estimated 38.4% reduction in dwell time across regional nodes.
Isolation protocols prevented lateral movement past boundary firewalls.

Section 3.2 Incident Containment
Dwell time telemetry recorded an isolation window of approximately 4 hours prior to automated quarantine.
The adversary leveraged modified commodity Cobalt Strike beacons with CVE-2025-4127.`;

  const originalDemoMode = env.DEMO_MODE;
  env.DEMO_MODE = true;

  const app = createApp();
  let server;
  const port = 4130;
  let baseUrl;

  await new Promise((resolve) => {
    server = app.listen(port, () => {
      baseUrl = `http://127.0.0.1:${port}`;
      resolve();
    });
  });

  try {
    const workspaceId = 'workspace-001';
    const userId = 'USR-802';

    // -------------------------------------------------------------
    // TEST 1: Distinction between claim, evidence, source, status
    // -------------------------------------------------------------
    try {
      const created = await claimsService.createClaim({
        transformationId: 'SF-2026-00124',
        claimIndex: 1,
        sectionTitle: 'Perimeter Telemetry',
        claimText: 'Enterprise perimeter firewalls mitigated 1,420,000 intrusion attempts.',
        anchorPassage: 'During the evaluated 90-day operational window, enterprise perimeter firewalls mitigated 1,420,000 intrusion attempts.',
        pageNumber: 1,
        confidenceScore: 99,
        sourceDocument: 'Cybersecurity Threat Intelligence Research Report.pdf',
        sourceReference: 'Report.pdf • Section 1.1 Page 1',
        status: 'supported'
      });

      // Verify Claim
      assert.ok(created.claimText, 'Claim assertion text must be present');
      assert.strictEqual(created.claimText, 'Enterprise perimeter firewalls mitigated 1,420,000 intrusion attempts.');

      // Verify Evidence
      assert.ok(created.evidence, 'Evidence object must be distinct');
      assert.ok(created.evidence.anchorPassage, 'Evidence must contain anchor passage');
      assert.strictEqual(created.evidence.pageNumber, 1, 'Evidence must record page number');

      // Verify Source
      assert.ok(created.sourceReference, 'Source reference must be present');
      assert.ok(created.sourceDocument, 'Source document must be present');

      // Verify Status
      assert.strictEqual(created.rawStatus, 'supported');
      assert.strictEqual(created.status, 'SUPPORTED');

      reportPass('1. Data model cleanly distinguishes claim, evidence, source reference, and verification status');
    } catch (err) {
      reportFail('1. Data model distinction test failed', err);
    }

    // -------------------------------------------------------------
    // TEST 2: Grounding Verification - Supported Assertion
    // -------------------------------------------------------------
    try {
      const claimText = 'Enterprise perimeter firewalls mitigated 1,420,000 intrusion attempts.';
      const anchorPassage = 'During the evaluated 90-day operational window, enterprise perimeter firewalls mitigated 1,420,000 intrusion attempts.';

      const result = claimsService.verifyClaimAgainstSource(claimText, anchorPassage, sourceDocumentText, {
        pageNumber: 1
      });

      assert.strictEqual(result.status, 'supported', 'Should be verified as supported');
      assert.ok(result.confidenceScore >= 90, 'Confidence score should be 90+');
      assert.strictEqual(result.evidence.exactMatch, true, 'Anchor passage must be confirmed in source');
      assert.strictEqual(result.evidence.verified, true, 'Verified flag must be true');

      reportPass('2. Verifiable evidence in source text is correctly confirmed as supported');
    } catch (err) {
      reportFail('2. Supported grounding verification failed', err);
    }

    // -------------------------------------------------------------
    // TEST 3: Grounding Verification - Metric Discrepancy (Needs Review)
    // -------------------------------------------------------------
    try {
      // Claim asserts exact 4 hours and 18 minutes, but anchor only states approximately 4 hours
      const claimText = 'Adversary dwell time inside the isolated honeypot perimeter was measured at exactly 4 hours and 18 minutes.';
      const anchorPassage = 'Dwell time telemetry recorded an isolation window of approximately 4 hours prior to automated quarantine.';

      const result = claimsService.verifyClaimAgainstSource(claimText, anchorPassage, sourceDocumentText, {
        pageNumber: 3
      });

      assert.strictEqual(result.status, 'needs_review', 'Discrepancy in metrics must trigger needs_review');
      assert.strictEqual(result.evidence.verified, false, 'Must NOT be marked as verified');
      assert.ok(result.flagReason, 'Must provide flag reason explaining metric mismatch');
      assert.ok(result.flagReason.includes('18'), 'Flag reason should identify missing metric');

      reportPass('3. Metric discrepancy between claim and evidence flags needs_review without false verification');
    } catch (err) {
      reportFail('3. Metric discrepancy test failed', err);
    }

    // -------------------------------------------------------------
    // TEST 4: Grounding Verification - Unsupported Hallucination
    // -------------------------------------------------------------
    try {
      // Completely ungrounded claim with fake anchor not in source
      const claimText = 'Adversary exfiltrated 45 gigabytes of sensitive customer financial records.';
      const fakeAnchor = 'Forensic teams confirmed 45 gigabytes of customer financial data exfiltrated.';

      const result = claimsService.verifyClaimAgainstSource(claimText, fakeAnchor, sourceDocumentText, {
        pageNumber: 5
      });

      assert.strictEqual(result.status, 'unsupported', 'Ungrounded claim must be marked unsupported');
      assert.strictEqual(result.evidence.verified, false, 'Unsupported claim must never be marked verified');
      assert.ok(result.flagReason, 'Must state reason why anchor was rejected');

      reportPass('4. Claims not found in source text are marked unsupported and never falsely verified');
    } catch (err) {
      reportFail('4. Unsupported claim test failed', err);
    }

    // -------------------------------------------------------------
    // TEST 5: AI-Generated Claim Without Direct Proof (Pending / Needs Review)
    // -------------------------------------------------------------
    try {
      const aiClaim = 'The adversary is likely affiliated with a nation-state sponsored threat group.';
      const result = claimsService.verifyClaimAgainstSource(aiClaim, '', sourceDocumentText, {
        pageNumber: 1,
        isAiGenerated: true
      });

      assert.notStrictEqual(result.status, 'supported', 'AI generated assertion without evidence must NOT be supported');
      assert.ok(result.status === 'unsupported' || result.status === 'needs_review' || result.status === 'pending');
      assert.strictEqual(result.evidence.isAiGenerated, true, 'isAiGenerated must be true');
      assert.strictEqual(result.evidence.verified, false, 'Must not be verified');

      reportPass('5. AI-generated assertions without proof are marked pending/needs_review');
    } catch (err) {
      reportFail('5. AI-generated claim handling failed', err);
    }

    // -------------------------------------------------------------
    // TEST 6: Claim Status Updates, Phrasing Edits, and Reviewer Notes
    // -------------------------------------------------------------
    try {
      const claimId = 'CLM-005';
      const updated = await claimsService.updateClaim(claimId, workspaceId, userId, {
        claimText: 'Mean dwell time of malicious probes decreased by 38.4% across SCADA sensor nodes.',
        status: 'supported',
        reviewerNote: 'Accepted after cross-referencing Section 2.4 SCADA telemetry logs.'
      });

      assert.strictEqual(updated.id, claimId);
      assert.strictEqual(updated.rawStatus, 'supported');
      assert.strictEqual(updated.status, 'SUPPORTED');
      assert.strictEqual(updated.reviewerNote, 'Accepted after cross-referencing Section 2.4 SCADA telemetry logs.');
      assert.ok(updated.originalDraftText, 'Must preserve original draft text for audit trail');

      reportPass('6. Claim status updates, phrasing corrections, and reviewer notes persist cleanly');
    } catch (err) {
      reportFail('6. Claim update failed', err);
    }

    // -------------------------------------------------------------
    // TEST 7: Review UI Data Formatting Compatibility
    // -------------------------------------------------------------
    try {
      const formatted = claimsService.formatForReviewUI({
        id: 'CLM-099',
        transformation_id: 'SF-2026-00124',
        claim_index: 99,
        section_title: 'Infrastructure Security',
        claim_text: 'Zero Trust policies enforced.',
        status: 'needs_review',
        confidence: 88,
        evidence: {
          anchor_passage: 'Zero Trust boundary policies enforced across ingress ports.',
          page_number: 7,
          similarity_score: 88,
          exact_match: true,
          is_ai_generated: false
        },
        source_reference: 'Security.pdf • Page 7'
      });

      // Verify properties required by Stage05Review.tsx
      assert.strictEqual(formatted.id, 'CLM-099');
      assert.strictEqual(formatted.jobId, 'SF-2026-00124');
      assert.strictEqual(formatted.claimIndex, 99);
      assert.strictEqual(formatted.sectionTitle, 'Infrastructure Security');
      assert.strictEqual(formatted.claimText, 'Zero Trust policies enforced.');
      assert.strictEqual(formatted.status, 'NEEDS_REVIEW');
      assert.strictEqual(formatted.rawStatus, 'needs_review');
      assert.strictEqual(formatted.pageNumber, 7);
      assert.strictEqual(formatted.anchorPassage, 'Zero Trust boundary policies enforced across ingress ports.');
      assert.strictEqual(formatted.sourceReference, 'Security.pdf • Page 7');
      assert.ok(formatted.evidence);

      reportPass('7. Claims data formatting is 100% compatible with existing Review UI');
    } catch (err) {
      reportFail('7. Review UI formatting failed', err);
    }

    // -------------------------------------------------------------
    // TEST 8: HTTP REST API Endpoints (/api/claims/*)
    // -------------------------------------------------------------
    try {
      const authHeaders = {
        'Authorization': 'Bearer demo-session-sourceflow-operator',
        'x-workspace-id': workspaceId,
        'Content-Type': 'application/json'
      };

      // 8a. GET /api/claims
      const listRes = await fetch(`${baseUrl}/api/claims`, { headers: authHeaders });
      const listData = await listRes.json();
      assert.strictEqual(listRes.status, 200);
      assert.strictEqual(listData.success, true);
      assert.ok(Array.isArray(listData.data));
      assert.ok(listData.data.length > 0);

      // 8b. POST /api/claims/verify
      const verifyRes = await fetch(`${baseUrl}/api/claims/verify`, {
        method: 'POST',
        headers: authHeaders,
        body: JSON.stringify({
          claimText: '1,420,000 intrusion attempts mitigated.',
          anchorPassage: 'enterprise perimeter firewalls mitigated 1,420,000 intrusion attempts.',
          sourceText: sourceDocumentText
        })
      });
      const verifyData = await verifyRes.json();
      assert.strictEqual(verifyRes.status, 200);
      assert.strictEqual(verifyData.success, true);
      assert.strictEqual(verifyData.data.status, 'supported');

      // 8c. PATCH /api/claims/:id
      const patchRes = await fetch(`${baseUrl}/api/claims/CLM-001`, {
        method: 'PATCH',
        headers: authHeaders,
        body: JSON.stringify({
          status: 'supported',
          reviewerNote: 'API verified update.'
        })
      });
      const patchData = await patchRes.json();
      assert.strictEqual(patchRes.status, 200);
      assert.strictEqual(patchData.success, true);
      assert.strictEqual(patchData.data.rawStatus, 'supported');

      reportPass('8. HTTP REST API endpoints (/api/claims/*) operate cleanly with authorization');
    } catch (err) {
      reportFail('8. HTTP REST API test failed', err);
    }

  } finally {
    env.DEMO_MODE = originalDemoMode;
    if (server) {
      await new Promise(res => server.close(res));
    }
  }

  console.log('\n=============================================================');
  console.log(`RESULTS: ${passed} passed, ${failed} failed`);
  console.log('=============================================================\n');

  if (failed > 0) {
    process.exit(1);
  }
}

runTests().catch(err => {
  console.error('Test suite failed:', err);
  process.exit(1);
});
