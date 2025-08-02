/**
 * Swap API Routes
 * Provides REST API endpoints for swap management and queries
 */

import { Elysia, t } from 'elysia';
import { eq, desc, and, gte, lte, sql } from 'drizzle-orm';
import { swaps, eventLogs, SwapStatus } from '../../schema/index.js';
import { logger } from '../../utils/logger.js';
import { createPaginationResponse, PaginationQuery } from '../../utils/pagination.js';
import { validateSwapInput } from '../../utils/validation.js';

/**
 * Swap query parameters
 */
const SwapQuerySchema = t.Object({
  // Pagination parameters
  page: t.Optional(t.Number({ minimum: 1 })),
  limit: t.Optional(t.Number({ minimum: 1, maximum: 100 })),
  
  // Filter parameters
  status: t.Optional(t.Union([
    t.Literal('pending'),
    t.Literal('active'), 
    t.Literal('completed'),
    t.Literal('failed'),
    t.Literal('refunded')
  ])),
  maker: t.Optional(t.String()),
  taker: t.Optional(t.String()),
  sourceChain: t.Optional(t.String()),
  targetChain: t.Optional(t.String()),
  
  // Time range
  fromDate: t.Optional(t.String()),
  toDate: t.Optional(t.String()),
  
  // Sorting
  sortBy: t.Optional(t.Union([
    t.Literal('createdAt'),
    t.Literal('updatedAt'),
    t.Literal('expiresAt'),
    t.Literal('makingAmount')
  ])),
  sortOrder: t.Optional(t.Union([t.Literal('asc'), t.Literal('desc')])),
});

/**
 * Create swap request parameters
 */
const CreateSwapSchema = t.Object({
  orderId: t.String({ minLength: 1 }),
  maker: t.String({ minLength: 1 }),
  taker: t.Optional(t.String()),
  
  makingAmount: t.String({ minLength: 1 }),
  takingAmount: t.String({ minLength: 1 }),
  makingToken: t.String({ minLength: 1 }),
  takingToken: t.String({ minLength: 1 }),
  
  sourceChain: t.String({ minLength: 1 }),
  targetChain: t.String({ minLength: 1 }),
  
  secretHash: t.String({ minLength: 1 }),
  timeLock: t.Number({ minimum: 0 }),
  
  sourceContract: t.String({ minLength: 1 }),
  targetContract: t.Optional(t.String()),
  
  metadata: t.Optional(t.Record(t.String(), t.Any())),
});

/**
 * Update swap status request parameters
 */
const UpdateSwapStatusSchema = t.Object({
  status: t.Union([
    t.Literal('pending'),
    t.Literal('active'), 
    t.Literal('completed'),
    t.Literal('failed'),
    t.Literal('refunded')
  ]),
  substatus: t.Optional(t.String()),
  taker: t.Optional(t.String()),
  secret: t.Optional(t.String()),
  sourceTransactionHash: t.Optional(t.String()),
  targetTransactionHash: t.Optional(t.String()),
  refundTransactionHash: t.Optional(t.String()),
  errorMessage: t.Optional(t.String()),
  errorCode: t.Optional(t.String()),
  metadata: t.Optional(t.Record(t.String(), t.Any())),
});

/**
 * Swap API routes plugin
 */
export const swapsRoutes = new Elysia({ prefix: '/swaps' })
  .derive(() => ({
    swapService: {
      // Query swap list (temporarily disabled database functionality)
      async findSwaps(query: any) {
        return { swaps: [], total: 0 }; // Temporarily return empty data
      },

      // Query swap by ID
      async findSwapById(id: string) {
        return null; // Temporarily return empty data
      },

      // Query swap by order ID
      async findSwapByOrderId(orderId: string) {
        return null; // Temporarily return empty data
      },

      // Create swap
      async createSwap(swapData: any) {
        const validation = validateSwapInput(swapData);
        if (!validation.success) {
          throw new Error(`Validation failed: ${validation.error}`);
        }

        const newSwap = {
          id: `swap_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
          ...swapData,
          status: SwapStatus.PENDING,
          createdAt: Math.floor(Date.now() / 1000),
          updatedAt: Math.floor(Date.now() / 1000),
          expiresAt: Math.floor(Date.now() / 1000) + (swapData.timeLock || 3600),
        };

        return newSwap; // Temporarily return mock data
      },

      // Update swap status
      async updateSwapStatus(id: string, updateData: any) {
        return null; // Temporarily return empty data
      },

      // Delete swap
      async deleteSwap(id: string) {
        return null; // Temporarily return empty data
      },

      // Get swap statistics
      async getSwapStats() {
        return {
          total: 0,
          pending: 0,
          active: 0,
          completed: 0,
          failed: 0,
          refunded: 0,
          totalMakingAmount: '0',
          totalTakingAmount: '0',
        }; // Temporarily return empty statistics data
      },
    }
  }))

  // GET /swaps - Query swap list
  .get('/', async ({ query, swapService }) => {
    try {
      const result = await swapService.findSwaps(query);
      return {
        success: true,
        ...result
      };
    } catch (error) {
      logger.error('Failed to fetch swaps:', error);
      throw new Error('Failed to fetch swaps');
    }
  }, {
    query: SwapQuerySchema,
    detail: {
      tags: ['Swaps'],
      summary: 'Query swap list',
      description: 'Swap queries with pagination, filtering and sorting support',
    }
  })

  // GET /swaps/stats - Get swap statistics
  .get('/stats', async ({ swapService }) => {
    try {
      const stats = await swapService.getSwapStats();
      return {
        success: true,
        data: stats
      };
    } catch (error) {
      logger.error('Failed to fetch swap stats:', error);
      throw new Error('Failed to fetch swap stats');
    }
  }, {
    detail: {
      tags: ['Swaps'],
      summary: 'Get swap statistics',
      description: 'Returns swap count and total amount statistics for each status',
    }
  })

  // GET /swaps/:id - Query swap by ID
  .get('/:id', async ({ params, swapService }) => {
    try {
      const swap = await swapService.findSwapById(params.id);
      
      if (!swap) {
        return {
          success: false,
          error: 'Swap not found',
        };
      }

      return {
        success: true,
        data: swap
      };
    } catch (error) {
      logger.error('Failed to fetch swap:', error);
      throw new Error('Failed to fetch swap');
    }
  }, {
    params: t.Object({
      id: t.String()
    }),
    detail: {
      tags: ['Swaps'],
      summary: 'Query swap by ID',
      description: 'Returns detailed information of the specified ID swap',
    }
  })

  // GET /swaps/order/:orderId - Query swap by order ID
  .get('/order/:orderId', async ({ params, swapService }) => {
    try {
      const swap = await swapService.findSwapByOrderId(params.orderId);
      
      if (!swap) {
        return {
          success: false,
          error: 'Swap not found',
        };
      }

      return {
        success: true,
        data: swap
      };
    } catch (error) {
      logger.error('Failed to fetch swap by order ID:', error);
      throw new Error('Failed to fetch swap by order ID');
    }
  }, {
    params: t.Object({
      orderId: t.String()
    }),
    detail: {
      tags: ['Swaps'],
      summary: 'Query swap by order ID',
      description: 'Returns detailed information of the specified order ID swap',
    }
  })

  // POST /swaps - Create swap
  .post('/', async ({ body, swapService }) => {
    try {
      const swap = await swapService.createSwap(body);
      
      return {
        success: true,
        data: swap
      };
    } catch (error) {
      logger.error('Failed to create swap:', error);
      
      if (error instanceof Error && error.message.includes('Validation failed')) {
        return {
          success: false,
          error: error.message,
        };
      }
      
      throw new Error('Failed to create swap');
    }
  }, {
    body: CreateSwapSchema,
    detail: {
      tags: ['Swaps'],
      summary: 'Create swap',
      description: 'Create new cross-chain swap record',
    }
  })

  // PUT /swaps/:id - Update swap status
  .put('/:id', async ({ params, body, swapService }) => {
    try {
      const swap = await swapService.updateSwapStatus(params.id, body);
      
      if (!swap) {
        return {
          success: false,
          error: 'Swap not found',
        };
      }

      return {
        success: true,
        data: swap
      };
    } catch (error) {
      logger.error('Failed to update swap:', error);
      throw new Error('Failed to update swap');
    }
  }, {
    params: t.Object({
      id: t.String()
    }),
    body: UpdateSwapStatusSchema,
    detail: {
      tags: ['Swaps'],
      summary: 'Update swap status',
      description: 'Update status and related information of the specified swap',
    }
  })

  // DELETE /swaps/:id - Delete swap
  .delete('/:id', async ({ params, swapService }) => {
    try {
      const swap = await swapService.deleteSwap(params.id);
      
      if (!swap) {
        return {
          success: false,
          error: 'Swap not found',
        };
      }

      return {
        success: true,
        message: 'Swap deleted successfully'
      };
    } catch (error) {
      logger.error('Failed to delete swap:', error);
      throw new Error('Failed to delete swap');
    }
  }, {
    params: t.Object({
      id: t.String()
    }),
    detail: {
      tags: ['Swaps'],
      summary: 'Delete swap',
      description: 'Delete the specified swap record',
    }
  })

  // GET /swaps/:id/events - Get swap related events
  .get('/:id/events', async ({ params, query, db }) => {
    try {
      const { page = 1, limit = 20 } = query;
      const offset = (page - 1) * limit;

      const [events, totalResult] = await Promise.all([
        db.select()
          .from(eventLogs)
          .where(eq(eventLogs.swapId, params.id))
          .orderBy(desc(eventLogs.timestamp))
          .limit(limit)
          .offset(offset),
        db.select({ count: sql<number>`count(*)` })
          .from(eventLogs)
          .where(eq(eventLogs.swapId, params.id))
      ]);

      const total = totalResult[0]?.count || 0;

      return {
        success: true,
        ...createPaginationResponse(events, total, page, limit)
      };
    } catch (error) {
      logger.error('Failed to fetch swap events:', error);
      throw new Error('Failed to fetch swap events');
    }
  }, {
    params: t.Object({
      id: t.String()
    }),
    query: t.Object({
      page: t.Optional(t.Number({ minimum: 1 })),
      limit: t.Optional(t.Number({ minimum: 1, maximum: 100 })),
    }),
    detail: {
      tags: ['Swaps'],
      summary: 'Get swap related events',
      description: 'Returns all related event logs for the specified swap',
    }
  });