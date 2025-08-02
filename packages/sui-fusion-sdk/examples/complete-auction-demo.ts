import {
  FusionService,
  AuctionService,
  ResolverService,
  createFusionService,
  type SuiFusionConfig,
  type FusionOrderParams,
  type ResolverInfo
} from '../src';
import { Ed25519Keypair } from '@mysten/sui/keypairs/ed25519';

/**
 * Complete Dutch Auction Demo
 * 
 * This example demonstrates:
 * 1. Creating Fusion orders with Dutch auction mechanism
 * 2. Setting up a Resolver to monitor and fill orders
 * 3. Real-time auction monitoring and price updates
 * 4. MEV protection analysis
 * 5. Profitability calculations
 */

async function runCompleteAuctionDemo() {
  console.log('🚀 Starting Complete Dutch Auction Demo...');
  
  // Configuration
  const config: SuiFusionConfig = {
    network: 'testnet',
    rpcUrl: 'https://fullnode.testnet.sui.io:443',
    privateKey: process.env.PRIVATE_KEY || '',
    gasPrice: '1000'
  };
  
  // Initialize services
  const fusionService = createFusionService(config);
  
  try {
    // Step 1: Create a Fusion order with Dutch auction
    console.log('\n📋 Step 1: Creating Fusion Order with Dutch Auction');
    
    const orderParams: FusionOrderParams = {
      fromToken: '0x2::sui::SUI',
      toToken: '0x5d4b302506645c37ff133b98c4b50a5ae14841659738d6d733d59d0d217a93bf::coin::COIN', // USDC
      fromAmount: '1000000000', // 1 SUI
      enableAuction: true,
      auctionParams: {
        startTime: Date.now(),
        duration: 300, // 5 minutes
        initialRateAdjustment: 0.02, // Start 2% above market rate
        decayFunction: 'linear'
      },
      minFillAmount: '100000000', // 0.1 SUI minimum
      maxFillAmount: '1000000000', // 1 SUI maximum
      partialFillAllowed: true,
      expirationTime: Date.now() + 600000 // 10 minutes
    };
    
    const orderResult = await fusionService.createFusionOrder(orderParams);
    
    if (!orderResult.success || !orderResult.order) {
      throw new Error(`Failed to create order: ${orderResult.error}`);
    }
    
    const order = orderResult.order;
    console.log(`✅ Order created: ${order.id}`);
    console.log(`   From: ${order.fromAmount} ${order.fromToken}`);
    console.log(`   To: ${order.toToken}`);
    console.log(`   Auction Duration: ${order.auctionDetails?.duration}s`);
    console.log(`   Initial Rate Adjustment: ${(order.auctionDetails?.initialRateAdjustment || 0) * 100}%`);
    
    // Step 2: Set up Resolver
    console.log('\n🤖 Step 2: Setting up Resolver');
    
    const resolverKeypair = Ed25519Keypair.generate();
    const resolverInfo: ResolverInfo = {
      address: resolverKeypair.getPublicKey().toSuiAddress(),
      reputation: 85.5,
      successRate: 0.92,
      averageGasUsed: '2500000',
      totalVolumeHandled: '50000000000000',
      isActive: true,
      lastActiveTime: Date.now(),
      supportedTokens: ['0x2::sui::SUI', '0x5d4b302506645c37ff133b98c4b50a5ae14841659738d6d733d59d0d217a93bf::coin::COIN']
    };
    
    const resolverService = new ResolverService(
      fusionService['transactionBuilder'], // Access private member for demo
      resolverKeypair,
      resolverInfo
    );
    
    console.log(`✅ Resolver initialized: ${resolverInfo.address}`);
    console.log(`   Reputation: ${resolverInfo.reputation}`);
    console.log(`   Success Rate: ${(resolverInfo.successRate * 100).toFixed(1)}%`);
    
    // Step 3: Monitor auction in real-time
    console.log('\n📊 Step 3: Real-time Auction Monitoring');
    
    const monitoringInterval = setInterval(() => {
      if (!order.auctionDetails) return;
      
      const isActive = AuctionService.isAuctionActive(order.auctionDetails);
      if (!isActive) {
        console.log('⏰ Auction has ended');
        clearInterval(monitoringInterval);
        return;
      }
      
      const currentRate = AuctionService.calculateCurrentAuctionRate(order.auctionDetails);
      const timeRemaining = AuctionService.getTimeRemaining(order.auctionDetails);
      
      console.log(`   Current Rate: ${currentRate} (${timeRemaining}s remaining)`);
      
      // Analyze profitability
      const profitability = resolverService.analyzeOrderProfitability(
        order,
        order.fromAmount
      );
      
      console.log(`   Profitable: ${profitability.isProfitable ? '✅' : '❌'} (${profitability.profitMargin.toFixed(3)}% margin)`);
      
      // Try to fill if profitable
      if (profitability.isProfitable && profitability.profitMargin > 0.1) {
        console.log('💰 Attempting to fill order...');
        fillOrderAsync();
        clearInterval(monitoringInterval);
      }
    }, 5000); // Check every 5 seconds
    
    // Step 4: Async order filling function
    async function fillOrderAsync() {
      try {
        console.log('\n🔄 Step 4: Filling Order');
        
        const fillResult = await resolverService.fillOrder(
          order,
          order.fromAmount // Fill the entire order
        );
        
        if (fillResult.success && fillResult.fill) {
          console.log('✅ Order filled successfully!');
          console.log(`   Fill ID: ${fillResult.fill.id}`);
          console.log(`   Fill Amount: ${fillResult.fill.fillAmount}`);
          console.log(`   Fill Rate: ${fillResult.fill.fillRate}`);
          console.log(`   Gas Used: ${fillResult.fill.gasUsed}`);
          console.log(`   Transaction: ${fillResult.fill.txHash}`);
          
          // Update resolver reputation
          resolverService.updateReputation({
            success: true,
            gasUsed: fillResult.fill.gasUsed,
            profitMargin: 0.15 // Example profit margin
          });
          
          console.log(`   Updated Resolver Reputation: ${resolverService.getResolverStats().reputation}`);
        } else {
          console.log(`❌ Failed to fill order: ${fillResult.error}`);
          
          // Update resolver reputation for failure
          resolverService.updateReputation({ success: false });
        }
      } catch (error) {
        console.error('Error filling order:', error);
      }
    }
    
    // Step 5: MEV Protection Analysis
    console.log('\n🛡️ Step 5: MEV Protection Analysis');
    
    const mevAnalysis = resolverService.estimateMEVProtection(order);
    console.log(`   Protection Level: ${mevAnalysis.protectionLevel.toUpperCase()}`);
    console.log(`   Estimated Savings: ${mevAnalysis.estimatedSavings}`);
    
    if (mevAnalysis.riskFactors.length > 0) {
      console.log('   Risk Factors:');
      mevAnalysis.riskFactors.forEach(factor => {
        console.log(`     - ${factor}`);
      });
    }
    
    // Step 6: Demonstrate batch order monitoring
    console.log('\n📦 Step 6: Batch Order Monitoring Demo');
    
    // Create additional demo orders
    const demoOrders = [order]; // In real scenario, you'd have multiple orders
    
    setTimeout(async () => {
      try {
        const fills = await resolverService.monitorAndFillOrders(demoOrders, 3);
        console.log(`✅ Batch monitoring completed. Filled ${fills.length} orders.`);
        
        fills.forEach((fill, index) => {
          console.log(`   Fill ${index + 1}: ${fill.fillAmount} at rate ${fill.fillRate}`);
        });
      } catch (error) {
        console.error('Error in batch monitoring:', error);
      }
    }, 15000); // Wait 15 seconds before batch monitoring
    
    // Step 7: Gas optimization demo
    console.log('\n⛽ Step 7: Gas Optimization');
    
    const gasLow = resolverService.calculateOptimalGasPrice('low');
    const gasMedium = resolverService.calculateOptimalGasPrice('medium');
    const gasHigh = resolverService.calculateOptimalGasPrice('high');
    
    console.log(`   Low Priority Gas: ${gasLow} MIST`);
    console.log(`   Medium Priority Gas: ${gasMedium} MIST`);
    console.log(`   High Priority Gas: ${gasHigh} MIST`);
    
    // Clean up after 30 seconds
    setTimeout(() => {
      clearInterval(monitoringInterval);
      console.log('\n🏁 Demo completed!');
      console.log('\n📊 Summary:');
      console.log('   - Created Fusion order with Dutch auction mechanism');
      console.log('   - Set up Resolver with profitability analysis');
      console.log('   - Monitored auction in real-time');
      console.log('   - Analyzed MEV protection effectiveness');
      console.log('   - Demonstrated gas optimization strategies');
      console.log('\n💡 Key Benefits of Dutch Auction:');
      console.log('   ✅ MEV Protection through time-based price discovery');
      console.log('   ✅ Fair price execution via competitive bidding');
      console.log('   ✅ Reduced slippage for large orders');
      console.log('   ✅ Incentivized resolver participation');
      console.log('   ✅ Automated optimal execution timing');
    }, 30000);
    
  } catch (error) {
    console.error('❌ Demo failed:', error);
  }
}

// Additional utility functions for the demo

/**
 * Simulate market conditions for testing
 */
function simulateMarketConditions() {
  return {
    volatility: Math.random() * 0.1, // 0-10% volatility
    liquidity: Math.random() * 1000000000, // Random liquidity
    gasPrice: 1000 + Math.random() * 2000, // 1000-3000 MIST
    networkCongestion: Math.random() // 0-100% congestion
  };
}

/**
 * Calculate expected auction performance
 */
function calculateAuctionPerformance(
  startRate: number,
  endRate: number,
  duration: number,
  fillTime: number
) {
  const timeRatio = fillTime / duration;
  const rateAtFill = startRate - (startRate - endRate) * timeRatio;
  const priceImprovement = (startRate - rateAtFill) / startRate;
  
  return {
    fillRate: rateAtFill,
    priceImprovement: priceImprovement * 100,
    timeToFill: fillTime,
    efficiency: (1 - timeRatio) * 100
  };
}

/**
 * Monitor network conditions
 */
function monitorNetworkConditions() {
  const conditions = simulateMarketConditions();
  
  console.log('\n🌐 Network Conditions:');
  console.log(`   Volatility: ${(conditions.volatility * 100).toFixed(1)}%`);
  console.log(`   Available Liquidity: ${conditions.liquidity.toLocaleString()}`);
  console.log(`   Current Gas Price: ${conditions.gasPrice.toFixed(0)} MIST`);
  console.log(`   Network Congestion: ${(conditions.networkCongestion * 100).toFixed(1)}%`);
  
  return conditions;
}

// Run the demo
if (require.main === module) {
  runCompleteAuctionDemo().catch(console.error);
}

export {
  runCompleteAuctionDemo,
  simulateMarketConditions,
  calculateAuctionPerformance,
  monitorNetworkConditions
};