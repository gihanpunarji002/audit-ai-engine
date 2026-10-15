import { testFirebaseConnection } from '../config/firebase.js';
import config from '../config/index.js';
import ApiResponse from '../utils/ApiResponse.js';
import asyncHandler from '../utils/asyncHandler.js';

export class HealthController {
  /**
   * GET /api/v1/health
   */
  checkHealth = asyncHandler(async (req, res) => {
    const isFirebaseConnected = await testFirebaseConnection();

    const healthStatus = {
      status: isFirebaseConnected ? 'UP' : 'DEGRADED',
      timestamp: new Date().toISOString(),
      uptime: `${Math.floor(process.uptime())}s`,
      environment: config.env,
      firebase: {
        firestore: isFirebaseConnected ? 'connected' : 'disconnected / unconfigured',
        storageBucket: config.firebase.storageBucket || 'local fallback',
        vectorEngine: 'Cloud Firestore KNN (Cosine)',
      },
      system: {
        memoryUsage: process.memoryUsage(),
        nodeVersion: process.version,
      },
    };

    const statusCode = isFirebaseConnected ? 200 : 200; // Return 200 with status info so UI/probes don't fail during config
    return res.status(statusCode).json(
      new ApiResponse(
        statusCode,
        healthStatus,
        isFirebaseConnected ? 'AuditEngine AI services are healthy' : 'AuditEngine running (Firebase credentials pending)'
      )
    );
  });
}

export default new HealthController();
