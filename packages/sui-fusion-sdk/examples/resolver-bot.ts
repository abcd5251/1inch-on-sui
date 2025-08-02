import {
  FusionService,
  ResolverService,
  createFusionService,
  type SuiFusionConfig,
  type FusionOrder,
  type ResolverInfo,
  type OrderFill
} from '../src';
import { Ed25519Keypair } from '@mysten/sui/keypairs/ed25519';

/**
 * Resolver Bot Example
 * 
 * This example demonstrates how to create an automated resolver bot that:
 * 1. Monitors active Fusion orders
 * 2. Analyzes profitability in real-time
 * 3. Automatically fills profitable orders
 * 4. Manages gas optimization and reputation
 * 5. Handles multiple orders concurrently
 */

class ResolverBot {
  private fusionService: FusionService;
  private resolverService: ResolverService;
  private isRunning: boolean = false;
  private monitoringInterval?: NodeJS.Timeout;
  private config: {
    minProfitMargin: number;
    maxConcurrentOrders: number;
    monitoringIntervalMs: number;
    gasStrategy: 'low' | 'medium' | 'high';
    maxOrderSize: string;
  };

  constructor(
    fusionService: FusionService,
    resolverService: ResolverService,
    config?: Partial<ResolverBot['config']>
  ) {
    this.fusionService = fusionService;
    this.resolverService = resolverService;
    this.config = {
      minProfitMargin: 0.05, // 0.05% minimum profit
      maxConcurrentOrders: 5,
      monitoringIntervalMs: 2000, // Check every 2 seconds
      gasStrategy: 'medium',
      maxOrderSize: '10000000000000', // 10,000 SUI max
      ...config
    };
  }

  /**
   * Start the resolver bot
   */
  async start(): Promise<void> {
    if (this.isRunning) {
      console.log('🤖 Resolver bot is already running');
      return;
    }

    console.log('🚀 Starting Resolver Bot...');
    console.log(`   Min Profit Margin: ${this.config.minProfitMargin}%`);
    console.log(`   Max Concurrent Orders: ${this.config.maxConcurrentOrders}`);
    console.log(`   Monitoring Interval: ${this.config.monitoringIntervalMs}ms`);
    console.log(`   Gas Strategy: ${this.config.gasStrategy}`);

    this.isRunning = true;

    // Start monitoring loop
    this.monitoringInterval = setInterval(() => {
      this.monitorAndFillOrders().catch(error => {
        console.error('❌ Error in monitoring loop:', error);
      });
    }, this.config.monitoringIntervalMs);

    console.log('✅ Resolver bot started successfully');
  }

  /**
   * Stop the resolver bot
   */
  stop(): void {
    if (!this.isRunning) {
      console.log('🤖 Resolver bot is not running');
      return;
    }

    console.log('🛑 Stopping Resolver Bot...');
    this.isRunning = false;

    if (this.monitoringInterval) {
      clearInterval(this.monitoringInterval);
      this.monitoringInterval = undefined;
    }

    console.log('✅ Resolver bot stopped');
  }

  /**
   * Main monitoring and filling logic
   */
  private async monitorAndFillOrders(): Promise<void> {
    try {
      // Get active orders (in production, this would fetch from the network)
      const activeOrders = await this.getActiveOrders();
      
      if (activeOrders.length === 0) {
        return;
      }

      console.log(`🔍 Monitoring ${activeOrders.length} active orders...`);

      // Filter profitable orders
      const profitableOrders: Array<{
        order: FusionOrder;
        profitability: {
          isProfitable: boolean;
          expectedProfit: string;
          fillAmount: string;
          fillRate: string;
          estimatedGas: string;
          profitMargin: number;
        };
      }> = [];
      
      for (const order of activeOrders) {
        const profitability = this.resolverService.analyzeOrderProfitability(
          order,
          this.getAvailableLiquidity(order.fromToken)
        );

        if (profitability.isProfitable && 
            profitability.profitMargin >= this.config.minProfitMargin &&
            this.isOrderSizeAcceptable(order)) {
          profitableOrders.push({ order, profitability });
        }
      }

      if (profitableOrders.length === 0) {
        console.log('📊 No profitable orders found');
        return;
      }

      console.log(`💰 Found ${profitableOrders.length} profitable orders`);

      // Sort by profitability (highest first)
      profitableOrders.sort((a, b) => b.profitability.profitMargin - a.profitability.profitMargin);

      // Fill orders up to max concurrent limit
      const ordersToFill = profitableOrders.slice(0, this.config.maxConcurrentOrders);
      
      const fillPromises = ordersToFill.map(({ order, profitability }) => 
        this.fillOrderSafely(order, profitability.fillAmount)
      );

      const results = await Promise.allSettled(fillPromises);
      
      // Process results
      let successCount = 0;
      let failureCount = 0;
      
      results.forEach((result, index) => {
        if (result.status === 'fulfilled' && result.value.success) {
          successCount++;
          console.log(`✅ Order ${ordersToFill[index].order.id} filled successfully`);
        } else {
          failureCount++;
          const error = result.status === 'rejected' ? result.reason : result.value.error;
          console.log(`❌ Failed to fill order ${ordersToFill[index].order.id}: ${error}`);
        }
      });

      if (successCount > 0 || failureCount > 0) {
        console.log(`📈 Fill Summary: ${successCount} success, ${failureCount} failed`);
        this.logResolverStats();
      }

    } catch (error) {
      console.error('❌ Error in monitoring loop:', error);
    }
  }

  /**
   * Safely fill an order with error handling
   */
  private async fillOrderSafely(
    order: FusionOrder,
    fillAmount: string
  ): Promise<{ success: boolean; fill?: OrderFill; error?: string }> {
    try {
      // Calculate optimal gas price
      const gasPrice = this.resolverService.calculateOptimalGasPrice(this.config.gasStrategy);
      
      // Fill the order
      const result = await this.resolverService.fillOrder(
        order,
        fillAmount,
        gasPrice
      );

      // Update reputation based on result
      this.resolverService.updateReputation({
        success: result.success,
        gasUsed: result.fill?.gasUsed
      });

      return result;
    } catch (error) {
      // Update reputation for failure
      this.resolverService.updateReputation({ success: false });
      
      return {
        success: false,
        error: error instanceof Error ? error.message : String(error)
      };
    }
  }

  /**
   * Get active orders (mock implementation)
   * In production, this would fetch from the Sui network
   */
  private async getActiveOrders(): Promise<FusionOrder[]> {
    // Mock implementation - in production, query the network for active orders
    return [];
  }

  /**
   * Get available liquidity for a token (mock implementation)
   */
  private getAvailableLiquidity(token: string): string {
    // Mock implementation - in production, check actual liquidity
    const mockLiquidity: Record<string, string> = {
      '0x2::sui::SUI': '100000000000000', // 100,000 SUI
      '0x5d4b302506645c37ff133b98c4b50a5ae14841659738d6d733d59d0d217a93bf::coin::COIN': '250000000000' // 250,000 USDC
    };
    
    return mockLiquidity[token] || '1000000000000'; // Default 1,000 tokens
  }

  /**
   * Check if order size is acceptable
   */
  private isOrderSizeAcceptable(order: FusionOrder): boolean {
    const orderSize = parseFloat(order.fromAmount);
    const maxSize = parseFloat(this.config.maxOrderSize);
    return orderSize <= maxSize;
  }

  /**
   * Log resolver statistics
   */
  private logResolverStats(): void {
    const stats = this.resolverService.getResolverStats();
    console.log('📊 Resolver Stats:');
    console.log(`   Reputation: ${stats.reputation.toFixed(1)}`);
    console.log(`   Success Rate: ${(stats.successRate * 100).toFixed(1)}%`);
    console.log(`   Avg Gas Used: ${stats.averageGasUsed}`);
    console.log(`   Total Volume: ${stats.totalVolumeHandled}`);
  }

  /**
   * Get bot status
   */
  getStatus(): {
    isRunning: boolean;
    config: ResolverBot['config'];
    resolverStats: ResolverInfo;
  } {
    return {
      isRunning: this.isRunning,
      config: this.config,
      resolverStats: this.resolverService.getResolverStats()
    };
  }

  /**
   * Update bot configuration
   */
  updateConfig(newConfig: Partial<ResolverBot['config']>): void {
    this.config = { ...this.config, ...newConfig };
    console.log('⚙️ Bot configuration updated:', newConfig);
  }
}

/**
 * Main function to run the resolver bot
 */
async function runResolverBot() {
  console.log('🤖 Initializing Resolver Bot...');

  // Configuration
  const config: SuiFusionConfig = {
    network: 'testnet',
    rpcUrl: 'https://fullnode.testnet.sui.io:443',
    privateKey: process.env.RESOLVER_PRIVATE_KEY || '',
    // gasPrice: '1000' // Removed invalid property
  };

  // Initialize services
  const fusionService = createFusionService(config);
  await fusionService.initialize();

  // Set up resolver
  const resolverKeypair = Ed25519Keypair.fromSecretKey(
    Buffer.from(config.privateKey || '', 'hex')
  );
  
  const resolverInfo: ResolverInfo = {
    address: resolverKeypair.getPublicKey().toSuiAddress(),
    reputation: 90.0,
    successRate: 0.95,
    averageGasUsed: '2000000',
    // totalVolumeHandled: '0', // Removed invalid property
    isActive: true,
    lastActiveTime: Date.now(),
    supportedTokens: [
      '0x2::sui::SUI',
      '0x5d4b302506645c37ff133b98c4b50a5ae14841659738d6d733d59d0d217a93bf::coin::COIN'
    ]
  };

  const resolverService = new ResolverService(
    fusionService['transactionBuilder'], // Access private member
    resolverKeypair,
    resolverInfo
  );

  // Create and configure bot
  const bot = new ResolverBot(fusionService, resolverService, {
    minProfitMargin: 0.1, // 0.1% minimum profit
    maxConcurrentOrders: 3,
    monitoringIntervalMs: 3000, // Check every 3 seconds
    gasStrategy: 'medium'
  });

  // Start the bot
  await bot.start();

  // Handle graceful shutdown
  process.on('SIGINT', () => {
    console.log('\n🛑 Received SIGINT, shutting down gracefully...');
    bot.stop();
    process.exit(0);
  });

  process.on('SIGTERM', () => {
    console.log('\n🛑 Received SIGTERM, shutting down gracefully...');
    bot.stop();
    process.exit(0);
  });

  // Log status every minute
  setInterval(() => {
    const status = bot.getStatus();
    if (status.isRunning) {
      console.log('\n📊 Bot Status Check:');
      console.log(`   Running: ${status.isRunning}`);
      console.log(`   Reputation: ${status.resolverStats.reputation.toFixed(1)}`);
      console.log(`   Success Rate: ${(status.resolverStats.successRate * 100).toFixed(1)}%`);
    }
  }, 60000);

  console.log('\n🎯 Resolver Bot is now running!');
  console.log('   Press Ctrl+C to stop the bot');
  console.log('   Monitor the logs for order filling activity');
}

// Export for use as a module
export { ResolverBot, runResolverBot };

// Run if this file is executed directly
if (require.main === module) {
  runResolverBot().catch(error => {
    console.error('❌ Failed to start resolver bot:', error);
    process.exit(1);
  });
}