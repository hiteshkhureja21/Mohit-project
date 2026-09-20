-- ============================================================
-- Step 9: Government Data Integration — Database Schema
-- ============================================================
-- Stores audit records of government dataset queries per workspace.
-- The actual dataset records are fetched live from data.gov.in /
-- API Setu on each request (with TTL caching in-memory).
-- No external API credentials are ever stored in this table.
-- ============================================================

-- Enable required extensions (idempotent)
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ============================================================
-- Table: public.government_datasets
-- Stores cached government dataset metadata per workspace.
-- Allows workspace-scoped audit trail of government data access.
-- ============================================================
CREATE TABLE IF NOT EXISTS public.government_datasets (
  id              UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id    UUID        NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  created_by      UUID        NOT NULL REFERENCES auth.users(id) ON DELETE SET NULL,

  -- Dataset identity (sourced from provider)
  dataset_id      TEXT        NOT NULL,             -- Provider's own dataset/resource ID
  provider        TEXT        NOT NULL DEFAULT 'data.gov.in',
  title           TEXT        NOT NULL,
  agency          TEXT,
  url             TEXT,
  category        TEXT,
  summary         TEXT,
  record_count    INTEGER     DEFAULT 0,

  -- Provenance
  last_fetched_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  -- Prevent duplicate dataset entries per workspace and provider
  CONSTRAINT uq_gov_dataset_workspace_provider
    UNIQUE (workspace_id, dataset_id, provider)
);

-- ============================================================
-- Indexes
-- ============================================================
CREATE INDEX IF NOT EXISTS idx_government_datasets_workspace_id
  ON public.government_datasets (workspace_id);

CREATE INDEX IF NOT EXISTS idx_government_datasets_provider
  ON public.government_datasets (provider);

CREATE INDEX IF NOT EXISTS idx_government_datasets_created_at
  ON public.government_datasets (created_at DESC);

CREATE INDEX IF NOT EXISTS idx_government_datasets_dataset_id
  ON public.government_datasets (dataset_id);

-- ============================================================
-- Comments for documentation
-- ============================================================
COMMENT ON TABLE public.government_datasets IS
  'Audit log of government open-data datasets accessed per workspace (data.gov.in, API Setu).';

COMMENT ON COLUMN public.government_datasets.dataset_id IS
  'The ID as provided by the government data provider (e.g. GOV-IN-CERT-01, or resource UUID from data.gov.in API).';

COMMENT ON COLUMN public.government_datasets.provider IS
  'Name of the government platform: data.gov.in or apisetu.';

COMMENT ON COLUMN public.government_datasets.workspace_id IS
  'Tenant boundary — every government dataset access is scoped to a workspace.';

COMMENT ON COLUMN public.government_datasets.last_fetched_at IS
  'Timestamp of the most recent live API fetch for this dataset by this workspace.';
