import dotenv from 'dotenv';

// Load environment variables from .env file
dotenv.config();

const config = Object.freeze({
  env: process.env.NODE_ENV || 'development',
  isProduction: process.env.NODE_ENV === 'production',
  isDevelopment: process.env.NODE_ENV === 'development',
  port: parseInt(process.env.PORT || '5000', 10),
  apiPrefix: process.env.API_PREFIX || '/api/v1',
  cors: {
    origin: process.env.CORS_ORIGIN ? process.env.CORS_ORIGIN.split(',').map((o) => o.trim()) : '*',
  },
  firebase: {
    projectId: process.env.FIREBASE_PROJECT_ID || '',
    clientEmail: process.env.FIREBASE_CLIENT_EMAIL || '',
    privateKey: process.env.FIREBASE_PRIVATE_KEY || '',
    serviceAccountPath: process.env.FIREBASE_SERVICE_ACCOUNT_PATH || '',
    storageBucket: process.env.FIREBASE_STORAGE_BUCKET || '',
  },
  jwt: {
    secret: process.env.JWT_SECRET || 'audit-ai-engine-super-secret-dev-key-change-in-production-2026',
    expiresIn: process.env.JWT_EXPIRES_IN || '7d',
  },
  bcrypt: {
    saltRounds: parseInt(process.env.BCRYPT_SALT_ROUNDS || '10', 10),
  },
  upload: {
    dir: process.env.UPLOAD_DIR || 'uploads',
    maxFileSizeMb: parseInt(process.env.MAX_FILE_SIZE_MB || '20', 10),
  },
  gemini: {
    apiKey: process.env.GEMINI_API_KEY || '',
    model: process.env.GEMINI_MODEL || 'gemini-2.5-flash',
    embeddingModel: process.env.GEMINI_EMBEDDING_MODEL || 'text-embedding-004',
  },
  rag: {
    chunkSize: parseInt(process.env.RAG_CHUNK_SIZE || '1000', 10),
    chunkOverlap: parseInt(process.env.RAG_CHUNK_OVERLAP || '200', 10),
    topK: parseInt(process.env.RAG_TOP_K || '4', 10),
  },
});

export default config;
