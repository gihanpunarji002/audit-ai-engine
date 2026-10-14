# AuditEngine - Node.js & Express Backend Boilerplate

An industry-standard, production-grade Node.js and Express backend boilerplate built with pure JavaScript (ES Modules) and PostgreSQL.

---

## 📁 Architecture & Project Structure

The project follows a standard **Layered Architecture (Separation of Concerns)**:

```text
server/
├── .env                  # Local environment variables (git-ignored)
├── .env.example          # Template for environment configuration
├── .gitignore            # Git ignore configuration
├── package.json          # Dependencies, scripts, and project metadata
├── README.md             # Project documentation
└── src/
    ├── app.js            # Express app configuration & middleware pipeline
    ├── server.js         # HTTP server entry point & graceful shutdown
    ├── config/           # Centralized configuration & DB pool
    │   ├── db.js         # PostgreSQL connection pool & query helpers
    │   └── index.js      # Environment variables parsing & validation
    ├── constants/        # App-wide constants (HTTP status codes, etc.)
    │   └── httpStatus.js
    ├── controllers/      # Request & response handlers
    │   ├── health.controller.js
    │   └── user.controller.js
    ├── db/               # Database SQL schemas & migrations
    │   └── schema.sql
    ├── middlewares/      # Express middlewares
    │   ├── errorHandler.js # Global centralized error handler
    │   ├── notFound.js     # 404 unmatched route handler
    │   └── requestLogger.js# HTTP request logging (Morgan + Logger)
    ├── repositories/     # Data Access Layer (SQL queries)
    │   └── user.repository.js
    ├── routes/           # Express routing definitions
    │   ├── health.routes.js
    │   ├── index.js      # Master API router (/api/v1)
    │   └── user.routes.js
    ├── services/         # Business Logic Layer
    │   └── user.service.js
    └── utils/            # Helper utilities
        ├── ApiError.js   # Standardized operational error class
        ├── ApiResponse.js# Standardized JSON response envelope
        ├── asyncHandler.js# Async route controller wrapper
        └── logger.js     # Structured application logger
```

---

## ⚙️ Environment Variables

The application is pre-configured via `.env` (derived from `.env.example`):

| Variable | Description | Default |
| :--- | :--- | :--- |
| `NODE_ENV` | Runtime environment (`development` / `production`) | `development` |
| `PORT` | Port number the HTTP server listens on | `5000` |
| `API_PREFIX` | Versioned route prefix | `/api/v1` |
| `CORS_ORIGIN` | Allowed origin for CORS | `*` |
| `DB_HOST` | PostgreSQL host | `localhost` |
| `DB_PORT` | PostgreSQL port | `5432` |
| `DB_NAME` | PostgreSQL database name | `audit_engine_dev` |
| `DB_USER` | PostgreSQL user | `postgres` |
| `DB_PASSWORD` | PostgreSQL password | `postgres` |
| `DB_SSL` | Enable SSL (`true`/`false`) | `false` |
| `DB_POOL_MAX` | Maximum database pool connections | `20` |
| `DB_IDLE_TIMEOUT_MILLIS` | Connection idle timeout (ms) | `30000` |
| `DB_CONNECTION_TIMEOUT_MILLIS` | Connection acquire timeout (ms) | `5000` |

---

## 🚀 Available Scripts

Run commands when you are ready to install and launch:

```bash
# Install dependencies
npm install

# Start in development mode with auto-reload (nodemon)
npm run dev

# Start in production mode
npm start
```

---

## 🌐 API Endpoints

All API endpoints are prefixed with `/api/v1`:

### Health Check
- `GET /api/v1/health` - Check API and PostgreSQL database health status

### User Resource (Sample CRUD)
- `GET /api/v1/users` - Get paginated users (`?page=1&limit=10`)
- `GET /api/v1/users/:id` - Get user by ID
- `POST /api/v1/users` - Create a new user (`{ "name": "...", "email": "..." }`)
- `PUT /api/v1/users/:id` - Update user details
- `DELETE /api/v1/users/:id` - Delete user

---

## 🛡️ Key Features

1. **Pure JavaScript (ES Modules)**: Native `import`/`export` syntax using `"type": "module"`.
2. **PostgreSQL Connection Pool**: Managed via `pg` with parameterized SQL to prevent SQL injection and transaction support.
3. **Layered Separation of Concerns**:
   - `Controllers`: Parse HTTP input, delegate to services, format response.
   - `Services`: Business rules, validation, domain logic.
   - `Repositories`: Direct SQL database access.
4. **Resilient Error Handling**: Centralized `ApiError` class, capturing PostgreSQL error codes (`23505`, `23503`), hiding stack traces in production.
5. **Standardized Response Envelope**: Uniform `{ success, statusCode, message, data }` format via `ApiResponse`.
6. **Graceful Shutdown**: Intercepts `SIGTERM`, `SIGINT`, `uncaughtException`, and `unhandledRejection` to safely drain DB pools and active HTTP requests.
