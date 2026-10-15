import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import config from './config/index.js';
import requestLogger from './middlewares/requestLogger.js';
import notFound from './middlewares/notFound.js';
import errorHandler from './middlewares/errorHandler.js';
import routes from './routes/index.js';

const app = express();

// Security HTTP headers
app.use(helmet({
  crossOriginResourcePolicy: false,
}));

// Cross-Origin Resource Sharing (React Frontend support)
const allowedOrigins = Array.isArray(config.cors.origin)
  ? config.cors.origin
  : [config.cors.origin];

app.use(
  cors({
    origin: (origin, callback) => {
      // Allow requests with no origin (like mobile apps, curl, Postman)
      if (!origin) return callback(null, true);
      if (allowedOrigins.includes('*') || allowedOrigins.includes(origin)) {
        return callback(null, true);
      }
      // Allow localhost in development
      if (config.isDevelopment && origin.includes('localhost')) {
        return callback(null, true);
      }
      return callback(new Error(`Origin ${origin} not allowed by CORS`));
    },
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With'],
  })
);

// Request parsing middlewares
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// HTTP request logging
app.use(requestLogger);

// Root informational endpoint
app.get('/', (req, res) => {
  res.json({
    name: 'AuditEngine AI API',
    version: '1.0.0',
    status: 'healthy',
    apiDocumentation: `${config.apiPrefix}`,
    endpoints: {
      auth: `${config.apiPrefix}/auth`,
      organizations: `${config.apiPrefix}/organizations`,
      audits: `${config.apiPrefix}/audits`,
      documents: `${config.apiPrefix}/documents`,
      health: `${config.apiPrefix}/health`,
    },
  });
});

// API Routes
app.use(config.apiPrefix, routes);

// 404 Route Handler
app.use(notFound);

// Centralized Error Handler (must be last)
app.use(errorHandler);

export default app;
