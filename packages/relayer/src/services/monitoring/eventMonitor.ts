/**
 * Unified event monitoring service
 * Monitors events on Ethereum and Sui chains and handles cross-chain coordination
 */

import { EventEmitter } from 'events';
import { logger } from '../../utils/logger.js';
import { EthereumMonitor } from '../../monitors/ethereum.js';
import { SuiMonitor } from '../../monitors/sui.js';
import { RedisService } from '../redis/redisService.js';
import { DatabaseManager } from '../../config/database.js';
import { SwapCoordinator } from '../coordination/swapCoordinator.js';
import { 
  ChainEvent, 
  CrossChainSwapEvent, 
  MonitorConfig,
  EventProcessingResult 
} from '../../types/events.js';

/**
 * Event monitor interface
 */
export interface EventMonitorInterface extends EventEmitter {
  start(): Promise<void>;
  stop(): Promise<void>;
  getStatus(): MonitorStatus;
  processEvent(event: ChainEvent): Promise<EventProcessingResult>;
}

/**
 * Monitor status
 */
export interface MonitorStatus {
  isRunning: boolean;
  lastSync: Record<string, number>;
  eventCounts: Record<string, number>;
  errorCounts: Record<string, number>;
  processingQueue: number;
}

/**
 * Unified event monitoring service
 */
export class EventMonitor extends EventEmitter implements EventMonitorInterface {
  private ethereumMonitor: EthereumMonitor;
  private suiMonitor: SuiMonitor;
  private redisService: RedisService;
  private dbManager: DatabaseManager;
  private swapCoordinator: SwapCoordinator;
  private config: MonitorConfig;
  private isRunning = false;
  private processingQueue = 0;
  private eventCounts: Record<string, number> = {};
  private errorCounts: Record<string, number> = {};
  private lastSync: Record<string, number> = {};

  constructor(
    config: MonitorConfig,
    dbManager: DatabaseManager,
    redisService: RedisService
  ) {
    super();
    this.config = config;
    this.dbManager = dbManager;
    this.redisService = redisService;
    
    // Initialize monitors
    this.ethereumMonitor = new EthereumMonitor(config.ethereum, redisService);
    this.suiMonitor = new SuiMonitor(config.sui, redisService);
    this.swapCoordinator = new SwapCoordinator(dbManager, redisService);
    
    this.setupEventHandlers();
  }

  /**
   * Setup event handlers
   */
  private setupEventHandlers(): void {
    // Ethereum event handling
    this.ethereumMonitor.on('event', async (event: ChainEvent) => {
      await this.handleChainEvent('ethereum', event);
    });

    this.ethereumMonitor.on('error', (error: Error) => {
      this.handleMonitorError('ethereum', error);
    });

    this.ethereumMonitor.on('sync', (blockNumber: number) => {
      this.lastSync.ethereum = blockNumber;
      this.emit('sync', { chain: 'ethereum', blockNumber });
    });

    // Sui event handling
    this.suiMonitor.on('event', async (event: ChainEvent) => {
      await this.handleChainEvent('sui', event);
    });

    this.suiMonitor.on('error', (error: Error) => {
      this.handleMonitorError('sui', error);
    });

    this.suiMonitor.on('sync', (checkpoint: number) => {
      this.lastSync.sui = checkpoint;
      this.emit('sync', { chain: 'sui', checkpoint });
    });

    // Swap coordinator events
    this.swapCoordinator.on('swapCreated', (swap) => {
      this.emit('swapCreated', swap);
    });

    this.swapCoordinator.on('swapCompleted', (swap) => {
      this.emit('swapCompleted', swap);
    });

    this.swapCoordinator.on('swapFailed', (swap) => {
      this.emit('swapFailed', swap);
    });
  }

  /**
   * Start monitoring service
   */
  async start(): Promise<void> {
    if (this.isRunning) {
      logger.warn('Event monitor is already running');
      return;
    }

    try {
      logger.info('Starting event monitor...');
      
      // Start sub-monitors
      await Promise.all([
        this.ethereumMonitor.start(),
        this.suiMonitor.start(),
      ]);
      
      // Start coordinator
      await this.swapCoordinator.start();
      
      this.isRunning = true;
      logger.info('Event monitor started successfully');
      
      this.emit('started');
    } catch (error) {
      logger.error('Failed to start event monitor:', error);
      throw error;
    }
  }

  /**
   * Stop monitoring service
   */
  async stop(): Promise<void> {
    if (!this.isRunning) {
      logger.warn('Event monitor is not running');
      return;
    }

    try {
      logger.info('Stopping event monitor...');
      
      // Stop sub-monitors
      await Promise.all([
        this.ethereumMonitor.stop(),
        this.suiMonitor.stop(),
      ]);
      
      // Stop coordinator
      await this.swapCoordinator.stop();
      
      this.isRunning = false;
      logger.info('Event monitor stopped successfully');
      
      this.emit('stopped');
    } catch (error) {
      logger.error('Failed to stop event monitor:', error);
      throw error;
    }
  }

  /**
   * Get monitoring status
   */
  getStatus(): MonitorStatus {
    return {
      isRunning: this.isRunning,
      lastSync: { ...this.lastSync },
      eventCounts: { ...this.eventCounts },
      errorCounts: { ...this.errorCounts },
      processingQueue: this.processingQueue,
    };
  }

  /**
   * Process chain event
   */
  async processEvent(event: ChainEvent): Promise<EventProcessingResult> {
    const startTime = Date.now();
    this.processingQueue++;

    try {
      logger.debug(`Processing ${event.type} event from ${event.chainId}`, {
        eventId: event.id,
        transactionHash: event.transactionHash,
      });

      // Check if event is already processed
      const processed = await this.isEventProcessed(event);
      if (processed) {
        logger.debug('Event already processed, skipping', { eventId: event.id });
        return {
          success: true,
          eventId: event.id,
          processingTime: Date.now() - startTime,
          action: 'skipped',
        };
      }

      // Process event
      const result = await this.handleEvent(event);
      
      // Mark event as processed
      await this.markEventProcessed(event);
      
      // Update statistics
      this.eventCounts[event.type] = (this.eventCounts[event.type] || 0) + 1;
      
      logger.debug('Event processed successfully', {
        eventId: event.id,
        processingTime: Date.now() - startTime,
        action: result.action,
      });

      return {
        success: true,
        eventId: event.id,
        processingTime: Date.now() - startTime,
        action: result.action,
        data: result.data,
      };
    } catch (error) {
      logger.error('Failed to process event:', error, {
        eventId: event.id,
        eventType: event.type,
        chainId: event.chainId,
      });

      this.errorCounts[event.type] = (this.errorCounts[event.type] || 0) + 1;

      return {
        success: false,
        eventId: event.id,
        processingTime: Date.now() - startTime,
        error: error instanceof Error ? error.message : String(error),
      };
    } finally {
      this.processingQueue--;
    }
  }

  /**
   * Handle chain event (internal)
   */
  private async handleChainEvent(chain: string, event: ChainEvent): Promise<void> {
    try {
      const result = await this.processEvent(event);
      
      if (result.success) {
        this.emit('eventProcessed', { chain, event, result });
      } else {
        this.emit('eventFailed', { chain, event, error: result.error });
      }
    } catch (error) {
      logger.error(`Failed to handle ${chain} event:`, error);
      this.emit('eventFailed', { chain, event, error });
    }
  }

  /**
   * Handle event logic
   */
  private async handleEvent(event: ChainEvent): Promise<{ action: string; data?: any }> {
    switch (event.type) {
      case 'OrderCreated':
        return await this.handleOrderCreated(event);
      
      case 'OrderFilled':
        return await this.handleOrderFilled(event);
      
      case 'SecretRevealed':
        return await this.handleSecretRevealed(event);
      
      case 'CrossChainInitiated':
        return await this.handleCrossChainInitiated(event);
      
      case 'CrossChainConfirmed':
        return await this.handleCrossChainConfirmed(event);
      
      case 'SwapRefunded':
        return await this.handleSwapRefunded(event);
      
      default:
        logger.warn('Unknown event type:', event.type);
        return { action: 'ignored' };
    }
  }

  // ========== Event Handling Methods ==========

  /**
   * Handle order created event
   */
  private async handleOrderCreated(event: ChainEvent): Promise<{ action: string; data?: any }> {
    const orderData = event.data;
    
    // Create cross-chain swap record
    const swap = await this.swapCoordinator.createSwap({
      orderId: orderData.orderId,
      maker: orderData.maker,
      makingAmount: orderData.makingAmount,
      takingAmount: orderData.takingAmount,
      makingToken: orderData.makingToken,
      takingToken: orderData.takingToken,
      sourceChain: event.chainId,
      targetChain: orderData.targetChain,
      secretHash: orderData.secretHash,
      timeLock: orderData.timeLock,
      sourceContract: orderData.contractAddress,
      sourceTransactionHash: event.transactionHash,
    });

    return { 
      action: 'swapCreated', 
      data: { swapId: swap.id } 
    };
  }

  /**
   * Handle order filled event
   */
  private async handleOrderFilled(event: ChainEvent): Promise<{ action: string; data?: any }> {
    const fillData = event.data;
    
    // Update swap status
    await this.swapCoordinator.updateSwapStatus(
      fillData.orderId, 
      'active',
      {
        taker: fillData.taker,
        targetTransactionHash: event.transactionHash,
      }
    );

    return { 
      action: 'swapActivated', 
      data: { orderId: fillData.orderId } 
    };
  }

  /**
   * Handle secret revealed event
   */
  private async handleSecretRevealed(event: ChainEvent): Promise<{ action: string; data?: any }> {
    const secretData = event.data;
    
    // Complete swap
    await this.swapCoordinator.completeSwap(
      secretData.orderId,
      secretData.secret,
      event.transactionHash
    );

    return { 
      action: 'swapCompleted', 
      data: { orderId: secretData.orderId } 
    };
  }

  /**
   * Handle cross-chain initiated event
   */
  private async handleCrossChainInitiated(event: ChainEvent): Promise<{ action: string; data?: any }> {
    const initiateData = event.data;
    
    // Trigger target chain operation
    await this.swapCoordinator.initiateCrossChainSwap(
      initiateData.orderId,
      initiateData.targetChain,
      initiateData.secretHash
    );

    return { 
      action: 'crossChainInitiated', 
      data: { orderId: initiateData.orderId } 
    };
  }

  /**
   * Handle cross-chain confirmed event
   */
  private async handleCrossChainConfirmed(event: ChainEvent): Promise<{ action: string; data?: any }> {
    const confirmData = event.data;
    
    // Confirm cross-chain swap
    await this.swapCoordinator.confirmCrossChainSwap(
      confirmData.orderId,
      event.transactionHash
    );

    return { 
      action: 'crossChainConfirmed', 
      data: { orderId: confirmData.orderId } 
    };
  }

  /**
   * Handle swap refunded event
   */
  private async handleSwapRefunded(event: ChainEvent): Promise<{ action: string; data?: any }> {
    const refundData = event.data;
    
    // Mark swap as refunded
    await this.swapCoordinator.refundSwap(
      refundData.orderId,
      event.transactionHash
    );

    return { 
      action: 'swapRefunded', 
      data: { orderId: refundData.orderId } 
    };
  }

  // ========== Helper Methods ==========

  /**
   * Check if event is already processed
   */
  private async isEventProcessed(event: ChainEvent): Promise<boolean> {
    const key = `processed:${event.chainId}:${event.transactionHash}:${event.logIndex}`;
    const result = await this.redisService.get(key);
    return result !== null;
  }

  /**
   * Mark event as processed
   */
  private async markEventProcessed(event: ChainEvent): Promise<void> {
    const key = `processed:${event.chainId}:${event.transactionHash}:${event.logIndex}`;
    // Set 24-hour expiration time
    await this.redisService.setex(key, 86400, 'processed');
  }

  /**
   * Handle monitor error
   */
  private handleMonitorError(chain: string, error: Error): void {
    logger.error(`${chain} monitor error:`, error);
    this.errorCounts[`${chain}_monitor_error`] = 
      (this.errorCounts[`${chain}_monitor_error`] || 0) + 1;
    
    this.emit('monitorError', { chain, error });
  }

  /**
   * Get statistics
   */
  getStats() {
    return {
      isRunning: this.isRunning,
      processingQueue: this.processingQueue,
      eventCounts: { ...this.eventCounts },
      errorCounts: { ...this.errorCounts },
      lastSync: { ...this.lastSync },
      monitors: {
        ethereum: this.ethereumMonitor.getStatus(),
        sui: this.suiMonitor.getStatus(),
      },
      coordinator: this.swapCoordinator.getStats(),
    };
  }

  /**
   * Reset statistics
   */
  resetStats(): void {
    this.eventCounts = {};
    this.errorCounts = {};
    this.lastSync = {};
  }
}