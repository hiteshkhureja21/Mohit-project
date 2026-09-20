# SourceFlow Enterprise Implementation Plan

## Repository Structure Snapshot

- `sourceflow-platform-main/`
- `sourceflow-platform-main/.gitignore`
- `sourceflow-platform-main/DESIGN.md`
- `sourceflow-platform-main/IMPLEMENTATION_PLAN.md`
- `sourceflow-platform-main/README.md`
- `sourceflow-platform-main/index.html`
- `sourceflow-platform-main/package-lock.json`
- `sourceflow-platform-main/package.json`
- `sourceflow-platform-main/postcss.config.js`
- `sourceflow-platform-main/public/`
- `sourceflow-platform-main/public/brand/`
- `sourceflow-platform-main/public/brand/reference_1.png`
- `sourceflow-platform-main/public/brand/reference_2.png`
- `sourceflow-platform-main/public/brand/sourceflow_logo.jpeg`
- `sourceflow-platform-main/public/brand/sourceflow_mark.png`
- `sourceflow-platform-main/public/logo.svg`
- `sourceflow-platform-main/public/sourceflow_logo.jpeg`
- `sourceflow-platform-main/public/sourceflow_mark.png`
- `sourceflow-platform-main/src/`
- `sourceflow-platform-main/src/App.tsx`
- `sourceflow-platform-main/src/components/`
- `sourceflow-platform-main/src/components/common/`
- `sourceflow-platform-main/src/components/common/Badge.tsx`
- `sourceflow-platform-main/src/components/common/Button.tsx`
- `sourceflow-platform-main/src/components/common/KpiCard.tsx`
- `sourceflow-platform-main/src/components/common/Modal.tsx`
- `sourceflow-platform-main/src/components/common/SearchPalette.tsx`
- `sourceflow-platform-main/src/components/common/SourceFlowLogo.tsx`
- `sourceflow-platform-main/src/components/common/Toast.tsx`
- `sourceflow-platform-main/src/components/dashboard/`
- `sourceflow-platform-main/src/components/dashboard/ExecutiveSummaryBar.tsx`
- `sourceflow-platform-main/src/components/dashboard/KpiGrid.tsx`
- `sourceflow-platform-main/src/components/dashboard/PipelinesTable.tsx`
- `sourceflow-platform-main/src/components/dashboard/ReviewQueuePanel.tsx`
- `sourceflow-platform-main/src/components/evidence/`
- `sourceflow-platform-main/src/components/evidence/ClaimCard.tsx`
- `sourceflow-platform-main/src/components/evidence/DocumentViewerPane.tsx`
- `sourceflow-platform-main/src/components/evidence/EvidenceHeader.tsx`
- `sourceflow-platform-main/src/components/output/`
- `sourceflow-platform-main/src/components/output/ArtifactTabs.tsx`
- `sourceflow-platform-main/src/components/output/DocumentCanvas.tsx`
- `sourceflow-platform-main/src/components/output/GroundingMetricsPane.tsx`
- `sourceflow-platform-main/src/components/output/StudioHeader.tsx`
- `sourceflow-platform-main/src/components/review/`
- `sourceflow-platform-main/src/components/review/AuditTrailDrawer.tsx`
- `sourceflow-platform-main/src/components/shell/`
- `sourceflow-platform-main/src/components/shell/ApplicationHeader.tsx`
- `sourceflow-platform-main/src/components/shell/AuditFooter.tsx`
- `sourceflow-platform-main/src/components/shell/Header.tsx`
- `sourceflow-platform-main/src/components/shell/SecurityStrip.tsx`
- `sourceflow-platform-main/src/components/shell/SettingsModal.tsx`
- `sourceflow-platform-main/src/components/shell/Sidebar.tsx`
- `sourceflow-platform-main/src/components/shell/WorkflowStepper.tsx`
- `sourceflow-platform-main/src/components/transform/`
- `sourceflow-platform-main/src/components/transform/Stage01Source.tsx`
- `sourceflow-platform-main/src/components/transform/Stage02Audience.tsx`
- `sourceflow-platform-main/src/components/transform/Stage03Outputs.tsx`
- `sourceflow-platform-main/src/components/transform/Stage04Generate.tsx`
- `sourceflow-platform-main/src/components/transform/Stage05Review.tsx`
- `sourceflow-platform-main/src/components/transform/Stage06Deliver.tsx`
- `sourceflow-platform-main/src/components/transform/Step1Source.tsx`
- `sourceflow-platform-main/src/components/transform/Step2Configure.tsx`
- `sourceflow-platform-main/src/components/transform/Step3Generate.tsx`
- `sourceflow-platform-main/src/components/transform/Step4Verify.tsx`
- `sourceflow-platform-main/src/components/transform/Step5Delivery.tsx`
- `sourceflow-platform-main/src/components/transformation/`
- `sourceflow-platform-main/src/components/transformation/FileUploadDropzone.tsx`
- `sourceflow-platform-main/src/components/transformation/IngestionTelemetry.tsx`
- `sourceflow-platform-main/src/components/workspace/`
- `sourceflow-platform-main/src/components/workspace/CreateDashboardModal.tsx`
- `sourceflow-platform-main/src/components/workspace/CreateWorkspaceModal.tsx`
- `sourceflow-platform-main/src/data/`
- `sourceflow-platform-main/src/data/demoData.ts`
- `sourceflow-platform-main/src/data/mockAuditLogs.ts`
- `sourceflow-platform-main/src/data/mockClaims.ts`
- `sourceflow-platform-main/src/data/mockDocuments.ts`
- `sourceflow-platform-main/src/data/mockJobs.ts`
- `sourceflow-platform-main/src/data/mockOutputs.ts`
- `sourceflow-platform-main/src/main.tsx`
- `sourceflow-platform-main/src/pages/`
- `sourceflow-platform-main/src/pages/ActivityPage.tsx`
- `sourceflow-platform-main/src/pages/AuditPage.tsx`
- `sourceflow-platform-main/src/pages/DashboardPage.tsx`
- `sourceflow-platform-main/src/pages/DashboardSelectorPage.tsx`
- `sourceflow-platform-main/src/pages/DocumentsPage.tsx`
- `sourceflow-platform-main/src/pages/EvidencePage.tsx`
- `sourceflow-platform-main/src/pages/LibraryPage.tsx`
- `sourceflow-platform-main/src/pages/LoginPage.tsx`
- `sourceflow-platform-main/src/pages/OutputStudioPage.tsx`
- `sourceflow-platform-main/src/pages/OverviewPage.tsx`
- `sourceflow-platform-main/src/pages/ProfilesPage.tsx`
- `sourceflow-platform-main/src/pages/ProjectsPage.tsx`
- `sourceflow-platform-main/src/pages/ReviewPage.tsx`
- `sourceflow-platform-main/src/pages/ReviewsPage.tsx`
- `sourceflow-platform-main/src/pages/SettingsPage.tsx`
- `sourceflow-platform-main/src/pages/TransformPage.tsx`
- `sourceflow-platform-main/src/pages/TransformationPage.tsx`
- `sourceflow-platform-main/src/pages/WorkspaceSelectorPage.tsx`
- `sourceflow-platform-main/src/services/`
- `sourceflow-platform-main/src/services/api.ts`
- `sourceflow-platform-main/src/services/auditService.ts`
- `sourceflow-platform-main/src/services/authService.ts`
- `sourceflow-platform-main/src/services/claimService.ts`
- `sourceflow-platform-main/src/services/deliveryService.ts`
- `sourceflow-platform-main/src/services/documentService.ts`
- `sourceflow-platform-main/src/services/generationService.ts`
- `sourceflow-platform-main/src/services/outputService.ts`
- `sourceflow-platform-main/src/services/pipelineService.ts`
- `sourceflow-platform-main/src/services/verificationService.ts`
- `sourceflow-platform-main/src/services/workspaceService.ts`
- `sourceflow-platform-main/src/store/`
- `sourceflow-platform-main/src/store/AppContext.tsx`
- `sourceflow-platform-main/src/styles/`
- `sourceflow-platform-main/src/styles/index.css`
- `sourceflow-platform-main/src/types/`
- `sourceflow-platform-main/src/types/audit.ts`
- `sourceflow-platform-main/src/types/claim.ts`
- `sourceflow-platform-main/src/types/output.ts`
- `sourceflow-platform-main/src/types/pipeline.ts`
- `sourceflow-platform-main/src/types/transformation.ts`
- `sourceflow-platform-main/src/types/user.ts`
- `sourceflow-platform-main/src/types/workspace.ts`
- `sourceflow-platform-main/src/utils/`
- `sourceflow-platform-main/src/utils/date.ts`
- `sourceflow-platform-main/src/utils/hash.ts`
- `sourceflow-platform-main/src/utils/text.ts`
- `sourceflow-platform-main/tailwind.config.js`
- `sourceflow-platform-main/tsconfig.json`
- `sourceflow-platform-main/vite.config.ts`

## Expanded Roadmap


## Vision
SourceFlow (TRUST-X) is a trusted-information transformation platform that converts source material into audience-specific, verifiable deliverables through a governed workflow.

## Architecture

### Frontend
- React
- TypeScript
- Vite
- Tailwind CSS

### Backend (Target)
- Node.js
- Express
- Supabase
- OpenAI integration
- OCR services

### Infrastructure
- Vercel (frontend)
- Supabase (database + storage + auth)

## Functional Modules

### 1. Authentication & Roles
- Owner
- Admin
- Reviewer
- Editor
- Viewer

### 2. Source Intake
- File upload
- URL ingestion
- Metadata extraction
- SHA-256 hashing

### 3. Analysis Engine
- Summaries
- Risks
- Recommendations
- Entity extraction

### 4. Generation Studio
- Executive Briefs
- Technical Advisories
- Communication Packages
- Slide-ready content

### 5. Verification Workbench
- Claim extraction
- Evidence linking
- Resolution workflow
- Approval gating

### 6. Delivery Center
- Email distribution
- Bulk recipients
- Export to PDF/DOCX

### 7. Audit Ledger
- Immutable event trail
- Hash chaining
- Compliance history

## Database Design

### users
id, email, role, created_at

### documents
id, title, source_hash, status, storage_path

### analyses
id, document_id, summary, risks, recommendations

### claims
id, document_id, claim_text, status, evidence

### outputs
id, document_id, audience, output_type, content

### deliveries
id, output_id, recipient, status

### audit_events
id, event_type, hash, previous_hash

## Backend APIs

### Documents
POST /api/documents/upload
GET /api/documents
GET /api/documents/:id

### Analysis
POST /api/analysis/run
GET /api/analysis/:id

### Verification
GET /api/claims
PATCH /api/claims/:id

### Outputs
POST /api/outputs/generate
POST /api/outputs/:id/approve

### Delivery
POST /api/delivery/send

## Milestones

### Phase 1
Project foundation and Supabase.

### Phase 2
Authentication and storage.

### Phase 3
Document processing.

### Phase 4
AI integration.

### Phase 5
Verification workflow.

### Phase 6
Delivery and audit.

## Evaluator Demo

Upload → Analyze → Generate → Verify → Approve → Deliver → Audit

## Definition of Done

- Source uploaded
- Analysis completed
- Deliverables generated
- Claims verified
- Approval completed
- Delivery recorded
- Audit trail persisted
