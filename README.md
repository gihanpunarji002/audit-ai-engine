# AuditEngine - AI-Powered Auditing with Firebase Cloud Firestore KNN & Storage

An enterprise-grade, production-ready Node.js and Express backend built with pure JavaScript (ES Modules), **Firebase Admin SDK**, **Google Cloud Firestore (with native KNN Vector Search)**, **Firebase Cloud Storage**, **JWT Authentication**, and **Google Gemini AI Multimodal Auditing**.

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
├── uploads/                     # Local temporary folder for uploaded documents
└── src/
    ├── app.js                   # Express app configuration & middleware pipeline
    ├── server.js                # HTTP server entry point & graceful shutdown
    ├── config/                  # Centralized configuration
    │   ├── firebase.js          # Firebase Admin SDK, Firestore DB, and Storage initialization
    │   └── index.js             # Environment variables parsing & validation
    ├── constants/               # App-wide constants
    │   ├── audit.js             # Audit status, authenticity verdicts, risk levels
    │   ├── httpStatus.js        # Standard HTTP status codes
    │   └── roles.js             # System roles & organization roles
    ├── controllers/             # Request & response handlers
    │   ├── audit.controller.js  # Document upload, AI audit triggers & report retrieval
    │   ├── auth.controller.js   # User registration, login, profile & password
    │   ├── health.controller.js # Firebase health check endpoint
    │   ├── organization.controller.js # Org workspace creation, invitations, members
    │   ├── rag.controller.js    # Firestore KNN vector search & grounded Q&A
    │   └── user.controller.js   # Admin user management
    ├── db/                      # Database scripts
    │   └── seedFirestore.js     # Cloud Firestore seed script (`npm run db:seed`)
    ├── middlewares/             # Express middlewares
    │   ├── auth.js              # JWT Bearer token authentication
    │   ├── authorize.js         # Role-Based Access Control (RBAC)
    │   ├── errorHandler.js      # Global centralized error handler (with Firebase errors)
    │   ├── notFound.js          # 404 unmatched route handler
    │   ├── requestLogger.js     # HTTP request logging (Morgan + Logger)
    │   ├── upload.js            # Multer multipart upload middleware
    │   └── validate.js          # Declarative request schema validation
    ├── repositories/            # Data Access Layer (Cloud Firestore Collections)
    │   ├── audit.repository.js  # `audit_reports` Firestore collection
    │   ├── document.repository.js# `documents` Firestore collection & storage metadata
    │   ├── organization.repository.js # `organizations`, `organization_members`, `organization_invitations`
    │   ├── rag.repository.js    # `document_chunks` (with KNN findNearest) & `rag_queries`
    │   └── user.repository.js   # `users` Firestore collection
    ├── routes/                  # Express routing definitions
    │   ├── audit.routes.js      # AI audit & upload endpoints
    │   ├── auth.routes.js       # Auth & JWT routes (/api/v1/auth)
    │   ├── document.routes.js   # Document retrieval & download endpoints
    │   ├── health.routes.js     # Health check route
    │   ├── index.js             # Master API router (/api/v1)
    │   ├── organization.routes.js # Organization & member routes
    │   ├── rag.routes.js        # Cloud Firestore KNN Q&A endpoints (/api/v1/rag)
    │   └── user.routes.js       # Admin user routes
    ├── services/                # Business Logic Layer
    │   ├── audit.service.js     # Document processing & audit orchestration
    │   ├── auth.service.js      # Password hashing, JWT signing, login/register
    │   ├── embedding.service.js # Google Gemini text-embedding-004 vectors
    │   ├── gemini.service.js    # Google Gemini AI multimodal analysis
    │   ├── organization.service.js # Organization creation & invitations
    │   ├── rag.service.js       # RAG chunking, indexing & Firestore KNN Q&A
    │   ├── storage.service.js   # Firebase Cloud Storage uploads & signed URLs
    │   └── user.service.js      # User administrative logic
    └── utils/                   # Shared helper utilities
        ├── ApiError.js          # Standardized operational error class
        ├── ApiResponse.js       # Standardized JSON response envelope
        ├── asyncHandler.js      # Async route controller wrapper
        ├── chunker.js           # Semantic recursive character text chunker
        ├── logger.js            # Structured application logger
        └── textExtractor.js     # Text parser for PDF, TXT, MD, CSV, JSON
```

---

## 🔥 Firebase Setup Guide

This application uses **Firebase Admin SDK** to communicate with:
1. **Cloud Firestore**: Database collections for users, workspaces, audits, and vector chunks.
2. **Cloud Firestore Vector Search (KNN)**: Native vector search using `FieldValue.vector` and `.findNearest()`.
3. **Firebase Cloud Storage**: File storage for uploaded documents (PDFs, images, spreadsheets, text).

### How to configure credentials:

#### Option A: Service Account Key File (Recommended)
1. Go to your [Firebase Console](https://console.firebase.google.com/) -> **Project Settings** -> **Service accounts**.
2. Click **Generate new private key** and download the JSON file.
3. Place it in the root folder (e.g. `serviceAccountKey.json`).
4. Set in your `.env`:
   ```env
   FIREBASE_SERVICE_ACCOUNT_PATH=./serviceAccountKey.json
   FIREBASE_STORAGE_BUCKET=your-project-id.firebasestorage.app
   ```

#### Option B: Environment Variables
Alternatively, populate your `.env` directly:
```env
FIREBASE_PROJECT_ID=your-project-id
FIREBASE_CLIENT_EMAIL=firebase-adminsdk-xxxxx@your-project-id.iam.gserviceaccount.com
FIREBASE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----\n"
FIREBASE_STORAGE_BUCKET=your-project-id.firebasestorage.app
```

---

## ⚙️ Environment Variables Table

| Variable | Description | Default |
| :--- | :--- | :--- |
| `NODE_ENV` | Runtime environment (`development` / `production`) | `development` |
| `PORT` | HTTP Server port | `5000` |
| `API_PREFIX` | Versioned route prefix | `/api/v1` |
| `CORS_ORIGIN` | Allowed React origins (e.g. `http://localhost:3000,http://localhost:5173`) | `*` |
| `FIREBASE_SERVICE_ACCOUNT_PATH` | Path to service account JSON file | `./serviceAccountKey.json` |
| `FIREBASE_PROJECT_ID` | Firebase Project ID | `audit-ai-engine` |
| `FIREBASE_STORAGE_BUCKET` | Cloud Storage bucket name | `<project_id>.firebasestorage.app` |
| `JWT_SECRET` | Secret key for signing JWT tokens | `<secret_key>` |
| `JWT_EXPIRES_IN` | Token validity duration | `7d` |
| `BCRYPT_SALT_ROUNDS` | Salt rounds for password hashing | `10` |
| `UPLOAD_DIR` | Temporary local disk buffer for uploads | `uploads` |
| `MAX_FILE_SIZE_MB` | Maximum allowed file upload size (MB) | `20` |
| `GEMINI_API_KEY` | Google Gemini API key | *(optional for dev simulation)* |
| `GEMINI_MODEL` | Google Gemini model name | `gemini-2.5-flash` |
| `GEMINI_EMBEDDING_MODEL`| Embedding model for vector search | `text-embedding-004` |
| `RAG_CHUNK_SIZE` | Target characters per document chunk | `1000` |
| `RAG_CHUNK_OVERLAP` | Character overlap between chunks | `200` |
| `RAG_TOP_K` | Number of top vector matches retrieved | `4` |

---

## 🚀 Getting Started

### 1. Install Dependencies
```bash
npm install
```

### 2. Seed Initial Admin & Demo Organization (Optional)
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

## 🧠 Cloud Firestore KNN Vector Search Architecture

```text
[Document File (PDF / Images / Text)]
                  │
                  ▼
[Uploaded to Firebase Cloud Storage] ──> Returns permanent signed URL
                  │
                  ▼
[Text Extraction (pdf-parse / UTF-8)]
                  │
                  ▼
[Semantic Chunker (1000 chars, 200 overlap)]
                  │
                  ▼
[Vector Embeddings (Gemini text-embedding-004)]
                  │
                  ▼
[Stored in Cloud Firestore: document_chunks]
  - content: string
  - embedding: FieldValue.vector([0.02, 0.45, ...])
                  │
                  ▲
                  │  (Firestore Native KNN findNearest: COSINE)
[User Audit Inquiry: "Check tax compliance across invoices"]
                  │
                  ▼
[Top-K Nearest Chunks Retrieved from Firestore]
                  │
                  ▼
[Grounded Prompt + Evidence Assembled]
                  │
                  ▼
[Gemini 2.5 Flash Forensic Reasoning with Source Citations]
                  │
                  ▼
[Saved in Firestore: rag_queries & Returned to Client]
```

---

## 🌐 API Endpoints Reference

All API endpoints are versioned with `/api/v1`:

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
| `POST` | `/api/v1/audits/upload` | Bearer Token | Upload to Firebase Storage, run AI audit & index chunks | Multipart: `document` (file), `organization_id`, `run_audit` |
| `POST` | `/api/v1/audits/:documentId/analyze` | Bearer Token | Trigger AI audit on an existing uploaded document | None |
| `GET` | `/api/v1/audits/:id` | Bearer Token | Get audit report by audit report ID | None |
| `GET` | `/api/v1/audits/document/:documentId` | Bearer Token | Get audit report for specific document | None |
| `GET` | `/api/v1/audits/organization/:orgId` | Bearer Token | List all audit reports in organization | Query params: `?page=1&limit=10&verdict=fake&risk_level=high` |

### 4. Cloud Firestore KNN Vector Intelligence & RAG (`/api/v1/rag`)
| Method | Endpoint | Access | Description | Request Body / Query |
| :--- | :--- | :--- | :--- | :--- |
| `POST` | `/api/v1/rag/documents/:documentId/index` | Bearer Token | Chunk, embed with Gemini & index document into Firestore | None |
| `POST` | `/api/v1/rag/organizations/:orgId/query` | Bearer Token | Ask audit question across ALL organization documents | `{ "query": "Is vendor VAT ID valid in clause 3?", "top_k": 4 }` |
| `POST` | `/api/v1/rag/documents/:documentId/query` | Bearer Token | Ask audit question scoped to a single document | `{ "query": "What are the payment terms?", "top_k": 3 }` |
| `GET` | `/api/v1/rag/organizations/:orgId/history` | Bearer Token | Retrieve audit inquiry & citation history | Query params: `?page=1&limit=20` |
| `GET` | `/api/v1/rag/organizations/:orgId/status` | Bearer Token | Check Cloud Firestore Vector Store status | None |

### 5. Document Management (`/api/v1/documents`)
| Method | Endpoint | Access | Description |
| :--- | :--- | :--- | :--- |
| `GET` | `/api/v1/documents/:id` | Bearer Token | Get document metadata (including `download_url` in Firebase Storage) |
| `GET` | `/api/v1/documents/:id/download` | Bearer Token | Redirects to Firebase Storage signed URL or streams document |
| `GET` | `/api/v1/documents/organization/:orgId` | Bearer Token | List all uploaded documents in organization (`?page=1&limit=10`) |

### 6. Health Check (`/api/v1/health`)
- `GET /api/v1/health` - Check API, Cloud Firestore, and Storage health status.

---

## 🧩 React Frontend Integration Guide

1. **Authentication**:
   ```javascript
   const res = await fetch('http://localhost:5000/api/v1/auth/login', {
     method: 'POST',
     headers: { 'Content-Type': 'application/json' },
     body: JSON.stringify({ email, password })
   });
   const { data } = await res.json();
   localStorage.setItem('token', data.token);
   ```

2. **Uploading an Audit Document (Saves to Firebase Storage, Audits with Gemini, Indexes in Firestore KNN)**:
   ```javascript
   const formData = new FormData();
   formData.append('document', fileInput.files[0]);
   formData.append('organization_id', orgId);
   formData.append('run_audit', 'true');

   const res = await fetch('http://localhost:5000/api/v1/audits/upload', {
     method: 'POST',
     headers: { 'Authorization': `Bearer ${token}` },
     body: formData
   });
   const { data } = await res.json();
   console.log('Firebase Storage URL:', data.document.download_url);
   console.log('Gemini Audit Report:', data.auditReport);
   ```

3. **Asking an Audit Question (Cloud Firestore KNN Semantic Inquiry)**:
   ```javascript
   const res = await fetch(`http://localhost:5000/api/v1/rag/organizations/${orgId}/query`, {
     method: 'POST',
     headers: {
       'Content-Type': 'application/json',
       'Authorization': `Bearer ${token}`
     },
     body: JSON.stringify({
       query: 'Are there any fraudulent bank details mentioned in recent invoices?',
       top_k: 4
     })
   });
   const { data } = await res.json();
   console.log('Grounded Answer:', data.answer);
   console.log('Cited Sources:', data.sources);
   ```
