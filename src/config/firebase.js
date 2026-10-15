import fs from 'fs';
import path from 'path';
import { initializeApp, cert, getApps } from 'firebase-admin/app';
import { getFirestore, FieldValue, Timestamp } from 'firebase-admin/firestore';
import { getStorage } from 'firebase-admin/storage';
import config from './index.js';
import logger from '../utils/logger.js';

let app = null;
let firestoreDb = null;
let storageInstance = null;
let defaultBucket = null;

// Determine if live credentials are provided
export const hasCredentials = Boolean(
  (config.firebase.serviceAccountPath && fs.existsSync(path.resolve(config.firebase.serviceAccountPath))) ||
  (config.firebase.clientEmail && config.firebase.privateKey)
);

try {
  const existingApps = getApps();

  if (existingApps.length > 0) {
    app = existingApps[0];
  } else if (config.firebase.serviceAccountPath && fs.existsSync(path.resolve(config.firebase.serviceAccountPath))) {
    // 1. Service Account JSON file path
    const serviceAccount = JSON.parse(
      fs.readFileSync(path.resolve(config.firebase.serviceAccountPath), 'utf8')
    );
    app = initializeApp({
      credential: cert(serviceAccount),
      storageBucket: config.firebase.storageBucket || `${serviceAccount.project_id}.appspot.com`,
    });
    logger.info(`Firebase initialized with Service Account from: ${config.firebase.serviceAccountPath}`);
  } else if (config.firebase.projectId && config.firebase.clientEmail && config.firebase.privateKey) {
    // 2. Direct credentials via environment variables
    app = initializeApp({
      credential: cert({
        projectId: config.firebase.projectId,
        clientEmail: config.firebase.clientEmail,
        privateKey: config.firebase.privateKey.replace(/\\n/g, '\n'),
      }),
      storageBucket: config.firebase.storageBucket || `${config.firebase.projectId}.appspot.com`,
    });
    logger.info(`Firebase initialized with environment credentials for project: ${config.firebase.projectId}`);
  } else {
    // 3. Development placeholder project
    app = initializeApp({
      projectId: config.firebase.projectId || 'audit-ai-engine-dev',
    });
    logger.warn(
      'Firebase live credentials not configured in .env. Configure FIREBASE_SERVICE_ACCOUNT_PATH or project credentials to connect to live Google Cloud Firestore.'
    );
  }

  firestoreDb = getFirestore(app);
  firestoreDb.settings({ ignoreUndefinedProperties: true });

  storageInstance = getStorage(app);
  defaultBucket = config.firebase.storageBucket
    ? storageInstance.bucket(config.firebase.storageBucket)
    : storageInstance.bucket();
} catch (error) {
  logger.error('Failed to initialize Firebase Admin SDK', { error: error.message });
  if (getApps().length === 0) {
    app = initializeApp({ projectId: 'audit-ai-engine-dev' });
  } else {
    app = getApps()[0];
  }
  firestoreDb = getFirestore(app);
  firestoreDb.settings({ ignoreUndefinedProperties: true });
  storageInstance = getStorage(app);
  defaultBucket = storageInstance.bucket();
}

export const db = firestoreDb;
export const storage = storageInstance;
export const bucket = defaultBucket;
export { FieldValue, Timestamp };

/**
 * Test connectivity to Cloud Firestore
 * @returns {Promise<boolean>}
 */
export const testFirebaseConnection = async () => {
  if (!hasCredentials) {
    logger.info('Cloud Firestore: Ready (Waiting for Firebase Service Account in .env)');
    return false;
  }

  try {
    const pingPromise = db
      .collection('_health')
      .doc('status')
      .set({
        service: 'AuditEngine Backend',
        lastPing: FieldValue.serverTimestamp(),
        environment: config.env,
      })
      .catch((err) => {
        logger.warn('Cloud Firestore background ping issue:', { message: err.message });
        throw err;
      });

    const timeoutPromise = new Promise((_, reject) =>
      setTimeout(() => reject(new Error('Firestore connection check timed out')), 3000)
    );

    await Promise.race([pingPromise, timeoutPromise]);
    logger.info('Cloud Firestore connected successfully! Health document updated.');
    return true;
  } catch (error) {
    logger.warn('Cloud Firestore connection status:', { message: error.message });
    return false;
  }
};

export default {
  db,
  storage,
  bucket,
  FieldValue,
  Timestamp,
  hasCredentials,
  testFirebaseConnection,
};
