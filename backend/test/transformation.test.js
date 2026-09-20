/**
 * Test Suite: SourceFlow Real Backend 6-Stage Transformation Pipeline
 * 
 * Verifies end-to-end functionality across all 6 stages:
 * Stage 1: Source Selection & Extraction
 * Stage 2: Audience Configuration
 * Stage 3: Output Format Configuration
 * Stage 4: AI Generation & Grounding Claims Extraction (including failed state on error)
 * Stage 5: Claims Review, Editing & Human Approval Gate
 * Stage 6: Delivery Package Preparation (Status: 'completed')
 * Stage 7: HTTP REST API Endpoints End-to-End
 */

import assert from 'node:assert';
import { createApp } from '../src/app.js';
import { TransformationService } from '../src/services/transformation/transformation.service.js';
import { documents, claims, outputs } from '../src/services/dataStore.js';
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
  console.log('🧪 RUNNING 6-STAGE TRANSFORMATION BACKEND PIPELINE TEST SUITE');
  console.log('=============================================================\n');

  // Set DEMO_MODE for test token resolution in HTTP API tests
  const originalDemoMode = env.DEMO_MODE;
  env.DEMO_MODE = true;

  const app = createApp();
  let server;
  let port = 4125;
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
    let transformationId;

    // Create a TransformationService instance with mocked AI pipeline for automated testing
    const mockAiPipeline = {
      resolveDocumentText: async () => ({ text: 'APT-29 intrusion attempt on DMZ gateway.' }),
      runAnalysis: async () => ({
        findings: 12,
        risks: 3,
        recommendations: 2,
        entities: 5,
        evidence: 8,
        importantData: 1420000,
        keySummary: ['Perimeter intrusion detected on DMZ gateway.'],
        riskList: [{ risk: 'Unpatched vulnerability in boundary firewall.' }],
        recommendationList: [{ recommendation: 'Update ingress firewall rules.' }]
      }),
      generateDeliverables: async () => ([
        {
          id: 'OUT-001',
          transformationId: '',
          type: 'Executive Brief',
          title: 'Executive Brief: APT-29 Intrusion',
          audience: 'Executive Leadership',
          content: 'Strategic briefing for leadership regarding perimeter attempt.',
          verificationState: 'PENDING'
        }
      ]),
      executeOperation: async (op) => {
        if (op === 'extract') {
          return {
            claims: [
              {
                statement: 'APT-29 perimeter intrusion attempt was detected on DMZ gateway.',
                claim_text: 'APT-29 perimeter intrusion attempt was detected on DMZ gateway.',
                confidence: 0.98,
                page_number: 1,
                anchor_passage: 'APT-29 unauthorized perimeter intrusion attempt on DMZ gateway IP 192.168.10.42.',
                section: 'Threat Telemetry'
              },
              {
                statement: 'Multi-factor authentication successfully rejected secondary privilege escalation.',
                claim_text: 'Multi-factor authentication successfully rejected secondary privilege escalation.',
                confidence: 0.95,
                page_number: 1,
                anchor_passage: 'Multi-factor authentication successfully rejected secondary privilege escalation.',
                section: 'Access Control'
              }
            ]
          };
        }
        return {};
      }
    };

    const service = new TransformationService(mockAiPipeline);

    // -------------------------------------------------------------
    // TEST 1: Stage 1 - Initialize Transformation (Draft status)
    // -------------------------------------------------------------
    try {
      const sourceDoc = documents[0]; // DOC-8821
      const created = await service.createTransformation(workspaceId, userId, {
        fileId: sourceDoc.id,
        title: 'Cybersecurity Threat Intelligence Research Report'
      });

      assert.ok(created.id, 'Transformation must have an ID');
      assert.strictEqual(created.workspace_id, workspaceId, 'Must be bound to correct workspace');
      assert.strictEqual(created.file_id, sourceDoc.id, 'Must be bound to source file');
      assert.strictEqual(created.status, 'draft', 'Initial status must be draft');
      assert.ok(created.configuration, 'Must have configuration object');
      assert.ok(Array.isArray(created.configuration.profiles), 'Must have initial profiles');

      transformationId = created.id;
      reportPass('1. Stage 1 - Transformation initialized with source file in draft status');
    } catch (err) {
      reportFail('1. Stage 1 - Transformation initialization failed', err);
    }

    // -------------------------------------------------------------
    // TEST 2: Stage 2 - Save Audience Configuration
    // -------------------------------------------------------------
    try {
      const updated = await service.updateAudienceConfig(transformationId, workspaceId, userId, {
        profiles: [
          {
            id: 'prof-exec',
            name: 'Executive Leadership',
            role: 'C-Suite',
            deliverableType: 'Executive Brief',
            tone: 'Strategic',
            isSelected: true
          },
          {
            id: 'prof-cyber',
            name: 'Security Operations',
            role: 'SOC Analyst',
            deliverableType: 'Technical Advisory',
            tone: 'Technical',
            isSelected: true
          }
        ],
        tone: 'Executive & Actionable',
        detailLevel: 'Audience-Optimized',
        language: 'English (US)'
      });

      assert.strictEqual(updated.configuration.profiles.length, 2, 'Should save 2 audience profiles');
      assert.strictEqual(updated.configuration.tone, 'Executive & Actionable');
      assert.strictEqual(updated.configuration.language, 'English (US)');
      reportPass('2. Stage 2 - Audience configuration successfully saved');
    } catch (err) {
      reportFail('2. Stage 2 - Audience configuration failed', err);
    }

    // -------------------------------------------------------------
    // TEST 3: Stage 3 - Save Requested Output Formats
    // -------------------------------------------------------------
    try {
      const updated = await service.updateOutputConfig(transformationId, workspaceId, userId, {
        selectedOutputs: {
          summary: true,
          advisory: true,
          presentation: false,
          comm_package: true
        }
      });

      assert.ok(updated.configuration.outputs.options.summary, 'Summary should be selected');
      assert.strictEqual(updated.configuration.outputs.options.presentation, false, 'Presentation should be false');
      assert.ok(updated.configuration.outputs.selectedTypes.includes('summary'));
      reportPass('3. Stage 3 - Output format specification successfully saved');
    } catch (err) {
      reportFail('3. Stage 3 - Output format specification failed', err);
    }

    // -------------------------------------------------------------
    // TEST 4: Stage 4 - Execute AI Generation & Extract Grounding Claims
    // -------------------------------------------------------------
    try {
      const genResult = await service.executeGeneration(transformationId, workspaceId, userId, {
        text: `Cybersecurity Threat Intelligence Report: Critical telemetry detected APT-29 unauthorized perimeter intrusion attempt on DMZ gateway IP 192.168.10.42.`
      });

      assert.ok(genResult.transformation, 'Should return updated transformation');
      assert.strictEqual(genResult.transformation.status, 'review', 'Status must transition to review');
      assert.ok(Array.isArray(genResult.deliverables), 'Should produce deliverables');
      assert.ok(genResult.deliverables.length > 0, 'Should generate at least 1 deliverable');
      assert.ok(Array.isArray(genResult.claims), 'Should extract grounding claims');
      assert.ok(genResult.claims.length > 0, 'Should have extracted claims');
      assert.ok(genResult.claims[0].anchorPassage, 'Claims must have source anchor passages');

      reportPass('4. Stage 4 - AI generation produced structured deliverables and grounded claims matrix');
    } catch (err) {
      reportFail('4. Stage 4 - AI generation failed', err);
    }

    // -------------------------------------------------------------
    // TEST 5: Stage 4 - Error Handling & Transition to 'failed' status
    // -------------------------------------------------------------
    try {
      const failingAiPipeline = {
        resolveDocumentText: async () => ({ text: 'Sample' }),
        runAnalysis: async () => {
          const err = new Error('AI Provider Rate Limit Exceeded');
          err.code = 'AI_RATE_LIMIT';
          throw err;
        }
      };

      const failingService = new TransformationService(failingAiPipeline);
      let caught = false;
      try {
        await failingService.executeGeneration(transformationId, workspaceId, userId);
      } catch (err) {
        caught = true;
      }

      assert.ok(caught, 'Must throw error on AI failure');
      const failedT = await service.getTransformation(transformationId, workspaceId);
      assert.strictEqual(failedT.status, 'failed', 'Transformation status must transition to failed on error');

      // Reset back to 'review' for subsequent stage tests
      await service.persistUpdate(transformationId, { status: 'review' });
      reportPass('5. Stage 4 - AI generation errors transition status to failed without faking success');
    } catch (err) {
      reportFail('5. Stage 4 - Error state transition failed', err);
    }

    // -------------------------------------------------------------
    // TEST 6: Stage 5 - Claims Review & Human Approval Gate
    // -------------------------------------------------------------
    try {
      // 6a. Retrieve review state
      const reviewData = await service.getReviewData(transformationId, workspaceId);
      assert.strictEqual(reviewData.transformationId, transformationId);
      assert.ok(reviewData.claims.length > 0, 'Must have review claims');

      // 6b. Verify an unverified claim
      const unverified = reviewData.claims.find(c => c.status === 'NEEDS_REVIEW' || c.status === 'UNSUPPORTED' || c.status === 'PENDING');
      if (unverified) {
        // Attempting approval while unsupported claims remain must fail
        let approvalBlocked = false;
        try {
          await service.approveReview(transformationId, workspaceId, { name: 'K. Varma' });
        } catch (blockedErr) {
          assert.strictEqual(blockedErr.code, 'APPROVAL_BLOCKED');
          approvalBlocked = true;
        }
        assert.ok(approvalBlocked, 'Approval gate must block approval when unverified claims exist');

        // Resolve unverified claims
        for (const claim of reviewData.claims) {
          if (claim.status === 'NEEDS_REVIEW' || claim.status === 'UNSUPPORTED' || claim.status === 'PENDING') {
            await service.updateClaim(transformationId, claim.id, workspaceId, userId, {
              status: 'SUPPORTED',
              reviewerNote: 'Verified and accepted against telemetry log.'
            });
          }
        }
      }

      // 6c. Grant formal approval
      const approved = await service.approveReview(transformationId, workspaceId, { name: 'K. Varma' });
      assert.strictEqual(approved.configuration.review.status, 'APPROVED', 'Review status must be APPROVED');
      assert.strictEqual(approved.configuration.review.reviewer, 'K. Varma');
      assert.ok(approved.configuration.review.approvedAt);

      reportPass('6. Stage 5 - Claims review, editing, and human approval gate verified');
    } catch (err) {
      reportFail('6. Stage 5 - Claims review and approval gate failed', err);
    }

    // -------------------------------------------------------------
    // TEST 7: Stage 6 - Delivery Package Preparation (Status: completed)
    // -------------------------------------------------------------
    try {
      const delivered = await service.prepareDelivery(transformationId, workspaceId, userId, {
        recipients: [
          { id: 'REC-1', name: 'Director Office', email: 'director@agency.gov', role: 'Executive', type: 'TO' },
          { id: 'REC-2', name: 'SOC Incident Leads', email: 'soc@agency.gov', role: 'Technical', type: 'CC' }
        ],
        subject: 'Verified Threat Intelligence Deliverable Package',
        message: 'All assertions verified and signed off for distribution.'
      });

      assert.strictEqual(delivered.status, 'completed', 'Transformation must transition to completed status');
      assert.strictEqual(delivered.configuration.delivery.status, 'READY_FOR_DISPATCH');
      assert.strictEqual(delivered.configuration.delivery.recipients.length, 2);
      assert.ok(delivered.configuration.delivery.preparedAt);

      reportPass('7. Stage 6 - Final deliverable package prepared and status transitioned to completed');
    } catch (err) {
      reportFail('7. Stage 6 - Delivery package preparation failed', err);
    }

    // -------------------------------------------------------------
    // TEST 8: HTTP REST API Endpoints End-to-End Verification
    // -------------------------------------------------------------
    try {
      // Test GET /api/transformations/:id
      const res = await fetch(`${baseUrl}/api/transformations/${transformationId}`, {
        headers: {
          'Authorization': 'Bearer demo-session-sourceflow-operator',
          'x-workspace-id': workspaceId
        }
      });
      const data = await res.json();
      assert.strictEqual(res.status, 200, `Expected 200, got ${res.status}`);
      assert.strictEqual(data.success, true);
      assert.strictEqual(data.data.id, transformationId);
      assert.strictEqual(data.data.status, 'completed');

      // Test GET /api/transformations list
      const listRes = await fetch(`${baseUrl}/api/transformations`, {
        headers: {
          'Authorization': 'Bearer demo-session-sourceflow-operator',
          'x-workspace-id': workspaceId
        }
      });
      const listData = await listRes.json();
      assert.strictEqual(listRes.status, 200);
      assert.ok(Array.isArray(listData.data));
      assert.ok(listData.data.some(t => t.id === transformationId));

      reportPass('8. HTTP REST API endpoints (/api/transformations/*) return standard JSON responses');
    } catch (err) {
      reportFail('8. HTTP REST API endpoints failed', err);
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
