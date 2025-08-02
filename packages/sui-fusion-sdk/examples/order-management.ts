/**
 * Order Management Example
 * 
 * This example demonstrates advanced order management features including:
 * - Creating limit orders
 * - Monitoring order status
 * - Cancelling orders
 * - Filtering and pagination
 */

import { createFusionService, TokenFormatter, ErrorCode } from '../src';
import type { SuiFusionConfig, OrderFilters } from '../src';

// Configuration
const config: SuiFusionConfig = {
  network: 'testnet',
  privateKey: process.env.PRIVATE_KEY
};

// Token addresses (testnet)
const SUI_TOKEN = '0x2::sui::SUI';
const USDC_TOKEN = '0x5d4b302506645c37ff133b98c4b50a5ae14841659738d6d733d59d0d217a93bf::coin::COIN';
const USDT_TOKEN = '0xc060006111016b8a020ad5b33834984a437aaa7d3c74c18e09a95d48aceab08c::coin::COIN';

async function orderManagementExample() {
  console.log('📋 Starting Order Management Example');
  console.log('====================================');

  const fusionService = createFusionService(config);

  try {
    // Initialize service
    console.log('\n📡 Initializing service...');
    await fusionService.initialize();
    console.log('✅ Service initialized');

    // Step 1: Create multiple orders
    console.log('\n🔄 Creating Multiple Orders...');
    const orders = [];

    // Create a limit order for SUI -> USDC
    console.log('\n📊 Creating SUI -> USDC limit order...');
    try {
      const suiUsdcOrder = await fusionService.createOrder({
        fromToken: SUI_TOKEN,
        toToken: USDC_TOKEN,
        amount: '500000000', // 0.5 SUI
        slippage: 0.5,
        orderType: 'limit',
        limitPrice: '2.5', // Limit price: 1 SUI = 2.5 USDC
        expirationTime: Date.now() + 3600000 // 1 hour from now
      });
      orders.push(suiUsdcOrder);
      console.log(`✅ Order created: ${suiUsdcOrder.id}`);
    } catch (error: any) {
      console.log(`❌ Failed to create SUI->USDC order: ${error.message}`);
    }

    // Create a market order for SUI -> USDT
    console.log('\n📊 Creating SUI -> USDT market order...');
    try {
      const suiUsdtOrder = await fusionService.createOrder({
        fromToken: SUI_TOKEN,
        toToken: USDT_TOKEN,
        amount: '300000000', // 0.3 SUI
        slippage: 1,
        orderType: 'market'
      });
      orders.push(suiUsdtOrder);
      console.log(`✅ Order created: ${suiUsdtOrder.id}`);
    } catch (error: any) {
      console.log(`❌ Failed to create SUI->USDT order: ${error.message}`);
    }

    // Step 2: List all orders
    console.log('\n📋 Fetching All Orders...');
    const allOrders = await fusionService.getOrders({
      limit: 20,
      offset: 0
    });

    console.log(`Found ${allOrders.total} total orders`);
    console.log(`Showing ${allOrders.items.length} orders:`);

    allOrders.items.forEach((order, index) => {
      console.log(`\n${index + 1}. Order ${order.id}:`);
      console.log(`   Type: ${order.orderType}`);
      console.log(`   Status: ${order.status}`);
      console.log(`   From: ${TokenFormatter.formatAmount(order.fromAmount, 9)} SUI`);
      console.log(`   To: ${order.toToken.includes('USDC') ? 'USDC' : 'USDT'}`);
      console.log(`   Created: ${new Date(order.createdAt).toLocaleString()}`);
      if (order.expirationTime) {
        console.log(`   Expires: ${new Date(order.expirationTime).toLocaleString()}`);
      }
      if (order.limitPrice) {
        console.log(`   Limit Price: ${order.limitPrice}`);
      }
    });

    // Step 3: Filter orders by status
    console.log('\n🔍 Filtering Pending Orders...');
    const pendingOrdersFilter: OrderFilters = {
      status: ['pending'],
      limit: 10
    };
    
    const pendingOrders = await fusionService.getOrders(pendingOrdersFilter);
    console.log(`Found ${pendingOrders.total} pending orders`);

    // Step 4: Monitor order status
    if (orders.length > 0) {
      console.log('\n⏳ Monitoring Order Status...');
      
      for (const order of orders) {
        console.log(`\nMonitoring order ${order.id}...`);
        
        let attempts = 0;
        const maxAttempts = 10;
        
        while (attempts < maxAttempts) {
          try {
            const updatedOrder = await fusionService.getOrder(order.id);
            console.log(`  Status: ${updatedOrder.status}`);
            
            if (updatedOrder.status === 'filled') {
              console.log(`  ✅ Order filled!`);
              if (updatedOrder.filledAt) {
                console.log(`  Filled at: ${new Date(updatedOrder.filledAt).toLocaleString()}`);
              }
              if (updatedOrder.actualToAmount) {
                const decimals = updatedOrder.toToken.includes('USDC') ? 6 : 6; // Both USDC and USDT have 6 decimals
                console.log(`  Received: ${TokenFormatter.formatAmount(updatedOrder.actualToAmount, decimals)}`);
              }
              break;
            } else if (updatedOrder.status === 'failed' || updatedOrder.status === 'cancelled') {
              console.log(`  ❌ Order ${updatedOrder.status}`);
              if (updatedOrder.failureReason) {
                console.log(`  Reason: ${updatedOrder.failureReason}`);
              }
              break;
            } else if (updatedOrder.status === 'expired') {
              console.log(`  ⏰ Order expired`);
              break;
            }
            
            await new Promise(resolve => setTimeout(resolve, 2000));
            attempts++;
          } catch (error: any) {
            console.log(`  ❌ Error checking order: ${error.message}`);
            break;
          }
        }
        
        if (attempts >= maxAttempts) {
          console.log(`  ⏰ Timeout monitoring order ${order.id}`);
        }
      }
    }

    // Step 5: Cancel pending orders (demonstration)
    console.log('\n🚫 Demonstrating Order Cancellation...');
    const ordersToCancel = pendingOrders.items.filter(order => 
      order.orderType === 'limit' && 
      order.expirationTime && 
      order.expirationTime > Date.now()
    ).slice(0, 2); // Cancel up to 2 orders for demo

    if (ordersToCancel.length > 0) {
      console.log(`Cancelling ${ordersToCancel.length} orders...`);
      
      for (const order of ordersToCancel) {
        try {
          console.log(`\nCancelling order ${order.id}...`);
          const result = await fusionService.cancelOrder(order.id);
          console.log(`✅ Order cancelled successfully`);
          console.log(`Transaction hash: ${result.txHash}`);
        } catch (error: any) {
          console.log(`❌ Failed to cancel order ${order.id}: ${error.message}`);
        }
      }
    } else {
      console.log('No suitable orders found for cancellation demo');
    }

    // Step 6: Get orders by different filters
    console.log('\n🔍 Advanced Filtering Examples...');
    
    // Filter by order type
    const limitOrders = await fusionService.getOrders({
      orderType: 'limit',
      limit: 5
    });
    console.log(`Limit orders: ${limitOrders.total}`);
    
    // Filter by token pair
    const suiUsdcOrders = await fusionService.getOrders({
      fromToken: SUI_TOKEN,
      toToken: USDC_TOKEN,
      limit: 5
    });
    console.log(`SUI->USDC orders: ${suiUsdcOrders.total}`);
    
    // Filter by date range (last 24 hours)
    const recentOrders = await fusionService.getOrders({
      createdAfter: Date.now() - 86400000, // 24 hours ago
      limit: 10
    });
    console.log(`Orders in last 24h: ${recentOrders.total}`);

    // Step 7: Order statistics
    console.log('\n📊 Order Statistics...');
    const allOrdersForStats = await fusionService.getOrders({ limit: 100 });
    
    const stats = {
      total: allOrdersForStats.total,
      pending: 0,
      filled: 0,
      cancelled: 0,
      failed: 0,
      expired: 0,
      market: 0,
      limit: 0
    };
    
    allOrdersForStats.items.forEach(order => {
      stats[order.status as keyof typeof stats]++;
      stats[order.orderType as keyof typeof stats]++;
    });
    
    console.log('Order Status Distribution:');
    console.log(`  Pending: ${stats.pending}`);
    console.log(`  Filled: ${stats.filled}`);
    console.log(`  Cancelled: ${stats.cancelled}`);
    console.log(`  Failed: ${stats.failed}`);
    console.log(`  Expired: ${stats.expired}`);
    
    console.log('Order Type Distribution:');
    console.log(`  Market: ${stats.market}`);
    console.log(`  Limit: ${stats.limit}`);

  } catch (error: any) {
    console.error('\n❌ Order Management Failed:');
    
    if (error.code) {
      console.error(`Error Code: ${error.code}`);
      
      switch (error.code) {
        case ErrorCode.ORDER_NOT_FOUND:
          console.error('📋 Order not found');
          break;
        case ErrorCode.ORDER_ALREADY_FILLED:
          console.error('✅ Order already filled');
          break;
        case ErrorCode.ORDER_EXPIRED:
          console.error('⏰ Order has expired');
          break;
        case ErrorCode.INSUFFICIENT_BALANCE:
          console.error('💸 Insufficient balance');
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
    fusionService.dispose();
    console.log('\n🧹 Service disposed');
  }
}

// Helper function to display order summary
function displayOrderSummary(order: any) {
  console.log(`Order ${order.id}:`);
  console.log(`  Type: ${order.orderType}`);
  console.log(`  Status: ${order.status}`);
  console.log(`  From: ${order.fromAmount} ${order.fromToken}`);
  console.log(`  To: ${order.toAmount} ${order.toToken}`);
  console.log(`  Created: ${new Date(order.createdAt).toLocaleString()}`);
}

// Run the example
if (require.main === module) {
  orderManagementExample()
    .then(() => {
      console.log('\n✨ Order Management Example completed');
      process.exit(0);
    })
    .catch((error) => {
      console.error('\n💥 Example failed:', error);
      process.exit(1);
    });
}

export { orderManagementExample };