/**
 * Basic Swap Example
 * 
 * This example demonstrates how to perform a basic token swap using the Sui Fusion SDK.
 * It shows the complete flow from initialization to order execution.
 */

import { createFusionService, TokenFormatter, ErrorCode } from '../src';
import type { SuiFusionConfig } from '../src';

// Configuration
const config: SuiFusionConfig = {
  network: 'testnet',
  privateKey: process.env.PRIVATE_KEY // Make sure to set this in your environment
};

// Token addresses (testnet)
const SUI_TOKEN = '0x2::sui::SUI';
const USDC_TOKEN = '0x5d4b302506645c37ff133b98c4b50a5ae14841659738d6d733d59d0d217a93bf::coin::COIN';

async function basicSwapExample() {
  console.log('🚀 Starting Basic Swap Example');
  console.log('================================');

  // Create fusion service
  const fusionService = createFusionService(config);

  try {
    // Step 1: Initialize the service
    console.log('\n📡 Initializing Fusion Service...');
    await fusionService.initialize();
    console.log('✅ Service initialized successfully');

    // Step 2: Get network information
    const networkInfo = await fusionService.getNetworkInfo();
    console.log(`\n🌐 Network: ${networkInfo.name}`);
    console.log(`📍 Chain ID: ${networkInfo.chainId}`);
    console.log(`⛽ Gas Price: ${TokenFormatter.formatGas(networkInfo.gasPrice)}`);

    // Step 3: Check current balances
    console.log('\n💰 Checking Balances...');
    const suiBalance = await fusionService.getBalance(SUI_TOKEN);
    console.log(`SUI Balance: ${suiBalance.formattedBalance} ${suiBalance.symbol}`);

    // Ensure we have enough SUI for the swap
    const swapAmount = '1000000000'; // 1 SUI in MIST
    if (BigInt(suiBalance.balance) < BigInt(swapAmount)) {
      throw new Error('Insufficient SUI balance for swap');
    }

    // Step 4: Get a quote
    console.log('\n📊 Getting Quote...');
    const quote = await fusionService.getQuote({
      fromToken: SUI_TOKEN,
      toToken: USDC_TOKEN,
      amount: swapAmount,
      slippage: 1 // 1% slippage tolerance
    });

    console.log('Quote Details:');
    console.log(`  From: ${TokenFormatter.formatAmount(quote.fromAmount, 9)} SUI`);
    console.log(`  To: ~${TokenFormatter.formatAmount(quote.toAmount, 6)} USDC`);
    console.log(`  Rate: 1 SUI = ${quote.rate} USDC`);
    console.log(`  Price Impact: ${quote.priceImpact}%`);
    console.log(`  Estimated Gas: ${TokenFormatter.formatGas(quote.estimatedGas)}`);
    console.log(`  Route: ${quote.route.join(' → ')}`);

    // Step 5: Create and execute the order
    console.log('\n🔄 Creating Swap Order...');
    const order = await fusionService.createOrder({
      fromToken: SUI_TOKEN,
      toToken: USDC_TOKEN,
      amount: swapAmount,
      slippage: 1,
      orderType: 'market'
    });

    console.log('✅ Order Created Successfully!');
    console.log(`Order ID: ${order.id}`);
    console.log(`Transaction Hash: ${order.txHash}`);
    console.log(`Status: ${order.status}`);
    console.log(`Created At: ${new Date(order.createdAt).toLocaleString()}`);

    // Step 6: Monitor order status
    console.log('\n⏳ Monitoring Order Status...');
    let attempts = 0;
    const maxAttempts = 30; // 30 seconds timeout

    while (attempts < maxAttempts) {
      const updatedOrder = await fusionService.getOrder(order.id);
      console.log(`Status: ${updatedOrder.status}`);

      if (updatedOrder.status === 'filled') {
        console.log('\n🎉 Swap Completed Successfully!');
        console.log(`Final Status: ${updatedOrder.status}`);
        if (updatedOrder.filledAt) {
          console.log(`Filled At: ${new Date(updatedOrder.filledAt).toLocaleString()}`);
        }
        if (updatedOrder.actualToAmount) {
          console.log(`Actual Amount Received: ${TokenFormatter.formatAmount(updatedOrder.actualToAmount, 6)} USDC`);
        }
        break;
      } else if (updatedOrder.status === 'failed' || updatedOrder.status === 'cancelled') {
        console.log(`\n❌ Order ${updatedOrder.status}`);
        if (updatedOrder.failureReason) {
          console.log(`Reason: ${updatedOrder.failureReason}`);
        }
        break;
      }

      // Wait 1 second before next check
      await new Promise(resolve => setTimeout(resolve, 1000));
      attempts++;
    }

    if (attempts >= maxAttempts) {
      console.log('\n⏰ Timeout waiting for order completion');
    }

    // Step 7: Check final balances
    console.log('\n💰 Final Balances:');
    const finalSuiBalance = await fusionService.getBalance(SUI_TOKEN);
    const finalUsdcBalance = await fusionService.getBalance(USDC_TOKEN);
    
    console.log(`SUI: ${finalSuiBalance.formattedBalance} ${finalSuiBalance.symbol}`);
    console.log(`USDC: ${finalUsdcBalance.formattedBalance} ${finalUsdcBalance.symbol}`);

  } catch (error: any) {
    console.error('\n❌ Swap Failed:');
    
    if (error.code) {
      console.error(`Error Code: ${error.code}`);
      
      // Handle specific error types
      switch (error.code) {
        case ErrorCode.INSUFFICIENT_BALANCE:
          console.error('💸 Insufficient balance for this transaction');
          break;
        case ErrorCode.NO_ROUTE_FOUND:
          console.error('🛣️ No trading route found for this token pair');
          break;
        case ErrorCode.SLIPPAGE_TOO_HIGH:
          console.error('📈 Price moved beyond acceptable slippage');
          break;
        case ErrorCode.NETWORK_ERROR:
          console.error('🌐 Network connection issue');
          break;
        default:
          console.error(`🔍 Error: ${error.message}`);
      }
    } else {
      console.error(`🔍 Error: ${error.message}`);
    }
    
    if (error.details) {
      console.error('Details:', error.details);
    }
  } finally {
    // Clean up
    fusionService.dispose();
    console.log('\n🧹 Service disposed');
  }
}

// Run the example
if (require.main === module) {
  basicSwapExample()
    .then(() => {
      console.log('\n✨ Example completed');
      process.exit(0);
    })
    .catch((error) => {
      console.error('\n💥 Example failed:', error);
      process.exit(1);
    });
}

export { basicSwapExample };