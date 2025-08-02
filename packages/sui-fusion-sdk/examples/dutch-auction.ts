import { FusionService } from '../src/services/FusionService';
import { AuctionService } from '../src/services/AuctionService';
import {
  SuiFusionConfig,
  FusionOrderParams,
  AuctionParams,
  QuoteParams
} from '../src/types';

/**
 * Example: Using Dutch Auction mechanism in Sui Fusion SDK
 * This demonstrates the core Fusion mode features including:
 * - Creating auction quotes
 * - Creating Fusion orders with Dutch auction
 * - Monitoring auction progress
 * - Filling orders as a Resolver
 */

async function dutchAuctionExample() {
  // Initialize Fusion service
  const config: SuiFusionConfig = {
    network: 'testnet',
    privateKey: process.env.PRIVATE_KEY // Your private key
  };

  const fusionService = new FusionService(config);
  await fusionService.initialize();

  console.log('🚀 Sui Fusion SDK - Dutch Auction Example');
  console.log('Network:', fusionService.getNetworkInfo().network);
  console.log('Address:', fusionService.getAddress());
  console.log();

  try {
    // Step 1: Get auction quote
    console.log('📊 Getting auction quote...');
    const quoteParams: QuoteParams = {
      fromToken: '0x2::sui::SUI',
      toToken: '0x123::usdc::USDC', // Example USDC token
      amount: '1000000000', // 1 SUI (9 decimals)
      slippage: 0.5 // 0.5%
    };

    const auctionParams: AuctionParams = {
      duration: 180, // 3 minutes
      startRateMultiplier: 1.05, // Start 5% above market rate
      endRateMultiplier: 0.95, // End 5% below market rate
      priceDecayFunction: 'linear',
      partialFillAllowed: true
    };

    const auctionQuote = await fusionService.getAuctionQuote(quoteParams, auctionParams);
    
    console.log('Auction Quote:');
    console.log('- From Amount:', auctionQuote.fromAmount, 'SUI');
    console.log('- To Amount:', auctionQuote.toAmount, 'USDC');
    console.log('- Start Rate:', auctionQuote.auctionDetails.startRate);
    console.log('- End Rate:', auctionQuote.auctionDetails.endRate);
    console.log('- Duration:', auctionQuote.auctionDetails.duration, 'seconds');
    console.log('- Estimated Fill Time:', auctionQuote.estimatedFillTime, 'seconds');
    console.log('- Available Resolvers:', auctionQuote.resolvers.length);
    console.log('- MEV Protection:', auctionQuote.mevProtection ? '✅' : '❌');
    console.log();

    // Step 2: Create Fusion order with Dutch auction
    console.log('📝 Creating Fusion order with Dutch auction...');
    const fusionOrderParams: FusionOrderParams = {
      ...quoteParams,
      enableAuction: true,
      auctionDetails: auctionQuote.auctionDetails,
      minFillAmount: '100000000', // Minimum 0.1 SUI
      maxFillAmount: quoteParams.amount, // Maximum full amount
      partialFillAllowed: true,
      expirationTime: Date.now() + 3600000 // 1 hour
    };

    const fusionOrder = await fusionService.createFusionOrder(fusionOrderParams);
    
    console.log('Fusion Order Created:');
    console.log('- Order ID:', fusionOrder.id);
    console.log('- Status:', fusionOrder.status);
    console.log('- Auction Enabled:', fusionOrder.enableAuction ? '✅' : '❌');
    console.log('- Partial Fill Allowed:', fusionOrder.partialFillAllowed ? '✅' : '❌');
    console.log('- Transaction Hash:', fusionOrder.txHash);
    console.log();

    // Step 3: Monitor auction progress
    console.log('⏱️  Monitoring auction progress...');
    await monitorAuction(fusionOrder.id, fusionService);

    // Step 4: Demonstrate resolver filling (simulation)
    console.log('🔧 Simulating resolver fill...');
    await simulateResolverFill(fusionOrder, fusionService);

  } catch (error) {
    console.error('❌ Error in Dutch auction example:', error);
  } finally {
    fusionService.dispose();
  }
}

/**
 * Monitor auction progress and show real-time rate updates
 */
async function monitorAuction(orderId: string, fusionService: FusionService) {
  const monitoringDuration = 60000; // Monitor for 1 minute
  const updateInterval = 5000; // Update every 5 seconds
  const startTime = Date.now();

  console.log('Starting auction monitoring...');
  
  const monitorInterval = setInterval(async () => {
    try {
      const order = await fusionService.getFusionOrder(orderId);
      
      if (order && order.auctionDetails) {
        const updatedAuction = AuctionService.updateAuctionState(order.auctionDetails);
        const isActive = AuctionService.isAuctionActive(updatedAuction);
        
        console.log(`⏰ Auction Update (${Math.floor((Date.now() - startTime) / 1000)}s):`);
        console.log('- Current Rate:', updatedAuction.currentRate);
        console.log('- Remaining Time:', Math.floor(updatedAuction.remainingTime || 0), 'seconds');
        console.log('- Status:', isActive ? '🟢 Active' : '🔴 Ended');
        console.log('- Order Status:', order.status);
        
        if (!isActive || order.status !== 'pending') {
          console.log('Auction monitoring completed.');
          clearInterval(monitorInterval);
          return;
        }
      }
    } catch (error) {
      console.error('Error monitoring auction:', error);
    }
  }, updateInterval);

  // Stop monitoring after specified duration
  setTimeout(() => {
    clearInterval(monitorInterval);
    console.log('Auction monitoring timeout reached.');
  }, monitoringDuration);
}

/**
 * Simulate a resolver filling the order
 */
async function simulateResolverFill(order: any, fusionService: FusionService) {
  if (!order.auctionDetails) {
    console.log('No auction details available for resolver simulation.');
    return;
  }

  try {
    // Calculate optimal fill based on current auction rate
    const optimalFill = AuctionService.calculateOptimalFill(
      order,
      order.fromAmount // Assume full liquidity available
    );

    console.log('Resolver Fill Simulation:');
    console.log('- Fill Amount:', optimalFill.fillAmount);
    console.log('- Fill Rate:', optimalFill.fillRate);
    console.log('- Estimated Gas:', '~150,000');
    console.log('- Profit Margin:', '~0.1%');
    
    // In a real scenario, a resolver would:
    // 1. Monitor multiple orders
    // 2. Calculate profitability
    // 3. Execute fill transaction
    // 4. Handle MEV protection
    
    console.log('✅ Resolver simulation completed.');
    
  } catch (error) {
    console.error('Error in resolver simulation:', error);
  }
}

/**
 * Advanced auction configuration example
 */
function advancedAuctionExample() {
  console.log('\n🔬 Advanced Auction Configuration Examples:');
  
  // Example 1: Fast auction for urgent swaps
  const fastAuction: AuctionParams = {
    duration: 60, // 1 minute
    startRateMultiplier: 1.02, // Start 2% above market
    endRateMultiplier: 0.98, // End 2% below market
    priceDecayFunction: 'exponential' // Faster initial decay
  };
  
  // Example 2: Conservative auction for large amounts
  const conservativeAuction: AuctionParams = {
    duration: 300, // 5 minutes
    startRateMultiplier: 1.08, // Start 8% above market
    endRateMultiplier: 0.92, // End 8% below market
    priceDecayFunction: 'linear',
    minFillAmount: '1000000000', // Minimum 1 SUI
    partialFillAllowed: false // All-or-nothing
  };
  
  // Example 3: High-frequency trading auction
  const hftAuction: AuctionParams = {
    duration: 30, // 30 seconds
    startRateMultiplier: 1.01, // Start 1% above market
    endRateMultiplier: 0.99, // End 1% below market
    priceDecayFunction: 'exponential',
    partialFillAllowed: true
  };
  
  console.log('Fast Auction:', fastAuction);
  console.log('Conservative Auction:', conservativeAuction);
  console.log('HFT Auction:', hftAuction);
}

// Run the example
if (require.main === module) {
  dutchAuctionExample()
    .then(() => {
      advancedAuctionExample();
      console.log('\n🎉 Dutch auction example completed!');
    })
    .catch(console.error);
}

export {
  dutchAuctionExample,
  monitorAuction,
  simulateResolverFill,
  advancedAuctionExample
};