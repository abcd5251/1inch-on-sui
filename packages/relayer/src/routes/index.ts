import { Elysia, t } from 'elysia';
import { logger } from '../utils/logger';
import { RelayerService } from '../services/relayer';
import { SwapStatus } from '../types/events';

export function setupRoutes(app: Elysia, relayerService: RelayerService): void {
  // Health check endpoint
  app.get('/health', async () => {
    try {
      const stats = relayerService.getStats();
      return {
        status: 'healthy',
        timestamp: Date.now(),
        service: 'cross-chain-relayer',
        version: '1.0.0',
        stats,
      };
    } catch (error) {
      logger.error('Health check failed:', error);
      return {
        status: 'unhealthy',
        timestamp: Date.now(),
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  });

  // API documentation endpoint
  app.get('/docs', () => {
    return {
      name: 'Cross-Chain HTLC Relayer API',
      version: '1.0.0',
      description: 'RESTful API for monitoring and managing cross-chain atomic swaps',
      endpoints: {
        'GET /health': 'Service health check and statistics',
        'GET /api/swaps': 'List all active swaps',
        'GET /api/swaps/:id': 'Get specific swap details',
        'GET /api/swaps/status/:status': 'Get swaps by status',
        'GET /api/swaps/history': 'Get swap history',
        'GET /api/stats': 'Get detailed service statistics',
        'POST /api/swaps/:id/withdraw': 'Manually trigger withdrawal (admin)',
        'POST /api/swaps/:id/refund': 'Manually trigger refund (admin)',
        'WS /ws': 'WebSocket endpoint for real-time updates',
      },
      swapStatuses: Object.values(SwapStatus),
    };
  });

  // API routes with /api prefix
  const api = app.group('/api');

  // Get all active swaps
  api.get('/swaps', async () => {
    try {
      const swaps = await relayerService.getAllActiveSwaps();
      return {
        success: true,
        data: swaps,
        count: swaps.length,
      };
    } catch (error) {
      logger.error('Error fetching active swaps:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to fetch swaps',
      };
    }
  });

  // Get specific swap by ID
  api.get('/swaps/:id', async ({ params }) => {
    try {
      const swap = await relayerService.getSwap(params.id);
      if (!swap) {
        return {
          success: false,
          error: 'Swap not found',
        };
      }
      
      return {
        success: true,
        data: swap,
      };
    } catch (error) {
      logger.error(`Error fetching swap ${params.id}:`, error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to fetch swap',
      };
    }
  }, {
    params: t.Object({
      id: t.String()
    })
  });

  // Get swaps by status
  api.get('/swaps/status/:status', async ({ params }) => {
    try {
      const status = params.status as SwapStatus;
      
      if (!Object.values(SwapStatus).includes(status)) {
        return {
          success: false,
          error: `Invalid status. Valid statuses: ${Object.values(SwapStatus).join(', ')}`,
        };
      }

      const swaps = await relayerService.getSwapsByStatus(status);
      return {
        success: true,
        data: swaps,
        count: swaps.length,
        status,
      };
    } catch (error) {
      logger.error(`Error fetching swaps with status ${params.status}:`, error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to fetch swaps',
      };
    }
  }, {
    params: t.Object({
      status: t.String()
    })
  });

  // Get swap history
  api.get('/swaps/history', async ({ query }) => {
    try {
      const limit = query.limit ? parseInt(query.limit) : 100;
      
      if (limit < 1 || limit > 1000) {
        return {
          success: false,
          error: 'Limit must be between 1 and 1000',
        };
      }

      const swaps = await relayerService.getSwapHistory(limit);
      return {
        success: true,
        data: swaps,
        count: swaps.length,
        limit,
      };
    } catch (error) {
      logger.error('Error fetching swap history:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to fetch swap history',
      };
    }
  }, {
    query: t.Object({
      limit: t.Optional(t.String())
    })
  });

  // Get detailed service statistics
  api.get('/stats', async () => {
    try {
      const stats = relayerService.getStats();
      return {
        success: true,
        timestamp: Date.now(),
        data: {
          ...stats,
          uptime: process.uptime(),
          memory: process.memoryUsage(),
          nodeVersion: process.version,
        },
      };
    } catch (error) {
      logger.error('Error fetching stats:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to fetch stats',
      };
    }
  });

  // Admin endpoints (would require authentication in production)
  const admin = api.group('/admin');

  // Manually trigger withdrawal (emergency use)
  admin.post('/swaps/:id/withdraw', async ({ params, body }) => {
    try {
      const { preimage, chain } = body as { preimage: string; chain: 'ethereum' | 'sui' };
      
      if (!preimage || !chain) {
        return {
          success: false,
          error: 'Preimage and chain are required',
        };
      }

      // This would trigger manual withdrawal
      // In production, this would interact with the appropriate monitor
      logger.warn(`Manual withdrawal triggered for swap ${params.id} on ${chain}`);
      
      return {
        success: true,
        message: `Manual withdrawal initiated for swap ${params.id} on ${chain}`,
        data: {
          swapId: params.id,
          chain,
          preimage,
          triggeredAt: Date.now(),
        },
      };
    } catch (error) {
      logger.error(`Error triggering manual withdrawal for swap ${params.id}:`, error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to trigger withdrawal',
      };
    }
  }, {
    params: t.Object({
      id: t.String()
    }),
    body: t.Object({
      preimage: t.String(),
      chain: t.Union([t.Literal('ethereum'), t.Literal('sui')])
    })
  });

  // Manually trigger refund (emergency use)
  admin.post('/swaps/:id/refund', async ({ params, body }) => {
    try {
      const { chain } = body as { chain: 'ethereum' | 'sui' };
      
      if (!chain) {
        return {
          success: false,
          error: 'Chain is required',
        };
      }

      // This would trigger manual refund
      logger.warn(`Manual refund triggered for swap ${params.id} on ${chain}`);
      
      return {
        success: true,
        message: `Manual refund initiated for swap ${params.id} on ${chain}`,
        data: {
          swapId: params.id,
          chain,
          triggeredAt: Date.now(),
        },
      };
    } catch (error) {
      logger.error(`Error triggering manual refund for swap ${params.id}:`, error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to trigger refund',
      };
    }
  }, {
    params: t.Object({
      id: t.String()
    }),
    body: t.Object({
      chain: t.Union([t.Literal('ethereum'), t.Literal('sui')])
    })
  });

  // Error handling middleware
  app.onError({ as: 'global' }, ({ code, error, set }) => {
    logger.error(`API Error [${code}]:`, error);
    
    set.status = 500;
    return {
      success: false,
      error: 'Internal server error',
      code,
      timestamp: Date.now(),
    };
  });

  logger.info('API routes configured successfully');
}