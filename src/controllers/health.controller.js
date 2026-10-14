import { testDbConnection } from '../config/db.js';
import config from '../config/index.js';
import ApiResponse from '../utils/ApiResponse.js';
import asyncHandler from '../utils/asyncHandler.js';

export class HealthController {
  /**
   * GET /api/v1/health
   */
  checkHealth = asyncHandler(async (req, res) => {
    const isDbConnected = await testDbConnection();

    const healthStatus = {
      status: isDbConnected ? 'UP' : 'DEGRADED',
      timestamp: new Date().toISOString(),
      uptime: `${Math.floor(process.uptime())}s`,
      environment: config.env,
      database: {
        status: isDbConnected ? 'connected' : 'disconnected',
      },
      system: {
        memoryUsage: process.memoryUsage(),
        nodeVersion: process.version,
      },
    };

    const statusCode = isDbConnected ? 200 : 503;
    return res.status(statusCode).json(
      new ApiResponse(statusCode, healthStatus, isDbConnected ? 'Service is healthy' : 'Database connection issue')
    );
  });
}

export default new HealthController();
