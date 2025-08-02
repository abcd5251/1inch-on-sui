/**
 * Metrics and monitoring routes
 * Provides system performance metrics and monitoring data
 */

import { Elysia, t } from 'elysia';
import { eq, desc, gte, lte, sql } from 'drizzle-orm';
import { metrics } from '../schema/index.js';
import { logger } from '../utils/logger.js';
import { createPaginationResponse } from '../utils/pagination.js';

/**
 * Metrics query parameter schema
 */
const MetricsQuerySchema = t.Object({
  // Pagination
  page: t.Optional(t.Number({ minimum: 1 })),
  limit: t.Optional(t.Number({ minimum: 1, maximum: 1000 })),
  
  // Filtering
  name: t.Optional(t.String()),
  fromTime: t.Optional(t.Number()),
  toTime: t.Optional(t.Number()),
  
  // Aggregation
  aggregation: t.Optional(t.Union([
    t.Literal('avg'),
    t.Literal('sum'),
    t.Literal('count'),
    t.Literal('min'),
    t.Literal('max'),
  ])),
  interval: t.Optional(t.Number({ minimum: 60 })), // Aggregation interval (seconds)
});

/**
 * Metrics routes
 */
export const metricsRoutes = new Elysia({ prefix: '/metrics' })
  // GET /metrics - Get metrics data
  .get('/', async ({ query }) => {
    try {
      // Return mock metrics data
      return {
        success: true,
        data: {
          items: [],
          total: 0,
          page: query.page || 1,
          limit: query.limit || 100,
          totalPages: 0
        },
      };
    } catch (error) {
      logger.error('Failed to fetch metrics:', error);
      return {
        success: false,
        error: 'Failed to fetch metrics',
      };
    }
  }, {
    query: MetricsQuerySchema,
    detail: {
      tags: ['Metrics'],
      summary: 'Get metrics data',
      description: 'Query metrics data with pagination, filtering and aggregation support',
    }
  })

  // GET /metrics/names - Get all metric names
  .get('/names', async () => {
    try {
      return {
        success: true,
        data: [], // Return empty metric names list
      };
    } catch (error) {
      logger.error('Failed to fetch metric names:', error);
      return {
         success: false,
         error: 'Failed to fetch metric names',
       };
     }
   }, {
    detail: {
      tags: ['Metrics'],
      summary: 'Get metric names list',
      description: 'Return all available metric names and their statistics',
    }
  })

  // GET /metrics/summary - Get metrics summary
  .get('/summary', async ({ query }) => {
    try {
      const { fromTime, toTime } = query;
      
      return {
        success: true,
        data: [], // Return empty summary data
        timeRange: {
          from: fromTime,
          to: toTime,
        },
      };
    } catch (error) {
      logger.error('Failed to fetch metrics summary:', error);
      return {
        success: false,
        error: 'Failed to fetch metrics summary',
      };
    }
  }, {
    query: t.Object({
      fromTime: t.Optional(t.Number()),
      toTime: t.Optional(t.Number()),
    }),
    detail: {
      tags: ['Metrics'],
      summary: 'Get metrics summary statistics',
      description: 'Return metrics statistics summary for specified time range',
    }
  })

  // GET /metrics/system - Get system metrics
  .get('/system', () => {
    try {
      const systemMetrics = {
        timestamp: Math.floor(Date.now() / 1000),
        process: {
          uptime: process.uptime(),
          memory: process.memoryUsage(),
          cpu: process.cpuUsage(),
          pid: process.pid,
          version: process.version,
          platform: process.platform,
          arch: process.arch,
        },
        system: {
          loadavg: process.platform !== 'win32' ? (require('os').loadavg() || []) : [],
          freemem: require('os').freemem(),
          totalmem: require('os').totalmem(),
          cpus: require('os').cpus().length,
        },
      };

      return {
        success: true,
        data: systemMetrics,
      };
    } catch (error) {
      logger.error('Failed to fetch system metrics:', error);
      throw new Error('Failed to fetch system metrics');
    }
  }, {
    detail: {
      tags: ['Metrics'],
      summary: 'Get system runtime metrics',
      description: 'Return current system resource usage',
    }
  })

  // DELETE /metrics - Clean up old metrics data
  .delete('/', async ({ query }) => {
    try {
      const { beforeTime } = query;
      
      if (!beforeTime) {
        return {
          success: false,
          error: 'beforeTime parameter is required',
        };
      }

      // Return mock deletion result
      return {
        success: true,
        message: 'Deleted 0 metric records (database disabled)',
        deletedCount: 0,
      };
    } catch (error) {
      logger.error('Failed to delete metrics:', error);
      return {
        success: false,
        error: 'Failed to delete metrics',
      };
    }
  }, {
    query: t.Object({
      beforeTime: t.Number({ description: 'Unix timestamp, delete metrics before this time' }),
    }),
    detail: {
      tags: ['Metrics'],
      summary: 'Clean up old metrics data',
      description: 'Delete metrics records before specified time',
    }
  });