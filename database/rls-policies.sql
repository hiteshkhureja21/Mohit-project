-- ==============================================================================
-- SourceFlow Supabase PostgreSQL Row Level Security (RLS) Policies (FINAL HARDENED)
-- Multi-Tenant Workspace Isolation, Role-Based Access Control (RBAC), and Anti-Tampering
-- ==============================================================================
-- SECURITY ARCHITECTURE & DESIGN PRINCIPLES:
-- 1. Single Source of Truth for RBAC:
--    The workspace_members table is the SOLE source of truth for all roles
--    ('owner', 'editor', 'viewer'). get_workspace_role() does NOT infer roles from
--    workspaces.created_by.
-- 2. Bootstrap Integrity:
--    Workspace creators are granted an initial 'owner' row in workspace_members
--    upon creation. Both automatic trigger bootstrap and client-driven insert are
--    supported safely without circular RLS dependencies.
-- 3. Membership Identity Immutability:
--    workspace_members.workspace_id and workspace_members.user_id are strictly
--    immutable after creation. A membership cannot be transferred to a different
--    user or workspace; members may only have their role updated by an owner.
-- 4. Workspace Immutability:
--    workspaces.created_by is strictly immutable after creation.
--    workspace_id on files, transformations, and ai_requests is strictly immutable.
--    Parent references on ocr_results, claims, and outputs are strictly immutable.
-- 5. Last Owner Protection:
--    A workspace cannot have its final active owner deleted or demoted.
-- 6. Privacy-Preserving Profiles:
--    Users can only select their own profile and profiles of peers sharing an active workspace.
-- 7. Audit Log Integrity:
--    Append-only (no UPDATE/DELETE policies = strict default deny). Client inserts
--    strictly validate caller identity (user_id = auth.uid()) and workspace membership.
-- 8. Restricted Functions:
--    All SECURITY DEFINER functions use SET search_path = public, pg_temp and have
--    their EXECUTE privilege revoked from PUBLIC (granted to authenticated & service_role only).
-- ==============================================================================

-- ==============================================================================
-- SECTION 1: HARDENED SECURITY HELPER FUNCTIONS
-- ==============================================================================

-- Resolves the effective role ('owner' | 'editor' | 'viewer' | NULL) strictly from workspace_members
CREATE OR REPLACE FUNCTION public.get_workspace_role(w_id UUID)
RETURNS TEXT AS $$
DECLARE
    v_role TEXT;
BEGIN
    IF w_id IS NULL OR auth.uid() IS NULL THEN
        RETURN NULL;
    END IF;

    -- Single source of truth: workspace_members table ONLY
    SELECT role INTO v_role
    FROM public.workspace_members
    WHERE workspace_id = w_id AND user_id = auth.uid();
    
    RETURN v_role;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE
SET search_path = public, pg_temp;

-- Evaluates if the authenticated caller belongs to the target workspace
CREATE OR REPLACE FUNCTION public.is_workspace_member(w_id UUID)
RETURNS BOOLEAN AS $$
BEGIN
    RETURN public.get_workspace_role(w_id) IS NOT NULL;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE
SET search_path = public, pg_temp;

-- Evaluates if caller holds 'owner' or 'editor' role in target workspace
CREATE OR REPLACE FUNCTION public.is_workspace_editor_or_owner(w_id UUID)
RETURNS BOOLEAN AS $$
BEGIN
    RETURN public.get_workspace_role(w_id) IN ('owner', 'editor');
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE
SET search_path = public, pg_temp;

-- Evaluates if caller holds 'owner' role in target workspace
CREATE OR REPLACE FUNCTION public.is_workspace_owner(w_id UUID)
RETURNS BOOLEAN AS $$
BEGIN
    RETURN public.get_workspace_role(w_id) = 'owner';
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE
SET search_path = public, pg_temp;

-- Evaluates if caller is the creator of the target workspace (used strictly for bootstrap validation)
CREATE OR REPLACE FUNCTION public.is_workspace_creator(w_id UUID)
RETURNS BOOLEAN AS $$
BEGIN
    IF w_id IS NULL OR auth.uid() IS NULL THEN
        RETURN FALSE;
    END IF;

    RETURN EXISTS (
        SELECT 1 FROM public.workspaces
        WHERE id = w_id AND created_by = auth.uid()
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE
SET search_path = public, pg_temp;

-- Evaluates if target user shares at least one common workspace with current caller
CREATE OR REPLACE FUNCTION public.shares_workspace_with(target_user_id UUID)
RETURNS BOOLEAN AS $$
BEGIN
    IF target_user_id IS NULL OR auth.uid() IS NULL THEN
        RETURN FALSE;
    END IF;

    IF target_user_id = auth.uid() THEN
        RETURN TRUE;
    END IF;

    RETURN EXISTS (
        SELECT 1
        FROM public.workspace_members wm_self
        JOIN public.workspace_members wm_peer 
          ON wm_self.workspace_id = wm_peer.workspace_id
        WHERE wm_self.user_id = auth.uid()
          AND wm_peer.user_id = target_user_id
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE
SET search_path = public, pg_temp;

-- Restrict execution permissions: Only authenticated users and server-side roles can execute
REVOKE EXECUTE ON FUNCTION public.get_workspace_role(UUID) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_workspace_role(UUID) TO authenticated, service_role;

REVOKE EXECUTE ON FUNCTION public.is_workspace_member(UUID) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.is_workspace_member(UUID) TO authenticated, service_role;

REVOKE EXECUTE ON FUNCTION public.is_workspace_editor_or_owner(UUID) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.is_workspace_editor_or_owner(UUID) TO authenticated, service_role;

REVOKE EXECUTE ON FUNCTION public.is_workspace_owner(UUID) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.is_workspace_owner(UUID) TO authenticated, service_role;

REVOKE EXECUTE ON FUNCTION public.is_workspace_creator(UUID) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.is_workspace_creator(UUID) TO authenticated, service_role;

REVOKE EXECUTE ON FUNCTION public.shares_workspace_with(UUID) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.shares_workspace_with(UUID) TO authenticated, service_role;

-- ==============================================================================
-- SECTION 2: IMMUTABLE BOUNDARY, ORPHAN PREVENTION, & BOOTSTRAP TRIGGERS
-- ==============================================================================

-- 1. Enforce that workspaces.created_by cannot be altered after insertion
CREATE OR REPLACE FUNCTION public.prevent_workspace_creator_change()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.created_by IS DISTINCT FROM OLD.created_by THEN
        RAISE EXCEPTION 'workspaces.created_by is strictly immutable.';
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_immutable_workspace_creator ON public.workspaces;
CREATE TRIGGER trg_immutable_workspace_creator
    BEFORE UPDATE OF created_by ON public.workspaces
    FOR EACH ROW EXECUTE FUNCTION public.prevent_workspace_creator_change();

-- 2. Enforce that workspace_members identity (workspace_id, user_id) cannot be mutated
CREATE OR REPLACE FUNCTION public.prevent_membership_reassignment()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.workspace_id IS DISTINCT FROM OLD.workspace_id THEN
        RAISE EXCEPTION 'Changing workspace_id on an existing membership is strictly forbidden.';
    END IF;
    IF NEW.user_id IS DISTINCT FROM OLD.user_id THEN
        RAISE EXCEPTION 'Changing user_id on an existing membership is strictly forbidden.';
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_immutable_membership_identity ON public.workspace_members;
CREATE TRIGGER trg_immutable_membership_identity
    BEFORE UPDATE OF workspace_id, user_id ON public.workspace_members
    FOR EACH ROW EXECUTE FUNCTION public.prevent_membership_reassignment();

-- 3. Automatic creator ownership bootstrap trigger
CREATE OR REPLACE FUNCTION public.handle_new_workspace()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.created_by IS NOT NULL THEN
        INSERT INTO public.workspace_members (workspace_id, user_id, role)
        VALUES (NEW.id, NEW.created_by, 'owner')
        ON CONFLICT (workspace_id, user_id) DO NOTHING;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public, pg_temp;

DROP TRIGGER IF EXISTS on_workspace_created ON public.workspaces;
CREATE TRIGGER on_workspace_created
    AFTER INSERT ON public.workspaces
    FOR EACH ROW EXECUTE FUNCTION public.handle_new_workspace();

-- 4. Enforce that workspace_id cannot be changed once assigned on records
CREATE OR REPLACE FUNCTION public.prevent_workspace_reassignment()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.workspace_id IS DISTINCT FROM OLD.workspace_id THEN
        RAISE EXCEPTION 'Moving records between workspaces is strictly forbidden. workspace_id is immutable.';
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_immutable_files_workspace ON public.files;
CREATE TRIGGER trg_immutable_files_workspace
    BEFORE UPDATE OF workspace_id ON public.files
    FOR EACH ROW EXECUTE FUNCTION public.prevent_workspace_reassignment();

DROP TRIGGER IF EXISTS trg_immutable_transformations_workspace ON public.transformations;
CREATE TRIGGER trg_immutable_transformations_workspace
    BEFORE UPDATE OF workspace_id ON public.transformations
    FOR EACH ROW EXECUTE FUNCTION public.prevent_workspace_reassignment();

DROP TRIGGER IF EXISTS trg_immutable_ai_requests_workspace ON public.ai_requests;
CREATE TRIGGER trg_immutable_ai_requests_workspace
    BEFORE UPDATE OF workspace_id ON public.ai_requests
    FOR EACH ROW EXECUTE FUNCTION public.prevent_workspace_reassignment();

-- 5. Enforce that parent references on child tables are immutable
CREATE OR REPLACE FUNCTION public.prevent_parent_reassignment()
RETURNS TRIGGER AS $$
BEGIN
    IF TG_TABLE_NAME = 'ocr_results' AND NEW.file_id IS DISTINCT FROM OLD.file_id THEN
        RAISE EXCEPTION 'Reassigning OCR results to a different file is forbidden. file_id is immutable.';
    ELSIF TG_TABLE_NAME IN ('claims', 'outputs') AND NEW.transformation_id IS DISTINCT FROM OLD.transformation_id THEN
        RAISE EXCEPTION 'Reassigning claims or outputs to a different transformation is forbidden. transformation_id is immutable.';
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_immutable_ocr_parent ON public.ocr_results;
CREATE TRIGGER trg_immutable_ocr_parent
    BEFORE UPDATE OF file_id ON public.ocr_results
    FOR EACH ROW EXECUTE FUNCTION public.prevent_parent_reassignment();

DROP TRIGGER IF EXISTS trg_immutable_claims_parent ON public.claims;
CREATE TRIGGER trg_immutable_claims_parent
    BEFORE UPDATE OF transformation_id ON public.claims
    FOR EACH ROW EXECUTE FUNCTION public.prevent_parent_reassignment();

DROP TRIGGER IF EXISTS trg_immutable_outputs_parent ON public.outputs;
CREATE TRIGGER trg_immutable_outputs_parent
    BEFORE UPDATE OF transformation_id ON public.outputs
    FOR EACH ROW EXECUTE FUNCTION public.prevent_parent_reassignment();

-- 6. Prevent a workspace from becoming orphaned without an active owner
CREATE OR REPLACE FUNCTION public.prevent_workspace_orphan()
RETURNS TRIGGER AS $$
DECLARE
    v_remaining_owners INTEGER;
    v_target_ws UUID;
BEGIN
    v_target_ws := OLD.workspace_id;

    -- Only check if an 'owner' is being deleted or demoted to a non-owner role
    IF (TG_OP = 'DELETE' AND OLD.role = 'owner') OR 
       (TG_OP = 'UPDATE' AND OLD.role = 'owner' AND NEW.role <> 'owner') THEN
        
        SELECT COUNT(*) INTO v_remaining_owners
        FROM public.workspace_members
        WHERE workspace_id = v_target_ws
          AND role = 'owner'
          AND id <> OLD.id;

        IF v_remaining_owners = 0 THEN
            RAISE EXCEPTION 'Cannot remove or demote the last owner. Every workspace must have at least one active owner.';
        END IF;
    END IF;

    RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public, pg_temp;

DROP TRIGGER IF EXISTS trg_prevent_workspace_orphan ON public.workspace_members;
CREATE TRIGGER trg_prevent_workspace_orphan
    BEFORE UPDATE OR DELETE ON public.workspace_members
    FOR EACH ROW EXECUTE FUNCTION public.prevent_workspace_orphan();

-- ==============================================================================
-- SECTION 3: PROFILES TABLE POLICIES (Privacy-Preserving)
-- ==============================================================================
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Profiles: select authenticated" ON public.profiles;
DROP POLICY IF EXISTS "Profiles: select self and workspace peers" ON public.profiles;
CREATE POLICY "Profiles: select self and workspace peers"
    ON public.profiles FOR SELECT
    TO authenticated
    USING (
        id = auth.uid()
        OR public.shares_workspace_with(id)
    );

DROP POLICY IF EXISTS "Profiles: insert own" ON public.profiles;
CREATE POLICY "Profiles: insert own"
    ON public.profiles FOR INSERT
    TO authenticated
    WITH CHECK (id = auth.uid());

DROP POLICY IF EXISTS "Profiles: update own" ON public.profiles;
CREATE POLICY "Profiles: update own"
    ON public.profiles FOR UPDATE
    TO authenticated
    USING (id = auth.uid())
    WITH CHECK (id = auth.uid());

DROP POLICY IF EXISTS "Profiles: delete own" ON public.profiles;
CREATE POLICY "Profiles: delete own"
    ON public.profiles FOR DELETE
    TO authenticated
    USING (id = auth.uid());

-- ==============================================================================
-- SECTION 4: WORKSPACES TABLE POLICIES
-- ==============================================================================
ALTER TABLE public.workspaces ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Workspaces: select member" ON public.workspaces;
CREATE POLICY "Workspaces: select member"
    ON public.workspaces FOR SELECT
    TO authenticated
    USING (
        public.is_workspace_member(id)
        OR created_by = auth.uid()
    );

DROP POLICY IF EXISTS "Workspaces: insert creator" ON public.workspaces;
CREATE POLICY "Workspaces: insert creator"
    ON public.workspaces FOR INSERT
    TO authenticated
    WITH CHECK (created_by = auth.uid());

DROP POLICY IF EXISTS "Workspaces: update owner" ON public.workspaces;
CREATE POLICY "Workspaces: update owner"
    ON public.workspaces FOR UPDATE
    TO authenticated
    USING (public.is_workspace_owner(id))
    WITH CHECK (
        public.is_workspace_owner(id)
        AND created_by = workspaces.created_by
    );

DROP POLICY IF EXISTS "Workspaces: delete owner" ON public.workspaces;
CREATE POLICY "Workspaces: delete owner"
    ON public.workspaces FOR DELETE
    TO authenticated
    USING (public.is_workspace_owner(id));

-- ==============================================================================
-- SECTION 5: WORKSPACE MEMBERS TABLE POLICIES (Anti-Elevation & RBAC)
-- ==============================================================================
ALTER TABLE public.workspace_members ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Members: select member" ON public.workspace_members;
CREATE POLICY "Members: select member"
    ON public.workspace_members FOR SELECT
    TO authenticated
    USING (public.is_workspace_member(workspace_id));

-- Only owners can invite/add new members, OR a workspace creator bootstrapping their initial owner row
DROP POLICY IF EXISTS "Members: insert owner only" ON public.workspace_members;
CREATE POLICY "Members: insert owner only"
    ON public.workspace_members FOR INSERT
    TO authenticated
    WITH CHECK (
        (public.is_workspace_owner(workspace_id) AND role IN ('owner', 'editor', 'viewer'))
        OR (
            user_id = auth.uid()
            AND role = 'owner'
            AND public.is_workspace_creator(workspace_id)
        )
    );

-- Only owners can update member roles; enforces valid roles and prevents changing workspace_id or user_id
DROP POLICY IF EXISTS "Members: update owner only" ON public.workspace_members;
CREATE POLICY "Members: update owner only"
    ON public.workspace_members FOR UPDATE
    TO authenticated
    USING (public.is_workspace_owner(workspace_id))
    WITH CHECK (
        public.is_workspace_owner(workspace_id)
        AND role IN ('owner', 'editor', 'viewer')
        AND workspace_id = workspace_members.workspace_id
        AND user_id = workspace_members.user_id
    );

-- Only owners can remove members; non-owners can only voluntarily leave their own membership (if not owner)
DROP POLICY IF EXISTS "Members: delete owner only" ON public.workspace_members;
CREATE POLICY "Members: delete owner only"
    ON public.workspace_members FOR DELETE
    TO authenticated
    USING (
        public.is_workspace_owner(workspace_id)
        OR (user_id = auth.uid() AND role <> 'owner')
    );

-- ==============================================================================
-- SECTION 6: FILES TABLE POLICIES (Metadata only)
-- ==============================================================================
ALTER TABLE public.files ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Files: select member" ON public.files;
CREATE POLICY "Files: select member"
    ON public.files FOR SELECT
    TO authenticated
    USING (public.is_workspace_member(workspace_id));

-- Only Owners and Editors can upload files (Viewers are strictly DENIED)
DROP POLICY IF EXISTS "Files: insert editor and owner" ON public.files;
CREATE POLICY "Files: insert editor and owner"
    ON public.files FOR INSERT
    TO authenticated
    WITH CHECK (
        public.is_workspace_editor_or_owner(workspace_id)
        AND (uploaded_by IS NULL OR uploaded_by = auth.uid())
    );

-- Only Owners and Editors can update files
DROP POLICY IF EXISTS "Files: update editor and owner" ON public.files;
CREATE POLICY "Files: update editor and owner"
    ON public.files FOR UPDATE
    TO authenticated
    USING (public.is_workspace_editor_or_owner(workspace_id))
    WITH CHECK (
        public.is_workspace_editor_or_owner(workspace_id)
        AND workspace_id = files.workspace_id
    );

-- Only Owners and Editors can delete files
DROP POLICY IF EXISTS "Files: delete editor and owner" ON public.files;
CREATE POLICY "Files: delete editor and owner"
    ON public.files FOR DELETE
    TO authenticated
    USING (public.is_workspace_editor_or_owner(workspace_id));

-- ==============================================================================
-- SECTION 7: OCR RESULTS TABLE POLICIES
-- ==============================================================================
ALTER TABLE public.ocr_results ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "OCR: select member" ON public.ocr_results;
CREATE POLICY "OCR: select member"
    ON public.ocr_results FOR SELECT
    TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM public.files f
            WHERE f.id = ocr_results.file_id
              AND public.is_workspace_member(f.workspace_id)
        )
    );

-- Only Owners and Editors can insert OCR results (Viewers are DENIED)
DROP POLICY IF EXISTS "OCR: insert editor and owner" ON public.ocr_results;
CREATE POLICY "OCR: insert editor and owner"
    ON public.ocr_results FOR INSERT
    TO authenticated
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM public.files f
            WHERE f.id = ocr_results.file_id
              AND public.is_workspace_editor_or_owner(f.workspace_id)
        )
    );

DROP POLICY IF EXISTS "OCR: update editor and owner" ON public.ocr_results;
CREATE POLICY "OCR: update editor and owner"
    ON public.ocr_results FOR UPDATE
    TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM public.files f
            WHERE f.id = ocr_results.file_id
              AND public.is_workspace_editor_or_owner(f.workspace_id)
        )
    )
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM public.files f
            WHERE f.id = ocr_results.file_id
              AND public.is_workspace_editor_or_owner(f.workspace_id)
        )
        AND file_id = ocr_results.file_id
    );

DROP POLICY IF EXISTS "OCR: delete editor and owner" ON public.ocr_results;
CREATE POLICY "OCR: delete editor and owner"
    ON public.ocr_results FOR DELETE
    TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM public.files f
            WHERE f.id = ocr_results.file_id
              AND public.is_workspace_editor_or_owner(f.workspace_id)
        )
    );

-- ==============================================================================
-- SECTION 8: AI REQUESTS TABLE POLICIES
-- ==============================================================================
ALTER TABLE public.ai_requests ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "AI Requests: select member" ON public.ai_requests;
CREATE POLICY "AI Requests: select member"
    ON public.ai_requests FOR SELECT
    TO authenticated
    USING (public.is_workspace_member(workspace_id));

-- Only Owners and Editors can record AI requests (Viewers are DENIED)
DROP POLICY IF EXISTS "AI Requests: insert editor and owner" ON public.ai_requests;
CREATE POLICY "AI Requests: insert editor and owner"
    ON public.ai_requests FOR INSERT
    TO authenticated
    WITH CHECK (
        public.is_workspace_editor_or_owner(workspace_id)
        AND (user_id IS NULL OR user_id = auth.uid())
    );

DROP POLICY IF EXISTS "AI Requests: update editor and owner" ON public.ai_requests;
CREATE POLICY "AI Requests: update editor and owner"
    ON public.ai_requests FOR UPDATE
    TO authenticated
    USING (public.is_workspace_editor_or_owner(workspace_id))
    WITH CHECK (
        public.is_workspace_editor_or_owner(workspace_id)
        AND workspace_id = ai_requests.workspace_id
    );

-- Only Owners can delete AI execution audit records
DROP POLICY IF EXISTS "AI Requests: delete owner" ON public.ai_requests;
CREATE POLICY "AI Requests: delete owner"
    ON public.ai_requests FOR DELETE
    TO authenticated
    USING (public.is_workspace_owner(workspace_id));

-- ==============================================================================
-- SECTION 9: TRANSFORMATIONS TABLE POLICIES
-- ==============================================================================
ALTER TABLE public.transformations ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Transformations: select member" ON public.transformations;
CREATE POLICY "Transformations: select member"
    ON public.transformations FOR SELECT
    TO authenticated
    USING (public.is_workspace_member(workspace_id));

-- Only Owners and Editors can create transformations (Viewers are DENIED)
DROP POLICY IF EXISTS "Transformations: insert editor and owner" ON public.transformations;
CREATE POLICY "Transformations: insert editor and owner"
    ON public.transformations FOR INSERT
    TO authenticated
    WITH CHECK (
        public.is_workspace_editor_or_owner(workspace_id)
        AND (created_by IS NULL OR created_by = auth.uid())
    );

-- Only Owners and Editors can advance transformation stages (Viewers are DENIED)
DROP POLICY IF EXISTS "Transformations: update editor and owner" ON public.transformations;
CREATE POLICY "Transformations: update editor and owner"
    ON public.transformations FOR UPDATE
    TO authenticated
    USING (public.is_workspace_editor_or_owner(workspace_id))
    WITH CHECK (
        public.is_workspace_editor_or_owner(workspace_id)
        AND workspace_id = transformations.workspace_id
    );

-- Only Owners can delete transformations (Editors and Viewers are DENIED)
DROP POLICY IF EXISTS "Transformations: delete owner" ON public.transformations;
CREATE POLICY "Transformations: delete owner"
    ON public.transformations FOR DELETE
    TO authenticated
    USING (public.is_workspace_owner(workspace_id));

-- ==============================================================================
-- SECTION 10: CLAIMS TABLE POLICIES
-- ==============================================================================
ALTER TABLE public.claims ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Claims: select member" ON public.claims;
CREATE POLICY "Claims: select member"
    ON public.claims FOR SELECT
    TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM public.transformations t
            WHERE t.id = claims.transformation_id
              AND public.is_workspace_member(t.workspace_id)
        )
    );

-- Only Owners and Editors can insert claims (Viewers are DENIED)
DROP POLICY IF EXISTS "Claims: insert editor and owner" ON public.claims;
CREATE POLICY "Claims: insert editor and owner"
    ON public.claims FOR INSERT
    TO authenticated
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM public.transformations t
            WHERE t.id = claims.transformation_id
              AND public.is_workspace_editor_or_owner(t.workspace_id)
        )
    );

-- Only Owners and Editors can update/verify claims (Viewers are DENIED)
DROP POLICY IF EXISTS "Claims: update editor and owner" ON public.claims;
CREATE POLICY "Claims: update editor and owner"
    ON public.claims FOR UPDATE
    TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM public.transformations t
            WHERE t.id = claims.transformation_id
              AND public.is_workspace_editor_or_owner(t.workspace_id)
        )
    )
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM public.transformations t
            WHERE t.id = claims.transformation_id
              AND public.is_workspace_editor_or_owner(t.workspace_id)
        )
        AND transformation_id = claims.transformation_id
    );

-- Only Owners and Editors can delete claims (Viewers are DENIED)
DROP POLICY IF EXISTS "Claims: delete editor and owner" ON public.claims;
CREATE POLICY "Claims: delete editor and owner"
    ON public.claims FOR DELETE
    TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM public.transformations t
            WHERE t.id = claims.transformation_id
              AND public.is_workspace_editor_or_owner(t.workspace_id)
        )
    );

-- ==============================================================================
-- SECTION 11: OUTPUTS TABLE POLICIES
-- ==============================================================================
ALTER TABLE public.outputs ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Outputs: select member" ON public.outputs;
CREATE POLICY "Outputs: select member"
    ON public.outputs FOR SELECT
    TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM public.transformations t
            WHERE t.id = outputs.transformation_id
              AND public.is_workspace_member(t.workspace_id)
        )
    );

-- Only Owners and Editors can create output artifacts (Viewers are DENIED)
DROP POLICY IF EXISTS "Outputs: insert editor and owner" ON public.outputs;
CREATE POLICY "Outputs: insert editor and owner"
    ON public.outputs FOR INSERT
    TO authenticated
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM public.transformations t
            WHERE t.id = outputs.transformation_id
              AND public.is_workspace_editor_or_owner(t.workspace_id)
        )
    );

-- Only Owners and Editors can update output artifacts
DROP POLICY IF EXISTS "Outputs: update editor and owner" ON public.outputs;
CREATE POLICY "Outputs: update editor and owner"
    ON public.outputs FOR UPDATE
    TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM public.transformations t
            WHERE t.id = outputs.transformation_id
              AND public.is_workspace_editor_or_owner(t.workspace_id)
        )
    )
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM public.transformations t
            WHERE t.id = outputs.transformation_id
              AND public.is_workspace_editor_or_owner(t.workspace_id)
        )
        AND transformation_id = outputs.transformation_id
    );

-- Only Owners can delete output artifacts
DROP POLICY IF EXISTS "Outputs: delete owner" ON public.outputs;
CREATE POLICY "Outputs: delete owner"
    ON public.outputs FOR DELETE
    TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM public.transformations t
            WHERE t.id = outputs.transformation_id
              AND public.is_workspace_owner(t.workspace_id)
        )
    );

-- ==============================================================================
-- SECTION 12: AUDIT LOGS TABLE POLICIES (Anti-Forgery & Append-Only)
-- ==============================================================================
-- ARCHITECTURAL NOTE:
-- Trusted institutional audit records (document verification fingerprints, cryptographic hashes,
-- automated transformation events, formal approvals) are authored securely by the backend application
-- service layer using the Supabase service_role key, which bypasses RLS.
--
-- The policy below permits verified, authenticated clients to submit client-side telemetry events
-- (e.g. user navigation, UI interactions) ONLY IF:
-- 1. The caller is a confirmed member of the specified workspace.
-- 2. The event is strictly attributed to the caller's verified auth.uid().
-- 3. Action and resource_type strings are non-empty.
--
-- STRICT IMMUTABILITY:
-- No UPDATE or DELETE policies are declared. PostgreSQL RLS defaults to DENY ALL.
-- Existing audit ledger entries cannot be mutated or purged by any client.
-- ==============================================================================
ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Audit: select member" ON public.audit_logs;
CREATE POLICY "Audit: select member"
    ON public.audit_logs FOR SELECT
    TO authenticated
    USING (public.is_workspace_member(workspace_id));

DROP POLICY IF EXISTS "Audit: insert member" ON public.audit_logs;
DROP POLICY IF EXISTS "Audit: insert member strictly validated" ON public.audit_logs;
CREATE POLICY "Audit: insert member strictly validated"
    ON public.audit_logs FOR INSERT
    TO authenticated
    WITH CHECK (
        public.is_workspace_member(workspace_id)
        AND user_id = auth.uid()
        AND action IS NOT NULL
        AND length(trim(action)) > 0
        AND resource_type IS NOT NULL
        AND length(trim(resource_type)) > 0
    );
