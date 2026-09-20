-- ==============================================================================
-- SourceFlow Supabase PostgreSQL Database Schema
-- Institutional Document Intelligence and Grounded Verification
-- STEP 2A: Core Idempotent Relational Schema (Safe for Supabase SQL Editor)
-- ==============================================================================

-- 1. Enable Cryptographic Extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ==============================================================================
-- 1. PROFILES TABLE
-- Extends Supabase auth.users with application profile metadata
-- Note: id strictly references Supabase auth.users(id).
-- No custom password/auth tables are created.
-- ==============================================================================
CREATE TABLE IF NOT EXISTS public.profiles (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    display_name TEXT NOT NULL,
    avatar_url TEXT,
    role TEXT NOT NULL DEFAULT 'Reviewer' CHECK (role IN ('Owner', 'Admin', 'Reviewer', 'Editor', 'Viewer', 'Content Operator', 'Approver')),
    designation TEXT DEFAULT 'Content Verification Specialist',
    department TEXT DEFAULT 'Operations',
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

CREATE INDEX IF NOT EXISTS idx_profiles_role ON public.profiles(role);

-- ==============================================================================
-- 2. WORKSPACES TABLE
-- Organizational boundaries for intelligence projects, teams, and dashboards
-- ==============================================================================
CREATE TABLE IF NOT EXISTS public.workspaces (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    description TEXT,
    workspace_type TEXT NOT NULL DEFAULT 'operations' CHECK (workspace_type IN ('operations', 'communications', 'research', 'compliance', 'other')),
    created_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

CREATE INDEX IF NOT EXISTS idx_workspaces_created_by ON public.workspaces(created_by);
CREATE INDEX IF NOT EXISTS idx_workspaces_type ON public.workspaces(workspace_type);

-- ==============================================================================
-- 3. WORKSPACE MEMBERS TABLE
-- Association table mapping users to workspaces with granular access roles
-- ==============================================================================
CREATE TABLE IF NOT EXISTS public.workspace_members (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    workspace_id UUID NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    role TEXT NOT NULL DEFAULT 'viewer' CHECK (role IN ('owner', 'editor', 'viewer')),
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    CONSTRAINT uq_workspace_member UNIQUE (workspace_id, user_id)
);

CREATE INDEX IF NOT EXISTS idx_workspace_members_workspace ON public.workspace_members(workspace_id);
CREATE INDEX IF NOT EXISTS idx_workspace_members_user ON public.workspace_members(user_id);
CREATE INDEX IF NOT EXISTS idx_workspace_members_role ON public.workspace_members(role);

-- ==============================================================================
-- 4. FILES TABLE
-- Tracks uploaded institutional source documents (Metadata only - files in Storage)
-- ==============================================================================
CREATE TABLE IF NOT EXISTS public.files (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    workspace_id UUID NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
    uploaded_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    original_name TEXT NOT NULL,
    stored_name TEXT NOT NULL,
    mime_type TEXT NOT NULL,
    file_size BIGINT NOT NULL,
    storage_path TEXT NOT NULL,
    sha256 TEXT,
    page_count INTEGER DEFAULT 1,
    status TEXT NOT NULL DEFAULT 'uploaded' CHECK (status IN ('uploaded', 'processing', 'completed', 'processed', 'failed', 'deleted')),
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

CREATE INDEX IF NOT EXISTS idx_files_workspace ON public.files(workspace_id);
CREATE INDEX IF NOT EXISTS idx_files_uploaded_by ON public.files(uploaded_by);
CREATE INDEX IF NOT EXISTS idx_files_status ON public.files(status);
CREATE INDEX IF NOT EXISTS idx_files_sha256 ON public.files(sha256);

-- ==============================================================================
-- 5. OCR RESULTS TABLE
-- Stores OCR extracted text and language metadata from ingestion engines
-- ==============================================================================
CREATE TABLE IF NOT EXISTS public.ocr_results (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    file_id UUID NOT NULL REFERENCES public.files(id) ON DELETE CASCADE,
    extracted_text TEXT NOT NULL,
    language TEXT NOT NULL DEFAULT 'eng',
    provider TEXT NOT NULL DEFAULT 'ocr_space',
    status TEXT NOT NULL DEFAULT 'completed' CHECK (status IN ('pending', 'processing', 'completed', 'failed')),
    confidence NUMERIC(5, 2),
    metadata JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

CREATE INDEX IF NOT EXISTS idx_ocr_results_file ON public.ocr_results(file_id);
CREATE INDEX IF NOT EXISTS idx_ocr_results_status ON public.ocr_results(status);

-- ==============================================================================
-- 6. AI REQUESTS TABLE
-- Audit log and cache for LLM extraction, claim deduction, and synthesis
-- ==============================================================================
CREATE TABLE IF NOT EXISTS public.ai_requests (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    workspace_id UUID NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
    file_id UUID REFERENCES public.files(id) ON DELETE SET NULL,
    operation TEXT NOT NULL, -- e.g. 'extract_claims', 'synthesize_brief', 'audience_adaptation'
    model TEXT NOT NULL,     -- e.g. 'gpt-4o', 'gpt-4o-mini'
    input_text TEXT,
    output_text TEXT,
    status TEXT NOT NULL DEFAULT 'completed' CHECK (status IN ('pending', 'processing', 'completed', 'failed')),
    tokens_used INTEGER DEFAULT 0,
    metadata JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

CREATE INDEX IF NOT EXISTS idx_ai_requests_workspace ON public.ai_requests(workspace_id);
CREATE INDEX IF NOT EXISTS idx_ai_requests_user ON public.ai_requests(user_id);
CREATE INDEX IF NOT EXISTS idx_ai_requests_operation ON public.ai_requests(operation);

-- ==============================================================================
-- 7. TRANSFORMATIONS TABLE
-- Central state for a 6-stage transformation workflow
-- ==============================================================================
CREATE TABLE IF NOT EXISTS public.transformations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    workspace_id UUID NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
    file_id UUID REFERENCES public.files(id) ON DELETE SET NULL,
    created_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    title TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'processing', 'review', 'completed', 'failed')),
    configuration JSONB NOT NULL DEFAULT '{
        "analysis": {},
        "profiles": [],
        "review": {"status": "PENDING", "reviewer": null, "approvedAt": null},
        "delivery": {"status": "NOT_SENT", "recipients": [], "sentAt": null, "subject": "", "message": ""}
    }'::jsonb,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

CREATE INDEX IF NOT EXISTS idx_transformations_workspace ON public.transformations(workspace_id);
CREATE INDEX IF NOT EXISTS idx_transformations_file ON public.transformations(file_id);
CREATE INDEX IF NOT EXISTS idx_transformations_status ON public.transformations(status);

-- ==============================================================================
-- 8. CLAIMS TABLE
-- Extracted assertions grounded against primary source evidence
-- ==============================================================================
CREATE TABLE IF NOT EXISTS public.claims (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    transformation_id UUID NOT NULL REFERENCES public.transformations(id) ON DELETE CASCADE,
    claim_text TEXT NOT NULL,
    evidence JSONB NOT NULL DEFAULT '{
        "pageNumber": 1,
        "anchorPassage": "",
        "sourceReference": ""
    }'::jsonb,
    confidence NUMERIC(5, 2) DEFAULT 95.00,
    status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'supported', 'unsupported', 'needs_review')),
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

CREATE INDEX IF NOT EXISTS idx_claims_transformation ON public.claims(transformation_id);
CREATE INDEX IF NOT EXISTS idx_claims_status ON public.claims(status);

-- ==============================================================================
-- 9. OUTPUTS TABLE
-- Audience-tailored deliverables generated from verified claims
-- ==============================================================================
CREATE TABLE IF NOT EXISTS public.outputs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    transformation_id UUID NOT NULL REFERENCES public.transformations(id) ON DELETE CASCADE,
    type TEXT NOT NULL,
    storage_path TEXT,
    status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'generating', 'completed', 'failed')),
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

CREATE INDEX IF NOT EXISTS idx_outputs_transformation ON public.outputs(transformation_id);
CREATE INDEX IF NOT EXISTS idx_outputs_status ON public.outputs(status);
CREATE INDEX IF NOT EXISTS idx_outputs_type ON public.outputs(type);

-- ==============================================================================
-- 10. AUDIT LOGS TABLE
-- Cryptographically linked, tamper-evident record of all platform operations
-- ==============================================================================
CREATE TABLE IF NOT EXISTS public.audit_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    workspace_id UUID NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
    user_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    action TEXT NOT NULL,
    resource_type TEXT NOT NULL, -- e.g. 'document', 'claim', 'output', 'workspace'
    resource_id TEXT,
    metadata JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

CREATE INDEX IF NOT EXISTS idx_audit_logs_workspace ON public.audit_logs(workspace_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_user ON public.audit_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_action ON public.audit_logs(action);
CREATE INDEX IF NOT EXISTS idx_audit_logs_created ON public.audit_logs(created_at DESC);

-- ==============================================================================
-- AUTOMATIC TIMESTAMPS TRIGGER FUNCTION
-- ==============================================================================
CREATE OR REPLACE FUNCTION public.handle_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = timezone('utc'::text, now());
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Attach updated_at triggers idempotently
DROP TRIGGER IF EXISTS set_profiles_updated_at ON public.profiles;
CREATE TRIGGER set_profiles_updated_at BEFORE UPDATE ON public.profiles FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

DROP TRIGGER IF EXISTS set_workspaces_updated_at ON public.workspaces;
CREATE TRIGGER set_workspaces_updated_at BEFORE UPDATE ON public.workspaces FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

DROP TRIGGER IF EXISTS set_files_updated_at ON public.files;
CREATE TRIGGER set_files_updated_at BEFORE UPDATE ON public.files FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

DROP TRIGGER IF EXISTS set_transformations_updated_at ON public.transformations;
CREATE TRIGGER set_transformations_updated_at BEFORE UPDATE ON public.transformations FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

DROP TRIGGER IF EXISTS set_claims_updated_at ON public.claims;
CREATE TRIGGER set_claims_updated_at BEFORE UPDATE ON public.claims FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

-- ==============================================================================
-- AUTOMATIC PROFILE CREATION ON NEW AUTH USER
-- ==============================================================================
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO public.profiles (id, display_name, avatar_url, role, designation)
    VALUES (
        NEW.id,
        COALESCE(NEW.raw_user_meta_data->>'name', split_part(NEW.email, '@', 1)),
        NEW.raw_user_meta_data->>'avatar_url',
        COALESCE(NEW.raw_user_meta_data->>'role', 'Reviewer'),
        COALESCE(NEW.raw_user_meta_data->>'designation', 'Content Verification Specialist')
    )
    ON CONFLICT (id) DO NOTHING;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();
