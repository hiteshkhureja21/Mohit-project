-- ============================================================
-- Step 9: Government Data Integration — RLS Policies
-- ============================================================
-- Row Level Security for public.government_datasets
-- 
-- Rules:
--   SELECT  → workspace members only (any role)
--   INSERT  → workspace members only (any role)
--   UPDATE  → workspace admins and owners only
--   DELETE  → workspace admins and owners only
-- ============================================================

-- Enable RLS on government_datasets
ALTER TABLE public.government_datasets ENABLE ROW LEVEL SECURITY;

-- Force RLS even for table owner (service role bypasses via BYPASSRLS privilege)
ALTER TABLE public.government_datasets FORCE ROW LEVEL SECURITY;

-- ============================================================
-- POLICY: SELECT — Workspace members can view government datasets
-- accessed within their own workspace.
-- ============================================================
DROP POLICY IF EXISTS "gov_datasets_select_members" ON public.government_datasets;
CREATE POLICY "gov_datasets_select_members"
  ON public.government_datasets
  FOR SELECT
  USING (
    workspace_id IN (
      SELECT workspace_id
      FROM public.workspace_members
      WHERE user_id = auth.uid()
        AND status = 'active'
    )
  );

-- ============================================================
-- POLICY: INSERT — Active workspace members can log dataset access
-- ============================================================
DROP POLICY IF EXISTS "gov_datasets_insert_members" ON public.government_datasets;
CREATE POLICY "gov_datasets_insert_members"
  ON public.government_datasets
  FOR INSERT
  WITH CHECK (
    workspace_id IN (
      SELECT workspace_id
      FROM public.workspace_members
      WHERE user_id = auth.uid()
        AND status = 'active'
    )
    AND created_by = auth.uid()
  );

-- ============================================================
-- POLICY: UPDATE — Admins and owners can update dataset metadata
-- (e.g., refresh last_fetched_at on re-fetch)
-- ============================================================
DROP POLICY IF EXISTS "gov_datasets_update_admin" ON public.government_datasets;
CREATE POLICY "gov_datasets_update_admin"
  ON public.government_datasets
  FOR UPDATE
  USING (
    workspace_id IN (
      SELECT workspace_id
      FROM public.workspace_members
      WHERE user_id = auth.uid()
        AND status = 'active'
        AND role IN ('admin', 'owner')
    )
  )
  WITH CHECK (
    workspace_id IN (
      SELECT workspace_id
      FROM public.workspace_members
      WHERE user_id = auth.uid()
        AND status = 'active'
        AND role IN ('admin', 'owner')
    )
  );

-- ============================================================
-- POLICY: DELETE — Admins and owners can remove audit records
-- ============================================================
DROP POLICY IF EXISTS "gov_datasets_delete_admin" ON public.government_datasets;
CREATE POLICY "gov_datasets_delete_admin"
  ON public.government_datasets
  FOR DELETE
  USING (
    workspace_id IN (
      SELECT workspace_id
      FROM public.workspace_members
      WHERE user_id = auth.uid()
        AND status = 'active'
        AND role IN ('admin', 'owner')
    )
  );

-- ============================================================
-- Verify policies are registered correctly
-- ============================================================
DO $$
DECLARE
  policy_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO policy_count
  FROM pg_policies
  WHERE tablename = 'government_datasets'
    AND schemaname = 'public';

  IF policy_count < 4 THEN
    RAISE EXCEPTION 'Expected at least 4 RLS policies on government_datasets, found %', policy_count;
  END IF;

  RAISE NOTICE 'government_datasets RLS policies verified: % policies active', policy_count;
END $$;
