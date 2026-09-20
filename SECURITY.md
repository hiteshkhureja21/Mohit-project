# SourceFlow Institutional Security & Deployment Hardening Guide

## 1. Production HTTPS & Transport Layer Security (TLS)

### Mandatory HTTPS Architecture
In production environments, all communication with SourceFlow (frontend and backend APIs) MUST be conducted over encrypted HTTPS/TLS. Cleartext HTTP connections must be immediately redirected to HTTPS with status code `301 Moved Permanently`.

```
Client (Browser / Native)
          │  HTTPS (TLS 1.3 / Port 443)
          ▼
Reverse Proxy / CDN (Cloudflare / AWS CloudFront / Nginx)
          │  Internal TLS / Private VPC
          ▼
SourceFlow Backend (Node.js / Express on Port 5000)
```

### 1.1 Transport Protocol & Cipher Suites
- **Minimum Protocol**: TLS 1.2 (TLS 1.3 strongly recommended).
- **Recommended Ciphers (TLS 1.3)**:
  - `TLS_AES_256_GCM_SHA384`
  - `TLS_CHACHA20_POLY1305_SHA256`
  - `TLS_AES_128_GCM_SHA256`
- **Certificate Management**: Automated renewal via Let's Encrypt Certbot or AWS Certificate Manager (ACM). Ensure OCSP Stapling is enabled.

### 1.2 Strict-Transport-Security (HSTS)
SourceFlow backend emits the standard HSTS header when running in production (`NODE_ENV=production`):
```http
Strict-Transport-Security: max-age=31536000; includeSubDomains; preload
```
This instructs web browsers to only ever connect to SourceFlow via HTTPS for at least 1 year, and to refuse connection downgrades.

### 1.3 Reverse Proxy Configuration Example (Nginx)
```nginx
# HTTP -> HTTPS Redirect
server {
    listen 80;
    listen [::]:80;
    server_name sourceflow.yourdomain.gov.in;
    return 301 https://$host$request_uri;
}

# Secure Production HTTPS Server
server {
    listen 443 ssl http2;
    listen [::]:443 ssl http2;
    server_name sourceflow.yourdomain.gov.in;

    ssl_certificate /etc/letsencrypt/live/sourceflow.yourdomain.gov.in/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/sourceflow.yourdomain.gov.in/privkey.pem;
    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_prefer_server_ciphers on;
    ssl_ciphers 'ECDHE-ECDSA-AES256-GCM-SHA384:ECDHE-RSA-AES256-GCM-SHA384';

    # Security Headers
    add_header X-Content-Type-Options "nosniff" always;
    add_header X-Frame-Options "DENY" always;
    add_header Referrer-Policy "strict-origin-when-cross-origin" always;
    add_header Strict-Transport-Security "max-age=31536000; includeSubDomains; preload" always;

    location / {
        proxy_pass http://127.0.0.1:5000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto https;
    }
}
```

---

## 2. Cross-Origin Resource Sharing (CORS)

- **Production Whitelist**: Arbitrary origins are strictly rejected. Only origins listed in `FRONTEND_URL` and `ALLOWED_ORIGINS` are accepted.
- Requests originating from non-whitelisted origins will fail preflight (`OPTIONS`) with a `403 Forbidden` error.
- Credentials (`credentials: true`) are only exchanged with explicitly authorized origins.

---

## 3. Authentication & Session Security

- **Supabase Authentication**: All client requests must include a valid Bearer token issued by Supabase Auth (`Authorization: Bearer <token>`).
- **No Synthetic Tokens in Production**: Demo tokens (`demo-session-...`) are strictly rejected whenever `NODE_ENV=production` or `DEMO_MODE=false`.
- **JWT Expiry**: Default access tokens expire after 1 hour. Refresh tokens are exchanged securely via Supabase Auth client libraries.

---

## 4. Authorization & Row Level Security (RLS)

- **Workspace Scoping**: Every API request operating on files, transformations, claims, or audit logs validates that the authenticated user is an active member of that workspace.
- **RBAC Roles**:
  - `OWNER`: Full administrative control, member invitation/removal, workspace deletion.
  - `EDITOR`: File upload, transformation runs, AI operations, content update.
  - `VIEWER`: Read-only access to files, claims, and generated outputs. Cannot upload or trigger AI runs.
- **Supabase PostgreSQL RLS**: RLS policies are enabled on `workspaces`, `workspace_members`, `files`, `transformations`, and `claims`.

---

## 5. Secrets Management

- **Zero Hardcoded Secrets**: Source code contains zero API keys, database passwords, or JWT secrets.
- **Environment Isolation**:
  - Private secrets (`SUPABASE_SERVICE_ROLE_KEY`, `OPENAI_API_KEY`, `OCR_API_KEY`) reside exclusively in backend server environment variables.
  - Frontend code is only provided with public client keys prefixed with `VITE_`.
- **Secret Rotation**: Rotate API keys periodically or immediately if an incident is suspected.

---

## 6. File Upload Security

1. **Strict Extension Whitelist**: `.pdf`, `.docx`, `.xlsx`, `.png`, `.jpg`, `.jpeg`.
2. **Double Extension Defense**: Suffix chains containing executable markers (e.g., `.pdf.exe`, `.docx.sh`, `.png.bat`) are rejected immediately.
3. **MIME Verification**: The declared MIME type must match the extension.
4. **Path Traversal Defense**: All filenames are stripped of `..`, null bytes (`\0`), control characters, and slashes.
5. **Private Storage**: Storage buckets in Supabase Storage are marked `public: false`. Files are accessed via temporary signed URLs with a 300-second time-to-live.
6. **File Size Enforcement**: 50MB hard limit checked in Multer and in `StorageService`.

---

## 7. Rate Limiting & Denial of Service Defense

The backend enforces sliding-window in-memory rate limits:
- **Authentication** (`/api/auth/*`): 10 requests / 15 minutes (brute-force defense)
- **AI Endpoints** (`/api/ai/*`): 20 requests / minute (cost and compute defense)
- **OCR Endpoints** (`/api/ocr/*`): 15 requests / minute
- **File Uploads** (`/api/files`): 20 uploads / 15 minutes
- **Translation** (`/api/translate`): 30 requests / minute
- **General API**: 120 requests / minute

When a client exceeds the limit, the server responds with:
- Status: `HTTP 429 Too Many Requests`
- Header: `Retry-After: <seconds>`
- JSON: `{ "success": false, "error": { "code": "RATE_LIMIT_EXCEEDED", "message": "...", "retryAfter": <seconds> } }`

---

## 8. Error Handling & Information Leakage Prevention

- **Stack Traces**: Completely suppressed in production and omitted from client responses.
- **Credential Masking**: Server-side error sanitizers strip API keys (`sk-...`), Bearer tokens, and Postgres credentials prior to returning JSON responses.
- **Generic 500 Responses**: In production, unhandled server exceptions return a uniform, safe response:
  ```json
  {
    "success": false,
    "error": {
      "code": "INTERNAL_SERVER_ERROR",
      "message": "An internal server error occurred. Our engineering team has been notified."
    },
    "timestamp": "..."
  }
  ```

---

## 9. Audit Logging & Data Privacy

- **Redacted Fields**: The institutional logger (`logger.js`) redacts `password`, `token`, `access_token`, `authorization`, `cookie`, `apiKey`, and `secret`.
- **Confidential Document Protection**: Large text payloads and document OCR contents exceeding 500 characters are truncated in logs to prevent institutional records from leaking into monitoring sinks.
