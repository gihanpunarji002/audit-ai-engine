# AuditEngine - AI-Powered Document Auditing Backend

An enterprise-grade, production-ready Node.js and Express backend built with pure JavaScript (ES Modules), PostgreSQL, JWT authentication, and Google Gemini AI multimodal analysis.

---

## 📁 Architecture & Project Structure

The project follows a standard **Layered Architecture (Separation of Concerns)**:

```text
audit-ai-engine/
├── .env                         # Local environment variables (git-ignored)
├── .env.example                 # Template for environment configuration
├── .gitignore                   # Git ignore configuration
├── package.json                 # Dependencies, scripts, and project metadata
├── README.md                    # Comprehensive technical documentation
├── uploads/                     # Local storage for uploaded audit documents
└── src/
    ├── app.js                   # Express app configuration & middleware pipeline
    ├── server.js                # HTTP server entry point & graceful shutdown
    ├── config/                  # Centralized configuration & DB pool
    │   ├── db.js                # PostgreSQL connection pool & query helpers
    │   └── index.js             # Environment variables parsing & validation
    ├── constants/               # App-wide constants
    │   ├── audit.js             # Audit status, authenticity verdicts, risk levels
    │   ├── httpStatus.js        # Standard HTTP status codes
    │   └── roles.js             # System roles & organization roles
    ├── controllers/             # Request & response handlers
    │   ├── audit.controller.js  # Document upload, AI audit triggers & report retrieval
    │   ├── auth.controller.js   # User registration, login, profile & password
    │   ├── health.controller.js # Health check endpoint
    │   ├── organization.controller.js # Org workspace creation, invitations, members
    │   └── user.controller.js   # Admin user management
    ├── db/                      # Database SQL schemas, migrations, seeds
    │   ├── migrate.js           # Automated schema runner (`npm run db:migrate`)
    │   ├── schema.sql           # Complete PostgreSQL schema (Users, Orgs, Docs, Audits)
    │   └── seed.js              # Database seed script (`npm run db:seed`)
    ├── middlewares/             # Express middlewares
    │   ├── auth.js              # JWT Bearer token authentication
    │   ├── authorize.js         # Role-Based Access Control (RBAC)
    │   ├── errorHandler.js      # Global centralized error handler
    │   ├── notFound.js          # 404 unmatched route handler
    │   ├── requestLogger.js     # HTTP request logging (Morgan + Logger)
    │   ├── upload.js            # Multer multipart upload middleware
    │   └── validate.js          # Declarative request schema validation
    ├── repositories/            # Data Access Layer (SQL queries)
    │   ├── audit.repository.js  # Audit reports data queries
    │   ├── document.repository.js# Documents metadata & Part 2 vector hooks
    │   ├── organization.repository.js # Orgs, members & invitation queries
    │   └── user.repository.js   # Users database operations
    ├── routes/                  # Express routing definitions
    │   ├── audit.routes.js      # AI audit & upload endpoints
    │   ├── auth.routes.js       # Auth & JWT routes (/api/v1/auth)
    │   ├── document.routes.js   # Document retrieval & download endpoints
    │   ├── health.routes.js     # Health check route
    │   ├── index.js             # Master API router (/api/v1)
    │   ├── organization.routes.js # Organization & member routes
    │   └── user.routes.js       # Admin user routes
    ├── services/                # Business Logic Layer
    │   ├── audit.service.js     # Document processing & audit orchestration
    │   ├── auth.service.js      # Password hashing, JWT signing, login/register
    │   ├── gemini.service.js    # Google Gemini AI multimodal analysis
    │   ├── organization.service.js # Organization creation & invitations
    │   └── user.service.js      # User management logic
    └── utils/                   # Shared helper utilities
        ├── ApiError.js          # Standardized operational error class
        ├── ApiResponse.js       # Standardized JSON response envelope
        ├── asyncHandler.js      # Async route controller wrapper
        └── logger.js            # Structured application logger
```

---

## ⚙️ Environment Configuration

Copy `.env.example` to `.env` and configure your credentials:

```bash
cp .env.example .env
```

| Variable | Description | Default |
| :--- | :--- | :--- |
| `NODE_ENV` | Runtime environment (`development` / `production`) | `development` |
| `PORT` | Port number the HTTP server listens on | `5000` |
| `API_PREFIX` | Versioned route prefix | `/api/v1` |
| `CORS_ORIGIN` | Allowed origins (e.g., React frontend: `http://localhost:3000,http://localhost:5173`) | `*` |
| `DB_HOST` | PostgreSQL host | `localhost` |
| `DB_PORT` | PostgreSQL port | `5432` |
| `DB_NAME` | PostgreSQL database name | `audit_engine_dev` |
| `DB_USER` | PostgreSQL user | `postgres` |
| `DB_PASSWORD` | PostgreSQL password | `postgres` |
| `DB_SSL` | Enable SSL (`true` / `false`) | `false` |
| `JWT_SECRET` | Secret key for signing JWT tokens | `<secret_key>` |
| `JWT_EXPIRES_IN`| Token validity duration | `7d` |
| `BCRYPT_SALT_ROUNDS` | Salt rounds for password hashing | `10` |
| `UPLOAD_DIR` | Local disk folder for uploaded audit documents | `uploads` |
| `MAX_FILE_SIZE_MB` | Maximum allowed file upload size (MB) | `20` |
| `GEMINI_API_KEY` | Google Gemini API key | *(optional for dev simulation)* |
| `GEMINI_MODEL` | Google Gemini model name | `gemini-2.5-flash` |

---

## 🚀 Getting Started

### 1. Install Dependencies
```bash
npm install
```

### 2. Run Database Migration
Ensure PostgreSQL is running and your database exists, then run:
```bash
npm run db:migrate
```
*(Optional) Seed initial superadmin and workspace:*
```bash
npm run db:seed
```

### 3. Start the Server
```bash
# Development mode with hot-reload (nodemon)
npm run dev

# Production mode
npm start
```

---

## 🌐 API Endpoints Reference

All API endpoints are prefixed with `/api/v1`:

### 1. Authentication & Profile (`/api/v1/auth`)
| Method | Endpoint | Access | Description | Request Body |
| :--- | :--- | :--- | :--- | :--- |
| `POST` | `/api/v1/auth/register` | Public | Register new user with email & password | `{ "email", "password", "first_name", "last_name" }` |
| `POST` | `/api/v1/auth/login` | Public | Authenticate user & receive JWT token | `{ "email", "password" }` |
| `GET` | `/api/v1/auth/me` | Bearer Token | Get logged-in user profile | None |
| `PUT` | `/api/v1/auth/profile` | Bearer Token | Update first name, last name, avatar | `{ "first_name", "last_name", "avatar_url" }` |
| `POST` | `/api/v1/auth/change-password` | Bearer Token | Securely update password | `{ "currentPassword", "newPassword" }` |

### 2. Organizations & Team Management (`/api/v1/organizations`)
| Method | Endpoint | Access | Description | Request Body |
| :--- | :--- | :--- | :--- | :--- |
| `POST` | `/api/v1/organizations` | Bearer Token | Create new organization (user becomes OWNER) | `{ "name", "description" }` |
| `GET` | `/api/v1/organizations` | Bearer Token | List all organizations current user belongs to | None |
| `GET` | `/api/v1/organizations/:id` | Bearer Token | Get organization details and user role | None |
| `GET` | `/api/v1/organizations/:id/members` | Bearer Token | List members of an organization | None |
| `POST` | `/api/v1/organizations/:id/invitations` | Org Admin/Owner | Send invitation link to an email | `{ "email", "role" }` |
| `POST` | `/api/v1/organizations/:id/members` | Org Admin/Owner | Add existing user directly to organization | `{ "email", "role" }` |
| `POST` | `/api/v1/organizations/invitations/accept` | Bearer Token | Accept organization invitation | `{ "token" }` |
| `PUT` | `/api/v1/organizations/:id/members/:userId`| Org Owner | Change member role (`admin`, `auditor`, `member`) | `{ "role" }` |
| `DELETE`| `/api/v1/organizations/:id/members/:userId`| Org Admin/Owner | Remove member from organization | None |

### 3. Document Auditing & Gemini AI Analysis (`/api/v1/audits`)
| Method | Endpoint | Access | Description | Payload |
| :--- | :--- | :--- | :--- | :--- |
| `POST` | `/api/v1/audits/upload` | Bearer Token | Upload file & run Gemini AI audit immediately | Multipart: `document` (file), `organization_id`, `run_audit` ("true"/"false") |
| `POST` | `/api/v1/audits/:documentId/analyze` | Bearer Token | Trigger AI audit on an existing uploaded document | None |
| `GET` | `/api/v1/audits/:id` | Bearer Token | Get audit report by audit report ID | None |
| `GET` | `/api/v1/audits/document/:documentId` | Bearer Token | Get audit report for specific document | None |
| `GET` | `/api/v1/audits/organization/:orgId` | Bearer Token | List all audit reports in organization | Query params: `?page=1&limit=10&verdict=fake&risk_level=high` |

### 4. Document Management (`/api/v1/documents`)
| Method | Endpoint | Access | Description |
| :--- | :--- | :--- | :--- |
| `GET` | `/api/v1/documents/:id` | Bearer Token | Get document metadata |
| `GET` | `/api/v1/documents/:id/download` | Bearer Token | Download original uploaded document file |
| `GET` | `/api/v1/documents/organization/:orgId` | Bearer Token | List all uploaded documents in organization (`?page=1&limit=10`) |

### 5. Health Check (`/api/v1/health`)
- `GET /api/v1/health` - Check API and PostgreSQL database health status.

---

## 🤖 Google Gemini AI Auditing Capabilities

The auditing engine analyzes both **text documents** and **images/multimodal files** (PDF, JPEG, PNG, WEBP, Plain Text, Markdown, CSV, JSON):

1. **Authenticity Verdict**: Classifies documents as `authentic`, `suspicious`, `fake`, `spam`, or `undetermined`.
2. **Quantitative Scores**:
   - `authenticity_score`: `0.0` to `100.0` (authenticity probability).
   - `overall_score`: `0.0` to `100.0` (overall compliance and health score).
3. **Faults & Flaws Detection**: Categorized list of irregularities (Formatting, Inconsistency, Metadata mismatch, Forgery indicators, Phishing language).
4. **Security & Mitigation Measures**: Prioritized recommendations (`high`, `medium`, `low`) for risk resolution.
5. **Simulated Development Mode**: If `GEMINI_API_KEY` is not provided in `.env`, the system safely operates in simulated mode, producing realistic forensic audit payloads for seamless local UI development.

---

## 🧩 React Frontend Integration Guide

1. **Connecting via CORS**:
   Add your React development origin (e.g. `http://localhost:5173` or `http://localhost:3000`) to `CORS_ORIGIN` in `.env`.
2. **Storing & Passing Token**:
   After logging in via `/api/v1/auth/login`, store `token` in `localStorage` or `sessionStorage` and include it in request headers:
   ```javascript
   headers: {
     'Authorization': `Bearer ${token}`
   }
   ```
3. **Uploading Documents**:
   Use `FormData` to send the document:
   ```javascript
   const formData = new FormData();
   formData.append('document', fileInput.files[0]);
   formData.append('organization_id', currentOrgId);
   formData.append('run_audit', 'true');

   const response = await fetch('http://localhost:5000/api/v1/audits/upload', {
     method: 'POST',
     headers: {
       'Authorization': `Bearer ${token}`
     },
     body: formData
   });
   ```

---

## 🧠 Part 2 Roadmap: RAG & Chroma DB Readiness

The PostgreSQL database schema already includes vector storage and retrieval attributes on the `documents` table:
- `chroma_collection_id`: Reference to the Chroma DB vector collection.
- `embedding_status`: `pending`, `indexed`, `failed`, or `not_applicable`.
- `chunk_count`: Number of semantic chunks created for retrieval.

In Part 2, document text extracted during upload will be automatically chunked, embedded, and indexed into Chroma DB collections per organization for semantic similarity queries and conversational auditing.
