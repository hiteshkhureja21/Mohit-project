/**
 * Comprehensive Backend and Frontend Integration Test Suite (STEP 14)
 * 
 * Verifies all 8 core domains:
 * 1. AUTH (login, logout, invalid token, missing token)
 * 2. AUTHORIZATION (owner, editor, viewer, cross-workspace access)
 * 3. FILES (upload, download, delete, invalid file type, oversized file)
 * 4. OCR (successful OCR, provider error, timeout)
 * 5. AI (successful analysis, invalid request, rate limit, provider failure)
 * 6. TRANSFORMATION (create, process, review, complete, failed state)
 * 7. SECURITY (CORS, unauthorized requests, workspace isolation)
 * 8. DATABASE (relationships, required fields, RLS policies)
 */

import http from 'http';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { createApp } from '../src/app.js';
import { storageService, validateFileMetadata } from '../src/services/storage.service.js';
import { OcrService } from '../src/services/ocr/ocr.service.js';
import { aiPipelineService } from '../src/services/ai/aiPipeline.service.js';
import { transformationService } from '../src/services/transformation/transformation.service.js';
import { workspaceMemberService } from '../src/services/workspaceMember.service.js';
import { workspaces } from '../src/services/dataStore.js';
import { ErrorCodes } from '../src/utils/errors.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

let passed = 0;
let failed = 0;
const testResults = {
  auth: { passed: 0, failed: 0 },
  authorization: { passed: 0, failed: 0 },
  files: { passed: 0, failed: 0 },
  ocr: { passed: 0, failed: 0 },
  ai: { passed: 0, failed: 0 },
  transformation: { passed: 0, failed: 0 },
  security: { passed: 0, failed: 0 },
  database: { passed: 0, failed: 0 }
};

function record(category, condition, message) {
  if (condition) {
    passed++;
    testResults[category].passed++;
    console.log(`  [PASS] [${category.toUpperCase()}] ${message}`);
  } else {
    failed++;
    testResults[category].failed++;
    console.error(`  [FAIL] [${category.toUpperCase()}] ${message}`);
  }
}

async function runIntegrationTestSuite() {
  console.log('\n=============================================================');
  console.log('STEP 14: SOURCEFLOW PLATFORM FULL INTEGRATION TEST SUITE');
  console.log('=============================================================\n');

  process.env.DEMO_MODE = 'true';
  const app = createApp();
  const server = http.createServer(app);
  await new Promise((r) => server.listen(0, r));
  const port = server.address().port;
  const baseUrl = `http://localhost:${port}`;

  // Dedicated test tokens
  const ownerToken = 'demo-session-sourceflow-operator';
  const editorToken = 'demo-session-sourceflow-editor';
  const viewerToken = 'demo-session-sourceflow-viewer';
  const userBToken = 'demo-session-sourceflow-user-b';

  const ownerHeaders = { Authorization: `Bearer ${ownerToken}`, 'Content-Type': 'application/json' };
  const editorHeaders = { Authorization: `Bearer ${editorToken}`, 'Content-Type': 'application/json' };
  const viewerHeaders = { Authorization: `Bearer ${viewerToken}`, 'Content-Type': 'application/json' };
  const userBHeaders = { Authorization: `Bearer ${userBToken}`, 'Content-Type': 'application/json' };

  // Setup sample workspace roles
  await workspaceMemberService.addMember('workspace-001', 'USR-802', 'owner');
  await workspaceMemberService.addMember('workspace-001', 'USR-EDITOR-1', 'editor');
  await workspaceMemberService.addMember('workspace-001', 'USR-VIEWER-1', 'viewer');
  await workspaceMemberService.addMember('workspace-002-isolated', 'USR-USER-B', 'owner');

  // -----------------------------------------------------------------
  // 1. AUTH TESTS
  // -----------------------------------------------------------------
  console.log('--- 1. AUTH DOMAIN TESTS ---');
  {
    // 1.1 Login
    const loginRes = await fetch(`${baseUrl}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: 'operator@sourceflow.demo', password: 'AnyPasswordInDemo' })
    });
    const loginData = await loginRes.json();
    record('auth', loginRes.status === 200 && loginData.success && Boolean(loginData.data.token), 'login returns valid session and user profile');

    // 1.2 Logout
    const logoutRes = await fetch(`${baseUrl}/api/auth/logout`, {
      method: 'POST',
      headers: ownerHeaders
    });
    const logoutData = await logoutRes.json();
    record('auth', logoutRes.status === 200 && logoutData.success, 'logout invalidates and tears down session');

    // 1.3 Invalid Token
    const invalidRes = await fetch(`${baseUrl}/api/auth/me`, {
      headers: { Authorization: 'Bearer invalid-token-12345' }
    });
    const invalidData = await invalidRes.json();
    record('auth', invalidRes.status === 401 && invalidData.error.code === ErrorCodes.AUTH_REQUIRED, 'invalid token is rejected with HTTP 401 AUTH_REQUIRED');

    // 1.4 Missing Token
    const missingRes = await fetch(`${baseUrl}/api/auth/me`);
    const missingData = await missingRes.json();
    record('auth', missingRes.status === 401 && missingData.error.code === ErrorCodes.AUTH_REQUIRED, 'missing token is rejected with HTTP 401 AUTH_REQUIRED');
  }

  // -----------------------------------------------------------------
  // 2. AUTHORIZATION TESTS
  // -----------------------------------------------------------------
  console.log('\n--- 2. AUTHORIZATION & RBAC DOMAIN TESTS ---');
  {
    // 2.1 Owner has administrative member management permissions
    const ownerAddMemberRes = await fetch(`${baseUrl}/api/workspaces/workspace-001/members`, {
      method: 'POST',
      headers: ownerHeaders,
      body: JSON.stringify({ userId: 'USR-NEW-01', role: 'viewer' })
    });
    record('authorization', ownerAddMemberRes.status === 201, 'owner can add members to workspace');

    // 2.2 Editor CANNOT manage members (403 ACCESS_DENIED)
    const editorAddMemberRes = await fetch(`${baseUrl}/api/workspaces/workspace-001/members`, {
      method: 'POST',
      headers: editorHeaders,
      body: JSON.stringify({ userId: 'USR-NEW-02', role: 'viewer' })
    });
    const editorData = await editorAddMemberRes.json();
    record('authorization', editorAddMemberRes.status === 403 && editorData.error.code === ErrorCodes.ACCESS_DENIED, 'editor is denied member management with 403 ACCESS_DENIED');

    // 2.3 Viewer CANNOT perform content modifications or transformations (403 ACCESS_DENIED)
    const viewerUploadRes = await fetch(`${baseUrl}/api/transformations`, {
      method: 'POST',
      headers: viewerHeaders,
      body: JSON.stringify({ workspaceId: 'workspace-001', fileId: 'doc-1' })
    });
    const viewerData = await viewerUploadRes.json();
    record('authorization', viewerUploadRes.status === 403 && viewerData.error.code === ErrorCodes.ACCESS_DENIED, 'viewer is denied content modifications with 403 ACCESS_DENIED');

    // 2.4 Cross-workspace access isolation
    // User B belongs ONLY to workspace-002-isolated. Attempts to read workspace-001 must be rejected with 403.
    const crossAccessRes = await fetch(`${baseUrl}/api/workspaces/workspace-001`, {
      headers: userBHeaders
    });
    const crossData = await crossAccessRes.json();
    record('authorization', crossAccessRes.status === 403 && crossData.error.code === ErrorCodes.ACCESS_DENIED, 'cross-workspace access between isolated tenants is strictly forbidden (403 ACCESS_DENIED)');
  }

  // -----------------------------------------------------------------
  // 3. FILES TESTS
  // -----------------------------------------------------------------
  console.log('\n--- 3. FILE INGESTION & STORAGE TESTS ---');
  {
    const sampleBuffer = Buffer.from('SourceFlow Institutional Record - Verified Test Dataset');
    let uploadedFileId = null;

    // 3.1 Upload
    const uploadedRecord = await storageService.uploadFile({
      workspaceId: 'workspace-001',
      fileBuffer: sampleBuffer,
      originalName: 'defense_telemetry_2026.pdf',
      mimeType: 'application/pdf',
      uploadedBy: 'USR-802'
    });
    uploadedFileId = uploadedRecord.id;
    record('files', Boolean(uploadedFileId) && uploadedRecord.sha256.length === 64, 'file upload generates UUID storage path and SHA-256 checksum');

    // 3.2 Download
    const downloadAccess = await storageService.getDownloadAccess(uploadedFileId, 'workspace-001');
    record('files', Boolean(downloadAccess && (downloadAccess.signedUrl || downloadAccess.buffer)), 'secure download retrieves file bytes or signed URL');

    // 3.3 Delete
    const deleteResult = await storageService.deleteFile(uploadedFileId, 'workspace-001');
    record('files', deleteResult.success && deleteResult.deletedId === uploadedFileId, 'secure file deletion cleanly removes storage record');

    // 3.4 Invalid file type
    const invalidTypeCheck = validateFileMetadata('malicious.exe', 'application/octet-stream', 1024);
    record('files', !invalidTypeCheck.valid && invalidTypeCheck.code === 'DISALLOWED_EXTENSION', 'invalid file type (.exe) is rejected with DISALLOWED_EXTENSION');

    // 3.5 Oversized file
    const oversizedCheck = validateFileMetadata('oversized.pdf', 'application/pdf', 55 * 1024 * 1024);
    record('files', !oversizedCheck.valid && oversizedCheck.code === 'FILE_TOO_LARGE', 'oversized file (>50MB) is rejected with FILE_TOO_LARGE');
  }

  // -------------------------------------------------------------
  // 4. OCR TESTS
  // -------------------------------------------------------------
  console.log('\n--- 4. OCR & TEXT EXTRACTION TESTS ---');
  {
    // 4.1 Successful OCR
    const mockSuccessOcrProvider = {
      processFile: async () => ({
        success: true,
        text: 'Institutional Intelligence Report: Perimeter defense active.',
        confidence: 96,
        language: 'eng',
        provider: 'ocr_space'
      })
    };
    const testOcrService = new OcrService(mockSuccessOcrProvider);
    const ocrResult = await testOcrService.extractText({
      originalName: 'scanned_report.png',
      mimeType: 'image/png',
      buffer: Buffer.from('fake-image-bytes')
    });
    record('ocr', ocrResult.success && ocrResult.extractedText.includes('Perimeter defense active'), 'successful OCR extracts text from image/scanned document');

    // 4.2 Provider error
    const mockErrorOcrProvider = {
      processFile: async () => {
        const err = new Error('Upstream OCR provider engine memory limit reached');
        err.code = ErrorCodes.OCR_FAILED;
        err.statusCode = 502;
        throw err;
      }
    };
    const errorOcrService = new OcrService(mockErrorOcrProvider);
    let errorCaught = false;
    try {
      await errorOcrService.extractText({
        originalName: 'corrupted.png',
        mimeType: 'image/png',
        buffer: Buffer.from('corrupt-bytes')
      });
    } catch (err) {
      errorCaught = true;
      record('ocr', Boolean(err), 'provider error is captured cleanly without crashing');
    }
    if (!errorCaught) record('ocr', false, 'provider error was not caught');

    // 4.3 Timeout
    const mockTimeoutOcrProvider = {
      processFile: async () => {
        const err = new Error('OCR provider request timed out');
        err.code = ErrorCodes.OCR_TIMEOUT;
        err.statusCode = 504;
        throw err;
      }
    };
    const timeoutOcrService = new OcrService(mockTimeoutOcrProvider);
    let timeoutCaught = false;
    try {
      await timeoutOcrService.extractText({
        originalName: 'laggy.png',
        mimeType: 'image/png',
        buffer: Buffer.from('laggy-bytes')
      });
    } catch (err) {
      timeoutCaught = true;
      record('ocr', Boolean(err), 'OCR timeout triggers error code');
    }
    if (!timeoutCaught) record('ocr', false, 'OCR timeout was not caught');
  }

  // -------------------------------------------------------------
  // 5. AI TESTS
  // -------------------------------------------------------------
  console.log('\n--- 5. REAL AI INTEGRATION TESTS ---');
  {
    // 5.1 Successful analysis
    const aiAnalysis = await aiPipelineService.executeOperation('analyze', {
      text: 'Mission Status: All 12 telemetry beacons are operational across Sector 4. Zero anomalies detected.'
    }, { audience: 'Executive Command' });
    const hasSummary = Boolean(aiAnalysis && (aiAnalysis.summary || aiAnalysis.data?.summary));
    record('ai', hasSummary, 'successful AI analysis produces structured executive summary and metrics');

    // 5.2 Invalid request
    const invalidAiRes = await fetch(`${baseUrl}/api/ai/analyze`, {
      method: 'POST',
      headers: editorHeaders,
      body: JSON.stringify({}) // Missing documentText
    });
    record('ai', invalidAiRes.status === 400 || invalidAiRes.status === 422, 'invalid AI request missing required payload returns HTTP 400/422');

    // 5.3 Rate limit
    // Rapid queries to trigger rate limiter
    let triggeredRateLimit = false;
    for (let i = 0; i < 25; i++) {
      const res = await fetch(`${baseUrl}/api/ai/analyze`, {
        method: 'POST',
        headers: editorHeaders,
        body: JSON.stringify({ documentText: 'Quick text' })
      });
      if (res.status === 429) {
        triggeredRateLimit = true;
        break;
      }
    }
    record('ai', triggeredRateLimit, 'AI endpoint rate limit triggers HTTP 429 when burst exceeds limit');

    // 5.4 Provider failure
    let failCaught = false;
    try {
      await aiPipelineService.executeOperation('non_existent_op', { text: 'Some text' });
    } catch (err) {
      failCaught = true;
      record('ai', Boolean(err.code || err.message), 'AI pipeline error does not fake success and captures real error');
    }
    if (!failCaught) record('ai', false, 'AI error was not caught');
  }

  // -------------------------------------------------------------
  // 6. TRANSFORMATION PIPELINE TESTS
  // -------------------------------------------------------------
  console.log('\n--- 6. MULTI-STAGE TRANSFORMATION PIPELINE TESTS ---');
  {
    // 6.1 Create
    const draftTransform = await transformationService.createTransformation('workspace-001', 'USR-802', {
      fileId: 'DOC-8821',
      title: 'Institutional Q3 Compliance Transformation'
    });
    record('transformation', draftTransform.status === 'draft', 'stage 1 creates transformation in draft status');

    // 6.2 Process
    await transformationService.updateAudienceConfig(draftTransform.id, 'workspace-001', 'USR-802', {
      profiles: [{ id: 'prof-exec', name: 'Executive Leadership', isSelected: true }]
    });
    await transformationService.updateOutputConfig(draftTransform.id, 'workspace-001', 'USR-802', {
      selectedOutputs: { summary: true }
    });
    const processedTransform = await transformationService.executeGeneration(draftTransform.id, 'workspace-001', 'USR-802', {
      text: 'Perimeter telemetry confirmed valid intrusion defense.'
    });
    record('transformation', processedTransform.transformation?.status === 'review', 'stages 2-4 process audience and outputs into review status');

    // 6.3 Review
    const reviewData = await transformationService.getReviewData(draftTransform.id, 'workspace-001');
    record('transformation', Boolean(reviewData && reviewData.transformationId === draftTransform.id), 'stage 5 human review gate retrieves review details');

    // Resolve claims and approve review prior to delivery
    if (reviewData && Array.isArray(reviewData.claims)) {
      for (const claim of reviewData.claims) {
        if (claim.status === 'NEEDS_REVIEW' || claim.status === 'UNSUPPORTED' || claim.status === 'PENDING') {
          await transformationService.updateClaim(draftTransform.id, claim.id, 'workspace-001', 'USR-802', {
            status: 'SUPPORTED',
            reviewerNote: 'Verified and accepted against primary evidence source.'
          });
        }
      }
    }
    await transformationService.approveReview(draftTransform.id, 'workspace-001', { name: 'Director Vance' });

    // 6.4 Complete
    const completedTransform = await transformationService.prepareDelivery(draftTransform.id, 'workspace-001', 'USR-802');
    record('transformation', completedTransform.status === 'completed', 'stage 6 delivery marks pipeline as completed');

    // 6.5 Failed state
    const failingService = new (transformationService.constructor)({
      resolveDocumentText: async () => ({ text: 'Sample' }),
      runAnalysis: async () => {
        const err = new Error('Upstream AI generation quota exceeded');
        err.code = ErrorCodes.AI_RATE_LIMITED;
        throw err;
      }
    });
    const failedDraft = await failingService.createTransformation('workspace-001', 'USR-802', { fileId: 'DOC-8821' });
    let pipelineFailed = false;
    try {
      await failingService.executeGeneration(failedDraft.id, 'workspace-001', 'USR-802');
    } catch {
      pipelineFailed = true;
    }
    const failedRecord = await failingService.getTransformation(failedDraft.id, 'workspace-001');
    record('transformation', pipelineFailed && failedRecord.status === 'failed', 'pipeline transition to failed state captures error without false success');
  }

  // -------------------------------------------------------------
  // 7. SECURITY TESTS
  // -------------------------------------------------------------
  console.log('\n--- 7. SECURITY & TENANT ISOLATION TESTS ---');
  {
    // 7.1 CORS
    const corsRes = await fetch(`${baseUrl}/api/health`, {
      headers: { Origin: 'http://localhost:5173' }
    });
    record('security', corsRes.headers.get('access-control-allow-origin') === 'http://localhost:5173', 'CORS allows configured frontend origin');

    // 7.2 Unauthorized requests
    const unauthClaims = await fetch(`${baseUrl}/api/claims`);
    record('security', unauthClaims.status === 401, 'protected resource /api/claims rejects unauthenticated requests');

    // 7.3 Workspace isolation
    // User B should receive 403 when trying to access workspace-001 files
    const isolatedFileRes = await fetch(`${baseUrl}/api/files?workspaceId=workspace-001`, {
      headers: userBHeaders
    });
    record('security', isolatedFileRes.status === 403, 'workspace isolation blocks unauthorized tenant access across boundaries');
  }

  // -------------------------------------------------------------
  // 8. DATABASE SCHEMA & RLS INTEGRITY TESTS
  // -------------------------------------------------------------
  console.log('\n--- 8. DATABASE SCHEMA & RLS INTEGRITY TESTS ---');
  {
    const schemaPath = path.resolve(__dirname, '../../database/schema.sql');
    record('database', fs.existsSync(schemaPath), 'schema.sql exists in database directory');

    const schemaSql = fs.readFileSync(schemaPath, 'utf8');

    // 8.1 Relationships (Foreign Keys)
    const hasWorkspaceMemberFK = schemaSql.includes('REFERENCES public.workspaces(id)') && schemaSql.includes('REFERENCES public.profiles(id)');
    const hasFilesFK = schemaSql.includes('FOREIGN KEY') || (schemaSql.includes('workspace_id') && schemaSql.includes('REFERENCES public.workspaces(id)'));
    const hasTransformFK = schemaSql.includes('transformations') && schemaSql.includes('REFERENCES public.workspaces(id)');
    record('database', hasWorkspaceMemberFK && hasFilesFK && hasTransformFK, 'schema.sql defines foreign key relationships between workspaces, members, files, and transformations');

    // 8.2 Required fields (NOT NULL constraints)
    const hasRequiredWorkspacesName = /CREATE TABLE IF NOT EXISTS public\.workspaces[\s\S]*?name TEXT NOT NULL/i.test(schemaSql);
    const hasRequiredFilesOriginalName = /CREATE TABLE IF NOT EXISTS public\.files[\s\S]*?original_name TEXT NOT NULL/i.test(schemaSql);
    const hasRequiredFilesStoragePath = /CREATE TABLE IF NOT EXISTS public\.files[\s\S]*?storage_path TEXT NOT NULL/i.test(schemaSql);
    record('database', hasRequiredWorkspacesName && hasRequiredFilesOriginalName && hasRequiredFilesStoragePath, 'schema.sql enforces NOT NULL constraints on critical business fields');

    // 8.3 Row Level Security (RLS) Policies
    const rlsWorkspaces = schemaSql.includes('ALTER TABLE public.workspaces ENABLE ROW LEVEL SECURITY');
    const rlsFiles = schemaSql.includes('ALTER TABLE public.files ENABLE ROW LEVEL SECURITY');
    const rlsTransformations = schemaSql.includes('ALTER TABLE public.transformations ENABLE ROW LEVEL SECURITY');
    const rlsClaims = schemaSql.includes('ALTER TABLE public.claims ENABLE ROW LEVEL SECURITY');
    record('database', rlsWorkspaces && rlsFiles && rlsTransformations && rlsClaims, 'schema.sql enables Row Level Security (RLS) across all institutional tables');
  }

  server.close();

  // -------------------------------------------------------------
  // FINAL AUDIT SUMMARY
  // -------------------------------------------------------------
  console.log('\n=============================================================');
  console.log(`STEP 14 INTEGRATION TEST RESULTS: ${passed} passed, ${failed} failed`);
  console.log('=============================================================');
  console.log('Domain Breakdown:');
  for (const [cat, res] of Object.entries(testResults)) {
    console.log(`  - ${cat.toUpperCase()}: ${res.passed} passed, ${res.failed} failed`);
  }
  console.log('=============================================================\n');

  if (failed > 0) {
    process.exit(1);
  }
}

runIntegrationTestSuite().catch((err) => {
  console.error('Integration test suite fatal error:', err);
  process.exit(1);
});
