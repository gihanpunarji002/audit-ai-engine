import multer from 'multer';
import path from 'path';
import fs from 'fs';
import crypto from 'crypto';
import config from '../config/index.js';
import ApiError from '../utils/ApiError.js';
import { FileType } from '../constants/audit.js';

// Ensure upload directory exists
const uploadDirectory = path.resolve(config.upload.dir);
if (!fs.existsSync(uploadDirectory)) {
  fs.mkdirSync(uploadDirectory, { recursive: true });
}

// Allowed MIME types
const ALLOWED_MIME_TYPES = {
  // Images
  'image/jpeg': FileType.IMAGE,
  'image/jpg': FileType.IMAGE,
  'image/png': FileType.IMAGE,
  'image/webp': FileType.IMAGE,
  'image/gif': FileType.IMAGE,
  'image/tiff': FileType.IMAGE,

  // Text & Documents
  'application/pdf': FileType.DOCUMENT,
  'text/plain': FileType.TEXT,
  'text/markdown': FileType.TEXT,
  'text/csv': FileType.TEXT,
  'application/json': FileType.TEXT,
  'text/html': FileType.TEXT,
  'application/msword': FileType.DOCUMENT,
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document': FileType.DOCUMENT,
};

// Storage Engine
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, uploadDirectory);
  },
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname);
    const uniqueName = `${Date.now()}-${crypto.randomBytes(8).toString('hex')}${ext}`;
    cb(null, uniqueName);
  },
});

// File filter validation
const fileFilter = (req, file, cb) => {
  const fileType = ALLOWED_MIME_TYPES[file.mimetype.toLowerCase()];

  if (!fileType) {
    return cb(
      ApiError.badRequest(
        `Unsupported file type '${file.mimetype}'. Supported formats: PDF, Images (JPEG, PNG, WEBP), Plain text, Markdown, CSV, JSON.`
      ),
      false
    );
  }

  // Attach detected broad fileType to file object for controllers/services
  file.auditFileType = fileType;
  cb(null, true);
};

export const uploadMiddleware = multer({
  storage,
  limits: {
    fileSize: config.upload.maxFileSizeMb * 1024 * 1024, // e.g. 20MB
  },
  fileFilter,
});

export default uploadMiddleware;
