-- ==============================================================================
-- SourceFlow Supabase Storage RLS Policies
-- Multi-Tenant Workspace Isolation for 'sourceflow-files' Private Bucket
-- ==============================================================================

-- 1. Helper function: Extracts workspace UUID from storage path
-- Format: workspace-{uuid}/{stored_filename}
CREATE OR REPLACE FUNCTION public.get_storage_workspace_id(object_name TEXT)
RETURNS UUID AS $$
DECLARE
    v_match TEXT[];
BEGIN
    IF object_name IS NULL THEN
        RETURN NULL;
    END IF;
    
    -- Matches 'workspace-<uuid>/...'
    v_match := regexp_match(object_name, '^workspace-([0-9a-fA-F-]{36})(/|$)');
    IF v_match IS NOT NULL AND array_length(v_match, 1) >= 1 THEN
        RETURN v_match[1]::UUID;
    END IF;

    RETURN NULL;
EXCEPTION
    WHEN OTHERS THEN
        RETURN NULL;
END;
$$ LANGUAGE plpgsql STABLE SECURITY DEFINER
SET search_path = public, pg_temp;

REVOKE EXECUTE ON FUNCTION public.get_storage_workspace_id(TEXT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_storage_workspace_id(TEXT) TO authenticated, service_role;

-- 2. Storage Policies on storage.objects for 'sourceflow-files'

-- Enable RLS on storage.objects (default in Supabase, ensured here)
ALTER TABLE storage.objects ENABLE ROW LEVEL SECURITY;

-- Policy A: Members (owner, editor, viewer) can read/download files within their workspace
DROP POLICY IF EXISTS "Storage: members select files" ON storage.objects;
CREATE POLICY "Storage: members select files"
    ON storage.objects FOR SELECT
    TO authenticated
    USING (
        bucket_id = 'sourceflow-files'
        AND public.is_workspace_member(public.get_storage_workspace_id(name))
    );

-- Policy B: Editors and Owners can upload/insert files into their workspace folder
DROP POLICY IF EXISTS "Storage: editor or owner insert files" ON storage.objects;
CREATE POLICY "Storage: editor or owner insert files"
    ON storage.objects FOR INSERT
    TO authenticated
    WITH CHECK (
        bucket_id = 'sourceflow-files'
        AND public.is_workspace_editor_or_owner(public.get_storage_workspace_id(name))
    );

-- Policy C: Editors and Owners can update files in their workspace folder
DROP POLICY IF EXISTS "Storage: editor or owner update files" ON storage.objects;
CREATE POLICY "Storage: editor or owner update files"
    ON storage.objects FOR UPDATE
    TO authenticated
    USING (
        bucket_id = 'sourceflow-files'
        AND public.is_workspace_editor_or_owner(public.get_storage_workspace_id(name))
    )
    WITH CHECK (
        bucket_id = 'sourceflow-files'
        AND public.is_workspace_editor_or_owner(public.get_storage_workspace_id(name))
    );

-- Policy D: Editors and Owners can delete files in their workspace folder
DROP POLICY IF EXISTS "Storage: editor or owner delete files" ON storage.objects;
CREATE POLICY "Storage: editor or owner delete files"
    ON storage.objects FOR DELETE
    TO authenticated
    USING (
        bucket_id = 'sourceflow-files'
        AND public.is_workspace_editor_or_owner(public.get_storage_workspace_id(name))
    );
