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
app.use(helmet());

// Cross-Origin Resource Sharing
app.use(cors({
  origin: config.cors.origin,
  credentials: true,
}));

// Request parsing middlewares
app.use(express.json({ limit: '16kb' }));
app.use(express.urlencoded({ extended: true, limit: '16kb' }));

// HTTP request logging
app.use(requestLogger);

// Root informational endpoint
app.get('/', (req, res) => {
  res.json({
    name: 'AuditEngine API',
    version: '1.0.0',
    status: 'healthy',
    apiDocumentation: `${config.apiPrefix}`,
  });
});

// API Routes
app.use(config.apiPrefix, routes);

// 404 Route Handler
app.use(notFound);

// Centralized Error Handler (must be last)
app.use(errorHandler);

export default app;
