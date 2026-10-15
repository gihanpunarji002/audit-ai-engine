import path from 'path';
import fs from 'fs';
import { bucket } from '../config/firebase.js';
import config from '../config/index.js';
import logger from '../utils/logger.js';

class StorageService {
  constructor() {
    this.bucket = bucket;
  }

  /**
   * Upload an audit document to Firebase Storage
   * @param {Object} params
   * @param {string} params.localFilePath - Local disk path of the uploaded file
   * @param {string} params.destination - Storage path in Firebase bucket
   * @param {string} params.mimeType - MIME content type
   * @returns {Promise<{ storagePath: string, downloadUrl: string, isCloudStorage: boolean }>}
   */
  async uploadFile({ localFilePath, destination, mimeType }) {
    try {
      if (!this.bucket || !config.firebase.storageBucket) {
        logger.info('Firebase Storage bucket not configured. Keeping file in local upload storage.');
        return {
          storagePath: destination,
          downloadUrl: `/uploads/${path.basename(localFilePath)}`,
          isCloudStorage: false,
        };
      }

      logger.info(`Uploading file to Firebase Storage: gs://${this.bucket.name}/${destination}`);

      await this.bucket.upload(localFilePath, {
        destination,
        metadata: {
          contentType: mimeType,
          metadata: {
            uploadedAt: new Date().toISOString(),
          },
        },
      });

      const file = this.bucket.file(destination);
      let downloadUrl = '';

      try {
        const [signedUrl] = await file.getSignedUrl({
          action: 'read',
          expires: '01-01-2035',
        });
        downloadUrl = signedUrl;
      } catch (signErr) {
        logger.warn('Could not generate signed URL, using standard bucket path', { error: signErr.message });
        downloadUrl = `https://storage.googleapis.com/${this.bucket.name}/${destination}`;
      }

      logger.info(`File successfully uploaded to Firebase Storage: ${destination}`);

      return {
        storagePath: destination,
        downloadUrl,
        isCloudStorage: true,
      };
    } catch (error) {
      logger.warn(`Firebase Storage upload failed: ${error.message}. Falling back to local storage.`);
      return {
        storagePath: destination,
        downloadUrl: `/uploads/${path.basename(localFilePath)}`,
        isCloudStorage: false,
      };
    }
  }

  /**
   * Delete a file from Firebase Storage
   * @param {string} storagePath 
   */
  async deleteFile(storagePath) {
    if (!this.bucket || !storagePath) return;

    try {
      const file = this.bucket.file(storagePath);
      const [exists] = await file.exists();
      if (exists) {
        await file.delete();
        logger.info(`Deleted file from Firebase Storage: ${storagePath}`);
      }
    } catch (err) {
      logger.warn(`Failed to delete file from Firebase Storage: ${err.message}`);
    }
  }

  /**
   * Get readable stream for a stored file
   * @param {string} storagePath 
   * @param {string} fallbackLocalPath 
   */
  async getReadStream(storagePath, fallbackLocalPath) {
    if (this.bucket && storagePath) {
      try {
        const file = this.bucket.file(storagePath);
        const [exists] = await file.exists();
        if (exists) {
          return file.createReadStream();
        }
      } catch (err) {
        logger.warn(`Could not read from Firebase Storage: ${err.message}. Trying local fallback.`);
      }
    }

    if (fallbackLocalPath && fs.existsSync(fallbackLocalPath)) {
      return fs.createReadStream(fallbackLocalPath);
    }

    throw new Error('File not found in cloud storage or local storage');
  }
}

export default new StorageService();
