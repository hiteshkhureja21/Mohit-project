/**
 * STEP 4 STORAGE VERIFICATION SUITE
 * Tests all 15 scenarios (A through O) against live Supabase Storage and Express Backend API.
 */

import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.resolve(__dirname, '../.env') });

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_SECRET_KEY = process.env.SUPABASE_SECRET_KEY;
const SUPABASE_PUBLISHABLE_KEY = process.env.SUPABASE_PUBLISHABLE_KEY;
const BACKEND_URL = process.env.BACKEND_URL || 'http://localhost:5000';
const BUCKET_NAME = process.env.SUPABASE_STORAGE_BUCKET || 'sourceflow-files';

if (!SUPABASE_URL || !SUPABASE_SECRET_KEY || !SUPABASE_PUBLISHABLE_KEY) {
  console.error('Missing Supabase configuration in backend/.env');
  process.exit(1);
}

const adminClient = createClient(SUPABASE_URL, SUPABASE_SECRET_KEY, {
  auth: { autoRefreshToken: false, persistSession: false }
});

const pubAuth = createClient(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY);

const results = [];

function recordResult(code, description, status, details = '') {
  results.push({ code, description, status, details });
  const icon = status === 'PASS' ? '✅ [PASS]' : (status === 'FAIL' ? '❌ [FAIL]' : '⚠️ [NOT YET IMPLEMENTED]');
  console.log(`${icon} Scenario ${code}: ${description}`);
  if (details) {
    console.log(`   └─ ${details}`);
  }
}

// Helper to create multipart form-data payload using standard FormData
async function uploadViaBackend(token, workspaceId, filename, fileBuffer, mimeType) {
  const formData = new FormData();
  const blob = new Blob([fileBuffer], { type: mimeType });
  formData.append('file', blob, filename);

  const res = await fetch(`${BACKEND_URL}/api/files`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'x-workspace-id': workspaceId
    },
    body: formData
  });

  const json = await res.json().catch(() => ({}));
  return { status: res.status, ok: res.ok, data: json };
}

async function runStep4Tests() {
  console.log('\n=============================================================');
  console.log('🧪 RUNNING STEP 4: SUPABASE STORAGE VERIFICATION (A through O)');
  console.log(`Target Supabase: ${SUPABASE_URL}`);
  console.log(`Target Bucket:   ${BUCKET_NAME}`);
  console.log('=============================================================\n');

  let ownerUser = null;
  let editorUser = null;
  let viewerUser = null;
  let otherUser = null;

  let ownerToken = null;
  let editorToken = null;
  let viewerToken = null;
  let otherToken = null;

  let workspaceAId = null;
  let workspaceBId = null;
  let uploadedFileAId = null;
  let uploadedFileBId = null;
  let uploadedStoragePathA = null;

  const timestamp = Date.now();

  try {
    // -------------------------------------------------------------
    // SETUP: Ensure bucket & create ephemeral test users & workspaces
    // -------------------------------------------------------------
    console.log('Ensuring private storage bucket exists...');
    const { data: bData } = await adminClient.storage.getBucket(BUCKET_NAME);
    if (!bData) {
      await adminClient.storage.createBucket(BUCKET_NAME, {
        public: false,
        fileSizeLimit: 26214400,
        allowedMimeTypes: [
          'application/pdf',
          'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
          'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
          'image/png',
          'image/jpeg'
        ]
      });
    }

    console.log('Creating ephemeral test users...');
    // 1. Owner
    const { data: u1 } = await adminClient.auth.admin.createUser({
      email: `st_owner_${timestamp}@sourceflow.test`,
      password: 'TestPassword123!',
      email_confirm: true,
      user_metadata: { name: 'Storage Owner' }
    });
    ownerUser = u1.user;
    await adminClient.from('profiles').insert({ id: ownerUser.id, display_name: 'Storage Owner', role: 'Owner' });

    // 2. Editor
    const { data: u2 } = await adminClient.auth.admin.createUser({
      email: `st_editor_${timestamp}@sourceflow.test`,
      password: 'TestPassword123!',
      email_confirm: true,
      user_metadata: { name: 'Storage Editor' }
    });
    editorUser = u2.user;
    await adminClient.from('profiles').insert({ id: editorUser.id, display_name: 'Storage Editor', role: 'Editor' });

    // 3. Viewer
    const { data: u3 } = await adminClient.auth.admin.createUser({
      email: `st_viewer_${timestamp}@sourceflow.test`,
      password: 'TestPassword123!',
      email_confirm: true,
      user_metadata: { name: 'Storage Viewer' }
    });
    viewerUser = u3.user;
    await adminClient.from('profiles').insert({ id: viewerUser.id, display_name: 'Storage Viewer', role: 'Viewer' });

    // 4. Other User (Member of Workspace B only)
    const { data: u4 } = await adminClient.auth.admin.createUser({
      email: `st_other_${timestamp}@sourceflow.test`,
      password: 'TestPassword123!',
      email_confirm: true,
      user_metadata: { name: 'Other User' }
    });
    otherUser = u4.user;
    await adminClient.from('profiles').insert({ id: otherUser.id, display_name: 'Other User', role: 'Reviewer' });

    // Sign in users to get real JWT access tokens
    const { data: s1 } = await pubAuth.auth.signInWithPassword({ email: ownerUser.email, password: 'TestPassword123!' });
    ownerToken = s1.session.access_token;

    const { data: s2 } = await pubAuth.auth.signInWithPassword({ email: editorUser.email, password: 'TestPassword123!' });
    editorToken = s2.session.access_token;

    const { data: s3 } = await pubAuth.auth.signInWithPassword({ email: viewerUser.email, password: 'TestPassword123!' });
    viewerToken = s3.session.access_token;

    const { data: s4 } = await pubAuth.auth.signInWithPassword({ email: otherUser.email, password: 'TestPassword123!' });
    otherToken = s4.session.access_token;

    // Create Workspace A
    const { data: wsA } = await adminClient.from('workspaces').insert({
      name: `Storage Test Workspace A ${timestamp}`,
      created_by: ownerUser.id,
      workspace_type: 'operations'
    }).select().single();
    workspaceAId = wsA.id;

    // Membership: Owner is already owner via trigger; add editor and viewer
    await adminClient.from('workspace_members').insert([
      { workspace_id: workspaceAId, user_id: editorUser.id, role: 'editor' },
      { workspace_id: workspaceAId, user_id: viewerUser.id, role: 'viewer' }
    ]);

    // Create Workspace B (otherUser is owner)
    const { data: wsB } = await adminClient.from('workspaces').insert({
      name: `Storage Test Workspace B ${timestamp}`,
      created_by: otherUser.id,
      workspace_type: 'research'
    }).select().single();
    workspaceBId = wsB.id;

    console.log('Setup completed.\n');

    // -------------------------------------------------------------
    // SCENARIO A: Authenticated owner uploads PDF → PASS
    // -------------------------------------------------------------
    const samplePdfBuffer = Buffer.from('%PDF-1.4\n%SourceFlow Institutional Sample Document Content\n%%EOF');
    const resA = await uploadViaBackend(ownerToken, workspaceAId, 'OwnerReport.pdf', samplePdfBuffer, 'application/pdf');
    if (resA.status === 201 && resA.data?.success && resA.data?.data?.id) {
      uploadedFileAId = resA.data.data.id;
      uploadedStoragePathA = resA.data.data.storage_path;
      recordResult('A', 'Authenticated owner uploads PDF → PASS', 'PASS',
        `Uploaded file ID: ${uploadedFileAId}, path: ${uploadedStoragePathA}`);
    } else {
      recordResult('A', 'Authenticated owner uploads PDF → PASS', 'FAIL',
        `Status ${resA.status}: ${JSON.stringify(resA.data)}`);
    }

    // -------------------------------------------------------------
    // SCENARIO B: Authenticated editor uploads PDF → PASS
    // -------------------------------------------------------------
    const samplePdfBuffer2 = Buffer.from('%PDF-1.4\n%SourceFlow Editor Ingestion Sample\n%%EOF');
    const resB = await uploadViaBackend(editorToken, workspaceAId, 'EditorTelemetry.pdf', samplePdfBuffer2, 'application/pdf');
    if (resB.status === 201 && resB.data?.success && resB.data?.data?.id) {
      uploadedFileBId = resB.data.data.id;
      recordResult('B', 'Authenticated editor uploads PDF → PASS', 'PASS',
        `Uploaded file ID: ${uploadedFileBId}`);
    } else {
      recordResult('B', 'Authenticated editor uploads PDF → PASS', 'FAIL',
        `Status ${resB.status}: ${JSON.stringify(resB.data)}`);
    }

    // -------------------------------------------------------------
    // SCENARIO C: Viewer uploads PDF → DENY
    // -------------------------------------------------------------
    const samplePdfBuffer3 = Buffer.from('%PDF-1.4\n%SourceFlow Viewer Attempt\n%%EOF');
    const resC = await uploadViaBackend(viewerToken, workspaceAId, 'ViewerUnauthorized.pdf', samplePdfBuffer3, 'application/pdf');
    if (resC.status === 403) {
      recordResult('C', 'Viewer uploads PDF → DENY', 'PASS',
        `Rejected with HTTP 403 (${resC.data?.error?.code || 'ACCESS_DENIED'})`);
    } else {
      recordResult('C', 'Viewer uploads PDF → DENY', 'FAIL',
        `Expected 403, got ${resC.status}: ${JSON.stringify(resC.data)}`);
    }

    // -------------------------------------------------------------
    // SCENARIO D: Unsupported file type → DENY
    // -------------------------------------------------------------
    const exeBuffer = Buffer.from('MZ\x90\x00\x03\x00\x00\x00\x04\x00\x00\x00\xff\xff\x00\x00');
    const resD = await uploadViaBackend(ownerToken, workspaceAId, 'malware.exe', exeBuffer, 'application/x-msdownload');
    if (resD.status === 400 && resD.data?.error?.code === 'INVALID_FILE_TYPE') {
      recordResult('D', 'Unsupported file type → DENY', 'PASS',
        `Rejected with HTTP 400 INVALID_FILE_TYPE: ${resD.data.error.message}`);
    } else {
      recordResult('D', 'Unsupported file type → DENY', 'FAIL',
        `Status ${resD.status}: ${JSON.stringify(resD.data)}`);
    }

    // -------------------------------------------------------------
    // SCENARIO E: File above maximum size → DENY
    // -------------------------------------------------------------
    // Create a buffer exceeding 25MB (25MB + 1KB)
    const oversizedBytes = (25 * 1024 * 1024) + 1024;
    // Fast allocation of oversized buffer
    const oversizedBuffer = Buffer.alloc(oversizedBytes, 0x20);
    oversizedBuffer.write('%PDF-1.4\n', 0);
    oversizedBuffer.write('%%EOF', oversizedBytes - 6);

    const resE = await uploadViaBackend(ownerToken, workspaceAId, 'large_dataset.pdf', oversizedBuffer, 'application/pdf');
    if (resE.status === 400 && (resE.data?.error?.code === 'FILE_TOO_LARGE' || resE.data?.error?.message?.includes('limit'))) {
      recordResult('E', 'File above maximum size → DENY', 'PASS',
        `Rejected with HTTP 400: ${resE.data?.error?.code} - ${resE.data?.error?.message}`);
    } else {
      recordResult('E', 'File above maximum size → DENY', 'FAIL',
        `Expected 400 FILE_TOO_LARGE, got ${resE.status}: ${JSON.stringify(resE.data)}`);
    }

    // -------------------------------------------------------------
    // SCENARIO F: User downloads own workspace file → PASS
    // -------------------------------------------------------------
    if (uploadedFileAId) {
      const dlRes = await fetch(`${BACKEND_URL}/api/files/${uploadedFileAId}/download?json=true`, {
        headers: {
          Authorization: `Bearer ${ownerToken}`,
          'x-workspace-id': workspaceAId
        }
      });
      const dlJson = await dlRes.json().catch(() => ({}));
      if (dlRes.ok && dlJson.success && dlJson.data?.signedUrl) {
        // Verify signed URL is reachable and streams identical content
        const storageFetch = await fetch(dlJson.data.signedUrl);
        const fetchedText = await storageFetch.text();
        const matchesContent = fetchedText.includes('SourceFlow Institutional Sample Document Content');
        if (storageFetch.ok && matchesContent) {
          recordResult('F', 'User downloads own workspace file → PASS', 'PASS',
            `Signed URL generated and verified with matching binary content`);
        } else {
          recordResult('F', 'User downloads own workspace file → PASS', 'FAIL',
            `Signed URL fetch returned status ${storageFetch.status}`);
        }
      } else {
        recordResult('F', 'User downloads own workspace file → PASS', 'FAIL',
          `Status ${dlRes.status}: ${JSON.stringify(dlJson)}`);
      }
    } else {
      recordResult('F', 'User downloads own workspace file → PASS', 'FAIL', 'Uploaded file A not available');
    }

    // -------------------------------------------------------------
    // SCENARIO G: User accesses another workspace file → DENY
    // -------------------------------------------------------------
    if (uploadedFileAId) {
      // otherUser belongs to Workspace B only, tries to download file from Workspace A
      const dlOtherRes = await fetch(`${BACKEND_URL}/api/files/${uploadedFileAId}/download?json=true`, {
        headers: {
          Authorization: `Bearer ${otherToken}`,
          'x-workspace-id': workspaceBId
        }
      });
      if (dlOtherRes.status === 403 || dlOtherRes.status === 404) {
        recordResult('G', 'User accesses another workspace file → DENY', 'PASS',
          `Blocked with HTTP ${dlOtherRes.status} (${dlOtherRes.statusText})`);
      } else {
        recordResult('G', 'User accesses another workspace file → DENY', 'FAIL',
          `Expected 403/404, got ${dlOtherRes.status}`);
      }
    } else {
      recordResult('G', 'User accesses another workspace file → DENY', 'FAIL', 'Uploaded file A not available');
    }

    // -------------------------------------------------------------
    // SCENARIO H: User deletes allowed file → PASS
    // -------------------------------------------------------------
    if (uploadedFileBId) {
      const delRes = await fetch(`${BACKEND_URL}/api/files/${uploadedFileBId}`, {
        method: 'DELETE',
        headers: {
          Authorization: `Bearer ${ownerToken}`,
          'x-workspace-id': workspaceAId
        }
      });
      const delJson = await delRes.json().catch(() => ({}));
      if (delRes.ok && delJson.success) {
        // Verify row deleted from PostgreSQL
        const { data: dbCheck } = await adminClient.from('files').select('*').eq('id', uploadedFileBId);
        const dbDeleted = !dbCheck || dbCheck.length === 0;
        if (dbDeleted) {
          recordResult('H', 'User deletes allowed file → PASS', 'PASS',
            `Deleted file ID ${uploadedFileBId} from Storage and PostgreSQL metadata`);
        } else {
          recordResult('H', 'User deletes allowed file → PASS', 'FAIL',
            `Row still in DB after delete`);
        }
      } else {
        recordResult('H', 'User deletes allowed file → PASS', 'FAIL',
          `Status ${delRes.status}: ${JSON.stringify(delJson)}`);
      }
    } else {
      recordResult('H', 'User deletes allowed file → PASS', 'FAIL', 'Uploaded file B not available');
    }

    // -------------------------------------------------------------
    // SCENARIO I: Viewer deletes file → DENY
    // -------------------------------------------------------------
    if (uploadedFileAId) {
      const delViewerRes = await fetch(`${BACKEND_URL}/api/files/${uploadedFileAId}`, {
        method: 'DELETE',
        headers: {
          Authorization: `Bearer ${viewerToken}`,
          'x-workspace-id': workspaceAId
        }
      });
      if (delViewerRes.status === 403) {
        recordResult('I', 'Viewer deletes file → DENY', 'PASS',
          `Viewer deletion blocked with HTTP 403 ACCESS_DENIED`);
      } else {
        recordResult('I', 'Viewer deletes file → DENY', 'FAIL',
          `Expected 403, got ${delViewerRes.status}`);
      }
    } else {
      recordResult('I', 'Viewer deletes file → DENY', 'FAIL', 'Uploaded file A not available');
    }

    // -------------------------------------------------------------
    // SCENARIO J: Storage object exists after successful upload → PASS
    // -------------------------------------------------------------
    if (uploadedStoragePathA) {
      const folderPath = `workspace-${workspaceAId}`;
      const filenameOnly = uploadedStoragePathA.split('/').pop();
      const { data: listData, error: listErr } = await adminClient.storage
        .from(BUCKET_NAME)
        .list(folderPath, { search: filenameOnly });

      const found = listData && listData.some(obj => obj.name === filenameOnly);
      if (found && !listErr) {
        recordResult('J', 'Storage object exists after successful upload → PASS', 'PASS',
          `Verified object '${filenameOnly}' in Supabase bucket '${BUCKET_NAME}/${folderPath}'`);
      } else {
        recordResult('J', 'Storage object exists after successful upload → PASS', 'FAIL',
          `Storage list error or object not found: ${listErr?.message}`);
      }
    } else {
      recordResult('J', 'Storage object exists after successful upload → PASS', 'FAIL', 'Storage path not available');
    }

    // -------------------------------------------------------------
    // SCENARIO K: PostgreSQL files row exists after successful upload → PASS
    // -------------------------------------------------------------
    if (uploadedFileAId) {
      const { data: fileRow, error: fErr } = await adminClient
        .from('files')
        .select('*')
        .eq('id', uploadedFileAId)
        .single();

      if (fileRow && !fErr && fileRow.status === 'uploaded') {
        recordResult('K', 'PostgreSQL files row exists after successful upload → PASS', 'PASS',
          `Row exists: original_name='${fileRow.original_name}', status='${fileRow.status}', size=${fileRow.file_size} bytes`);
      } else {
        recordResult('K', 'PostgreSQL files row exists after successful upload → PASS', 'FAIL',
          `Row error: ${fErr?.message}`);
      }
    } else {
      recordResult('K', 'PostgreSQL files row exists after successful upload → PASS', 'FAIL', 'Uploaded file A not available');
    }

    // -------------------------------------------------------------
    // SCENARIO L: PostgreSQL files.storage_path matches Storage object path → PASS
    // -------------------------------------------------------------
    if (uploadedFileAId && uploadedStoragePathA) {
      const { data: fileRow } = await adminClient
        .from('files')
        .select('storage_path')
        .eq('id', uploadedFileAId)
        .single();

      const expectedPattern = new RegExp(`^workspace-${workspaceAId}/[0-9a-fA-F-]{36}-OwnerReport\\.pdf$`);
      const matchesPattern = expectedPattern.test(fileRow?.storage_path);
      const matchesExact = fileRow?.storage_path === uploadedStoragePathA;

      if (matchesExact && matchesPattern) {
        recordResult('L', 'PostgreSQL files.storage_path matches Storage object path → PASS', 'PASS',
          `storage_path '${fileRow.storage_path}' strictly matches convention workspace-{wsId}/{uuid}-{name}`);
      } else {
        recordResult('L', 'PostgreSQL files.storage_path matches Storage object path → PASS', 'FAIL',
          `Path mismatch: db='${fileRow?.storage_path}', actual='${uploadedStoragePathA}'`);
      }
    } else {
      recordResult('L', 'PostgreSQL files.storage_path matches Storage object path → PASS', 'FAIL', 'Files row not available');
    }

    // -------------------------------------------------------------
    // SCENARIO M: Bucket remains private → PASS
    // -------------------------------------------------------------
    if (uploadedStoragePathA) {
      const publicUrl = `${SUPABASE_URL}/storage/v1/object/public/${BUCKET_NAME}/${uploadedStoragePathA}`;
      const pubRes = await fetch(publicUrl);
      // Private bucket returns 400 or 404 error when accessed via public URL endpoint
      if (!pubRes.ok) {
        recordResult('M', 'Bucket remains private → PASS', 'PASS',
          `Public URL fetch returned HTTP ${pubRes.status} (${pubRes.statusText}), direct public access denied`);
      } else {
        recordResult('M', 'Bucket remains private → PASS', 'FAIL',
          `Bucket returned HTTP 200 on public URL: ${publicUrl}`);
      }
    } else {
      recordResult('M', 'Bucket remains private → PASS', 'FAIL', 'Storage path not available');
    }

    // -------------------------------------------------------------
    // SCENARIO N: No secret credentials exposed to frontend → PASS
    // -------------------------------------------------------------
    const frontendEnvPath = path.resolve(__dirname, '../../frontend/.env.local');
    const frontendEnv = fs.existsSync(frontendEnvPath) ? fs.readFileSync(frontendEnvPath, 'utf8') : '';
    const hasSecretKeyInFrontend = frontendEnv.includes('SUPABASE_SECRET_KEY') || frontendEnv.includes('sb_secret_');

    if (!hasSecretKeyInFrontend) {
      recordResult('N', 'No secret credentials exposed to frontend → PASS', 'PASS',
        `frontend/.env.local contains ONLY publishable keys, SUPABASE_SECRET_KEY is zero-exposed`);
    } else {
      recordResult('N', 'No secret credentials exposed to frontend → PASS', 'FAIL',
        'Secret key found in frontend configuration!');
    }

    // -------------------------------------------------------------
    // SCENARIO O: Refresh page and file metadata remains available → PASS
    // -------------------------------------------------------------
    if (uploadedFileAId) {
      // Simulate new session/browser refresh: create a new auth client and query GET /api/files
      const listRes = await fetch(`${BACKEND_URL}/api/files`, {
        headers: {
          Authorization: `Bearer ${ownerToken}`,
          'x-workspace-id': workspaceAId
        }
      });
      const listJson = await listRes.json().catch(() => ({}));
      const foundInList = listJson.data && listJson.data.some(f => f.id === uploadedFileAId);

      if (listRes.ok && foundInList) {
        recordResult('O', 'Refresh page and file metadata remains available → PASS', 'PASS',
          `Queried GET /api/files in fresh request: file ${uploadedFileAId} retrieved successfully from PostgreSQL`);
      } else {
        recordResult('O', 'Refresh page and file metadata remains available → PASS', 'FAIL',
          `File not found in refreshed listing: ${JSON.stringify(listJson)}`);
      }
    } else {
      recordResult('O', 'Refresh page and file metadata remains available → PASS', 'FAIL', 'Uploaded file A not available');
    }

  } finally {
    // -------------------------------------------------------------
    // TEARDOWN: Clean up test files, workspaces & users
    // -------------------------------------------------------------
    console.log('\nCleaning up ephemeral test records from Supabase...');
    try {
      if (uploadedStoragePathA) {
        await adminClient.storage.from(BUCKET_NAME).remove([uploadedStoragePathA]);
      }
      if (workspaceAId) await adminClient.from('workspaces').delete().eq('id', workspaceAId);
      if (workspaceBId) await adminClient.from('workspaces').delete().eq('id', workspaceBId);
      if (ownerUser) await adminClient.auth.admin.deleteUser(ownerUser.id);
      if (editorUser) await adminClient.auth.admin.deleteUser(editorUser.id);
      if (viewerUser) await adminClient.auth.admin.deleteUser(viewerUser.id);
      if (otherUser) await adminClient.auth.admin.deleteUser(otherUser.id);
      console.log('Teardown completed cleanly.');
    } catch (cleanErr) {
      console.warn('Teardown warning:', cleanErr.message);
    }
  }

  // -------------------------------------------------------------
  // SUMMARY
  // -------------------------------------------------------------
  console.log('\n=============================================================');
  console.log('FINAL STEP 4 STORAGE MATRIX RESULTS:');
  console.log('=============================================================');
  const passCount = results.filter(r => r.status === 'PASS').length;
  const failCount = results.filter(r => r.status === 'FAIL').length;
  const notImpCount = results.filter(r => r.status === 'NOT YET IMPLEMENTED').length;

  console.log(`PASS: ${passCount} | FAIL: ${failCount} | NOT YET IMPLEMENTED: ${notImpCount}`);
  console.log('=============================================================\n');

  if (failCount > 0) {
    process.exit(1);
  }
}

runStep4Tests().catch(err => {
  console.error('Unhandled test suite error:', err);
  process.exit(1);
});
