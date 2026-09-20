/**
 * Step 3: Final Hardened Supabase RLS & Workspace RBAC Test Suite
 * Validates the 19-point security matrix (Scenarios A through S) and SQL hardening.
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import http from 'http';
import { createApp } from '../src/app.js';
import { workspaceMemberService, demoMemberships } from '../src/services/workspaceMember.service.js';
import { authService } from '../src/services/auth.service.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, '../..');

let server;
let baseUrl;

const REQUIRED_TABLES = [
  'profiles',
  'workspaces',
  'workspace_members',
  'files',
  'ocr_results',
  'ai_requests',
  'transformations',
  'claims',
  'outputs',
  'audit_logs'
];

function request(options, postData = null, headers = {}) {
  return new Promise((resolve, reject) => {
    const url = new URL(options.path, baseUrl);
    const reqOptions = {
      method: options.method || 'GET',
      hostname: url.hostname,
      port: url.port,
      path: url.pathname + url.search,
      headers: {
        'Content-Type': 'application/json',
        ...headers
      }
    };

    const req = http.request(reqOptions, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        let body;
        try {
          body = JSON.parse(data);
        } catch {
          body = data;
        }
        resolve({ status: res.statusCode, headers: res.headers, body });
      });
    });

    req.on('error', reject);
    if (postData) {
      req.write(typeof postData === 'string' ? postData : JSON.stringify(postData));
    }
    req.end();
  });
}

function getAuthHeader(role) {
  switch (role) {
    case 'userA':
    case 'owner':
      return { Authorization: 'Bearer token-user-a' };
    case 'userB':
      return { Authorization: 'Bearer token-user-b' };
    case 'editor':
      return { Authorization: 'Bearer token-editor-a' };
    case 'viewer':
      return { Authorization: 'Bearer token-viewer-a' };
    default:
      return {};
  }
}

// Stub authService.verifyToken for test identities
const originalVerifyToken = authService.verifyToken.bind(authService);
authService.verifyToken = async (token) => {
  if (token === 'token-user-a') {
    return {
      success: true,
      user: { id: 'USR-802', email: 'userA@sourceflow.demo', name: 'User A (Owner ws-001)', role: 'Owner', isDemo: false }
    };
  }
  if (token === 'token-user-b') {
    return {
      success: true,
      user: { id: 'USR-USER-B', email: 'userB@sourceflow.demo', name: 'User B (Owner ws-002)', role: 'Owner', isDemo: false }
    };
  }
  if (token === 'token-editor-a') {
    return {
      success: true,
      user: { id: 'USR-EDITOR-1', email: 'editor@sourceflow.demo', name: 'Editor ws-001', role: 'Editor', isDemo: false }
    };
  }
  if (token === 'token-viewer-a') {
    return {
      success: true,
      user: { id: 'USR-VIEWER-1', email: 'viewer@sourceflow.demo', name: 'Viewer ws-001', role: 'Viewer', isDemo: false }
    };
  }
  return originalVerifyToken(token);
};

async function runStep3FinalTests() {
  console.log('\n=============================================================');
  console.log('🧪 RUNNING STEP 3 FINAL: RLS OWNERSHIP & RBAC MATRIX (A-S)');
  console.log('=============================================================\n');

  let passed = 0;
  let failed = 0;

  function assert(condition, message) {
    if (condition) {
      console.log(`  ✓ [PASS] ${message}`);
      passed++;
    } else {
      console.error(`  ✗ [FAIL] ${message}`);
      failed++;
    }
  }

  // --- PART 1: RLS SQL STATIC SECURITY ANALYSIS ---
  console.log('--- 1. RLS SPECIFICATION VERIFICATION (database/rls-policies.sql) ---');
  const rlsPath = path.join(rootDir, 'database', 'rls-policies.sql');
  assert(fs.existsSync(rlsPath), 'database/rls-policies.sql exists');

  const rlsContent = fs.readFileSync(rlsPath, 'utf8');

  // Verify all 10 tables have RLS enabled
  for (const table of REQUIRED_TABLES) {
    const rlsRegex = new RegExp(`ALTER\\s+TABLE\\s+public\\.${table}\\s+ENABLE\\s+ROW\\s+LEVEL\\s+SECURITY`, 'i');
    assert(rlsRegex.test(rlsContent), `RLS enabled on public.${table}`);
  }

  // Verify Single Source of Truth in get_workspace_role: NO created_by fallback
  const getWorkspaceRoleFn = rlsContent.match(/FUNCTION\s+public\.get_workspace_role[\s\S]*?END;\s*\$\$/i)?.[0] || '';
  assert(
    getWorkspaceRoleFn && !/created_by\s*=\s*auth\.uid\(\)/i.test(getWorkspaceRoleFn),
    'get_workspace_role() does NOT infer owner status from workspaces.created_by (Single Source of Truth)'
  );

  // Verify SECURITY DEFINER functions have explicit safe search_path and revoked PUBLIC execute
  const functionsWithSearchPath = [
    'get_workspace_role',
    'is_workspace_member',
    'is_workspace_editor_or_owner',
    'is_workspace_owner',
    'is_workspace_creator',
    'shares_workspace_with'
  ];
  for (const fnName of functionsWithSearchPath) {
    const fnRegex = new RegExp(
      `FUNCTION\\s+public\\.${fnName}[\\s\\S]*?SECURITY\\s+DEFINER[\\s\\S]*?SET\\s+search_path\\s*=\\s*public,\\s*pg_temp`,
      'i'
    );
    assert(fnRegex.test(rlsContent), `Function public.${fnName}() has SECURITY DEFINER and SET search_path = public, pg_temp`);

    const revokeRegex = new RegExp(`REVOKE\\s+EXECUTE\\s+ON\\s+FUNCTION\\s+public\\.${fnName}[^;]*FROM\\s+PUBLIC`, 'i');
    assert(revokeRegex.test(rlsContent), `REVOKE EXECUTE ON FUNCTION public.${fnName}() FROM PUBLIC`);
  }

  // Verify Immutability and Orphan Prevention triggers in SQL
  assert(/prevent_workspace_creator_change/i.test(rlsContent), 'Immutable workspaces.created_by trigger defined (prevent_workspace_creator_change)');
  assert(/prevent_membership_reassignment/i.test(rlsContent), 'Immutable workspace_members (workspace_id, user_id) trigger defined (prevent_membership_reassignment)');
  assert(/prevent_workspace_reassignment/i.test(rlsContent), 'Immutable records workspace_id trigger defined (prevent_workspace_reassignment)');
  assert(/prevent_parent_reassignment/i.test(rlsContent), 'Immutable child parent reference trigger defined (prevent_parent_reassignment)');
  assert(/prevent_workspace_orphan/i.test(rlsContent), 'Orphan workspace prevention trigger defined (prevent_workspace_orphan)');

  // Verify Privacy-Preserving Profiles policy
  assert(!/Profiles:[^;]*USING\s*\(\s*true\s*\)/i.test(rlsContent), 'Profiles policy strictly rejects USING(true)');
  assert(/shares_workspace_with/i.test(rlsContent), 'Profiles policy isolates profile reads to workspace peers');

  // Verify Audit Log Integrity
  assert(/user_id\s*=\s*auth\.uid\(\)/i.test(rlsContent), 'Audit inserts strictly validate user_id = auth.uid()');
  assert(!/CREATE\s+POLICY[^\n]*ON\s+public\.audit_logs[^\n]*FOR\s+(UPDATE|DELETE)/i.test(rlsContent), 'Audit logs omit UPDATE and DELETE policies (Strict Append-Only Immutability)');

  // Start Express server for HTTP RBAC Matrix
  const app = createApp();
  server = http.createServer(app);
  await new Promise(resolve => server.listen(0, resolve));
  const port = server.address().port;
  baseUrl = `http://127.0.0.1:${port}`;

  console.log('\n--- 2. FINAL RBAC TEST MATRIX (Scenarios A through S) ---');

  const authUserA = getAuthHeader('userA');
  const authUserB = getAuthHeader('userB');
  const authEditor = getAuthHeader('editor');
  const authViewer = getAuthHeader('viewer');

  // Scenario A: Creator creates workspace → ALLOW
  const resA = await request(
    { path: '/api/workspaces', method: 'POST' },
    { name: 'Research Lab Alpha', type: 'research' },
    authUserA
  );
  assert(resA.status === 201 && resA.body?.success === true, 'Scenario A: Creator creates workspace → ALLOW (201)');
  const createdWsId = resA.body?.data?.id;

  // Scenario B: Creator becomes owner through membership → ALLOW
  const roleInNewWs = await workspaceMemberService.getMemberRole(createdWsId, 'USR-802');
  assert(roleInNewWs === 'owner', 'Scenario B: Creator becomes owner through workspace_members registration (role: owner)');

  // Scenario C: Owner reads workspace → ALLOW
  const resC = await request({ path: '/api/workspaces/workspace-001', method: 'GET' }, null, authUserA);
  assert(resC.status === 200 && resC.body?.success === true, 'Scenario C: Owner reads workspace → ALLOW (200)');

  // Scenario D: Editor reads workspace → ALLOW
  const resD = await request({ path: '/api/workspaces/workspace-001', method: 'GET' }, null, authEditor);
  assert(resD.status === 200 && resD.body?.success === true, 'Scenario D: Editor reads workspace → ALLOW (200)');

  // Scenario E: Viewer reads workspace → ALLOW
  const resE = await request({ path: '/api/workspaces/workspace-001', method: 'GET' }, null, authViewer);
  assert(resE.status === 200 && resE.body?.success === true, 'Scenario E: Viewer reads workspace → ALLOW (200)');

  // Scenario F: Non-member reads workspace → DENY
  const resF = await request({ path: '/api/workspaces/workspace-002', method: 'GET' }, null, authUserA);
  assert(resF.status === 403 && resF.body?.error?.code === 'ACCESS_DENIED', 'Scenario F: Non-member reads workspace → DENY (403 ACCESS_DENIED)');

  // Scenario G: Owner adds member → ALLOW
  const resG = await request(
    { path: '/api/workspaces/workspace-001/members', method: 'POST' },
    { userId: 'USR-TEMP-MEMBER', role: 'viewer' },
    authUserA
  );
  assert(resG.status === 201 && resG.body?.success === true, 'Scenario G: Owner adds member → ALLOW (201)');

  // Scenario H: Editor adds member → DENY
  const resH = await request(
    { path: '/api/workspaces/workspace-001/members', method: 'POST' },
    { userId: 'USR-ILLEGAL-MEMBER', role: 'editor' },
    authEditor
  );
  assert(resH.status === 403 && resH.body?.error?.code === 'ACCESS_DENIED', 'Scenario H: Editor adds member → DENY (403 ACCESS_DENIED)');

  // Scenario I: Viewer adds member → DENY
  const resI = await request(
    { path: '/api/workspaces/workspace-001/members', method: 'POST' },
    { userId: 'USR-ILLEGAL-MEMBER', role: 'viewer' },
    authViewer
  );
  assert(resI.status === 403 && resI.body?.error?.code === 'ACCESS_DENIED', 'Scenario I: Viewer adds member → DENY (403 ACCESS_DENIED)');

  // Scenario J: Owner changes role → ALLOW
  const resJ = await request(
    { path: '/api/workspaces/workspace-001/members', method: 'POST' },
    { userId: 'USR-TEMP-MEMBER', role: 'editor' },
    authUserA
  );
  assert(resJ.status === 201 && resJ.body?.success === true, 'Scenario J: Owner changes member role → ALLOW (201)');

  // Scenario K: Editor changes role → DENY
  const resK = await request(
    { path: '/api/workspaces/workspace-001/members', method: 'POST' },
    { userId: 'USR-TEMP-MEMBER', role: 'owner' },
    authEditor
  );
  assert(resK.status === 403 && resK.body?.error?.code === 'ACCESS_DENIED', 'Scenario K: Editor changes role → DENY (403 ACCESS_DENIED)');

  // Scenario L: User changes own role to owner → DENY
  const resL = await request(
    { path: '/api/workspaces/workspace-001/members', method: 'POST' },
    { userId: 'USR-EDITOR-1', role: 'owner' },
    authEditor
  );
  assert(resL.status === 403 && resL.body?.error?.code === 'ACCESS_DENIED', 'Scenario L: User self-promotion to owner → DENY (403 ACCESS_DENIED)');

  // Scenario M: Owner removes member → ALLOW
  const resM = await request(
    { path: '/api/workspaces/workspace-001/members/USR-TEMP-MEMBER', method: 'DELETE' },
    null,
    authUserA
  );
  assert(resM.status === 200 && resM.body?.success === true, 'Scenario M: Owner removes member → ALLOW (200)');

  // Scenario N: Owner removes final owner → DENY
  let orphanPrevented = false;
  try {
    await workspaceMemberService.removeMember('workspace-001', 'USR-802');
  } catch (err) {
    if (err.code === 'LAST_OWNER_PROTECTED' || err.message.includes('last owner')) {
      orphanPrevented = true;
    }
  }
  assert(orphanPrevented, 'Scenario N: Removing final active owner is prevented by orphan guard → DENY');

  // Scenario O: Member changes workspace_id → DENY
  const trgO = /prevent_membership_reassignment[\s\S]*?NEW\.workspace_id\s+IS\s+DISTINCT\s+FROM\s+OLD\.workspace_id/i.test(rlsContent);
  const polO = /WITH\s+CHECK\s*\([^;]*workspace_id\s*=\s*workspace_members\.workspace_id/i.test(rlsContent);
  assert(trgO && polO, 'Scenario O: Changing workspace_id on existing membership row blocked by trigger & policy → DENY');

  // Scenario P: Member changes user_id → DENY
  const trgP = /prevent_membership_reassignment[\s\S]*?NEW\.user_id\s+IS\s+DISTINCT\s+FROM\s+OLD\.user_id/i.test(rlsContent);
  const polP = /WITH\s+CHECK\s*\([^;]*user_id\s*=\s*workspace_members\.user_id/i.test(rlsContent);
  assert(trgP && polP, 'Scenario P: Changing user_id on existing membership row blocked by trigger & policy → DENY');

  // Scenario Q: Owner changes created_by → DENY
  const trgQ = /prevent_workspace_creator_change[\s\S]*?NEW\.created_by\s+IS\s+DISTINCT\s+FROM\s+OLD\.created_by/i.test(rlsContent);
  const polQ = /WITH\s+CHECK\s*\([^;]*created_by\s*=\s*workspaces\.created_by/i.test(rlsContent);
  assert(trgQ && polQ, 'Scenario Q: Changing workspaces.created_by blocked by trigger & policy → DENY');

  // Scenario R: User accesses another workspace's file → DENY
  const resR = await request(
    { path: '/api/files/DOC-8821', method: 'GET' },
    null,
    { ...authUserB, 'x-workspace-id': 'workspace-001' }
  );
  assert(resR.status === 403 && resR.body?.error?.code === 'ACCESS_DENIED', 'Scenario R: Accessing another workspace file → DENY (403 ACCESS_DENIED)');

  // Scenario S: User moves file to another workspace → DENY
  const trgS = /prevent_workspace_reassignment[\s\S]*?NEW\.workspace_id\s+IS\s+DISTINCT\s+FROM\s+OLD\.workspace_id/i.test(rlsContent);
  const polS = /WITH\s+CHECK\s*\([^;]*workspace_id\s*=\s*files\.workspace_id/i.test(rlsContent);
  assert(trgS && polS, 'Scenario S: Moving files to another workspace blocked by immutability trigger & policy → DENY');

  console.log('\n=============================================================');
  console.log(`FINAL STEP 3 MATRIX RESULTS: ${passed} passed, ${failed} failed`);
  console.log('=============================================================\n');

  server.close();
  if (failed > 0) {
    process.exit(1);
  }
}

runStep3FinalTests().catch(err => {
  console.error('Test execution error:', err);
  if (server) server.close();
  process.exit(1);
});
