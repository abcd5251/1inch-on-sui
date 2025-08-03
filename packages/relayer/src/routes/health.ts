/**
 * Health check routes
 * Provides system health status and diagnostic information
 */

import { Elysia } from 'elysia';
import { logger } from '../utils/logger.js';
import { getDatabaseManager } from '../config/database.js';

/**
 * Health check routes
 */
export const healthRoutes = new Elysia({ prefix: '/health' })
  // GET /health - Basic health check
  .get('/', async () => {
    const startTime = Date.now();
    
    try {
      // Basic system information
      const health = {
        status: 'healthy',
        timestamp: new Date().toISOString(),
        uptime: process.uptime(),
        memory: process.memoryUsage(),
        version: '2.0.0',
        services: {
          database: await checkDatabaseHealth(),
          api: 'healthy',
        },
        responseTime: Date.now() - startTime,
      };

      return {
        success: true,
        data: health
      };
    } catch (error) {
      logger.error('Health check failed:', error);
      return {
        success: false,
        status: 'unhealthy',
        error: 'Health check failed',
        timestamp: new Date().toISOString(),
        responseTime: Date.now() - startTime,
      };
    }
  }, {
    detail: {
      tags: ['Health'],
      summary: 'Basic health check',
      description: 'Return basic system health status',
    }
  })

  // GET /health/detailed - Detailed health check
  .get('/detailed', async () => {
    const startTime = Date.now();
    
    try {
      const detailedHealth = {
        status: 'healthy',
        timestamp: new Date().toISOString(),
        uptime: process.uptime(),
        system: {
          nodeVersion: process.version,
          platform: process.platform,
          arch: process.arch,
          memory: {
            ...process.memoryUsage(),
            free: process.memoryUsage().heapTotal - process.memoryUsage().heapUsed,
          },
          cpu: process.cpuUsage(),
          pid: process.pid,
        },
        services: {
          database: {
            status: await checkDatabaseHealth(),
            stats: await getDatabaseStats(),
          },
          api: {
            status: 'healthy',
            version: '2.0.0',
          },
        },
        responseTime: Date.now() - startTime,
      };

      return {
        success: true,
        data: detailedHealth
      };
    } catch (error) {
      logger.error('Detailed health check failed:', error);
      return {
        success: false,
        status: 'unhealthy',
        error: 'Detailed health check failed',
        timestamp: new Date().toISOString(),
        responseTime: Date.now() - startTime,
      };
    }
  }, {
    detail: {
      tags: ['Health'],
      summary: 'Detailed health check',
      description: 'Return detailed system health status and statistics',
    }
  })

  // GET /health/readiness - Readiness check
  .get('/readiness', async () => {
    try {
      const ready = true; // Temporarily always return ready status
      
      return {
        success: true,
        ready,
        services: {
          database: await checkDatabaseHealth(),
        },
        timestamp: new Date().toISOString(),
      };
    } catch (error) {
      logger.error('Readiness check failed:', error);
      return {
        success: false,
        ready: false,
        error: 'Readiness check failed',
        timestamp: new Date().toISOString(),
      };
    }
  }, {
    detail: {
      tags: ['Health'],
      summary: 'Readiness check',
      description: 'Check if system is ready to accept requests',
    }
  })

  // GET /health/liveness - Liveness check
  .get('/liveness', () => {
    return {
      success: true,
      alive: true,
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
    };
  }, {
    detail: {
      tags: ['Health'],
      summary: 'Liveness check',
      description: 'Check if application is alive',
    }
  });

/**
 * Check database health status
 */
async function checkDatabaseHealth(): Promise<string> {
  try {
    const dbManager = getDatabaseManager();
    const isHealthy = await dbManager.healthCheck();
    return isHealthy ? 'healthy' : 'unhealthy';
  } catch (error) {
    logger.error('Database health check failed:', error);
    return 'unhealthy';
  }
}

/**
 * Get database statistics
 */
async function getDatabaseStats(): Promise<any> {
  try {
    const dbManager = getDatabaseManager();
    return await dbManager.getStats();
  } catch (error) {
    logger.error('Failed to get database stats:', error);
    return null;
  }
}