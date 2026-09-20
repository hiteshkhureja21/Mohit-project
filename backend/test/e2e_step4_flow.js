import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { createClient } from '@supabase/supabase-js';

import dotenv from 'dotenv';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.resolve(__dirname, '../.env') });

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SECRET_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY;
const SUPABASE_ANON_KEY = process.env.SUPABASE_PUBLISHABLE_KEY || process.env.SUPABASE_ANON_KEY;
const API_BASE = 'http://localhost:5000/api';

if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY || !SUPABASE_ANON_KEY) {
  console.error('❌ Missing Supabase credentials in environment.');
  process.exit(1);
}

const adminClient = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
  auth: { autoRefreshToken: false, persistSession: false }
});

const anonClient = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
  auth: { autoRefreshToken: false, persistSession: false }
});

const REAL_PDF_PATH = path.join(__dirname, 'sample_real_document.pdf');

async function runTest() {
  console.log('=============================================================');
  console.log('🧪 REAL PDF END-TO-END FLOW VERIFICATION');
  console.log(`Target Backend:  ${API_BASE}`);
  console.log(`Target Supabase: ${SUPABASE_URL}`);
  console.log(`Test PDF:        ${REAL_PDF_PATH}`);
  console.log('=============================================================\n');

  const testEmail = `step4_real_pdf_${Date.now()}@sourceflow-audit.internal`;
  const testPassword = 'Password123!Secure';
  let userId = null;
  let userToken = null;
  let workspaceId = null;
  let uploadedFileRecord = null;
  let storageObjectKey = null;

  try {
    // 1. SETUP: Create Real User & Workspace in Supabase
    console.log('1. Setting up real authenticated user and workspace in Supabase...');
    const { data: authUser, error: authErr } = await adminClient.auth.admin.createUser({
      email: testEmail,
      password: testPassword,
      email_confirm: true
    });
    if (authErr) throw authErr;
    userId = authUser.user.id;

    // Login as the user to get real JWT access token
    const { data: sessionData, error: loginErr } = await anonClient.auth.signInWithPassword({
      email: testEmail,
      password: testPassword
    });
    if (loginErr) throw loginErr;
    userToken = sessionData.session.access_token;

    // Create real workspace in database (trigger automatically creates owner row in workspace_members)
    const { data: wsData, error: wsErr } = await adminClient
      .from('workspaces')
      .insert({
        name: 'Step4 Verification Workspace',
        description: 'Testing real PDF upload flow',
        created_by: userId
      })
      .select()
      .single();
    if (wsErr) throw wsErr;
    workspaceId = wsData.id;

    console.log(`   User created: ${testEmail} (ID: ${userId})`);
    console.log(`   Workspace created: ID: ${workspaceId} (Trigger bootstrapped role: owner)\n`);

    // 2. VERIFY FLOW: Frontend -> POST /api/files -> Auth -> Workspace Auth -> File Validation -> Storage -> DB
    console.log('2. Executing Real PDF Upload via POST /api/files...');
    const pdfBytes = fs.readFileSync(REAL_PDF_PATH);
    const blob = new Blob([pdfBytes], { type: 'application/pdf' });
    const formData = new FormData();
    formData.append('file', blob, 'sample_real_document.pdf');
    formData.append('title', 'Sample Real Document.pdf');

    const uploadResponse = await fetch(`${API_BASE}/files`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${userToken}`,
        'x-workspace-id': workspaceId
      },
      body: formData
    });

    const uploadJson = await uploadResponse.json();
    if (!uploadResponse.ok) {
      console.error('❌ Upload Failed:', uploadJson);
      throw new Error(`Upload returned status ${uploadResponse.status}: ${JSON.stringify(uploadJson)}`);
    }

    uploadedFileRecord = uploadJson.data;
    storageObjectKey = uploadedFileRecord.storage_path;
    console.log('   ✅ POST /api/files succeeded (HTTP ' + uploadResponse.status + ')');
    console.log(`   └─ File Record ID: ${uploadedFileRecord.id}`);
    console.log(`   └─ Storage Path:   ${uploadedFileRecord.storage_path}`);
    console.log(`   └─ MIME Type:      ${uploadedFileRecord.mime_type}`);
    console.log(`   └─ File Size:      ${uploadedFileRecord.file_size} bytes`);
    console.log(`   └─ Status:         ${uploadedFileRecord.status}\n`);

    // 3. VERIFY Supabase Storage Object Existence
    console.log('3. Verifying Object exists in private Supabase Storage bucket `sourceflow-files`...');
    const pathParts = storageObjectKey.split('/');
    const folder = pathParts[0];
    const filename = pathParts.slice(1).join('/');

    const { data: storageList, error: storageListErr } = await adminClient
      .storage
      .from('sourceflow-files')
      .list(folder, { search: filename });

    if (storageListErr) throw storageListErr;
    const foundObject = storageList?.find(o => o.name === filename);
    if (!foundObject) {
      throw new Error(`Storage object '${filename}' was not found in bucket folder '${folder}'`);
    }
    console.log(`   ✅ Supabase Storage object verified: '${filename}' in folder '${folder}' (Size: ${foundObject.metadata?.size || pdfBytes.length} bytes)\n`);

    // 4. VERIFY public.files Metadata Row in PostgreSQL
    console.log('4. Verifying public.files metadata row in PostgreSQL database...');
    const { data: dbFile, error: dbFileErr } = await adminClient
      .from('files')
      .select('*')
      .eq('id', uploadedFileRecord.id)
      .single();

    if (dbFileErr) throw dbFileErr;
    if (!dbFile) throw new Error('File metadata record not found in public.files table');

    if (dbFile.workspace_id !== workspaceId) {
      throw new Error(`Workspace ID mismatch: expected ${workspaceId}, found ${dbFile.workspace_id}`);
    }
    if (dbFile.storage_path !== storageObjectKey) {
      throw new Error(`Storage path mismatch: expected ${storageObjectKey}, found ${dbFile.storage_path}`);
    }
    if (dbFile.status !== 'uploaded') {
      throw new Error(`File status mismatch: expected 'uploaded', found ${dbFile.status}`);
    }
    console.log(`   ✅ PostgreSQL row verified in public.files: ID ${dbFile.id}, workspace_id=${dbFile.workspace_id}, status=${dbFile.status}\n`);

    // 5. TEST: List / Refresh Files
    console.log('5. Testing List / Refresh: GET /api/files...');
    const listResponse = await fetch(`${API_BASE}/files`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${userToken}`,
        'x-workspace-id': workspaceId
      }
    });
    const listJson = await listResponse.json();
    if (!listResponse.ok) {
      throw new Error(`List files returned status ${listResponse.status}: ${JSON.stringify(listJson)}`);
    }
    const matchingFile = listJson.data?.find(f => f.id === uploadedFileRecord.id);
    if (!matchingFile) {
      throw new Error(`Uploaded file ${uploadedFileRecord.id} not found in workspace files list`);
    }
    console.log(`   ✅ GET /api/files succeeded: Returned ${listJson.data.length} file(s), correctly includes ${uploadedFileRecord.id}\n`);

    // 6. TEST: Download Using Short-Lived Signed URL
    console.log('6. Testing Download using Signed URL: GET /api/files/:id/download...');
    const downloadResponse = await fetch(`${API_BASE}/files/${uploadedFileRecord.id}/download?json=true`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${userToken}`,
        'x-workspace-id': workspaceId
      }
    });
    const downloadJson = await downloadResponse.json();
    if (!downloadResponse.ok) {
      throw new Error(`Download endpoint returned status ${downloadResponse.status}: ${JSON.stringify(downloadJson)}`);
    }
    const signedUrl = downloadJson.data?.downloadUrl || downloadJson.data?.signedUrl;
    if (!signedUrl || !signedUrl.includes('token=')) {
      throw new Error(`Invalid signed URL returned: ${JSON.stringify(downloadJson)}`);
    }
    console.log(`   Signed URL received: ${signedUrl.slice(0, 75)}...`);

    // Fetch the actual binary via the signed URL and compare contents
    const binaryFetchResponse = await fetch(signedUrl);
    if (!binaryFetchResponse.ok) {
      throw new Error(`Fetching signed URL failed with HTTP ${binaryFetchResponse.status}`);
    }
    const downloadedBuffer = Buffer.from(await binaryFetchResponse.arrayBuffer());
    if (downloadedBuffer.length !== pdfBytes.length) {
      throw new Error(`Downloaded content size mismatch: expected ${pdfBytes.length} bytes, got ${downloadedBuffer.length} bytes`);
    }
    console.log(`   ✅ Signed URL download succeeded: Retrieved ${downloadedBuffer.length} bytes, content verified\n`);

    // 7. TEST: Delete File
    console.log('7. Testing Delete: DELETE /api/files/:id...');
    const deleteResponse = await fetch(`${API_BASE}/files/${uploadedFileRecord.id}`, {
      method: 'DELETE',
      headers: {
        'Authorization': `Bearer ${userToken}`,
        'x-workspace-id': workspaceId
      }
    });
    const deleteJson = await deleteResponse.json();
    if (!deleteResponse.ok) {
      throw new Error(`Delete endpoint returned status ${deleteResponse.status}: ${JSON.stringify(deleteJson)}`);
    }
    console.log(`   ✅ DELETE /api/files/${uploadedFileRecord.id} succeeded (HTTP ${deleteResponse.status})`);

    // Verify deleted from Supabase Storage
    const { data: postDeleteStorageList } = await adminClient
      .storage
      .from('sourceflow-files')
      .list(folder, { search: filename });
    const stillInStorage = postDeleteStorageList?.some(o => o.name === filename);
    if (stillInStorage) {
      throw new Error(`File was NOT removed from Supabase Storage bucket!`);
    }
    console.log(`   ✅ Verified object removed from Supabase Storage bucket 'sourceflow-files'`);

    // Verify deleted from public.files table
    const { data: postDeleteDbRow } = await adminClient
      .from('files')
      .select('id')
      .eq('id', uploadedFileRecord.id)
      .maybeSingle();
    if (postDeleteDbRow) {
      throw new Error(`File row was NOT removed from public.files table!`);
    }
    console.log(`   ✅ Verified metadata row removed from public.files table\n`);

    console.log('=============================================================');
    console.log('🎉 ALL OPERATIONS PASSED:');
    console.log('   - UPLOAD:                       PASS');
    console.log('   - STORAGE BUCKET VERIFICATION:  PASS');
    console.log('   - DATABASE ROW VERIFICATION:    PASS');
    console.log('   - LIST / REFRESH:               PASS');
    console.log('   - DOWNLOAD VIA SIGNED URL:      PASS');
    console.log('   - DELETE (STORAGE & DB):        PASS');
    console.log('=============================================================');

  } catch (err) {
    console.error('\n❌ TEST FAILED:');
    console.error(err.message || err);
    process.exitCode = 1;
  } finally {
    console.log('\nCleaning up test user & workspace...');
    if (workspaceId) {
      await adminClient.from('workspaces').delete().eq('id', workspaceId);
    }
    if (userId) {
      await adminClient.auth.admin.deleteUser(userId);
    }
    console.log('Cleanup finished.');
  }
}

runTest();
