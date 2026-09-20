# SourceFlow Platform: Production Deployment & Operations Guide

This document is the authoritative operations runbook for deploying and operating the **SourceFlow Platform** in development, staging, and high-security enterprise production environments.

---

## 1. System Architecture Overview

```
                         [ CLIENT LAYER ]
               Vercel Edge Network (HTTPS / TLS 1.3)
                ├── Single Page Application (Vite + React)
                └── Client-side Routing & Assets (/assets/*)
                                  │
                                  ▼
                        [ APPLICATION LAYER ]
           Node.js / Express Backend (HTTPS / Reverse Proxy)
                ├── Authentication & Supabase JWT Verification
                ├── Multi-tenant RBAC & Workspace Boundary Enforcement
                ├── Rate Limiting & Input Sanitization
                ├── 6-Stage Transformation Pipeline
                └── External Integration Adapters
                      │          │             │
        ┌─────────────┴──┐       │       ┌─────┴──────────────┐
        ▼                ▼       ▼       ▼                    ▼
   [ OpenAI ]       [ OCR.Space ] ─ [ LibreTranslate ]   [ data.gov.in / API Setu ]
        │
        ▼
   [ DATA PERSISTENCE & STORAGE LAYER ]
   Supabase Enterprise Project (Frankfurt / Singapore / US)
        ├── PostgreSQL 15+ (With Row Level Security enabled on all tables)
        ├── Supabase GoTrue Auth (Session tokens & User Identity)
        └── Supabase Storage (`sourceflow-files` private encrypted bucket)
```

---

## 2. Development Setup

### Prerequisites
- Node.js `v20.x` or higher (LTS recommended)
- `npm` `v10.x` or higher
- Git

### Local Quickstart
```bash
# 1. Clone repository
git clone https://github.com/vishal0-7/sourceflow-platform.git
cd sourceflow-platform

# 2. Install workspace dependencies
npm install

# 3. Configure backend local environment
cp backend/.env.example backend/.env
# Edit backend/.env if using real Supabase or OpenAI credentials.
# For zero-config offline development, set: DEMO_MODE=true

# 4. Configure frontend local environment
cp frontend/.env.example frontend/.env
# Default: VITE_API_URL=http://localhost:5000, VITE_DEMO_MODE=false

# 5. Start development servers concurrently
npm run dev:backend    # Starts Express API at http://localhost:5000
npm run dev:frontend   # Starts Vite SPA at http://localhost:5173
```

---

## 3. Environment Variables Matrix

### Backend Environment Variables (`backend/.env`)

| Variable Name | Required | Development Default | Production Value Example | Purpose / Security Notes |
| :--- | :---: | :--- | :--- | :--- |
| `NODE_ENV` | **Yes** | `development` | `production` | Enables production error redaction, strict HTTPS, and HSTS headers. |
| `PORT` | **Yes** | `5000` | `5000` (or injected by PaaS) | Local listening port for the Express HTTP server. |
| `FRONTEND_URL` | **Yes** | `http://localhost:5173` | `https://app.sourceflow.io` | Primary domain allowed in CORS headers with credentials. |
| `ALLOWED_ORIGINS` | No | `http://localhost:5173` | `https://app.sourceflow.io,https://sourceflow.vercel.app` | Comma-separated list of allowed web origins for CORS whitelisting. |
| `DEMO_MODE` | **Yes** | `false` (or `true` offline) | **`false`** | **CRITICAL**: Must always be `false` in production to enforce real auth, real DB, and real file storage. |
| `SUPABASE_URL` | **Yes** | `https://xyz.supabase.co` | `https://prod-project.supabase.co` | Base URL of the dedicated production Supabase project. |
| `SUPABASE_ANON_KEY` | **Yes** | `eyJhb...` | `eyJhb...` | Public/anon API key for Supabase client initialization. |
| `SUPABASE_SERVICE_ROLE_KEY` | **Yes** | `eyJhb...` | `eyJhb...` | **RESTRICTED**: Private service key for backend admin operations. **NEVER** expose to client. |
| `OPENAI_API_KEY` | **Yes** | `sk-...` | `sk-proj-...` | Production OpenAI API key for analysis and transformation generation. |
| `OCR_API_KEY` | **Yes** | `helloworld` | `<your-licensed-ocr-key>` | OCR.Space engine key for scanned document text extraction. |
| `LIBRETRANSLATE_URL` | No | `https://translate.argosopentech.com` | `https://translate.yourdomain.com` | Self-hosted or hosted LibreTranslate base URL. |
| `LIBRETRANSLATE_API_KEY` | No | `""` | `<your-libre-api-key>` | Optional API key for private translation service instance. |
| `DATA_GOV_IN_API_KEY` | No | `""` | `<your-data-gov-in-key>` | Indian Open Government Data API key. |
| `API_SETU_CLIENT_ID` | No | `""` | `<your-setu-client-id>` | Onboarded API Setu institutional Client ID. |
| `API_SETU_API_KEY` | No | `""` | `<your-setu-api-key>` | API Setu institutional service secret. |

### Frontend Environment Variables (`frontend/.env`)

| Variable Name | Required | Development Default | Production Value Example | Purpose / Security Notes |
| :--- | :---: | :--- | :--- | :--- |
| `VITE_API_URL` | **Yes** | `http://localhost:5000` | `https://api.sourceflow.io` | Base URL of the deployed Express backend. |
| `VITE_SUPABASE_URL` | **Yes** | `https://xyz.supabase.co` | `https://prod-project.supabase.co` | Supabase endpoint for client session handling. |
| `VITE_SUPABASE_ANON_KEY` | **Yes** | `eyJhb...` | `eyJhb...` | Public anon key. Safe for client distribution. |
| `VITE_DEMO_MODE` | **Yes** | `false` | **`false`** | Enforces live API calls and disables mock client data. |

> [!WARNING]
> **NO SECRETS IN FRONTEND**: Never prefix private API keys (`OPENAI_API_KEY`, `SUPABASE_SERVICE_ROLE_KEY`) with `VITE_`. Any variable starting with `VITE_` is compiled into public client JavaScript bundles.

---

## 4. Supabase Setup & Configuration

1. **Create Supabase Project**:
   - Go to [Supabase Dashboard](https://database.new) and create a new production project.
   - Choose a region geographically adjacent to your primary operational team.
   - Generate a high-entropy Database Password (minimum 24 characters). Store in an institutional password vault.

2. **Authentication Settings**:
   - Navigate to **Authentication** -> **URL Configuration**.
   - Set **Site URL** to your production frontend domain (e.g., `https://app.sourceflow.io`).
   - Add all authorized redirect URLs:
     - `https://app.sourceflow.io/**`
     - `https://sourceflow.vercel.app/**`
   - In **Authentication** -> **Providers**, configure Email/Password and institutional SAML/SSO if required.
   - Set JWT expiry to `3600` seconds (1 hour) and configure refresh tokens.

---

## 5. Database Schema & Migration Setup

Run the SQL migration files against the production database in the exact sequence specified:

```
Step 1: database/schema.sql
Step 2: database/rls-policies.sql
Step 3: database/storage-setup.sql
Step 4 (Optional Demo/Staging): database/seed.sql
```

### Execution Methods:
**Option A: Supabase Dashboard SQL Editor**:
1. Open **SQL Editor** in your Supabase project dashboard.
2. Copy and execute [`database/schema.sql`](file:///c:/Users/VM-TECH%20COMPUTER/Desktop/trust/database/schema.sql) (Creates all core institutional tables, indexes, triggers, and foreign keys).
3. Copy and execute [`database/rls-policies.sql`](file:///c:/Users/VM-TECH%20COMPUTER/Desktop/trust/database/rls-policies.sql) (Enables RLS on `workspaces`, `workspace_members`, `files`, `transformations`, `claims`, `outputs`, `ai_requests`, `audit_logs`).
4. Copy and execute [`database/storage-setup.sql`](file:///c:/Users/VM-TECH%20COMPUTER/Desktop/trust/database/storage-setup.sql) (Provisions private `sourceflow-files` bucket and object access policies).

**Option B: Supabase CLI**:
```bash
supabase link --project-ref <your-project-ref>
supabase db push
```

---

## 6. Storage Bucket & Policies Setup

SourceFlow mandates strict private storage isolation for uploaded institutional documents:

1. **Bucket Configuration**:
   - Bucket ID: `sourceflow-files`
   - Public Access: **OFF** (Private)
   - Maximum File Size: `50MB` (`52,428,800` bytes)
   - Permitted MIME Types:
     - `application/pdf`
     - `application/vnd.openxmlformats-officedocument.wordprocessingml.document`
     - `application/vnd.openxmlformats-officedocument.spreadsheetml.sheet`
     - `image/png`
     - `image/jpeg`
2. **Access Control**:
   - All client downloads occur through signed URLs generated by the backend with short-lived expiration (15 minutes).
   - Direct anonymous access to storage objects is strictly denied by RLS policies.

---

## 7. Frontend Deployment (Vercel)

SourceFlow frontend is built with Vite and React, configured for zero-configuration deployment on Vercel:

### Deployment Steps:
1. **Connect Repository**:
   - Import the Git repository in the [Vercel Dashboard](https://vercel.com/new).
2. **Configure Build Settings**:
   - **Framework Preset**: `Vite`
   - **Root Directory**: `frontend`
   - **Build Command**: `npm run build` (or `tsc && vite build`)
   - **Output Directory**: `dist`
   - **Install Command**: `npm install`
3. **Environment Variables**:
   In Vercel Project Settings -> **Environment Variables**, add:
   - `VITE_API_URL` = `https://api.sourceflow.io`
   - `VITE_SUPABASE_URL` = `https://<project-ref>.supabase.co`
   - `VITE_SUPABASE_ANON_KEY` = `<production-anon-key>`
   - `VITE_DEMO_MODE` = `false`
4. **Deploy**:
   - Trigger deployment. [`frontend/vercel.json`](file:///c:/Users/VM-TECH%20COMPUTER/Desktop/trust/frontend/vercel.json) automatically enforces client-side SPA routing and sets production security headers (`X-Frame-Options: DENY`, `X-Content-Type-Options: nosniff`).

---

## 8. Backend Deployment (Node.js / Express)

Deploy the Express backend to an enterprise container platform (Render, Railway, AWS ECS, GCP Cloud Run, or Fly.io).

### Method A: Docker Container (Recommended for ECS / Cloud Run / Fly.io)
The production [`backend/Dockerfile`](file:///c:/Users/VM-TECH%20COMPUTER/Desktop/trust/backend/Dockerfile) is multi-staged and runs as an unprivileged `node` user:
```bash
cd backend
docker build -t sourceflow-backend:latest .
docker run -p 5000:5000 \
  -e NODE_ENV=production \
  -e FRONTEND_URL=https://app.sourceflow.io \
  -e DEMO_MODE=false \
  -e SUPABASE_URL=https://<project-ref>.supabase.co \
  -e SUPABASE_ANON_KEY=<anon-key> \
  -e SUPABASE_SERVICE_ROLE_KEY=<service-role-key> \
  -e OPENAI_API_KEY=sk-proj-... \
  -e OCR_API_KEY=... \
  sourceflow-backend:latest
```

### Method B: PaaS Hosting (Render / Railway)
1. Set **Root Directory** to `backend`.
2. Set **Build Command**: `npm ci --only=production`.
3. Set **Start Command**: `node src/server.js`.
4. Configure all environment variables listed in Section 3.
5. Set **Health Check Path** to `/api/health`.

---

## 9. 25-Point Production Readiness Checklist

Before moving production traffic to SourceFlow, verify all 25 controls:

### Environment & Secrets
- [ ] 1. `DEMO_MODE` is strictly set to `false` in backend environment.
- [ ] 2. `VITE_DEMO_MODE` is strictly set to `false` in frontend environment.
- [ ] 3. No `.env` or credential files are tracked in Git (`git status --porcelain` is clean).
- [ ] 4. All secrets (`OPENAI_API_KEY`, `SUPABASE_SERVICE_ROLE_KEY`) are managed via encrypted environment injection.

### Network & Security
- [ ] 5. Frontend and Backend both enforce HTTPS (TLS 1.3 preferred).
- [ ] 6. Strict Transport Security (`HSTS`) header is enabled with `max-age=31536000`.
- [ ] 7. CORS origin whitelist matches only the real production frontend domains.
- [ ] 8. Security headers (`X-Content-Type-Options: nosniff`, `X-Frame-Options: DENY`, `Referrer-Policy`) are returned on all routes.
- [ ] 9. Sliding-window rate limiters are active on `/api/auth`, `/api/ai`, `/api/ocr`, and `/api/files`.

### Database & Auth
- [ ] 10. Supabase production project is active with automated daily backups.
- [ ] 11. Core schema migration ([`database/schema.sql`](file:///c:/Users/VM-TECH%20COMPUTER/Desktop/trust/database/schema.sql)) applied without errors.
- [ ] 12. Row Level Security ([`database/rls-policies.sql`](file:///c:/Users/VM-TECH%20COMPUTER/Desktop/trust/database/rls-policies.sql)) enabled on all 9 institutional tables.
- [ ] 13. Multi-tenant workspace isolation verified (cross-workspace queries rejected with HTTP 403).
- [ ] 14. JWT token authentication verified; expired/fake tokens rejected with HTTP 401.

### Storage & Files
- [ ] 15. `sourceflow-files` bucket created and flagged as private.
- [ ] 16. Object size limit configured to 50MB.
- [ ] 17. Path traversal and executable file extensions (`.exe`, `.sh`, `.pdf.exe`) rejected with HTTP 422.
- [ ] 18. Signed URL downloads expire within 15 minutes.

### Pipelines & Providers
- [ ] 19. OCR.Space API key configured with timeout fallback handling.
- [ ] 20. OpenAI API key configured with rate-limit and quota error trapping.
- [ ] 21. Multi-stage transformation human approval gate blocks unverified claims.
- [ ] 22. LibreTranslate endpoint reachable with timeout safeguards.

### Diagnostics & Monitoring
- [ ] 23. `/api/health` endpoint returns HTTP 200 with service readiness breakdown.
- [ ] 24. Request logging formats every log with unique tracking ID (`req_xxxxxx`).
- [ ] 25. Error responses are sanitized in production (stack traces and internal connection strings stripped).

---

## 10. Rollback & Emergency Recovery Procedures

### Scenario 1: Frontend Deployment Rollback (Vercel)
If a frontend defect is detected:
1. Open the **Vercel Dashboard** -> **Deployments**.
2. Locate the previous known-good deployment.
3. Click the three dots (`...`) -> **Promote to Production**.
4. Traffic routes instantly to the previous build without downtime (< 5 seconds).

### Scenario 2: Backend Container Rollback
If the backend crashes or throws runtime errors:
1. On container platforms (ECS / Cloud Run / Render):
   - Roll back to the previous Docker image digest or deployment tag.
   - Example (Fly.io): `fly deploy --image registry.fly.io/sourceflow-backend:<previous-tag>`
2. Verify service recovery:
   ```bash
   curl -i https://api.sourceflow.io/api/health
   ```

### Scenario 3: Database Schema Rollback
1. Supabase maintains Point-in-Time Recovery (PITR) for enterprise tiers.
2. For specific table rollbacks:
   - Always run additive migrations in production (add nullable columns before deprecating old ones).
   - If an RLS policy causes access issues, revert using [`database/rls-policies.sql`](file:///c:/Users/VM-TECH%20COMPUTER/Desktop/trust/database/rls-policies.sql) definitions.

---

## 11. End-to-End Verification Pipeline

Verify complete system readiness by running the automated production verification suite:
```bash
# Run Master Integration Suite (32 tests across 8 domains)
node backend/test/integration.test.js

# Run Full 10-Stage Production End-to-End Verification Suite
node backend/test/e2e_production.test.js
```
The test validates the complete unbroken lifecycle:
$$\text{Login} \rightarrow \text{Workspace} \rightarrow \text{Upload} \rightarrow \text{Process} \rightarrow \text{OCR} \rightarrow \text{AI} \rightarrow \text{Claims Review} \rightarrow \text{Generate} \rightarrow \text{Download} \rightarrow \text{Logout}$$
plus state persistence across server restarts.
