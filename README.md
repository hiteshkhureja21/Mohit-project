# SourceFlow Platform (TRUST-X)

**Transform trusted information into verified communication.**

SourceFlow is an enterprise document-intelligence and content-transformation platform. It ingests complex source documents (reports, threat briefs, policy directives), generates audience-tailored deliverables, runs every claim through a source-grounding verification workbench, and gates final delivery behind strict human review and cryptographic audit logging.

---

## 🏗️ Repository Architecture

The project is arranged into structured `frontend` and `backend` modules orchestrated via root npm workspaces:

```
trust/
├── frontend/                               # React 18 + Vite + TypeScript Frontend
│   ├── public/                             # Static assets, branding logo & icons
│   ├── src/                                # Application source code
│   │   ├── components/                     # Shell, transform stages, and UI components
│   │   ├── config/                         # Central API configuration (VITE_API_URL)
│   │   ├── data/                           # Demo datasets & fixtures
│   │   ├── pages/                          # Application pages & routing views
│   │   ├── services/                       # API clients & service integrations
│   │   ├── store/                          # Global state context (AppContext.tsx)
│   │   ├── styles/                         # Tailwind CSS & theme tokens
│   │   ├── types/                          # TypeScript definitions & RBAC models
│   │   ├── utils/                          # Cryptographic hashing & helpers
│   │   ├── App.tsx                         # Root app component
│   │   ├── main.tsx                        # Vite entry point
│   │   └── vite-env.d.ts                   # Environment type declarations
│   ├── .env.example                        # Frontend environment template
│   ├── .env.local                          # Local environment (VITE_API_URL=http://localhost:5000)
│   ├── index.html                          # HTML shell
│   ├── package.json                        # Frontend dependencies & scripts
│   ├── postcss.config.js                   # PostCSS configuration
│   ├── tailwind.config.js                  # Tailwind design system configuration
│   ├── tsconfig.json                       # TypeScript compiler settings
│   └── vite.config.ts                      # Vite build & dev server configuration
│
├── backend/                                # Node.js + Express REST API Backend
│   ├── src/                                # Modular backend source
│   │   ├── middleware/                     # Authentication & CORS middleware
│   │   │   └── auth.js                     # Bearer token verification & user attachment
│   │   ├── routes/                         # REST API modular route handlers
│   │   └── server.js                       # Express app setup & route mounting
│   ├── .env.example                        # Backend environment template (PORT, FRONTEND_URL)
│   ├── package.json                        # Backend dependencies (express, cors, multer)
│   └── index.js                            # Backend server entry point (port 5000)
│
├── .gitignore                              # Root gitignore protecting secrets & build artifacts
├── package.json                            # Root workspace orchestration
├── README.md                               # Architecture and quickstart guide
├── DESIGN.md                               # Design specifications
└── IMPLEMENTATION_PLAN.md                  # Implementation records
```

---

## 🚀 Quickstart & Commands

### Prerequisites
- **Node.js**: v18 or later
- **npm**: v9 or later

### Install Dependencies
From the repository root:
```bash
npm install
```
*(Installs dependencies for both `frontend` and `backend` via npm workspaces).*

### Run the Development Environment

#### Option A: Run Both Frontend and Backend Concurrently
In Terminal 1 (Backend):
```bash
npm run server
```
*Starts Express API server on `http://localhost:5000`.*

In Terminal 2 (Frontend):
```bash
npm run dev
```
*Starts Vite dev server on `http://localhost:5173`.*

#### Option B: Dedicated Workspace Commands
```bash
# Start frontend only
npm run dev:frontend

# Start backend only
npm run dev:backend

# Production build frontend
npm run build
```

---

## 🔒 Security & Environment Configuration

### Frontend (`frontend/.env.local`):
```env
VITE_API_URL=http://localhost:5000
```
*Only variables prefixed with `VITE_` are exposed to the client bundle. Never place backend secrets here.*

### Backend (`backend/.env.example`):
```env
PORT=5000
FRONTEND_URL=http://localhost:5173
# External providers (Server-side ONLY):
# SUPABASE_URL=
# SUPABASE_SERVICE_ROLE_KEY=
# OPENAI_API_KEY=
# OCR_API_KEY=
```
