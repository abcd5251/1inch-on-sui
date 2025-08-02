# Sui Fusion SDK

A comprehensive TypeScript SDK for 1inch Fusion protocol on Sui blockchain. This SDK provides a complete solution for interacting with Fusion swaps, orders, and liquidity on the Sui network.

## Features

- 🔄 **Token Swaps**: Execute instant token swaps with optimal routing
- 📋 **Order Management**: Create, cancel, and manage limit orders
- 🎯 **Dutch Auction**: Advanced Fusion orders with MEV protection and fair price discovery
- 🤖 **Resolver Ecosystem**: Competitive market makers for optimal order execution
- 🛡️ **MEV Protection**: Time-based auctions prevent front-running and sandwich attacks
- 💰 **Balance Queries**: Check token balances and portfolio information
- 🌐 **Multi-Network**: Support for mainnet, testnet, devnet, and localnet
- 🔒 **Type Safety**: Full TypeScript support with comprehensive type definitions
- ⚡ **Performance**: Optimized for speed and efficiency
- 🛡️ **Error Handling**: Robust error handling with detailed error codes
- 🔧 **Utilities**: Rich set of formatting and validation utilities

## Installation

```bash
npm install @1inch/sui-fusion-sdk
# or
yarn add @1inch/sui-fusion-sdk
# or
pnpm add @1inch/sui-fusion-sdk
```

## Quick Start

```typescript
import { FusionService, createFusionService } from '@1inch/sui-fusion-sdk';

// Create service instance
const fusionService = createFusionService({
  network: 'testnet',
  privateKey: 'your-private-key' // Optional, required for transactions
});

// Initialize the service
await fusionService.initialize();

// Get a quote
const quote = await fusionService.getQuote({
  fromToken: '0x2::sui::SUI',
  toToken: '0x5d4b302506645c37ff133b98c4b50a5ae14841659738d6d733d59d0d217a93bf::coin::COIN',
  amount: '1000000000', // 1 SUI in MIST
  slippage: 1 // 1% slippage
});

console.log('Quote:', quote);

// Create a standard order
const order = await fusionService.createOrder({
  fromToken: '0x2::sui::SUI',
  toToken: '0x5d4b302506645c37ff133b98c4b50a5ae14841659738d6d733d59d0d217a93bf::coin::COIN',
  amount: '1000000000',
  slippage: 1,
  orderType: 'market'
});

console.log('Order created:', order);

// Create a Fusion order with Dutch auction (MEV protection)
const fusionOrder = await fusionService.createFusionOrder({
  fromToken: '0x2::sui::SUI',
  toToken: '0x5d4b302506645c37ff133b98c4b50a5ae14841659738d6d733d59d0d217a93bf::coin::COIN',
  fromAmount: '1000000000', // 1 SUI
  enableAuction: true,
  auctionParams: {
    duration: 300, // 5 minutes
    initialRateAdjustment: 0.02, // Start 2% above market rate
    decayFunction: 'linear'
  },
  partialFillAllowed: true
});

console.log('Fusion order with Dutch auction created:', fusionOrder.order?.id);
```

## Configuration

### Basic Configuration

```typescript
import { SuiFusionConfig } from '@1inch/sui-fusion-sdk';

const config: SuiFusionConfig = {
  network: 'mainnet', // 'mainnet' | 'testnet' | 'devnet' | 'localnet'
  rpcUrl: 'https://fullnode.mainnet.sui.io', // Optional, uses default if not provided
  packageId: '0x...', // Optional, uses default if not provided
  privateKey: 'your-private-key' // Optional, required for transactions
};
```

### Network Configurations

The SDK comes with pre-configured settings for all Sui networks:

```typescript
import { NETWORK_CONFIGS, getNetworkConfig } from '@1inch/sui-fusion-sdk';

// Get configuration for a specific network
const mainnetConfig = getNetworkConfig('mainnet');
console.log(mainnetConfig);

// Check supported networks
import { getSupportedNetworks } from '@1inch/sui-fusion-sdk';
const networks = getSupportedNetworks();
console.log('Supported networks:', networks);
```

## API Reference

### FusionService

The main service class for interacting with Sui Fusion protocol.

#### Methods

##### `initialize(): Promise<void>`
Initialize the service and test network connection.

##### `getQuote(params: QuoteParams): Promise<Quote>`
Get a quote for token swap.

```typescript
const quote = await fusionService.getQuote({
  fromToken: '0x2::sui::SUI',
  toToken: '0x...::usdc::USDC',
  amount: '1000000000',
  slippage: 1
});
```

##### `createOrder(params: OrderParams): Promise<Order>`
Create a new swap order.

```typescript
const order = await fusionService.createOrder({
  fromToken: '0x2::sui::SUI',
  toToken: '0x...::usdc::USDC',
  amount: '1000000000',
  slippage: 1,
  orderType: 'market',
  expirationTime: Date.now() + 3600000 // 1 hour
});
```

##### `cancelOrder(orderId: string): Promise<TransactionResult>`
Cancel an existing order.

```typescript
const result = await fusionService.cancelOrder('order-id');
```

##### `getOrder(orderId: string): Promise<Order>`
Get order details by ID.

```typescript
const order = await fusionService.getOrder('order-id');
```

##### `getOrders(filters?: OrderFilters): Promise<PaginatedResult<Order>>`
Get orders with optional filters.

```typescript
const orders = await fusionService.getOrders({
  status: ['pending', 'filled'],
  maker: '0x...',
  limit: 10,
  offset: 0
});
```

##### `getBalance(tokenType: string, address?: string): Promise<Balance>`
Get token balance for an address.

```typescript
const balance = await fusionService.getBalance('0x2::sui::SUI');
```

##### `getAllBalances(address?: string): Promise<Balance[]>`
Get all token balances for an address.

```typescript
const balances = await fusionService.getAllBalances();
```

### Utilities

#### TokenFormatter

Utilities for formatting token amounts and related data.

```typescript
import { TokenFormatter } from '@1inch/sui-fusion-sdk';

// Format amount from smallest unit to human readable
const formatted = TokenFormatter.formatAmount('1000000000', 9); // '1'

// Parse human readable amount to smallest unit
const parsed = TokenFormatter.parseAmount('1.5', 9); // '1500000000'

// Format with token symbol
const withSymbol = TokenFormatter.formatWithSymbol('1000000000', {
  symbol: 'SUI',
  decimals: 9
}); // '1 SUI'
```

#### NumberUtils

Utilities for number calculations and conversions.

```typescript
import { NumberUtils } from '@1inch/sui-fusion-sdk';

// Convert MIST to SUI
const sui = NumberUtils.mistToSui('1000000000'); // 1

// Convert SUI to MIST
const mist = NumberUtils.suiToMist('1.5'); // '1500000000'

// Calculate minimum amount out with slippage
const minOut = NumberUtils.calculateMinAmountOut('1000000000', 1); // Amount with 1% slippage
```

#### Validators

Validation utilities for addresses, amounts, and parameters.

```typescript
import { AddressValidator, AmountValidator, ParamValidator } from '@1inch/sui-fusion-sdk';

// Validate Sui address
const isValid = AddressValidator.isValidAddress('0x...');

// Validate amount
const isValidAmount = AmountValidator.isPositiveAmount('1.5');

// Validate quote parameters
const errors = ParamValidator.validateQuoteParams({
  fromToken: '0x2::sui::SUI',
  toToken: '0x...::usdc::USDC',
  amount: '1000000000'
});
```

## Error Handling

The SDK provides comprehensive error handling with specific error types:

```typescript
import {
  SuiFusionSDKError,
  ErrorCode,
  NetworkError,
  ValidationError,
  TransactionError,
  OrderError,
  QuoteError
} from '@1inch/sui-fusion-sdk';

try {
  const quote = await fusionService.getQuote(params);
} catch (error) {
  if (error instanceof SuiFusionSDKError) {
    console.log('Error code:', error.code);
    console.log('Error message:', error.message);
    console.log('Error details:', error.details);
    
    // Handle specific error types
    switch (error.code) {
      case ErrorCode.INSUFFICIENT_BALANCE:
        console.log('Insufficient balance for transaction');
        break;
      case ErrorCode.NO_ROUTE_FOUND:
        console.log('No trading route found');
        break;
      case ErrorCode.NETWORK_ERROR:
        console.log('Network connection issue');
        break;
    }
  }
}
```

## Examples

### Complete Swap Example

```typescript
import { createFusionService, TokenFormatter } from '@1inch/sui-fusion-sdk';

async function performSwap() {
  const fusionService = createFusionService({
    network: 'testnet',
    privateKey: process.env.PRIVATE_KEY
  });

  try {
    // Initialize service
    await fusionService.initialize();
    console.log('Service initialized');

    // Check balance
    const balance = await fusionService.getBalance('0x2::sui::SUI');
    console.log(`SUI Balance: ${balance.formattedBalance} ${balance.symbol}`);

    // Get quote
    const quote = await fusionService.getQuote({
      fromToken: '0x2::sui::SUI',
      toToken: '0x5d4b302506645c37ff133b98c4b50a5ae14841659738d6d733d59d0d217a93bf::coin::COIN',
      amount: '1000000000', // 1 SUI
      slippage: 1
    });

    console.log('Quote received:');
    console.log(`Rate: ${quote.rate}`);
    console.log(`Price Impact: ${quote.priceImpact}%`);
    console.log(`Estimated Gas: ${TokenFormatter.formatGas(quote.estimatedGas)}`);

    // Create order
    const order = await fusionService.createOrder({
      fromToken: '0x2::sui::SUI',
      toToken: '0x5d4b302506645c37ff133b98c4b50a5ae14841659738d6d733d59d0d217a93bf::coin::COIN',
      amount: '1000000000',
      slippage: 1,
      orderType: 'market'
    });

    console.log('Order created:', order.id);
    console.log('Transaction hash:', order.txHash);

  } catch (error) {
    console.error('Swap failed:', error);
  } finally {
    fusionService.dispose();
  }
}

performSwap();
```

### Order Management Example

```typescript
import { createFusionService } from '@1inch/sui-fusion-sdk';

async function manageOrders() {
  const fusionService = createFusionService({
    network: 'testnet',
    privateKey: process.env.PRIVATE_KEY
  });

  await fusionService.initialize();

  try {
    // Get all orders
    const orders = await fusionService.getOrders({
      status: ['pending'],
      limit: 10
    });

    console.log(`Found ${orders.total} pending orders`);

    for (const order of orders.items) {
      console.log(`Order ${order.id}:`);
      console.log(`  From: ${order.fromAmount} ${order.fromToken}`);
      console.log(`  To: ${order.toAmount} ${order.toToken}`);
      console.log(`  Status: ${order.status}`);
      console.log(`  Created: ${new Date(order.createdAt).toLocaleString()}`);
      
      // Cancel old orders (older than 1 hour)
      if (Date.now() - order.createdAt > 3600000) {
        console.log(`Cancelling old order ${order.id}`);
        await fusionService.cancelOrder(order.id);
      }
    }
  } catch (error) {
    console.error('Order management failed:', error);
  } finally {
    fusionService.dispose();
  }
}

manageOrders();
```

## TypeScript Support

The SDK is built with TypeScript and provides full type safety:

```typescript
import type {
  SuiFusionConfig,
  QuoteParams,
  Quote,
  Order,
  Balance,
  NetworkInfo
} from '@1inch/sui-fusion-sdk';

// All types are fully typed and documented
const config: SuiFusionConfig = {
  network: 'testnet', // Autocomplete available
  privateKey: 'your-key'
};

// Function parameters are type-checked
const quoteParams: QuoteParams = {
  fromToken: '0x2::sui::SUI',
  toToken: '0x...::usdc::USDC',
  amount: '1000000000',
  slippage: 1 // Optional, type-checked
};
```

## Dutch Auction & MEV Protection

The Sui Fusion SDK implements advanced Dutch auction mechanisms for MEV protection and optimal price discovery. This is the core feature that sets Fusion apart from traditional DEX aggregators.

### Key Benefits

- **🛡️ MEV Protection**: Time-based auctions prevent front-running and sandwich attacks
- **💰 Better Prices**: Competitive resolver bidding leads to improved execution rates
- **⚡ Fair Execution**: Dutch auction ensures fair price discovery over time
- **🔄 Partial Fills**: Support for partial order execution reduces slippage
- **🤖 Automated**: Resolvers compete automatically for optimal execution

### How It Works

1. **Order Creation**: User creates a Fusion order with auction parameters
2. **Price Decay**: Order starts at a premium rate and decreases over time
3. **Resolver Competition**: Independent market makers compete to fill the order
4. **Optimal Execution**: Best resolver wins and executes the trade
5. **MEV Protection**: Time-based mechanism prevents exploitation

### Quick Example

```typescript
import { FusionService, AuctionService, ResolverService } from '@1inch/sui-fusion-sdk';

// Create Fusion order with Dutch auction
const fusionOrder = await fusionService.createFusionOrder({
  fromToken: '0x2::sui::SUI',
  toToken: '0x...::usdc::COIN',
  fromAmount: '1000000000',
  enableAuction: true,
  auctionParams: {
    duration: 300, // 5 minutes
    initialRateAdjustment: 0.02, // Start 2% above market
    decayFunction: 'linear'
  },
  partialFillAllowed: true
});

// Monitor auction progress
const currentRate = AuctionService.calculateCurrentAuctionRate(
  fusionOrder.order.auctionDetails
);

// Set up resolver (for market makers)
const resolverService = new ResolverService(
  transactionBuilder,
  resolverKeypair,
  resolverInfo
);

// Analyze and fill profitable orders
const profitability = resolverService.analyzeOrderProfitability(
  fusionOrder.order,
  availableLiquidity
);

if (profitability.isProfitable) {
  const fillResult = await resolverService.fillOrder(
    fusionOrder.order,
    profitability.fillAmount
  );
}
```

### Advanced Features

- **Real-time Monitoring**: Track auction progress and profitability
- **Gas Optimization**: Smart gas pricing strategies for resolvers
- **Reputation System**: Track resolver performance and reliability
- **Batch Processing**: Handle multiple orders efficiently
- **MEV Analysis**: Estimate protection effectiveness and savings

### Documentation

For detailed documentation on Dutch auction implementation, see [DUTCH_AUCTION.md](./DUTCH_AUCTION.md).

For complete examples, check the `/examples` directory:
- `dutch-auction.ts` - Basic usage
- `complete-auction-demo.ts` - Comprehensive demo
- `resolver-bot.ts` - Resolver implementation

## Contributing

We welcome contributions! Please see our [Contributing Guide](CONTRIBUTING.md) for details.

## License

MIT License - see [LICENSE](LICENSE) file for details.

## Support

- 📖 [Documentation](https://docs.1inch.io/)
- 💬 [Discord](https://discord.gg/1inch)
- 🐦 [Twitter](https://twitter.com/1inch)
- 📧 [Email](mailto:support@1inch.io)

## Changelog

See [CHANGELOG.md](CHANGELOG.md) for version history and updates.