import { logger } from '../utils/logger';
import { RedisClient } from './redis';
import { HTLCEvent, HTLCEventType, CrossChainSwap, SwapStatus, RelayerEvent } from '../types/events';
import { EventEmitter } from 'events';
import { createHash } from 'crypto';

export class RelayerService extends EventEmitter {
  private redisClient: RedisClient;
  private activeSwaps = new Map<string, CrossChainSwap>();
  private processingQueue = new Set<string>();

  constructor(redisClient: RedisClient) {
    super();
    this.redisClient = redisClient;
  }

  async initialize(): Promise<void> {
    logger.info('Initializing RelayerService...');
    
    // Load active swaps from Redis
    await this.loadActiveSwaps();
    
    logger.info(`RelayerService initialized with ${this.activeSwaps.size} active swaps`);
  }

  async processHTLCEvent(event: HTLCEvent): Promise<void> {
    const eventKey = `${event.chain}:${event.contractId}:${event.type}`;
    
    // Prevent duplicate processing
    if (this.processingQueue.has(eventKey)) {
      logger.debug(`Event already being processed: ${eventKey}`);
      return;
    }

    this.processingQueue.add(eventKey);
    
    try {
      logger.info(`Processing HTLC event: ${event.type} on ${event.chain}`, {
        contractId: event.contractId,
        txHash: event.txHash,
      });

      // Store event in Redis
      await this.storeEvent(event);

      // Process based on event type and chain
      switch (event.type) {
        case HTLCEventType.HTLC_CREATED:
          await this.handleHTLCCreated(event);
          break;
        
        case HTLCEventType.HTLC_WITHDRAWN:
          await this.handleHTLCWithdrawn(event);
          break;
        
        case HTLCEventType.HTLC_REFUNDED:
          await this.handleHTLCRefunded(event);
          break;
      }

    } catch (error) {
      logger.error(`Error processing HTLC event ${eventKey}:`, error);
      
      // Store error for debugging
      await this.storeEventError(event, error as Error);
      
    } finally {
      this.processingQueue.delete(eventKey);
    }
  }

  private async handleHTLCCreated(event: HTLCEvent): Promise<void> {
    if (event.chain === 'ethereum' && 'sender' in event && event.sender) {
      // Ethereum HTLC created - this initiates a cross-chain swap
      const swapId = this.generateSwapId(event.contractId, event.hashlock!);
      
      const swap: CrossChainSwap = {
        id: swapId,
        status: SwapStatus.ETHEREUM_LOCKED,
        ethereumContractId: event.contractId,
        initiator: event.sender,
        receiver: event.receiver!,
        amount: event.amount!,
        hashlock: event.hashlock!,
        timelock: parseInt(event.timelock!),
        createdAt: event.timestamp,
        updatedAt: event.timestamp,
      };

      await this.createSwap(swap);
      logger.info(`New cross-chain swap initiated: ${swapId}`);
      
    } else if (event.chain === 'sui' && 'sender' in event && event.sender) {
      // Sui HTLC created - match with existing swap or create new one
      const swapId = this.findSwapByHashlock(event.hashlock!);
      
      if (swapId) {
        await this.updateSwapStatus(swapId, SwapStatus.SUI_LOCKED, {
          suiContractId: event.contractId,
        });
        logger.info(`Sui side locked for swap: ${swapId}`);
      } else {
        // Standalone Sui HTLC (reverse direction)
        const newSwapId = this.generateSwapId(event.contractId, event.hashlock!);
        const swap: CrossChainSwap = {
          id: newSwapId,
          status: SwapStatus.SUI_LOCKED,
          suiContractId: event.contractId,
          initiator: event.sender,
          receiver: event.receiver!,
          amount: event.amount!,
          hashlock: event.hashlock!,
          timelock: parseInt(event.timelock!),
          createdAt: event.timestamp,
          updatedAt: event.timestamp,
        };

        await this.createSwap(swap);
      }
    }
  }

  private async handleHTLCWithdrawn(event: HTLCEvent): Promise<void> {
    const swapId = this.findSwapByContractId(event.contractId, event.chain);
    
    if (!swapId) {
      logger.warn(`No swap found for withdrawn HTLC: ${event.contractId} on ${event.chain}`);
      return;
    }

    const swap = this.activeSwaps.get(swapId);
    if (!swap) {
      logger.error(`Swap ${swapId} not found in active swaps`);
      return;
    }

    // Extract and store preimage
    if ('preimage' in event && event.preimage) {
      swap.preimage = event.preimage;
      
      // Verify preimage matches hashlock
      if (!this.verifyPreimage(event.preimage, swap.hashlock)) {
        logger.error(`Preimage verification failed for swap ${swapId}`);
        await this.updateSwapStatus(swapId, SwapStatus.FAILED, {
          errors: [...(swap.errors || []), 'Preimage verification failed']
        });
        return;
      }

      logger.info(`Preimage revealed for swap ${swapId}: ${event.preimage}`);
      
      // Initiate cross-chain withdrawal
      await this.initiateCounterWithdrawal(swap, event.chain);
    }
  }

  private async handleHTLCRefunded(event: HTLCEvent): Promise<void> {
    const swapId = this.findSwapByContractId(event.contractId, event.chain);
    
    if (!swapId) {
      logger.warn(`No swap found for refunded HTLC: ${event.contractId} on ${event.chain}`);
      return;
    }

    await this.updateSwapStatus(swapId, SwapStatus.REFUNDED);
    logger.info(`Swap ${swapId} refunded on ${event.chain}`);
    
    // Clean up active swap
    this.activeSwaps.delete(swapId);
  }

  private async initiateCounterWithdrawal(swap: CrossChainSwap, withdrawnChain: 'ethereum' | 'sui'): Promise<void> {
    if (!swap.preimage) {
      logger.error(`No preimage available for counter-withdrawal of swap ${swap.id}`);
      return;
    }

    try {
      if (withdrawnChain === 'ethereum' && swap.suiContractId) {
        // Ethereum was withdrawn, now withdraw from Sui
        logger.info(`Initiating Sui withdrawal for swap ${swap.id}`);
        
        // Note: In production, this would call the Sui monitor's withdraw method
        // For now, we'll emit an event that the frontend can listen to
        this.emit('withdrawal_needed', {
          chain: 'sui',
          contractId: swap.suiContractId,
          preimage: swap.preimage,
          swapId: swap.id,
        });
        
      } else if (withdrawnChain === 'sui' && swap.ethereumContractId) {
        // Sui was withdrawn, now withdraw from Ethereum
        logger.info(`Initiating Ethereum withdrawal for swap ${swap.id}`);
        
        this.emit('withdrawal_needed', {
          chain: 'ethereum',
          contractId: swap.ethereumContractId,
          preimage: swap.preimage,
          swapId: swap.id,
        });
      }

      // Update swap status to completed
      await this.updateSwapStatus(swap.id, SwapStatus.COMPLETED);
      
    } catch (error) {
      logger.error(`Error initiating counter-withdrawal for swap ${swap.id}:`, error);
      await this.updateSwapStatus(swap.id, SwapStatus.FAILED, {
        errors: [...(swap.errors || []), `Counter-withdrawal failed: ${error}`]
      });
    }
  }

  private verifyPreimage(preimage: string, hashlock: string): boolean {
    try {
      const hash = createHash('sha256').update(Buffer.from(preimage, 'hex')).digest('hex');
      return `0x${hash}` === hashlock.toLowerCase();
    } catch (error) {
      logger.error('Error verifying preimage:', error);
      return false;
    }
  }

  private generateSwapId(contractId: string, hashlock: string): string {
    const hash = createHash('sha256')
      .update(contractId + hashlock)
      .digest('hex');
    return hash.substring(0, 16);
  }

  private findSwapByHashlock(hashlock: string): string | null {
    for (const [swapId, swap] of this.activeSwaps) {
      if (swap.hashlock === hashlock) {
        return swapId;
      }
    }
    return null;
  }

  private findSwapByContractId(contractId: string, chain: 'ethereum' | 'sui'): string | null {
    for (const [swapId, swap] of this.activeSwaps) {
      if (chain === 'ethereum' && swap.ethereumContractId === contractId) {
        return swapId;
      } else if (chain === 'sui' && swap.suiContractId === contractId) {
        return swapId;
      }
    }
    return null;
  }

  private async createSwap(swap: CrossChainSwap): Promise<void> {
    this.activeSwaps.set(swap.id, swap);
    await this.redisClient.setSwap(swap);
    
    // Emit event for real-time updates
    this.emitRelayerEvent('SWAP_CREATED', swap.id, swap);
  }

  private async updateSwapStatus(
    swapId: string, 
    status: SwapStatus, 
    updates: Partial<CrossChainSwap> = {}
  ): Promise<void> {
    const swap = this.activeSwaps.get(swapId);
    if (!swap) {
      logger.error(`Cannot update non-existent swap: ${swapId}`);
      return;
    }

    const updatedSwap = {
      ...swap,
      ...updates,
      status,
      updatedAt: Date.now(),
    };

    this.activeSwaps.set(swapId, updatedSwap);
    await this.redisClient.setSwap(updatedSwap);
    
    // Emit event for real-time updates
    this.emitRelayerEvent('SWAP_UPDATED', swapId, updatedSwap);
    
    // Clean up completed or failed swaps
    if (status === SwapStatus.COMPLETED || status === SwapStatus.FAILED || status === SwapStatus.REFUNDED) {
      setTimeout(() => {
        this.activeSwaps.delete(swapId);
      }, 300000); // Keep for 5 minutes for debugging
    }
  }

  private async storeEvent(event: HTLCEvent): Promise<void> {
    const key = `event:${event.chain}:${event.contractId}:${event.type}:${event.txHash}`;
    await this.redisClient.set(key, JSON.stringify(event), 86400); // 24 hours TTL
  }

  private async storeEventError(event: HTLCEvent, error: Error): Promise<void> {
    const key = `error:${event.chain}:${event.contractId}:${event.txHash}`;
    const errorData = {
      event,
      error: {
        message: error.message,
        stack: error.stack,
      },
      timestamp: Date.now(),
    };
    await this.redisClient.set(key, JSON.stringify(errorData), 86400);
  }

  private async loadActiveSwaps(): Promise<void> {
    try {
      const swaps = await this.redisClient.getAllSwaps();
      for (const swap of swaps) {
        if (swap.status !== SwapStatus.COMPLETED && 
            swap.status !== SwapStatus.FAILED && 
            swap.status !== SwapStatus.REFUNDED) {
          this.activeSwaps.set(swap.id, swap);
        }
      }
    } catch (error) {
      logger.error('Error loading active swaps from Redis:', error);
    }
  }

  private emitRelayerEvent(type: RelayerEvent['type'], swapId: string, data: any): void {
    const event: RelayerEvent = {
      type,
      swapId,
      data,
      timestamp: Date.now(),
    };
    
    this.emit('relayer_event', event);
  }

  // Public API methods
  async getSwap(swapId: string): Promise<CrossChainSwap | null> {
    return this.activeSwaps.get(swapId) || await this.redisClient.getSwap(swapId);
  }

  async getAllActiveSwaps(): Promise<CrossChainSwap[]> {
    return Array.from(this.activeSwaps.values());
  }

  async getSwapsByStatus(status: SwapStatus): Promise<CrossChainSwap[]> {
    return Array.from(this.activeSwaps.values()).filter(swap => swap.status === status);
  }

  async getSwapHistory(limit = 100): Promise<CrossChainSwap[]> {
    return await this.redisClient.getSwapHistory(limit);
  }

  getActiveSwapCount(): number {
    return this.activeSwaps.size;
  }

  getStats() {
    const statusCounts = Array.from(this.activeSwaps.values()).reduce((acc, swap) => {
      acc[swap.status] = (acc[swap.status] || 0) + 1;
      return acc;
    }, {} as Record<SwapStatus, number>);

    return {
      activeSwaps: this.activeSwaps.size,
      processingQueue: this.processingQueue.size,
      statusBreakdown: statusCounts,
    };
  }
}