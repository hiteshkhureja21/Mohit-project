/**
 * Database Verification & Connectivity Service
 * Provides health checks, connection tests, and schema verification for Supabase PostgreSQL.
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { getSupabaseClient, isSupabaseConfigured } from '../config/supabase.js';
import { env } from '../config/env.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export const REQUIRED_TABLES = [
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

export class DatabaseService {
  /**
   * Tests the live connection to Supabase PostgreSQL.
   */
  async checkConnection() {
    if (!isSupabaseConfigured()) {
      return {
        configured: false,
        connected: false,
        error: 'SUPABASE_URL or secret key is missing in environment variables.'
      };
    }

    const supabase = getSupabaseClient();
    const startTime = Date.now();

    try {
      // Execute lightweight query on workspaces
      const { data, error } = await supabase
        .from('workspaces')
        .select('id')
        .limit(1);

      const latencyMs = Date.now() - startTime;

      if (error) {
        return {
          configured: true,
          connected: false,
          latencyMs,
          error: error.message || 'Supabase query error',
          code: error.code || 'QUERY_ERROR'
        };
      }

      return {
        configured: true,
        connected: true,
        latencyMs,
        sampleCount: data ? data.length : 0
      };
    } catch (err) {
      return {
        configured: true,
        connected: false,
        latencyMs: Date.now() - startTime,
        error: err.message,
        code: 'NETWORK_ERROR'
      };
    }
  }

  /**
   * Verifies the local schema.sql file definition.
   */
  verifySchemaSql() {
    const schemaPath = path.resolve(__dirname, '../../../database/schema.sql');
    if (!fs.existsSync(schemaPath)) {
      return { valid: false, error: `schema.sql not found at ${schemaPath}` };
    }

    const content = fs.readFileSync(schemaPath, 'utf-8');
    const tableResults = {};
    let missingTables = [];

    for (const table of REQUIRED_TABLES) {
      const regex = new RegExp(`CREATE TABLE (IF NOT EXISTS )?public\\.${table}\\b`, 'i');
      const found = regex.test(content);
      tableResults[table] = found;
      if (!found) missingTables.push(table);
    }

    // Check critical foreign keys
    const fkChecks = {
      'profiles.id -> auth.users.id': /REFERENCES\s+auth\.users\(id\)/i.test(content),
      'workspaces.created_by -> profiles.id': /created_by\s+UUID\s+REFERENCES\s+public\.profiles\(id\)/i.test(content),
      'workspace_members.workspace_id -> workspaces.id': /workspace_id\s+UUID\s+NOT\s+NULL\s+REFERENCES\s+public\.workspaces\(id\)/i.test(content),
      'workspace_members.user_id -> profiles.id': /user_id\s+UUID\s+NOT\s+NULL\s+REFERENCES\s+public\.profiles\(id\)/i.test(content),
      'files.workspace_id -> workspaces.id': /workspace_id\s+UUID\s+NOT\s+NULL\s+REFERENCES\s+public\.workspaces\(id\)/i.test(content),
      'ocr_results.file_id -> files.id': /file_id\s+UUID\s+NOT\s+NULL\s+REFERENCES\s+public\.files\(id\)/i.test(content),
      'ai_requests.workspace_id -> workspaces.id': /workspace_id\s+UUID\s+NOT\s+NULL\s+REFERENCES\s+public\.workspaces\(id\)/i.test(content),
      'transformations.workspace_id -> workspaces.id': /workspace_id\s+UUID\s+NOT\s+NULL\s+REFERENCES\s+public\.workspaces\(id\)/i.test(content),
      'claims.transformation_id -> transformations.id': /transformation_id\s+UUID\s+NOT\s+NULL\s+REFERENCES\s+public\.transformations\(id\)/i.test(content),
      'outputs.transformation_id -> transformations.id': /transformation_id\s+UUID\s+NOT\s+NULL\s+REFERENCES\s+public\.transformations\(id\)/i.test(content),
      'audit_logs.workspace_id -> workspaces.id': /workspace_id\s+UUID\s+NOT\s+NULL\s+REFERENCES\s+public\.workspaces\(id\)/i.test(content)
    };

    return {
      valid: missingTables.length === 0,
      totalRequired: REQUIRED_TABLES.length,
      tablesFound: Object.keys(tableResults).filter(t => tableResults[t]).length,
      missingTables,
      tableResults,
      foreignKeys: fkChecks
    };
  }
}

export const dbService = new DatabaseService();
