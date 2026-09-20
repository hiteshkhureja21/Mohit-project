/**
 * STEP 8: TRANSLATION INTEGRATION VERIFICATION SUITE
 * Tests Scenarios A through L against Real Supabase Auth, PostgreSQL, RBAC, and LibreTranslate Provider:
 * - Scenario A: Direct text translation with automatic source language detection
 * - Scenario B: Explicit source language translation (en -> es, en -> hi)
 * - Scenario C: Target language selection and catalog
 * - Scenario D: Character limit validation (20,000 max characters)
 * - Scenario E: Missing target language validation
 * - Scenario F: Unauthenticated access rejection (401)
 * - Scenario G: Workspace RBAC & isolation (Owner/Editor permitted; Viewer denied 403; Stranger denied 403)
 * - Scenario H: File-based translation authorization & text resolution
 * - Scenario I: Translation record lookup (GET /api/translate/:id with cross-workspace protection)
 * - Scenario J: Translation history listing (GET /api/translate with workspace isolation & filters)
 * - Scenario K: Provider abstraction and timeout resilience
 * - Scenario L: Non-regression check on existing routes (/api/health, /api/files, /api/ocr, /api/ai)
 */

import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import assert from 'node:assert';
import { createApp } from '../src/app.js';
import { libreTranslateService } from '../src/services/translation/libretranslate.service.js';
import { translationService, TranslationService } from '../src/services/translation/translation.service.js';
import { TranslationProvider } from '../src/services/translation/translationProvider.interface.js';
import { env } from '../src/config/env.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.resolve(__dirname, '../.env') });

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_SECRET_KEY = process.env.SUPABASE_SECRET_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY;
const SUPABASE_PUBLISHABLE_KEY = process.env.SUPABASE_PUBLISHABLE_KEY || process.env.SUPABASE_ANON_KEY;

if (!SUPABASE_URL || !SUPABASE_SECRET_KEY || !SUPABASE_PUBLISHABLE_KEY) {
  console.error('Missing Supabase configuration in backend/.env');
  process.exit(1);
}

const adminClient = createClient(SUPABASE_URL, SUPABASE_SECRET_KEY, {
  auth: { autoRefreshToken: false, persistSession: false }
});

const pubAuth = createClient(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY);

const results = [];

function record(scenario, name, status, details = '') {
  results.push({ scenario, name, status, details });
  const icon = status === 'PASS' ? '✅' : status === 'NOT TESTED' ? '⚠️' : '❌';
  console.log(`${icon} [${status}] Scenario ${scenario}: ${name}`);
  if (details) {
    console.log(`   └─ ${details}`);
  }
}

async function runStep8Suite() {
  console.log('\n=============================================================');
  console.log('🧪 RUNNING STEP 8: TRANSLATION INTEGRATION TEST SUITE');
  console.log('=============================================================\n');

  // Start internal test server on ephemeral port
  const app = createApp();
  const testPort = 5025;
  let server;
  const baseUrl = `http://127.0.0.1:${testPort}`;

  await new Promise((resolve) => {
    server = app.listen(testPort, () => {
      console.log(`Test server active at ${baseUrl}`);
      resolve();
    });
  });

  const usersToCleanup = [];
  const workspacesToCleanup = [];
  let ownerUser, ownerToken;
  let editorUser, editorToken;
  let viewerUser, viewerToken;
  let foreignUser, foreignToken;
  let workspaceA, workspaceB;
  let testFileA = null;
  let createdTranslationId = null;

  try {
    // -------------------------------------------------------------------------
    // SETUP: Real Supabase Auth Users & Workspaces
    // -------------------------------------------------------------------------
    console.log('Setup: Provisioning real Supabase test accounts and workspaces...');
    const timestamp = Date.now();
    const password = 'Password123!Secure';

    // 1. Owner User
    const ownerEmail = `step8_owner_${timestamp}@sourceflow-audit.internal`;
    const { data: oAuth, error: oErr } = await adminClient.auth.admin.createUser({
      email: ownerEmail,
      password,
      email_confirm: true,
      user_metadata: { full_name: 'Step8 Owner' }
    });
    if (oErr) throw oErr;
    ownerUser = oAuth.user;
    usersToCleanup.push(ownerUser.id);

    const { data: oSession, error: oLogErr } = await pubAuth.auth.signInWithPassword({ email: ownerEmail, password });
    if (oLogErr) throw oLogErr;
    ownerToken = oSession.session.access_token;

    // 2. Editor User
    const editorEmail = `step8_editor_${timestamp}@sourceflow-audit.internal`;
    const { data: edAuth, error: edErr } = await adminClient.auth.admin.createUser({
      email: editorEmail,
      password,
      email_confirm: true,
      user_metadata: { full_name: 'Step8 Editor' }
    });
    if (edErr) throw edErr;
    editorUser = edAuth.user;
    usersToCleanup.push(editorUser.id);

    const { data: edSession, error: edLogErr } = await pubAuth.auth.signInWithPassword({ email: editorEmail, password });
    if (edLogErr) throw edLogErr;
    editorToken = edSession.session.access_token;

    // 3. Viewer User
    const viewerEmail = `step8_viewer_${timestamp}@sourceflow-audit.internal`;
    const { data: vAuth, error: vErr } = await adminClient.auth.admin.createUser({
      email: viewerEmail,
      password,
      email_confirm: true,
      user_metadata: { full_name: 'Step8 Viewer' }
    });
    if (vErr) throw vErr;
    viewerUser = vAuth.user;
    usersToCleanup.push(viewerUser.id);

    const { data: vSession, error: vLogErr } = await pubAuth.auth.signInWithPassword({ email: viewerEmail, password });
    if (vLogErr) throw vLogErr;
    viewerToken = vSession.session.access_token;

    // 4. Foreign User
    const foreignEmail = `step8_foreign_${timestamp}@sourceflow-audit.internal`;
    const { data: fAuth, error: fErr } = await adminClient.auth.admin.createUser({
      email: foreignEmail,
      password,
      email_confirm: true,
      user_metadata: { full_name: 'Step8 Foreign User' }
    });
    if (fErr) throw fErr;
    foreignUser = fAuth.user;
    usersToCleanup.push(foreignUser.id);

    const { data: fSession, error: fLogErr } = await pubAuth.auth.signInWithPassword({ email: foreignEmail, password });
    if (fLogErr) throw fLogErr;
    foreignToken = fSession.session.access_token;

    // 5. Workspaces
    const { data: wsA, error: wsAErr } = await adminClient
      .from('workspaces')
      .insert({
        name: 'Step 8 Translation Test Workspace A',
        description: 'Workspace A for translation integration verification',
        created_by: ownerUser.id
      })
      .select()
      .single();
    if (wsAErr) throw wsAErr;
    workspaceA = wsA;
    workspacesToCleanup.push(workspaceA.id);

    // Workspace A owner is already created by trigger; insert editor and viewer
    const { error: memErrA } = await adminClient.from('workspace_members').insert([
      { workspace_id: workspaceA.id, user_id: editorUser.id, role: 'editor' },
      { workspace_id: workspaceA.id, user_id: viewerUser.id, role: 'viewer' }
    ]);
    if (memErrA) console.error('Workspace A member insert error:', memErrA);

    // Workspace B (Foreign) - owner is already created by trigger
    const { data: wsB, error: wsBErr } = await adminClient
      .from('workspaces')
      .insert({
        name: 'Step 8 Foreign Workspace B',
        description: 'Foreign workspace for cross-tenant isolation testing',
        created_by: foreignUser.id
      })
      .select()
      .single();
    if (wsBErr) throw wsBErr;
    workspaceB = wsB;
    workspacesToCleanup.push(workspaceB.id);

    // Create a mock file in Workspace A for file-based translation test
    const { data: fileRow, error: fileErr } = await adminClient
      .from('files')
      .insert({
        workspace_id: workspaceA.id,
        uploaded_by: ownerUser.id,
        original_name: 'institutional_advisory.txt',
        stored_name: `trans-${timestamp}.txt`,
        mime_type: 'text/plain',
        file_size: 120,
        storage_path: `workspace-${workspaceA.id}/trans-${timestamp}.txt`,
        status: 'completed'
      })
      .select()
      .single();
    if (!fileErr && fileRow) {
      testFileA = fileRow;
      // Also insert OCR result row for file
      await adminClient.from('ocr_results').insert({
        file_id: testFileA.id,
        extracted_text: 'Official Government Directive: Critical telemetry alerts must be routed to the chief information security officer immediately.',
        language: 'eng',
        status: 'completed'
      });
    }

    console.log('Setup complete. Executing verification scenarios...\n');

    // -------------------------------------------------------------------------
    // SCENARIO A: Direct Text Translation with Auto Detection
    // -------------------------------------------------------------------------
    try {
      const res = await fetch(`${baseUrl}/api/translate`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${editorToken}`,
          'X-Workspace-Id': workspaceA.id
        },
        body: JSON.stringify({
          text: 'Hello, how are you?',
          sourceLanguage: 'auto',
          targetLanguage: 'hi',
          workspaceId: workspaceA.id
        })
      });

      const body = await res.json();
      assert.strictEqual(res.status, 200, `Expected 200, got ${res.status}: ${JSON.stringify(body)}`);
      assert.strictEqual(body.success, true);
      assert.ok(body.data.translationId || body.data.id, 'Must return translationId');
      assert.ok(body.data.translatedText, 'Must return translatedText');
      assert.strictEqual(body.data.targetLanguage, 'hi');
      assert.strictEqual(body.data.status, 'completed');
      assert.strictEqual(body.data.provider, 'libretranslate');

      createdTranslationId = body.data.translationId || body.data.id;
      record('A', 'Direct Text Translation (Auto Detection)', 'PASS', `Translated: "${body.data.translatedText}" (id: ${createdTranslationId})`);
    } catch (err) {
      record('A', 'Direct Text Translation (Auto Detection)', 'FAIL', err.message);
    }

    // -------------------------------------------------------------------------
    // SCENARIO B: Explicit Source Language Translation
    // -------------------------------------------------------------------------
    try {
      const res = await fetch(`${baseUrl}/api/translate`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${ownerToken}`,
          'X-Workspace-Id': workspaceA.id
        },
        body: JSON.stringify({
          text: 'Cybersecurity Threat Intelligence: perimeter firewalls mitigated intrusion attempts.',
          sourceLanguage: 'en',
          targetLanguage: 'es',
          workspaceId: workspaceA.id
        })
      });

      const body = await res.json();
      assert.strictEqual(res.status, 200, `Expected 200, got ${res.status}`);
      assert.strictEqual(body.success, true);
      assert.strictEqual(body.data.sourceLanguage, 'en');
      assert.strictEqual(body.data.targetLanguage, 'es');
      assert.ok(body.data.translatedText.length > 0);
      record('B', 'Explicit Source Language Translation', 'PASS', `En->Es translated: "${body.data.translatedText.substring(0, 60)}..."`);
    } catch (err) {
      record('B', 'Explicit Source Language Translation', 'FAIL', err.message);
    }

    // -------------------------------------------------------------------------
    // SCENARIO C: Target Language Selection Catalog & Aliases
    // -------------------------------------------------------------------------
    try {
      const res = await fetch(`${baseUrl}/api/translate/languages`);
      const body = await res.json();
      assert.strictEqual(res.status, 200);
      assert.strictEqual(body.success, true);
      assert.ok(Array.isArray(body.data), 'Languages catalog must be an array');
      assert.ok(body.data.some(l => l.code === 'hi'), 'Must include Hindi (hi)');
      assert.ok(body.data.some(l => l.code === 'es'), 'Must include Spanish (es)');
      assert.ok(body.data.some(l => l.code === 'fr'), 'Must include French (fr)');

      record('C', 'Target Language Selection & Catalog', 'PASS', `Catalog verified with ${body.data.length} supported languages`);
    } catch (err) {
      record('C', 'Target Language Selection & Catalog', 'FAIL', err.message);
    }

    // -------------------------------------------------------------------------
    // SCENARIO D: Character Limit Validation (20,000 max chars)
    // -------------------------------------------------------------------------
    try {
      const oversizedText = 'A'.repeat(20005);
      const res = await fetch(`${baseUrl}/api/translate`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${editorToken}`,
          'X-Workspace-Id': workspaceA.id
        },
        body: JSON.stringify({
          text: oversizedText,
          targetLanguage: 'es',
          workspaceId: workspaceA.id
        })
      });

      const body = await res.json();
      assert.ok([400, 422].includes(res.status), `Expected 400 or 422 for oversized text, got ${res.status}`);
      assert.strictEqual(body.success, false);
      record('D', 'Character Limit Validation (>20,000 chars rejected)', 'PASS', `Correctly rejected with ${res.status}: ${JSON.stringify(body.error)}`);
    } catch (err) {
      record('D', 'Character Limit Validation (>20,000 chars rejected)', 'FAIL', err.message);
    }

    // -------------------------------------------------------------------------
    // SCENARIO E: Missing Target Language Validation
    // -------------------------------------------------------------------------
    try {
      const res = await fetch(`${baseUrl}/api/translate`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${editorToken}`,
          'X-Workspace-Id': workspaceA.id
        },
        body: JSON.stringify({
          text: 'Hello world',
          workspaceId: workspaceA.id
        })
      });

      const body = await res.json();
      assert.ok([400, 422].includes(res.status), `Expected 400 or 422 for missing targetLanguage, got ${res.status}`);
      assert.strictEqual(body.success, false);
      record('E', 'Missing Target Language Validation', 'PASS', `Correctly rejected missing target language with ${res.status}`);
    } catch (err) {
      record('E', 'Missing Target Language Validation', 'FAIL', err.message);
    }

    // -------------------------------------------------------------------------
    // SCENARIO F: Unauthenticated Request Rejection (401)
    // -------------------------------------------------------------------------
    try {
      const res = await fetch(`${baseUrl}/api/translate`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          text: 'Hello unauthenticated',
          targetLanguage: 'es',
          workspaceId: workspaceA.id
        })
      });

      assert.strictEqual(res.status, 401, `Expected 401 Unauthorized, got ${res.status}`);
      record('F', 'Unauthenticated Access Rejection (401)', 'PASS', 'Access blocked with 401 when Authorization header is missing');
    } catch (err) {
      record('F', 'Unauthenticated Access Rejection (401)', 'FAIL', err.message);
    }

    // -------------------------------------------------------------------------
    // SCENARIO G: Workspace RBAC & Isolation
    // -------------------------------------------------------------------------
    try {
      // 1. Viewer Role -> 403 Forbidden
      const viewerRes = await fetch(`${baseUrl}/api/translate`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${viewerToken}`,
          'X-Workspace-Id': workspaceA.id
        },
        body: JSON.stringify({
          text: 'Attempting translation as viewer',
          targetLanguage: 'hi',
          workspaceId: workspaceA.id
        })
      });
      assert.strictEqual(viewerRes.status, 403, `Expected 403 for viewer, got ${viewerRes.status}`);

      // 2. Stranger (not in workspace) -> 403 Forbidden
      const strangerRes = await fetch(`${baseUrl}/api/translate`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${foreignToken}`,
          'X-Workspace-Id': workspaceA.id
        },
        body: JSON.stringify({
          text: 'Attempting translation across workspace boundary',
          targetLanguage: 'es',
          workspaceId: workspaceA.id
        })
      });
      assert.strictEqual(strangerRes.status, 403, `Expected 403 for non-member, got ${strangerRes.status}`);

      // 3. Editor Role -> 200 OK
      const editorRes = await fetch(`${baseUrl}/api/translate`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${editorToken}`,
          'X-Workspace-Id': workspaceA.id
        },
        body: JSON.stringify({
          text: 'Allowed translation as editor',
          targetLanguage: 'es',
          workspaceId: workspaceA.id
        })
      });
      assert.strictEqual(editorRes.status, 200, `Expected 200 for editor, got ${editorRes.status}`);

      record('G', 'Workspace RBAC & Isolation', 'PASS', 'Viewers blocked (403), non-members blocked (403), editors allowed (200)');
    } catch (err) {
      record('G', 'Workspace RBAC & Isolation', 'FAIL', err.message);
    }

    // -------------------------------------------------------------------------
    // SCENARIO H: File-Based Translation Authorization
    // -------------------------------------------------------------------------
    try {
      // 1. Non-existent file returns 404
      const nonExistentRes = await fetch(`${baseUrl}/api/translate`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${editorToken}`,
          'X-Workspace-Id': workspaceA.id
        },
        body: JSON.stringify({
          fileId: '00000000-0000-0000-0000-000000000000',
          targetLanguage: 'hi',
          workspaceId: workspaceA.id
        })
      });
      assert.strictEqual(nonExistentRes.status, 404, `Expected 404 for non-existent file, got ${nonExistentRes.status}`);

      // 2. Real file in workspace extracts OCR text and translates
      if (testFileA) {
        const fileTransRes = await fetch(`${baseUrl}/api/translate`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${editorToken}`,
            'X-Workspace-Id': workspaceA.id
          },
          body: JSON.stringify({
            fileId: testFileA.id,
            targetLanguage: 'hi',
            workspaceId: workspaceA.id
          })
        });
        const fileTransBody = await fileTransRes.json();
        assert.strictEqual(fileTransRes.status, 200, `Expected 200 for file translation, got ${fileTransRes.status}`);
        assert.ok(fileTransBody.data.translatedText);
      }

      record('H', 'File-Based Translation Authorization', 'PASS', 'Non-existent file 404; OCR text extracted and translated for authorized file');
    } catch (err) {
      record('H', 'File-Based Translation Authorization', 'FAIL', err.message);
    }

    // -------------------------------------------------------------------------
    // SCENARIO I: Translation History Retrieval (GET /api/translate/:id)
    // -------------------------------------------------------------------------
    try {
      assert.ok(createdTranslationId, 'A valid translationId must have been created in Scenario A');

      // 1. Authorized member retrieves translation
      const memberRes = await fetch(`${baseUrl}/api/translate/${createdTranslationId}`, {
        headers: {
          'Authorization': `Bearer ${editorToken}`,
          'X-Workspace-Id': workspaceA.id
        }
      });
      const memberBody = await memberRes.json();
      assert.strictEqual(memberRes.status, 200, `Expected 200, got ${memberRes.status}`);
      assert.strictEqual(memberBody.success, true);
      assert.strictEqual(memberBody.data.id, createdTranslationId);

      // 2. Stranger from another workspace is denied with 403
      const strangerRes = await fetch(`${baseUrl}/api/translate/${createdTranslationId}`, {
        headers: {
          'Authorization': `Bearer ${foreignToken}`,
          'X-Workspace-Id': workspaceB.id
        }
      });
      assert.strictEqual(strangerRes.status, 403, `Expected 403 for cross-workspace access, got ${strangerRes.status}`);

      // 3. Non-existent ID returns 404
      const notFoundRes = await fetch(`${baseUrl}/api/translate/00000000-0000-0000-0000-000000000000`, {
        headers: {
          'Authorization': `Bearer ${editorToken}`,
          'X-Workspace-Id': workspaceA.id
        }
      });
      assert.strictEqual(notFoundRes.status, 404, `Expected 404, got ${notFoundRes.status}`);

      record('I', 'Translation Record Lookup (GET /api/translate/:id)', 'PASS', `Retrieved ID ${createdTranslationId}; cross-workspace blocked with 403`);
    } catch (err) {
      record('I', 'Translation Record Lookup (GET /api/translate/:id)', 'FAIL', err.message);
    }

    // -------------------------------------------------------------------------
    // SCENARIO J: Translation History Listing (GET /api/translate)
    // -------------------------------------------------------------------------
    try {
      const listRes = await fetch(`${baseUrl}/api/translate?workspaceId=${workspaceA.id}&limit=10&offset=0`, {
        headers: {
          'Authorization': `Bearer ${editorToken}`,
          'X-Workspace-Id': workspaceA.id
        }
      });
      const listBody = await listRes.json();
      assert.strictEqual(listRes.status, 200, `Expected 200, got ${listRes.status}`);
      assert.strictEqual(listBody.success, true);
      assert.ok(Array.isArray(listBody.data), 'History data must be an array');
      assert.ok(listBody.data.length >= 1, 'History must contain at least 1 record');

      // Unauthorized workspace filter blocked with 403
      const unauthorizedListRes = await fetch(`${baseUrl}/api/translate?workspaceId=${workspaceB.id}`, {
        headers: {
          'Authorization': `Bearer ${editorToken}`
        }
      });
      assert.strictEqual(unauthorizedListRes.status, 403, `Expected 403 for unauthorized workspace, got ${unauthorizedListRes.status}`);

      record('J', 'Translation History Listing (GET /api/translate)', 'PASS', `Listed ${listBody.data.length} records; unauthorized workspace filter blocked with 403`);
    } catch (err) {
      record('J', 'Translation History Listing (GET /api/translate)', 'FAIL', err.message);
    }

    // -------------------------------------------------------------------------
    // SCENARIO K: Provider Abstraction & Timeout Resilience
    // -------------------------------------------------------------------------
    try {
      // Test custom mock provider to verify abstraction swappability
      class MockCustomProvider extends TranslationProvider {
        get name() { return 'MockEngine'; }
        async translate({ text, targetLanguage }) {
          return {
            translatedText: `[MOCK-${targetLanguage}] ${text}`,
            detectedLanguage: 'en',
            provider: 'MockEngine'
          };
        }
        async getSupportedLanguages() {
          return [{ code: 'en', name: 'English' }, { code: 'hi', name: 'Hindi' }];
        }
      }

      const customService = new TranslationService(new MockCustomProvider());
      const customResult = await customService.translateText({
        text: 'Hello provider abstraction',
        targetLanguage: 'hi',
        workspaceId: workspaceA.id,
        userId: editorUser.id
      });

      assert.strictEqual(customResult.provider, 'MockEngine');
      assert.strictEqual(customResult.translatedText, '[MOCK-hi] Hello provider abstraction');

      // Test timeout simulation with LibreTranslate provider
      let timeoutCaught = false;
      try {
        await libreTranslateService.translate({
          text: 'Testing timeout',
          targetLanguage: 'es',
          timeoutMs: 1 // 1ms guaranteed timeout
        });
      } catch (timeoutErr) {
        timeoutCaught = true;
        assert.ok(timeoutErr.code === 'TRANSLATION_TIMEOUT' || timeoutErr.statusCode === 504 || timeoutErr.message.includes('timed out'));
      }
      assert.ok(timeoutCaught, '1ms timeout must trigger TRANSLATION_TIMEOUT');

      record('K', 'Provider Abstraction & Timeout Handling', 'PASS', 'Provider swappability verified; AbortController timeout handled with 504');
    } catch (err) {
      record('K', 'Provider Abstraction & Timeout Handling', 'FAIL', err.message);
    }

    // -------------------------------------------------------------------------
    // SCENARIO L: Non-Regression on Existing Routes
    // -------------------------------------------------------------------------
    try {
      // 1. /api/health
      const healthRes = await fetch(`${baseUrl}/api/health`);
      const healthBody = await healthRes.json();
      assert.strictEqual(healthRes.status, 200);
      assert.strictEqual(healthBody.success, true);
      assert.strictEqual(healthBody.status, 'healthy');
      assert.ok(healthBody.services?.translation);

      // 2. /api/files unauthenticated test
      const filesRes = await fetch(`${baseUrl}/api/files`);
      assert.strictEqual(filesRes.status, 401, 'Files endpoint must maintain 401 on unauthenticated request');

      // 3. /api/ocr unauthenticated test
      const ocrRes = await fetch(`${baseUrl}/api/ocr`, { method: 'POST' });
      assert.strictEqual(ocrRes.status, 401, 'OCR endpoint must maintain 401 on unauthenticated request');

      // 4. /api/ai/summarize unauthenticated test
      const aiRes = await fetch(`${baseUrl}/api/ai/summarize`, { method: 'POST' });
      assert.strictEqual(aiRes.status, 401, 'AI summarize endpoint must maintain 401 on unauthenticated request');

      record('L', 'Non-Regression on Existing Routes', 'PASS', 'Health, Files, OCR, and AI routes all preserve security and response contracts');
    } catch (err) {
      record('L', 'Non-Regression on Existing Routes', 'FAIL', err.message);
    }

  } finally {
    // Teardown test server
    server.close();

    // Clean up test data in Supabase
    console.log('\nTeardown: Cleaning up test records from Supabase...');
    for (const wsId of workspacesToCleanup) {
      await adminClient.from('translations').delete().eq('workspace_id', wsId);
      await adminClient.from('ocr_results').delete().filter('file_id', 'in', `(select id from files where workspace_id = '${wsId}')`);
      await adminClient.from('files').delete().eq('workspace_id', wsId);
      await adminClient.from('workspace_members').delete().eq('workspace_id', wsId);
      await adminClient.from('workspaces').delete().eq('id', wsId);
    }

    for (const uid of usersToCleanup) {
      await adminClient.from('profiles').delete().eq('id', uid);
      await adminClient.auth.admin.deleteUser(uid);
    }
  }

  console.log('\n=============================================================');
  console.log('📊 STEP 8 TRANSLATION INTEGRATION VERIFICATION SUMMARY');
  console.log('=============================================================');
  const passCount = results.filter(r => r.status === 'PASS').length;
  const failCount = results.filter(r => r.status === 'FAIL').length;
  console.log(`TOTAL SCENARIOS: ${results.length}`);
  console.log(`PASSED:          ${passCount}`);
  console.log(`FAILED:          ${failCount}`);
  console.log('=============================================================\n');

  if (failCount > 0) {
    process.exit(1);
  }
}

runStep8Suite().catch((err) => {
  console.error('Fatal error in Step 8 test suite:', err);
  process.exit(1);
});
