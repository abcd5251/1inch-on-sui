/**
 * Swap coordinator service
 * Responsible for cross-chain swap lifecycle management and state coordination
 */

import { EventEmitter } from 'events';
import { eq, and } from 'drizzle-orm';
import { DatabaseManager } from '../../config/database.js';
import { RedisService } from '../redis/redisService.js';
import { swaps, SwapStatus, eventLogs } from '../../schema/index.js';
import { logger, performanceLogger } from '../../utils/logger.js';

/**
 * Swap creation parameters interface
 */
export interface CreateSwapParams {
  orderId: string;
  maker: string;
  taker?: string;
  makingAmount: string;
  takingAmount: string;
  makingToken: string;
  takingToken: string;
  sourceChain: string;
  targetChain: string;
  secretHash: string;
  timeLock: number;
  sourceContract: string;
  targetContract?: string;
  sourceTransactionHash?: string;
  metadata?: Record<string, any>;
}

/**
 * Swap coordinator statistics
 */
export interface SwapCoordinatorStats {
  totalSwaps: number;
  activeSwaps: number;
  completedSwaps: number;
  failedSwaps: number;
  refundedSwaps: number;
  averageCompletionTime: number;
  successRate: number;
}

/**
 * Swap coordinator class
 */
export class SwapCoordinator extends EventEmitter {
  private dbManager: DatabaseManager;
  private redisService: RedisService;
  private isRunning = false;
  private cleanupInterval?: NodeJS.Timeout;
  private monitoringInterval?: NodeJS.Timeout;

  constructor(dbManager: DatabaseManager, redisService: RedisService) {
    super();
    this.dbManager = dbManager;
    this.redisService = redisService;
  }

  /**
   * Start coordinator
   */
  async start(): Promise<void> {
    if (this.isRunning) {
      logger.warn('SwapCoordinator is already running');
      return;
    }

    try {
      logger.info('Starting SwapCoordinator...');
      
      // Start periodic cleanup of expired swaps
      this.cleanupInterval = setInterval(
        () => this.cleanupExpiredSwaps(),
        5 * 60 * 1000 // Clean up every 5 minutes
      );

      // Start monitoring tasks
      this.monitoringInterval = setInterval(
        () => this.performMonitoring(),
        60 * 1000 // Execute monitoring every minute
      );

      this.isRunning = true;
      logger.info('SwapCoordinator started successfully');
    } catch (error) {
      logger.error('Failed to start SwapCoordinator:', error);
      throw error;
    }
  }

  /**
   * Stop coordinator
   */
  async stop(): Promise<void> {
    if (!this.isRunning) {
      logger.warn('SwapCoordinator is not running');
      return;
    }

    try {
      logger.info('Stopping SwapCoordinator...');
      
      // Clear timers
      if (this.cleanupInterval) {
        clearInterval(this.cleanupInterval);
        this.cleanupInterval = undefined;
      }

      if (this.monitoringInterval) {
        clearInterval(this.monitoringInterval);
        this.monitoringInterval = undefined;
      }

      this.isRunning = false;
      logger.info('SwapCoordinator stopped successfully');
    } catch (error) {
      logger.error('Error stopping SwapCoordinator:', error);
    }
  }

  /**
   * Create new swap record
   */
  async createSwap(params: CreateSwapParams): Promise<any> {
    const operation = performanceLogger.start('createSwap', { orderId: params.orderId });
    
    try {
      const db = this.dbManager.getDatabase();
      
      // Check if swap with same order ID already exists
      const existingSwap = await db.select()
        .from(swaps)
        .where(eq(swaps.orderId, params.orderId))
        .limit(1);

      if (existingSwap.length > 0) {
        throw new Error(`Swap with orderId ${params.orderId} already exists`);
      }

      // Create swap record
      const newSwap = {
        id: `swap_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        ...params,
        status: SwapStatus.PENDING,
        createdAt: Math.floor(Date.now() / 1000),
        updatedAt: Math.floor(Date.now() / 1000),
        expiresAt: Math.floor(Date.now() / 1000) + params.timeLock,
        retryCount: 0,
        maxRetries: 3,
      };

      const result = await db.insert(swaps).values(newSwap).returning();
      const createdSwap = result[0];

      // Cache to Redis
      await this.cacheSwap(createdSwap);

      // Emit event
      this.emit('swapCreated', createdSwap);
      
      operation.end({ swapId: createdSwap.id });
      logger.info('Swap created successfully:', {
        swapId: createdSwap.id,
        orderId: params.orderId,
        sourceChain: params.sourceChain,
        targetChain: params.targetChain,
      });

      return createdSwap;
    } catch (error) {
      operation.fail(error as Error);
      logger.error('Failed to create swap:', error, {
        orderId: params.orderId,
      });
      throw error;
    }
  }

  /**
   * Update swap status
   */
  async updateSwapStatus(
    orderId: string,
    status: string,
    updateData: Partial<any> = {}
  ): Promise<any> {
    const operation = performanceLogger.start('updateSwapStatus', { orderId, status });
    
    try {
      const db = this.dbManager.getDatabase();
      
      const updateValues = {
        status,
        ...updateData,
        updatedAt: Math.floor(Date.now() / 1000),
      };

      const result = await db.update(swaps)
        .set(updateValues)
        .where(eq(swaps.orderId, orderId))
        .returning();

      const updatedSwap = result[0];
      if (!updatedSwap) {
        throw new Error(`Swap with orderId ${orderId} not found`);
      }

      // Update cache
      await this.cacheSwap(updatedSwap);

      // Emit status change event
      this.emit('swapStatusChanged', updatedSwap, status);
      
      operation.end({ swapId: updatedSwap.id });
      logger.info('Swap status updated:', {
        swapId: updatedSwap.id,
        orderId,
        newStatus: status,
      });

      return updatedSwap;
    } catch (error) {
      operation.fail(error as Error);
      logger.error('Failed to update swap status:', error, {
        orderId,
        status,
      });
      throw error;
    }
  }

  /**
   * Complete swap
   */
  async completeSwap(orderId: string, secret: string, transactionHash: string): Promise<any> {
    const operation = performanceLogger.start('completeSwap', { orderId });
    
    try {
      const db = this.dbManager.getDatabase();
      
      const updateValues = {
        status: SwapStatus.COMPLETED,
        secret,
        targetTransactionHash: transactionHash,
        updatedAt: Math.floor(Date.now() / 1000),
      };

      const result = await db.update(swaps)
        .set(updateValues)
        .where(eq(swaps.orderId, orderId))
        .returning();

      const completedSwap = result[0];
      if (!completedSwap) {
        throw new Error(`Swap with orderId ${orderId} not found`);
      }

      // Update cache
      await this.cacheSwap(completedSwap);

      // Emit completion event
      this.emit('swapCompleted', completedSwap);
      
      operation.end({ swapId: completedSwap.id });
      logger.info('Swap completed successfully:', {
        swapId: completedSwap.id,
        orderId,
        transactionHash,
      });

      return completedSwap;
    } catch (error) {
      operation.fail(error as Error);
      logger.error('Failed to complete swap:', error, {
        orderId,
      });
      throw error;
    }
  }

  /**
   * Refund swap
   */
  async refundSwap(orderId: string, transactionHash: string): Promise<any> {
    const operation = performanceLogger.start('refundSwap', { orderId });
    
    try {
      const db = this.dbManager.getDatabase();
      
      const updateValues = {
        status: SwapStatus.REFUNDED,
        refundTransactionHash: transactionHash,
        updatedAt: Math.floor(Date.now() / 1000),
      };

      const result = await db.update(swaps)
        .set(updateValues)
        .where(eq(swaps.orderId, orderId))
        .returning();

      const refundedSwap = result[0];
      if (!refundedSwap) {
        throw new Error(`Swap with orderId ${orderId} not found`);
      }

      // Update cache
      await this.cacheSwap(refundedSwap);

      // Emit refund event
      this.emit('swapRefunded', refundedSwap);
      
      operation.end({ swapId: refundedSwap.id });
      logger.info('Swap refunded:', {
        swapId: refundedSwap.id,
        orderId,
        transactionHash,
      });

      return refundedSwap;
    } catch (error) {
      operation.fail(error as Error);
      logger.error('Failed to refund swap:', error, {
        orderId,
      });
      throw error;
    }
  }

  /**
   * Mark swap as failed
   */
  async failSwap(orderId: string, errorMessage: string, errorCode?: string): Promise<any> {
    const operation = performanceLogger.start('failSwap', { orderId });
    
    try {
      const db = this.dbManager.getDatabase();
      
      const updateValues = {
        status: SwapStatus.FAILED,
        errorMessage,
        errorCode: errorCode || 'UNKNOWN_ERROR',
        updatedAt: Math.floor(Date.now() / 1000),
      };

      const result = await db.update(swaps)
        .set(updateValues)
        .where(eq(swaps.orderId, orderId))
        .returning();

      const failedSwap = result[0];
      if (!failedSwap) {
        throw new Error(`Swap with orderId ${orderId} not found`);
      }

      // Update cache
      await this.cacheSwap(failedSwap);

      // Emit failure event
      this.emit('swapFailed', failedSwap);
      
      operation.end({ swapId: failedSwap.id });
      logger.error('Swap failed:', {
        swapId: failedSwap.id,
        orderId,
        errorMessage,
      });

      return failedSwap;
    } catch (error) {
      operation.fail(error as Error);
      logger.error('Failed to mark swap as failed:', error, {
        orderId,
      });
      throw error;
    }
  }

  /**
   * Initiate cross-chain swap
   */
  async initiateCrossChainSwap(orderId: string, targetChain: string, secretHash: string): Promise<void> {
    const operation = performanceLogger.start('initiateCrossChainSwap', { orderId, targetChain });
    
    try {
      // Here should implement actual cross-chain swap logic
      // For example: call target chain contract, create corresponding HTLC
      logger.info('Initiating cross-chain swap:', {
        orderId,
        targetChain,
        secretHash,
      });

      // Update status to active
      await this.updateSwapStatus(orderId, SwapStatus.ACTIVE, {
        substatus: 'cross-chain-initiated',
      });

      operation.end();
    } catch (error) {
      operation.fail(error as Error);
      await this.failSwap(orderId, 'Failed to initiate cross-chain swap', 'CROSS_CHAIN_INIT_FAILED');
      throw error;
    }
  }

  /**
   * Confirm cross-chain swap
   */
  async confirmCrossChainSwap(orderId: string, transactionHash: string): Promise<void> {
    const operation = performanceLogger.start('confirmCrossChainSwap', { orderId });
    
    try {
      logger.info('Confirming cross-chain swap:', {
        orderId,
        transactionHash,
      });

      await this.updateSwapStatus(orderId, SwapStatus.ACTIVE, {
        substatus: 'cross-chain-confirmed',
        targetTransactionHash: transactionHash,
      });

      operation.end();
    } catch (error) {
      operation.fail(error as Error);
      await this.failSwap(orderId, 'Failed to confirm cross-chain swap', 'CROSS_CHAIN_CONFIRM_FAILED');
      throw error;
    }
  }

  /**
   * Cache swap record to Redis
   */
  private async cacheSwap(swap: any): Promise<void> {
    try {
      const cacheKey = `swap:${swap.orderId}`;
      await this.redisService.setJSON(cacheKey, swap, 3600); // Cache for 1 hour
    } catch (error) {
      logger.warn('Failed to cache swap to Redis:', error);
    }
  }

  /**
   * Get swap record from cache
   */
  async getSwapFromCache(orderId: string): Promise<any | null> {
    try {
      const cacheKey = `swap:${orderId}`;
      return await this.redisService.getJSON(cacheKey);
    } catch (error) {
      logger.warn('Failed to get swap from cache:', error);
      return null;
    }
  }

  /**
   * Clean up expired swap records
   */
  private async cleanupExpiredSwaps(): Promise<void> {
    try {
      const db = this.dbManager.getDatabase();
      const now = Math.floor(Date.now() / 1000);

      // Find expired pending swaps
      const expiredSwaps = await db.select()
        .from(swaps)
        .where(
          and(
            eq(swaps.status, SwapStatus.PENDING),
            // expiresAt < now
          )
        );

      for (const swap of expiredSwaps) {
        await this.failSwap(swap.orderId, 'Swap expired', 'TIMEOUT');
        logger.info('Expired swap cleaned up:', {
          swapId: swap.id,
          orderId: swap.orderId,
        });
      }

      if (expiredSwaps.length > 0) {
        logger.info(`Cleaned up ${expiredSwaps.length} expired swaps`);
      }
    } catch (error) {
      logger.error('Failed to cleanup expired swaps:', error);
    }
  }

  /**
   * Execute monitoring tasks
   */
  private async performMonitoring(): Promise<void> {
    try {
      // Collect statistics
      const stats = await this.getStats();
      
      // Log to console
      logger.debug('SwapCoordinator stats:', stats);
      
      // Emit monitoring event
      this.emit('statsUpdated', stats);
    } catch (error) {
      logger.error('Failed to perform monitoring:', error);
    }
  }

  /**
   * Get statistics
   */
  async getStats(): Promise<SwapCoordinatorStats> {
    try {
      const db = this.dbManager.getDatabase();
      
      const [
        totalSwaps,
        activeSwaps,
        completedSwaps,
        failedSwaps,
        refundedSwaps
      ] = await Promise.all([
        db.select().from(swaps),
        db.select().from(swaps).where(eq(swaps.status, SwapStatus.ACTIVE)),
        db.select().from(swaps).where(eq(swaps.status, SwapStatus.COMPLETED)),
        db.select().from(swaps).where(eq(swaps.status, SwapStatus.FAILED)),
        db.select().from(swaps).where(eq(swaps.status, SwapStatus.REFUNDED)),
      ]);

      // Calculate average completion time and success rate
      const completedCount = completedSwaps.length;
      const totalCount = totalSwaps.length;
      
      let averageCompletionTime = 0;
      if (completedCount > 0) {
        const totalTime = completedSwaps.reduce((sum, swap) => {
          return sum + (swap.updatedAt - swap.createdAt);
        }, 0);
        averageCompletionTime = totalTime / completedCount;
      }

      const successRate = totalCount > 0 ? (completedCount / totalCount) * 100 : 0;

      return {
        totalSwaps: totalCount,
        activeSwaps: activeSwaps.length,
        completedSwaps: completedCount,
        failedSwaps: failedSwaps.length,
        refundedSwaps: refundedSwaps.length,
        averageCompletionTime,
        successRate,
      };
    } catch (error) {
      logger.error('Failed to get stats:', error);
      return {
        totalSwaps: 0,
        activeSwaps: 0,
        completedSwaps: 0,
        failedSwaps: 0,
        refundedSwaps: 0,
        averageCompletionTime: 0,
        successRate: 0,
      };
    }
  }

  /**
   * Check if coordinator is running
   */
  isRunning_(): boolean {
    return this.isRunning;
  }
}