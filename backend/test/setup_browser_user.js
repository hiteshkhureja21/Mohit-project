import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import { createClient } from '@supabase/supabase-js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.resolve(__dirname, '../.env') });

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_SECRET_KEY = process.env.SUPABASE_SECRET_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY;

const adminClient = createClient(SUPABASE_URL, SUPABASE_SECRET_KEY, {
  auth: { autoRefreshToken: false, persistSession: false }
});

async function setup() {
  const email = 'ui_tester@sourceflow.internal';
  const password = 'Password123!Secure';

  // Check if user already exists
  const { data: users } = await adminClient.auth.admin.listUsers();
  let user = users?.users?.find(u => u.email === email);

  if (!user) {
    const { data: created, error } = await adminClient.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: { full_name: 'UI Test Owner' }
    });
    if (error) throw error;
    user = created.user;
  } else {
    // Update password to ensure it matches
    await adminClient.auth.admin.updateUserById(user.id, { password });
  }

  // Ensure workspace exists
  const { data: workspaces } = await adminClient
    .from('workspaces')
    .select('*')
    .eq('created_by', user.id);

  let ws = workspaces?.[0];
  if (!ws) {
    const { data: createdWs, error: wsErr } = await adminClient
      .from('workspaces')
      .insert({
        name: 'UI Enterprise Workspace',
        description: 'Testing upload via UI',
        created_by: user.id
      })
      .select()
      .single();
    if (wsErr) throw wsErr;
    ws = createdWs;
  }

  console.log(JSON.stringify({ email, password, userId: user.id, workspaceId: ws.id }));
}

setup().catch(err => {
  console.error(err);
  process.exit(1);
});
