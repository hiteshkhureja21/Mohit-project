-- ==============================================================================
-- SourceFlow Supabase PostgreSQL Database Schema
-- Institutional Document Intelligence and Grounded Verification
-- STEP 8: Translation Integration - Table Schema & Constraints
-- Safe for execution in the Supabase SQL Editor
-- ==============================================================================

-- 1. Enable Cryptographic Extensions (if not already enabled)
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ==============================================================================
-- 2. TRANSLATIONS TABLE
-- Tracks machine translation requests, provider metadata, and translated results
-- ==============================================================================
CREATE TABLE IF NOT EXISTS public.translations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    workspace_id UUID NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
    file_id UUID NULL REFERENCES public.files(id) ON DELETE SET NULL,
    source_language TEXT NOT NULL,
    target_language TEXT NOT NULL,
    source_text TEXT NOT NULL,
    translated_text TEXT NOT NULL,
    provider TEXT NOT NULL DEFAULT 'libretranslate',
    status TEXT NOT NULL DEFAULT 'completed' CHECK (status IN ('processing', 'completed', 'failed')),
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

-- ==============================================================================
-- 3. INDEXES FOR PERFORMANCE & AUDITING
-- ==============================================================================
CREATE INDEX IF NOT EXISTS idx_translations_workspace ON public.translations(workspace_id);
CREATE INDEX IF NOT EXISTS idx_translations_user ON public.translations(user_id);
CREATE INDEX IF NOT EXISTS idx_translations_file ON public.translations(file_id);
CREATE INDEX IF NOT EXISTS idx_translations_status ON public.translations(status);
CREATE INDEX IF NOT EXISTS idx_translations_created_at ON public.translations(created_at DESC);

-- ==============================================================================
-- 4. TRIGGERS
-- ==============================================================================

-- Maintain updated_at timestamp on row mutation
CREATE OR REPLACE FUNCTION public.handle_translations_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = timezone('utc'::text, now());
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_translations_updated_at ON public.translations;
CREATE TRIGGER trg_translations_updated_at
    BEFORE UPDATE ON public.translations
    FOR EACH ROW EXECUTE FUNCTION public.handle_translations_updated_at();

-- Enforce workspace_id immutability once created (prevent moving across tenant boundaries)
CREATE OR REPLACE FUNCTION public.prevent_translation_workspace_reassignment()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.workspace_id IS DISTINCT FROM OLD.workspace_id THEN
        RAISE EXCEPTION 'Moving translation records between workspaces is strictly forbidden. workspace_id is immutable.';
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_immutable_translations_workspace ON public.translations;
CREATE TRIGGER trg_immutable_translations_workspace
    BEFORE UPDATE OF workspace_id ON public.translations
    FOR EACH ROW EXECUTE FUNCTION public.prevent_translation_workspace_reassignment();
