import {
  CreateSwapRequest,
  SwapData,
  SwapQueryParams,
  SwapStats,
  SwapStatus,
  UpdateSwapStatusRequest,
} from "../../types/swap";

/**
 * Mock Relayer Service
 * Provides simulated relayer functionality for demo purposes with realistic behavior
 */
export class MockRelayerService {
  private mockSwaps: Map<string, SwapData> = new Map();
  private mockEvents: Map<string, any[]> = new Map();
  private nextSwapId = 1;
  private isOnline = true;
  private simulatedLatency = 200; // milliseconds
  private successRate = 0.95; // 95% success rate

  constructor() {
    this.initializeMockData();
  }

  /**
   * Initialize with sample swap data for demo
   */
  private initializeMockData(): void {
    const sampleSwaps: SwapData[] = [
      {
        id: "swap_demo_001",
        orderId: "0x1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef",
        maker: "0x742d35Cc6634C0532925a3b8D2B3A8c88f2F7399",
        makerAsset: "0xeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeee", // ETH
        takerAsset: "0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48", // USDC
        makerAmount: "100000000000000000", // 0.1 ETH
        takerAmount: "350000000", // 350 USDC
        makerChain: "ethereum",
        takerChain: "sui",
        status: "completed" as SwapStatus,
        createdAt: new Date(Date.now() - 3600000).toISOString(), // 1 hour ago
        updatedAt: new Date(Date.now() - 1800000).toISOString(), // 30 min ago
        expiresAt: Date.now() + 86400000, // 24 hours from now
        txHash: "0xabcdef1234567890abcdef1234567890abcdef1234567890abcdef1234567890",
        signature: "0x9876543210fedcba9876543210fedcba9876543210fedcba9876543210fedcba9876543210fedcba9876543210fedcba9876543210fedcba9876543210fedcba12",
        metadata: {
          preset: "fast",
          fromTokenSymbol: "ETH",
          toTokenSymbol: "USDC",
          estimatedCompletionTime: 120,
        },
      },
      {
        id: "swap_demo_002",
        orderId: "0xfedcba0987654321fedcba0987654321fedcba0987654321fedcba0987654321",
        maker: "0x742d35Cc6634C0532925a3b8D2B3A8c88f2F7399",
        makerAsset: "0x111111111117dC0aa78b770fA6A738034120C302", // 1INCH
        takerAsset: "0xc02aaa39b223fe8d0a0e5c4f27ead9083c756cc2", // WETH
        makerAmount: "50000000000000000000", // 50 1INCH
        takerAmount: "2500000000000000000", // 2.5 WETH
        makerChain: "ethereum",
        takerChain: "sui",
        status: "pending" as SwapStatus,
        createdAt: new Date(Date.now() - 1800000).toISOString(), // 30 min ago
        updatedAt: new Date(Date.now() - 600000).toISOString(), // 10 min ago
        expiresAt: Date.now() + 82800000, // ~23 hours from now
        signature: "0x1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef12",
        metadata: {
          preset: "medium",
          fromTokenSymbol: "1INCH",
          toTokenSymbol: "WETH",
          estimatedCompletionTime: 180,
        },
      },
    ];

    sampleSwaps.forEach(swap => {
      this.mockSwaps.set(swap.id, swap);
      // Initialize mock events for each swap
      this.mockEvents.set(swap.id, this.generateMockEvents(swap));
    });

    this.nextSwapId = sampleSwaps.length + 1;
  }

  /**
   * Generate realistic mock events for a swap
   */
  private generateMockEvents(swap: SwapData): any[] {
    const events = [
      {
        id: `event_${swap.id}_1`,
        swapId: swap.id,
        type: 'swap_created',
        timestamp: new Date(swap.createdAt).getTime(),
        data: {
          orderId: swap.orderId,
          maker: swap.maker,
          amount: swap.makerAmount,
        },
      },
    ];

    if (swap.status === 'completed') {
      events.push(
        {
          id: `event_${swap.id}_2`,
          swapId: swap.id,
          type: 'order_matched',
          timestamp: new Date(swap.createdAt).getTime() + 30000,
          data: {
            matcher: "0x9876543210fedcba9876543210fedcba98765432",
            price: swap.takerAmount,
          },
        },
        {
          id: `event_${swap.id}_3`,
          swapId: swap.id,
          type: 'swap_executed',
          timestamp: new Date(swap.updatedAt!).getTime(),
          data: {
            txHash: swap.txHash,
            blockNumber: 18950000 + Math.floor(Math.random() * 1000),
          },
        }
      );
    }

    return events;
  }

  /**
   * Simulate network delay
   */
  private async simulateLatency(): Promise<void> {
    const delay = this.simulatedLatency + Math.random() * 100; // Add some jitter
    await new Promise(resolve => setTimeout(resolve, delay));
  }

  /**
   * Simulate network errors
   */
  private shouldSimulateError(): boolean {
    return Math.random() > this.successRate;
  }

  /**
   * Generate a unique swap ID
   */
  private generateSwapId(): string {
    return `swap_demo_${String(this.nextSwapId++).padStart(3, '0')}`;
  }

  /**
   * Generate a mock transaction hash
   */
  private generateMockTxHash(): string {
    return '0x' + Array.from({length: 64}, () => Math.floor(Math.random() * 16).toString(16)).join('');
  }

  /**
   * Get swaps with query parameters
   */
  async getSwaps(params: SwapQueryParams = {}): Promise<{
    success: boolean;
    data?: {
      data: SwapData[];
      total: number;
      page: number;
      limit: number;
    };
    error?: string;
  }> {
    await this.simulateLatency();

    if (!this.isOnline) {
      return {
        success: false,
        error: "Mock relayer service is offline",
      };
    }

    if (this.shouldSimulateError()) {
      return {
        success: false,
        error: "Simulated network error",
      };
    }

    let swaps = Array.from(this.mockSwaps.values());

    // Apply filters
    if (params.maker) {
      swaps = swaps.filter(swap => swap.maker.toLowerCase() === params.maker!.toLowerCase());
    }

    if (params.status) {
      swaps = swaps.filter(swap => swap.status === params.status);
    }

    if (params.makerChain) {
      swaps = swaps.filter(swap => swap.makerChain === params.makerChain);
    }

    if (params.takerChain) {
      swaps = swaps.filter(swap => swap.takerChain === params.takerChain);
    }

    // Sort by creation date (newest first)
    swaps.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

    // Apply pagination
    const page = params.page || 1;
    const limit = params.limit || 10;
    const startIndex = (page - 1) * limit;
    const endIndex = startIndex + limit;
    const paginatedSwaps = swaps.slice(startIndex, endIndex);

    return {
      success: true,
      data: {
        data: paginatedSwaps,
        total: swaps.length,
        page,
        limit,
      },
    };
  }

  /**
   * Get swap by ID
   */
  async getSwapById(id: string): Promise<{ success: boolean; data?: SwapData; error?: string }> {
    await this.simulateLatency();

    if (!this.isOnline) {
      return {
        success: false,
        error: "Mock relayer service is offline",
      };
    }

    if (this.shouldSimulateError()) {
      return {
        success: false,
        error: "Simulated network error",
      };
    }

    const swap = this.mockSwaps.get(id);
    if (!swap) {
      return {
        success: false,
        error: `Swap with ID ${id} not found`,
      };
    }

    return {
      success: true,
      data: swap,
    };
  }

  /**
   * Get swap by order ID
   */
  async getSwapByOrderId(orderId: string): Promise<SwapData | null> {
    await this.simulateLatency();

    if (!this.isOnline || this.shouldSimulateError()) {
      return null;
    }

    const swap = Array.from(this.mockSwaps.values()).find(s => s.orderId === orderId);
    return swap || null;
  }

  /**
   * Create a new swap
   */
  async createSwap(swapData: CreateSwapRequest): Promise<{ success: boolean; data?: SwapData; error?: string }> {
    await this.simulateLatency();

    if (!this.isOnline) {
      return {
        success: false,
        error: "Mock relayer service is offline",
      };
    }

    if (this.shouldSimulateError()) {
      return {
        success: false,
        error: "Failed to create swap - simulated error",
      };
    }

    const newSwap: SwapData = {
      id: this.generateSwapId(),
      orderId: swapData.orderId,
      maker: swapData.maker,
      makerAsset: swapData.makerAsset,
      takerAsset: swapData.takerAsset,
      makerAmount: swapData.makerAmount,
      takerAmount: swapData.takerAmount,
      makerChain: swapData.makerChain,
      takerChain: swapData.takerChain,
      status: "pending" as SwapStatus,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      expiresAt: swapData.expiresAt,
      signature: swapData.signature,
      metadata: swapData.metadata,
    };

    this.mockSwaps.set(newSwap.id, newSwap);
    this.mockEvents.set(newSwap.id, this.generateMockEvents(newSwap));

    // Simulate automatic status progression
    setTimeout(() => {
      this.progressSwapStatus(newSwap.id);
    }, 5000 + Math.random() * 10000); // 5-15 seconds

    return {
      success: true,
      data: newSwap,
    };
  }

  /**
   * Update swap status
   */
  async updateSwapStatus(
    id: string,
    updateData: UpdateSwapStatusRequest
  ): Promise<{ success: boolean; data?: SwapData; error?: string }> {
    await this.simulateLatency();

    if (!this.isOnline) {
      return {
        success: false,
        error: "Mock relayer service is offline",
      };
    }

    if (this.shouldSimulateError()) {
      return {
        success: false,
        error: "Failed to update swap status - simulated error",
      };
    }

    const swap = this.mockSwaps.get(id);
    if (!swap) {
      return {
        success: false,
        error: `Swap with ID ${id} not found`,
      };
    }

    const updatedSwap: SwapData = {
      ...swap,
      status: updateData.status,
      updatedAt: new Date().toISOString(),
      txHash: updateData.txHash || swap.txHash,
      errorMessage: updateData.errorMessage,
    };

    this.mockSwaps.set(id, updatedSwap);

    // Add event for status change
    const events = this.mockEvents.get(id) || [];
    events.push({
      id: `event_${id}_${events.length + 1}`,
      swapId: id,
      type: 'status_changed',
      timestamp: Date.now(),
      data: {
        oldStatus: swap.status,
        newStatus: updateData.status,
        txHash: updateData.txHash,
        errorMessage: updateData.errorMessage,
      },
    });
    this.mockEvents.set(id, events);

    return {
      success: true,
      data: updatedSwap,
    };
  }

  /**
   * Delete swap
   */
  async deleteSwap(id: string): Promise<{ success: boolean; message: string }> {
    await this.simulateLatency();

    if (!this.isOnline) {
      return {
        success: false,
        message: "Mock relayer service is offline",
      };
    }

    if (this.shouldSimulateError()) {
      return {
        success: false,
        message: "Failed to delete swap - simulated error",
      };
    }

    const existed = this.mockSwaps.has(id);
    this.mockSwaps.delete(id);
    this.mockEvents.delete(id);

    return {
      success: true,
      message: existed ? `Swap ${id} deleted successfully` : `Swap ${id} not found, but operation succeeded`,
    };
  }

  /**
   * Get swap statistics
   */
  async getSwapStats(): Promise<{ success: boolean; data?: SwapStats; error?: string }> {
    await this.simulateLatency();

    if (!this.isOnline) {
      return {
        success: false,
        error: "Mock relayer service is offline",
      };
    }

    if (this.shouldSimulateError()) {
      return {
        success: false,
        error: "Failed to get stats - simulated error",
      };
    }

    const swaps = Array.from(this.mockSwaps.values());
    const now = Date.now();
    const oneDayAgo = now - 86400000;
    const oneWeekAgo = now - 604800000;

    const stats: SwapStats = {
      totalSwaps: swaps.length,
      completedSwaps: swaps.filter(s => s.status === 'completed').length,
      pendingSwaps: swaps.filter(s => s.status === 'pending').length,
      failedSwaps: swaps.filter(s => s.status === 'failed').length,
      totalVolume: swaps.reduce((sum, swap) => {
        return sum + parseFloat(swap.makerAmount);
      }, 0).toString(),
      averageCompletionTime: 145, // seconds
      successRate: 0.94,
      dailyStats: {
        swapsCreated: swaps.filter(s => new Date(s.createdAt).getTime() > oneDayAgo).length,
        swapsCompleted: swaps.filter(s => s.status === 'completed' && new Date(s.updatedAt!).getTime() > oneDayAgo).length,
        volume: swaps
          .filter(s => new Date(s.createdAt).getTime() > oneDayAgo)
          .reduce((sum, swap) => sum + parseFloat(swap.makerAmount), 0)
          .toString(),
      },
      weeklyStats: {
        swapsCreated: swaps.filter(s => new Date(s.createdAt).getTime() > oneWeekAgo).length,
        swapsCompleted: swaps.filter(s => s.status === 'completed' && new Date(s.updatedAt!).getTime() > oneWeekAgo).length,
        volume: swaps
          .filter(s => new Date(s.createdAt).getTime() > oneWeekAgo)
          .reduce((sum, swap) => sum + parseFloat(swap.makerAmount), 0)
          .toString(),
      },
    };

    return {
      success: true,
      data: stats,
    };
  }

  /**
   * Get swap events
   */
  async getSwapEvents(
    id: string,
    page: number = 1,
    limit: number = 20
  ): Promise<{
    events: any[];
    total: number;
    page: number;
    limit: number;
  }> {
    await this.simulateLatency();

    const events = this.mockEvents.get(id) || [];
    
    // Sort events by timestamp (newest first)
    events.sort((a, b) => b.timestamp - a.timestamp);

    // Apply pagination
    const startIndex = (page - 1) * limit;
    const endIndex = startIndex + limit;
    const paginatedEvents = events.slice(startIndex, endIndex);

    return {
      events: paginatedEvents,
      total: events.length,
      page,
      limit,
    };
  }

  /**
   * Health check
   */
  async healthCheck(): Promise<{ success: boolean; status?: string; timestamp?: string; error?: string }> {
    await this.simulateLatency();

    if (!this.isOnline) {
      return {
        success: false,
        error: "Mock relayer service is offline",
      };
    }

    return {
      success: true,
      status: "Mock relayer service is running",
      timestamp: new Date().toISOString(),
    };
  }

  /**
   * Simulate automatic swap status progression
   */
  private async progressSwapStatus(swapId: string): Promise<void> {
    const swap = this.mockSwaps.get(swapId);
    if (!swap || swap.status !== 'pending') return;

    // Simulate progression: pending -> processing -> completed (or failed)
    
    // Update to processing
    await this.updateSwapStatus(swapId, {
      status: 'processing' as SwapStatus,
    });

    // Wait a bit more then complete or fail
    setTimeout(async () => {
      const currentSwap = this.mockSwaps.get(swapId);
      if (!currentSwap || currentSwap.status !== 'processing') return;

      const willSucceed = Math.random() > 0.1; // 90% success rate for progression

      if (willSucceed) {
        await this.updateSwapStatus(swapId, {
          status: 'completed' as SwapStatus,
          txHash: this.generateMockTxHash(),
        });
      } else {
        await this.updateSwapStatus(swapId, {
          status: 'failed' as SwapStatus,
          errorMessage: 'Simulated swap failure for demo purposes',
        });
      }
    }, 8000 + Math.random() * 12000); // 8-20 seconds
  }

  /**
   * Control methods for testing
   */
  public setOnlineStatus(online: boolean): void {
    this.isOnline = online;
  }

  public setLatency(latency: number): void {
    this.simulatedLatency = latency;
  }

  public setSuccessRate(rate: number): void {
    this.successRate = Math.max(0, Math.min(1, rate));
  }

  public getServiceStatus(): {
    isOnline: boolean;
    latency: number;
    successRate: number;
    totalSwaps: number;
  } {
    return {
      isOnline: this.isOnline,
      latency: this.simulatedLatency,
      successRate: this.successRate,
      totalSwaps: this.mockSwaps.size,
    };
  }

  /**
   * Add random swap for demo purposes
   */
  public addRandomSwap(): SwapData {
    const tokens = [
      { address: "0xeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeee", symbol: "ETH" },
      { address: "0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48", symbol: "USDC" },
      { address: "0x111111111117dC0aa78b770fA6A738034120C302", symbol: "1INCH" },
      { address: "0xc02aaa39b223fe8d0a0e5c4f27ead9083c756cc2", symbol: "WETH" },
    ];

    const fromToken = tokens[Math.floor(Math.random() * tokens.length)];
    const toToken = tokens[Math.floor(Math.random() * tokens.length)];

    const randomSwap: SwapData = {
      id: this.generateSwapId(),
      orderId: this.generateMockTxHash(),
      maker: "0x742d35Cc6634C0532925a3b8D2B3A8c88f2F7399",
      makerAsset: fromToken.address,
      takerAsset: toToken.address,
      makerAmount: (Math.random() * 1000 * Math.pow(10, 18)).toString(),
      takerAmount: (Math.random() * 1000 * Math.pow(10, 18)).toString(),
      makerChain: Math.random() > 0.5 ? "ethereum" : "sui",
      takerChain: Math.random() > 0.5 ? "ethereum" : "sui",
      status: ["pending", "processing", "completed", "failed"][Math.floor(Math.random() * 4)] as SwapStatus,
      createdAt: new Date(Date.now() - Math.random() * 86400000).toISOString(),
      updatedAt: new Date().toISOString(),
      expiresAt: Date.now() + 86400000,
      signature: this.generateMockTxHash() + this.generateMockTxHash().slice(2),
      metadata: {
        preset: ["fast", "medium", "slow"][Math.floor(Math.random() * 3)],
        fromTokenSymbol: fromToken.symbol,
        toTokenSymbol: toToken.symbol,
      },
    };

    this.mockSwaps.set(randomSwap.id, randomSwap);
    this.mockEvents.set(randomSwap.id, this.generateMockEvents(randomSwap));

    return randomSwap;
  }
}

// Create default instance for demo
export const mockRelayerService = new MockRelayerService();

// Export types
export type { SwapData, SwapStatus, SwapQueryParams, SwapStats, CreateSwapRequest, UpdateSwapStatusRequest };