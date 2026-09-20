-- ==============================================================================
-- SourceFlow Supabase PostgreSQL Database Schema
-- Institutional Document Intelligence and Grounded Verification
-- STEP 8: Translation Integration - Row Level Security (RLS) & RBAC Policies
-- Safe for execution in the Supabase SQL Editor
-- ==============================================================================

-- 1. Enable Row Level Security on public.translations
ALTER TABLE public.translations ENABLE ROW LEVEL SECURITY;

-- 2. SELECT Policy: All workspace members (Owner, Editor, Viewer) can view translations
DROP POLICY IF EXISTS "Translations: select member" ON public.translations;
CREATE POLICY "Translations: select member"
    ON public.translations FOR SELECT
    TO authenticated
    USING (public.is_workspace_member(workspace_id));

-- 3. INSERT Policy: Only Owners and Editors can record translations (Viewers are DENIED)
DROP POLICY IF EXISTS "Translations: insert editor and owner" ON public.translations;
CREATE POLICY "Translations: insert editor and owner"
    ON public.translations FOR INSERT
    TO authenticated
    WITH CHECK (
        public.is_workspace_editor_or_owner(workspace_id)
        AND auth.uid() = user_id
    );

-- 4. UPDATE Policy: Only Owners and Editors can update translations
DROP POLICY IF EXISTS "Translations: update editor and owner" ON public.translations;
CREATE POLICY "Translations: update editor and owner"
    ON public.translations FOR UPDATE
    TO authenticated
    USING (public.is_workspace_editor_or_owner(workspace_id))
    WITH CHECK (
        public.is_workspace_editor_or_owner(workspace_id)
        AND workspace_id = translations.workspace_id
    );

-- 5. DELETE Policy: Only Owners and Editors can delete translations
DROP POLICY IF EXISTS "Translations: delete editor and owner" ON public.translations;
CREATE POLICY "Translations: delete editor and owner"
    ON public.translations FOR DELETE
    TO authenticated
    USING (public.is_workspace_editor_or_owner(workspace_id));
