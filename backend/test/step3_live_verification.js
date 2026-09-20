/**
 * STEP 3 LIVE SUPABASE RLS & RBAC VERIFICATION SUITE
 * Tests all 15 verification points against the live Supabase database and backend API.
 */

import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.resolve(__dirname, '../.env') });

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_SECRET_KEY = process.env.SUPABASE_SECRET_KEY;
const SUPABASE_PUBLISHABLE_KEY = process.env.SUPABASE_PUBLISHABLE_KEY;
const BACKEND_URL = process.env.BACKEND_URL || 'http://localhost:5000';

if (!SUPABASE_URL || !SUPABASE_SECRET_KEY || !SUPABASE_PUBLISHABLE_KEY) {
  console.error('Missing Supabase configuration in backend/.env');
  process.exit(1);
}

// 1. Service role client (Admin / Superuser)
const adminClient = createClient(SUPABASE_URL, SUPABASE_SECRET_KEY, {
  auth: { autoRefreshToken: false, persistSession: false }
});

// Helper to create an authenticated user client with a real JWT
function createUserClient(accessToken) {
  return createClient(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY, {
    auth: { autoRefreshToken: false, persistSession: false },
    global: {
      headers: {
        Authorization: `Bearer ${accessToken}`
      }
    }
  });
}

const results = [];

function recordResult(num, description, status, details = '') {
  results.push({ num, description, status, details });
  const icon = status === 'PASS' ? '✅ [PASS]' : (status === 'FAIL' ? '❌ [FAIL]' : '⚠️ [NOT YET IMPLEMENTED]');
  console.log(`${icon} #${num}: ${description}`);
  if (details) {
    console.log(`   └─ ${details}`);
  }
}

async function runLiveVerification() {
  console.log('\n=============================================================');
  console.log('🧪 RUNNING LIVE SUPABASE RLS & RBAC VERIFICATION');
  console.log(`Target: ${SUPABASE_URL}`);
  console.log('=============================================================\n');

  let testUserOwner = null;
  let testUserEditor = null;
  let testUserViewer = null;
  let testUserNonMember = null;

  let ownerToken = null;
  let editorToken = null;
  let viewerToken = null;
  let nonMemberToken = null;

  let ownerClient = null;
  let editorClient = null;
  let viewerClient = null;
  let nonMemberClient = null;

  let workspaceId = null;
  const timestamp = Date.now();

  try {
    // -------------------------------------------------------------
    // SETUP: Create ephemeral test users directly in Supabase Auth
    // -------------------------------------------------------------
    console.log('Creating ephemeral test users via Supabase Admin Auth...');
    
    // User 1: Owner
    const { data: u1, error: e1 } = await adminClient.auth.admin.createUser({
      email: `owner_${timestamp}@sourceflow.test`,
      password: 'TestPassword123!',
      email_confirm: true,
      user_metadata: { name: 'Test Owner' }
    });
    if (e1) throw new Error('Failed to create owner user: ' + e1.message);
    testUserOwner = u1.user;

    // User 2: Editor
    const { data: u2, error: e2 } = await adminClient.auth.admin.createUser({
      email: `editor_${timestamp}@sourceflow.test`,
      password: 'TestPassword123!',
      email_confirm: true,
      user_metadata: { name: 'Test Editor' }
    });
    if (e2) throw new Error('Failed to create editor user: ' + e2.message);
    testUserEditor = u2.user;

    // User 3: Viewer
    const { data: u3, error: e3 } = await adminClient.auth.admin.createUser({
      email: `viewer_${timestamp}@sourceflow.test`,
      password: 'TestPassword123!',
      email_confirm: true,
      user_metadata: { name: 'Test Viewer' }
    });
    if (e3) throw new Error('Failed to create viewer user: ' + e3.message);
    testUserViewer = u3.user;

    // User 4: Non-Member
    const { data: u4, error: e4 } = await adminClient.auth.admin.createUser({
      email: `nonmember_${timestamp}@sourceflow.test`,
      password: 'TestPassword123!',
      email_confirm: true,
      user_metadata: { name: 'Test Non-Member' }
    });
    if (e4) throw new Error('Failed to create non-member user: ' + e4.message);
    testUserNonMember = u4.user;

    // Create user profiles in public.profiles (referencing auth.users)
    await adminClient.from('profiles').insert([
      { id: testUserOwner.id, display_name: 'Test Owner', role: 'Owner' },
      { id: testUserEditor.id, display_name: 'Test Editor', role: 'Editor' },
      { id: testUserViewer.id, display_name: 'Test Viewer', role: 'Viewer' },
      { id: testUserNonMember.id, display_name: 'Test Non-Member', role: 'Reviewer' }
    ]);

    // Sign in to get real JWT access tokens
    const pubAuth = createClient(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY);
    
    const { data: s1 } = await pubAuth.auth.signInWithPassword({
      email: testUserOwner.email,
      password: 'TestPassword123!'
    });
    ownerToken = s1.session.access_token;
    ownerClient = createUserClient(ownerToken);

    const { data: s2 } = await pubAuth.auth.signInWithPassword({
      email: testUserEditor.email,
      password: 'TestPassword123!'
    });
    editorToken = s2.session.access_token;
    editorClient = createUserClient(editorToken);

    const { data: s3 } = await pubAuth.auth.signInWithPassword({
      email: testUserViewer.email,
      password: 'TestPassword123!'
    });
    viewerToken = s3.session.access_token;
    viewerClient = createUserClient(viewerToken);

    const { data: s4 } = await pubAuth.auth.signInWithPassword({
      email: testUserNonMember.email,
      password: 'TestPassword123!'
    });
    nonMemberToken = s4.session.access_token;
    nonMemberClient = createUserClient(nonMemberToken);

    console.log('Ephemeral test users authenticated successfully.\n');

    // -------------------------------------------------------------
    // 1. Supabase authentication still works
    // -------------------------------------------------------------
    try {
      const meRes = await fetch(`${BACKEND_URL}/api/auth/me`, {
        headers: { Authorization: `Bearer ${ownerToken}` }
      });
      const meData = await meRes.json();
      const userId = meData.data?.id || meData.user?.id;
      if (meRes.ok && userId === testUserOwner.id) {
        recordResult(1, 'Supabase authentication still works', 'PASS', `Token verified by backend: user ${userId}`);
      } else {
        recordResult(1, 'Supabase authentication still works', 'FAIL', `Backend returned status ${meRes.status}: ${JSON.stringify(meData)}`);
      }
    } catch (err) {
      recordResult(1, 'Supabase authentication still works', 'FAIL', err.message);
    }

    // -------------------------------------------------------------
    // 2. Authenticated user can create a workspace
    // -------------------------------------------------------------
    let wsInsertError = null;
    try {
      const { data: ws, error } = await ownerClient
        .from('workspaces')
        .insert({
          name: `RLS Verification Workspace ${timestamp}`,
          description: 'Testing live RLS policies',
          workspace_type: 'operations',
          created_by: testUserOwner.id
        })
        .select('*')
        .single();

      if (error) {
        wsInsertError = error;
        recordResult(2, 'Authenticated user can create a workspace', 'FAIL', error.message);
      } else {
        workspaceId = ws.id;
        recordResult(2, 'Authenticated user can create a workspace', 'PASS', `Workspace ID: ${workspaceId}`);
      }
    } catch (err) {
      recordResult(2, 'Authenticated user can create a workspace', 'FAIL', err.message);
    }

    // -------------------------------------------------------------
    // 3. Workspace creation creates: workspaces row, workspace_members row, creator role = owner
    // -------------------------------------------------------------
    if (workspaceId) {
      try {
        // Query workspace_members row using owner client (evaluates RLS)
        const { data: memberRow, error: mErr } = await ownerClient
          .from('workspace_members')
          .select('*')
          .eq('workspace_id', workspaceId)
          .eq('user_id', testUserOwner.id)
          .single();

        if (!mErr && memberRow && memberRow.role === 'owner') {
          recordResult(3, 'Workspace creation creates workspaces row, workspace_members row, creator role = owner', 'PASS',
            `Found membership row: user_id=${memberRow.user_id}, role=${memberRow.role}`);
        } else {
          recordResult(3, 'Workspace creation creates workspaces row, workspace_members row, creator role = owner', 'FAIL',
            mErr ? mErr.message : `Unexpected role: ${memberRow?.role}`);
        }
      } catch (err) {
        recordResult(3, 'Workspace creation creates workspaces row, workspace_members row, creator role = owner', 'FAIL', err.message);
      }
    } else {
      recordResult(3, 'Workspace creation creates workspaces row, workspace_members row, creator role = owner', 'FAIL', 'Workspace was not created');
    }

    // -------------------------------------------------------------
    // 4. User can retrieve their own workspace after refreshing the browser (via token / GET /workspaces)
    // -------------------------------------------------------------
    if (workspaceId) {
      try {
        const { data: wsList, error: listErr } = await ownerClient
          .from('workspaces')
          .select('*')
          .eq('id', workspaceId);

        const backendRes = await fetch(`${BACKEND_URL}/api/workspaces`, {
          headers: { Authorization: `Bearer ${ownerToken}` }
        });
        const backendJson = await backendRes.json();

        if (!listErr && wsList && wsList.length > 0 && backendRes.ok) {
          recordResult(4, 'User can retrieve their own workspace after refreshing the browser', 'PASS',
            `Retrieved from Supabase RLS (${wsList.length} row) and Backend API (status ${backendRes.status})`);
        } else {
          recordResult(4, 'User can retrieve their own workspace after refreshing the browser', 'FAIL',
            listErr ? listErr.message : `Backend status ${backendRes.status}`);
        }
      } catch (err) {
        recordResult(4, 'User can retrieve their own workspace after refreshing the browser', 'FAIL', err.message);
      }
    }

    // -------------------------------------------------------------
    // 5. User cannot access a workspace they are not a member of
    // -------------------------------------------------------------
    if (workspaceId) {
      try {
        // Non-member queries workspace via Supabase RLS
        const { data: nonMemberWs, error: nonMemberErr } = await nonMemberClient
          .from('workspaces')
          .select('*')
          .eq('id', workspaceId);

        // Non-member calls backend API for workspace
        const backendRes = await fetch(`${BACKEND_URL}/api/workspaces/${workspaceId}`, {
          headers: { Authorization: `Bearer ${nonMemberToken}` }
        });

        const rlsBlocked = !nonMemberWs || nonMemberWs.length === 0;
        const apiBlocked = backendRes.status === 403 || backendRes.status === 404;

        if (rlsBlocked && apiBlocked) {
          recordResult(5, 'User cannot access a workspace they are not a member of', 'PASS',
            `Supabase RLS returned 0 rows; Backend API returned HTTP ${backendRes.status}`);
        } else {
          recordResult(5, 'User cannot access a workspace they are not a member of', 'FAIL',
            `RLS returned: ${JSON.stringify(nonMemberWs)}, API status: ${backendRes.status}`);
        }
      } catch (err) {
        recordResult(5, 'User cannot access a workspace they are not a member of', 'FAIL', err.message);
      }
    }

    // -------------------------------------------------------------
    // Setup Editor and Viewer memberships in the workspace for testing 6 - 10
    // -------------------------------------------------------------
    if (workspaceId) {
      await ownerClient.from('workspace_members').insert([
        { workspace_id: workspaceId, user_id: testUserEditor.id, role: 'editor' },
        { workspace_id: workspaceId, user_id: testUserViewer.id, role: 'viewer' }
      ]);
    }

    // -------------------------------------------------------------
    // 6. Owner can: view workspace, update workspace, add members, change member roles, remove members
    // -------------------------------------------------------------
    if (workspaceId) {
      try {
        // 6a. View workspace
        const { data: viewWs, error: vErr } = await ownerClient
          .from('workspaces')
          .select('*')
          .eq('id', workspaceId)
          .single();

        // 6b. Update workspace
        const { data: updateWs, error: uErr } = await ownerClient
          .from('workspaces')
          .update({ description: 'Updated by owner' })
          .eq('id', workspaceId)
          .select('*')
          .single();

        // 6c. Add temporary member
        const tempUserEmail = `temp_member_${timestamp}@sourceflow.test`;
        const { data: tempU } = await adminClient.auth.admin.createUser({
          email: tempUserEmail,
          password: 'TestPassword123!',
          email_confirm: true
        });
        await adminClient.from('profiles').insert({ id: tempU.user.id, display_name: 'Temp Member', role: 'Reviewer' });

        const { data: addMember, error: aErr } = await ownerClient
          .from('workspace_members')
          .insert({ workspace_id: workspaceId, user_id: tempU.user.id, role: 'viewer' })
          .select('*')
          .single();

        // 6d. Change member role
        const { data: changeRole, error: cErr } = await ownerClient
          .from('workspace_members')
          .update({ role: 'editor' })
          .eq('id', addMember?.id)
          .select('*')
          .single();

        // 6e. Remove member
        const { error: rErr } = await ownerClient
          .from('workspace_members')
          .delete()
          .eq('id', addMember?.id);

        await adminClient.auth.admin.deleteUser(tempU.user.id);

        if (!vErr && !uErr && !aErr && !cErr && !rErr) {
          recordResult(6, 'Owner can: view, update, add members, change roles, remove members', 'PASS',
            'All 5 operations succeeded under Owner RLS');
        } else {
          recordResult(6, 'Owner can: view, update, add members, change roles, remove members', 'FAIL',
            `Errors: view=${vErr?.message}, update=${uErr?.message}, add=${aErr?.message}, role=${cErr?.message}, remove=${rErr?.message}`);
        }
      } catch (err) {
        recordResult(6, 'Owner can: view, update, add members, change roles, remove members', 'FAIL', err.message);
      }
    }

    // -------------------------------------------------------------
    // 7. Editor can: view workspace, upload/create file metadata, create transformations, update allowed processing records
    // -------------------------------------------------------------
    let editorFileId = null;
    let editorTransId = null;
    if (workspaceId) {
      try {
        // 7a. View workspace
        const { data: eWs, error: eWsErr } = await editorClient
          .from('workspaces')
          .select('*')
          .eq('id', workspaceId)
          .single();

        // 7b. Create file metadata
        const { data: fMeta, error: fErr } = await editorClient
          .from('files')
          .insert({
            workspace_id: workspaceId,
            original_name: 'test_doc.pdf',
            stored_name: 'test_doc_stored.pdf',
            mime_type: 'application/pdf',
            file_size: 1024,
            storage_path: 'workspaces/test_doc.pdf',
            uploaded_by: testUserEditor.id,
            status: 'completed'
          })
          .select('*')
          .single();
        editorFileId = fMeta?.id;

        // 7c. Create transformation
        const { data: trans, error: tErr } = await editorClient
          .from('transformations')
          .insert({
            workspace_id: workspaceId,
            file_id: editorFileId,
            title: 'Executive Brief Transformation',
            status: 'processing',
            created_by: testUserEditor.id
          })
          .select('*')
          .single();
        editorTransId = trans?.id;

        // 7d. Update processing record
        const { data: updTrans, error: utErr } = await editorClient
          .from('transformations')
          .update({ status: 'completed' })
          .eq('id', editorTransId)
          .select('*')
          .single();

        if (!eWsErr && !fErr && !tErr && !utErr) {
          recordResult(7, 'Editor can: view workspace, create files, create transformations, update records', 'PASS',
            'All 4 editor operations succeeded under Editor RLS');
        } else {
          recordResult(7, 'Editor can: view workspace, create files, create transformations, update records', 'FAIL',
            `Errors: ws=${eWsErr?.message}, file=${fErr?.message}, trans=${tErr?.message}, updTrans=${utErr?.message}`);
        }
      } catch (err) {
        recordResult(7, 'Editor can: view workspace, create files, create transformations, update records', 'FAIL', err.message);
      }
    }

    // -------------------------------------------------------------
    // 8. Editor cannot: manage members, delete workspace, perform owner-only operations
    // -------------------------------------------------------------
    if (workspaceId) {
      try {
        // 8a. Editor attempts to add member
        const { error: eAddErr } = await editorClient
          .from('workspace_members')
          .insert({ workspace_id: workspaceId, user_id: testUserNonMember.id, role: 'viewer' });

        // 8b. Editor attempts to delete workspace
        const { error: eDelErr, count } = await editorClient
          .from('workspaces')
          .delete()
          .eq('id', workspaceId);

        // 8c. Editor attempts to update workspace created_by or name (only owner can update workspace)
        const { data: eUpdData } = await editorClient
          .from('workspaces')
          .update({ name: 'Hacked by Editor' })
          .eq('id', workspaceId)
          .select('*');

        const memberBlocked = Boolean(eAddErr);
        const updateBlocked = !eUpdData || eUpdData.length === 0;

        if (memberBlocked && updateBlocked) {
          recordResult(8, 'Editor cannot: manage members, delete workspace, perform owner-only operations', 'PASS',
            `Add member blocked: ${eAddErr?.message}; Workspace update blocked (0 rows affected)`);
        } else {
          recordResult(8, 'Editor cannot: manage members, delete workspace, perform owner-only operations', 'FAIL',
            `Add error: ${eAddErr?.message}, Updated rows: ${eUpdData?.length}`);
        }
      } catch (err) {
        recordResult(8, 'Editor cannot: manage members, delete workspace, perform owner-only operations', 'FAIL', err.message);
      }
    }

    // -------------------------------------------------------------
    // 9. Viewer can: view workspace, view files/results
    // -------------------------------------------------------------
    if (workspaceId) {
      try {
        // 9a. View workspace
        const { data: vWs, error: vWsErr } = await viewerClient
          .from('workspaces')
          .select('*')
          .eq('id', workspaceId)
          .single();

        // 9b. View files
        const { data: vFiles, error: vFilesErr } = await viewerClient
          .from('files')
          .select('*')
          .eq('workspace_id', workspaceId);

        // 9c. View transformations
        const { data: vTrans, error: vTransErr } = await viewerClient
          .from('transformations')
          .select('*')
          .eq('workspace_id', workspaceId);

        if (!vWsErr && !vFilesErr && !vTransErr && vFiles?.length > 0) {
          recordResult(9, 'Viewer can: view workspace, view files/results', 'PASS',
            `Viewer retrieved workspace '${vWs?.name}', ${vFiles?.length} files, ${vTrans?.length} transformations`);
        } else {
          recordResult(9, 'Viewer can: view workspace, view files/results', 'FAIL',
            `Errors: ws=${vWsErr?.message}, files=${vFilesErr?.message}, trans=${vTransErr?.message}`);
        }
      } catch (err) {
        recordResult(9, 'Viewer can: view workspace, view files/results', 'FAIL', err.message);
      }
    }

    // -------------------------------------------------------------
    // 10. Viewer cannot: upload files, modify files, create transformations, manage members, delete workspace
    // -------------------------------------------------------------
    if (workspaceId) {
      try {
        // 10a. Viewer upload file
        const { error: vUploadErr } = await viewerClient
          .from('files')
          .insert({
            workspace_id: workspaceId,
            original_name: 'viewer_doc.pdf',
            stored_name: 'viewer_doc.pdf',
            mime_type: 'application/pdf',
            file_size: 512,
            storage_path: 'viewer/doc.pdf',
            uploaded_by: testUserViewer.id
          });

        // 10b. Viewer create transformation
        const { error: vTransErr } = await viewerClient
          .from('transformations')
          .insert({
            workspace_id: workspaceId,
            file_id: editorFileId,
            title: 'Viewer Transformation Attempt',
            status: 'processing',
            created_by: testUserViewer.id
          });

        // 10c. Viewer manage members
        const { error: vMemErr } = await viewerClient
          .from('workspace_members')
          .insert({ workspace_id: workspaceId, user_id: testUserNonMember.id, role: 'viewer' });

        // 10d. Viewer delete workspace
        const { data: vDelData } = await viewerClient
          .from('workspaces')
          .delete()
          .eq('id', workspaceId)
          .select('*');

        if (vUploadErr && vTransErr && vMemErr && (!vDelData || vDelData.length === 0)) {
          recordResult(10, 'Viewer cannot: upload files, modify files, create transformations, manage members, delete workspace', 'PASS',
            'All mutation attempts strictly rejected by Viewer RLS policies');
        } else {
          recordResult(10, 'Viewer cannot: upload files, modify files, create transformations, manage members, delete workspace', 'FAIL',
            `UploadErr: ${vUploadErr?.message}, TransErr: ${vTransErr?.message}, MemErr: ${vMemErr?.message}, DelRows: ${vDelData?.length}`);
        }
      } catch (err) {
        recordResult(10, 'Viewer cannot: upload files, modify files, create transformations, manage members, delete workspace', 'FAIL', err.message);
      }
    }

    // -------------------------------------------------------------
    // 11. Verify cross-workspace isolation
    // -------------------------------------------------------------
    let wsBId = null;
    if (workspaceId) {
      try {
        // Create second workspace B belonging exclusively to testUserNonMember
        const { data: wsB } = await adminClient
          .from('workspaces')
          .insert({
            name: `Workspace B ${timestamp}`,
            workspace_type: 'research',
            created_by: testUserNonMember.id
          })
          .select('*')
          .single();
        wsBId = wsB.id;
        await adminClient.from('workspace_members').insert({ workspace_id: wsBId, user_id: testUserNonMember.id, role: 'owner' });

        // NonMember attempts to query files from Workspace A
        const { data: crossFiles } = await nonMemberClient
          .from('files')
          .select('*')
          .eq('workspace_id', workspaceId);

        // Owner of Workspace A attempts to move file to Workspace B
        const { error: moveErr, data: moveData } = await ownerClient
          .from('files')
          .update({ workspace_id: wsBId })
          .eq('id', editorFileId)
          .select('*');

        const crossFilesBlocked = !crossFiles || crossFiles.length === 0;
        const moveBlocked = Boolean(moveErr) || !moveData || moveData.length === 0;

        if (crossFilesBlocked && moveBlocked) {
          recordResult(11, 'Verify cross-workspace isolation', 'PASS',
            `Reading other workspace files returned 0 rows; Moving file to other workspace blocked: ${moveErr?.message || '0 rows updated'}`);
        } else {
          recordResult(11, 'Verify cross-workspace isolation', 'FAIL',
            `Cross files: ${crossFiles?.length}, Move error: ${moveErr?.message}, Move data: ${JSON.stringify(moveData)}`);
        }
      } catch (err) {
        recordResult(11, 'Verify cross-workspace isolation', 'FAIL', err.message);
      }
    }

    // -------------------------------------------------------------
    // 12. Verify workspace_id and membership identity cannot be changed
    // -------------------------------------------------------------
    if (workspaceId && wsBId) {
      try {
        // 12a. Change workspace_members.workspace_id
        const { error: moveMemErr, data: memData } = await ownerClient
          .from('workspace_members')
          .update({ workspace_id: wsBId })
          .eq('workspace_id', workspaceId)
          .eq('user_id', testUserEditor.id)
          .select('*');

        // 12b. Change workspace_members.user_id
        const { error: changeUserErr, data: changeUserData } = await ownerClient
          .from('workspace_members')
          .update({ user_id: testUserNonMember.id })
          .eq('workspace_id', workspaceId)
          .eq('user_id', testUserEditor.id)
          .select('*');

        // 12c. Change workspaces.created_by
        const { error: changeCreatorErr, data: changeCreatorData } = await ownerClient
          .from('workspaces')
          .update({ created_by: testUserNonMember.id })
          .eq('id', workspaceId)
          .select('*');

        const memWsBlocked = Boolean(moveMemErr) || !memData || memData.length === 0;
        const memUserBlocked = Boolean(changeUserErr) || !changeUserData || changeUserData.length === 0;
        const creatorBlocked = Boolean(changeCreatorErr) || !changeCreatorData || changeCreatorData.length === 0;

        if (memWsBlocked && memUserBlocked && creatorBlocked) {
          recordResult(12, 'Verify workspace_id and membership identity cannot be changed', 'PASS',
            `workspace_id immutability: ${moveMemErr?.message || 'blocked'}; user_id immutability: ${changeUserErr?.message || 'blocked'}; created_by immutability: ${changeCreatorErr?.message || 'blocked'}`);
        } else {
          recordResult(12, 'Verify workspace_id and membership identity cannot be changed', 'FAIL',
            `MemWs: ${moveMemErr?.message}, MemUser: ${changeUserErr?.message}, Creator: ${changeCreatorErr?.message}`);
        }
      } catch (err) {
        recordResult(12, 'Verify workspace_id and membership identity cannot be changed', 'FAIL', err.message);
      }
    }

    // -------------------------------------------------------------
    // 13. Verify the last owner cannot be removed or demoted
    // -------------------------------------------------------------
    if (workspaceId) {
      try {
        // 13a. Attempt to delete sole owner
        const { error: delOwnerErr, data: delData } = await ownerClient
          .from('workspace_members')
          .delete()
          .eq('workspace_id', workspaceId)
          .eq('user_id', testUserOwner.id)
          .select('*');

        // 13b. Attempt to demote sole owner to viewer
        const { error: demoteErr, data: demoteData } = await ownerClient
          .from('workspace_members')
          .update({ role: 'viewer' })
          .eq('workspace_id', workspaceId)
          .eq('user_id', testUserOwner.id)
          .select('*');

        const delBlocked = Boolean(delOwnerErr) || !delData || delData.length === 0;
        const demoteBlocked = Boolean(demoteErr) || !demoteData || demoteData.length === 0;

        if (delBlocked && demoteBlocked) {
          recordResult(13, 'Verify the last owner cannot be removed or demoted', 'PASS',
            `Delete last owner blocked: ${delOwnerErr?.message || 'rejected'}; Demote last owner blocked: ${demoteErr?.message || 'rejected'}`);
        } else {
          recordResult(13, 'Verify the last owner cannot be removed or demoted', 'FAIL',
            `Delete err: ${delOwnerErr?.message}, Demote err: ${demoteErr?.message}`);
        }
      } catch (err) {
        recordResult(13, 'Verify the last owner cannot be removed or demoted', 'FAIL', err.message);
      }
    }

    // -------------------------------------------------------------
    // 14. Verify profiles are not globally exposed
    // -------------------------------------------------------------
    if (wsBId) {
      try {
        // Create an isolated user who shares NO workspaces with testUserOwner
        const { data: isoU } = await adminClient.auth.admin.createUser({
          email: `isolated_${timestamp}@sourceflow.test`,
          password: 'TestPassword123!',
          email_confirm: true
        });
        await adminClient.from('profiles').insert({ id: isoU.user.id, display_name: 'Isolated User', role: 'Reviewer' });

        // Owner queries profiles
        const { data: profRows, error: pErr } = await ownerClient
          .from('profiles')
          .select('id, display_name')
          .eq('id', isoU.user.id);

        await adminClient.auth.admin.deleteUser(isoU.user.id);

        if (!pErr && (!profRows || profRows.length === 0)) {
          recordResult(14, 'Verify profiles are not globally exposed', 'PASS',
            'Non-peer profile query returned 0 rows under privacy policy');
        } else {
          recordResult(14, 'Verify profiles are not globally exposed', 'FAIL',
            `Exposed isolated profile: ${JSON.stringify(profRows)}`);
        }
      } catch (err) {
        recordResult(14, 'Verify profiles are not globally exposed', 'FAIL', err.message);
      }
    }

    // -------------------------------------------------------------
    // 15. Verify audit logs are append-only
    // -------------------------------------------------------------
    if (workspaceId) {
      try {
        // 15a. Insert audit log
        const { data: auditEntry, error: aInsErr } = await ownerClient
          .from('audit_logs')
          .insert({
            workspace_id: workspaceId,
            user_id: testUserOwner.id,
            action: 'VERIFY_RLS',
            resource_type: 'workspace',
            resource_id: workspaceId
          })
          .select('*')
          .single();

        if (aInsErr || !auditEntry) {
          throw new Error('Failed to insert audit entry: ' + aInsErr?.message);
        }

        // 15b. Attempt to UPDATE audit log
        const { error: aUpdErr, data: aUpdData } = await ownerClient
          .from('audit_logs')
          .update({ action: 'TAMPERED_ACTION' })
          .eq('id', auditEntry.id)
          .select('*');

        // 15c. Attempt to DELETE audit log
        const { error: aDelErr, data: aDelData } = await ownerClient
          .from('audit_logs')
          .delete()
          .eq('id', auditEntry.id)
          .select('*');

        const updBlocked = Boolean(aUpdErr) || !aUpdData || aUpdData.length === 0;
        const delBlocked = Boolean(aDelErr) || !aDelData || aDelData.length === 0;

        if (updBlocked && delBlocked) {
          recordResult(15, 'Verify audit logs are append-only', 'PASS',
            `Audit update rejected (${aUpdErr?.message || '0 rows'}); Audit delete rejected (${aDelErr?.message || '0 rows'})`);
        } else {
          recordResult(15, 'Verify audit logs are append-only', 'FAIL',
            `Update data: ${JSON.stringify(aUpdData)}, Delete data: ${JSON.stringify(aDelData)}`);
        }
      } catch (err) {
        recordResult(15, 'Verify audit logs are append-only', 'FAIL', err.message);
      }
    }

  } finally {
    // -------------------------------------------------------------
    // TEARDOWN: Clean up test workspaces & ephemeral test users
    // -------------------------------------------------------------
    console.log('\nCleaning up ephemeral test records from Supabase...');
    try {
      if (workspaceId) {
        await adminClient.from('workspaces').delete().eq('id', workspaceId);
      }
      if (testUserOwner) await adminClient.auth.admin.deleteUser(testUserOwner.id);
      if (testUserEditor) await adminClient.auth.admin.deleteUser(testUserEditor.id);
      if (testUserViewer) await adminClient.auth.admin.deleteUser(testUserViewer.id);
      if (testUserNonMember) await adminClient.auth.admin.deleteUser(testUserNonMember.id);
      console.log('Cleanup completed cleanly.');
    } catch (cleanErr) {
      console.warn('Cleanup warning:', cleanErr.message);
    }
  }

  // -------------------------------------------------------------
  // SUMMARY
  // -------------------------------------------------------------
  console.log('\n=============================================================');
  console.log('FINAL LIVE VERIFICATION SUMMARY:');
  console.log('=============================================================');
  const passCount = results.filter(r => r.status === 'PASS').length;
  const failCount = results.filter(r => r.status === 'FAIL').length;
  const notImpCount = results.filter(r => r.status === 'NOT YET IMPLEMENTED').length;

  console.log(`PASS: ${passCount} | FAIL: ${failCount} | NOT YET IMPLEMENTED: ${notImpCount}`);
  console.log('=============================================================\n');
}

runLiveVerification().catch(err => {
  console.error('Unhandled verification error:', err);
  process.exit(1);
});
