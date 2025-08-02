# Dutch Auction Mechanism - Sui Fusion SDK

## Overview

The Dutch Auction mechanism is the core feature of Fusion mode, providing MEV protection, fair price discovery, and optimal execution for token swaps on the Sui blockchain. This implementation brings the power of 1inch's Fusion technology to the Sui ecosystem.

## Key Features

### 🎯 **Dutch Auction Core**
- **Time-based Price Discovery**: Prices start high and decrease over time until filled
- **MEV Protection**: Prevents front-running and sandwich attacks
- **Fair Execution**: Best price discovery through competitive bidding
- **Flexible Duration**: Configurable auction periods (30s to 10 minutes)

### 🤖 **Resolver Ecosystem**
- **Independent Market Makers**: Compete to fill orders profitably
- **Reputation System**: Track resolver performance and reliability
- **Profitability Analysis**: Real-time profit calculations
- **Gas Optimization**: Smart gas price strategies

### 🛡️ **MEV Protection**
- **Auction-based Execution**: Eliminates front-running opportunities
- **Time-locked Orders**: Prevents immediate exploitation
- **Competitive Filling**: Multiple resolvers compete for best execution
- **Slippage Reduction**: Better prices through auction mechanism

## Architecture

```
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   User Order    │───▶│ Dutch Auction   │───▶│   Resolvers     │
│                 │    │   Mechanism     │    │                 │
│ • Token Pair    │    │ • Price Decay   │    │ • Profit Calc   │
│ • Amount        │    │ • Time Window   │    │ • Competition   │
│ • Min/Max Fill  │    │ • Rate Curve    │    │ • Execution     │
└─────────────────┘    └─────────────────┘    └─────────────────┘
```

## Core Components

### 1. AuctionService

Handles auction logic and price calculations:

```typescript
import { AuctionService } from '@1inch/sui-fusion-sdk';

// Create auction details
const auctionDetails = AuctionService.createAuctionDetails({
  startTime: Date.now(),
  duration: 300, // 5 minutes
  initialRateAdjustment: 0.02, // Start 2% above market
  decayFunction: 'linear'
});

// Calculate current rate
const currentRate = AuctionService.calculateCurrentAuctionRate(auctionDetails);

// Check if auction is active
const isActive = AuctionService.isAuctionActive(auctionDetails);
```

### 2. ResolverService

Manages resolver operations and profitability:

```typescript
import { ResolverService } from '@1inch/sui-fusion-sdk';

// Initialize resolver
const resolverService = new ResolverService(
  transactionBuilder,
  resolverKeypair,
  resolverInfo
);

// Analyze order profitability
const analysis = resolverService.analyzeOrderProfitability(
  order,
  availableLiquidity
);

// Fill profitable order
if (analysis.isProfitable) {
  const result = await resolverService.fillOrder(
    order,
    analysis.fillAmount
  );
}
```

### 3. FusionService (Enhanced)

Extended with Dutch auction capabilities:

```typescript
import { FusionService } from '@1inch/sui-fusion-sdk';

// Get auction quote
const quote = await fusionService.getAuctionQuote({
  fromToken: '0x2::sui::SUI',
  toToken: '0x...::usdc::COIN',
  fromAmount: '1000000000',
  auctionParams: {
    duration: 300,
    initialRateAdjustment: 0.02
  }
});

// Create fusion order
const order = await fusionService.createFusionOrder({
  fromToken: '0x2::sui::SUI',
  toToken: '0x...::usdc::COIN',
  fromAmount: '1000000000',
  enableAuction: true,
  auctionParams: {
    startTime: Date.now(),
    duration: 300,
    initialRateAdjustment: 0.02,
    decayFunction: 'linear'
  },
  partialFillAllowed: true
});
```

## Usage Examples

### Basic Dutch Auction Order

```typescript
import { createFusionService, type FusionOrderParams } from '@1inch/sui-fusion-sdk';

const fusionService = createFusionService({
  network: 'testnet',
  rpcUrl: 'https://fullnode.testnet.sui.io:443',
  privateKey: process.env.PRIVATE_KEY
});

const orderParams: FusionOrderParams = {
  fromToken: '0x2::sui::SUI',
  toToken: '0x...::usdc::COIN',
  fromAmount: '1000000000', // 1 SUI
  enableAuction: true,
  auctionParams: {
    startTime: Date.now(),
    duration: 300, // 5 minutes
    initialRateAdjustment: 0.02, // Start 2% above market
    decayFunction: 'linear'
  },
  minFillAmount: '100000000', // 0.1 SUI minimum
  partialFillAllowed: true,
  expirationTime: Date.now() + 600000 // 10 minutes
};

const result = await fusionService.createFusionOrder(orderParams);
console.log('Order created:', result.order?.id);
```

### Resolver Implementation

```typescript
import { ResolverService, type ResolverInfo } from '@1inch/sui-fusion-sdk';
import { Ed25519Keypair } from '@mysten/sui/keypairs/ed25519';

// Set up resolver
const resolverKeypair = Ed25519Keypair.generate();
const resolverInfo: ResolverInfo = {
  address: resolverKeypair.getPublicKey().toSuiAddress(),
  reputation: 85.0,
  successRate: 0.92,
  averageGasUsed: '2500000',
  totalVolumeHandled: '50000000000000',
  isActive: true,
  lastActiveTime: Date.now(),
  supportedTokens: ['0x2::sui::SUI', '0x...::usdc::COIN']
};

const resolverService = new ResolverService(
  transactionBuilder,
  resolverKeypair,
  resolverInfo
);

// Monitor and fill orders
const orders = await getActiveOrders(); // Your order fetching logic
const fills = await resolverService.monitorAndFillOrders(orders, 3);
console.log(`Filled ${fills.length} orders`);
```

### Real-time Monitoring

```typescript
import { AuctionService } from '@1inch/sui-fusion-sdk';

// Monitor auction progress
const monitorAuction = (order) => {
  const interval = setInterval(() => {
    if (!order.auctionDetails) return;
    
    const isActive = AuctionService.isAuctionActive(order.auctionDetails);
    if (!isActive) {
      console.log('Auction ended');
      clearInterval(interval);
      return;
    }
    
    const currentRate = AuctionService.calculateCurrentAuctionRate(order.auctionDetails);
    const timeRemaining = AuctionService.getTimeRemaining(order.auctionDetails);
    
    console.log(`Rate: ${currentRate}, Time: ${timeRemaining}s`);
  }, 1000);
};
```

## Configuration Options

### Auction Parameters

```typescript
interface AuctionParams {
  startTime?: number;           // Auction start time (default: now)
  duration: number;             // Auction duration in seconds (30-600)
  initialRateAdjustment: number; // Initial rate adjustment (0.01-0.1)
  decayFunction: 'linear' | 'exponential'; // Price decay function
}
```

### Order Configuration

```typescript
interface FusionOrderParams {
  fromToken: string;            // Source token address
  toToken: string;              // Target token address
  fromAmount: string;           // Amount to swap
  enableAuction: boolean;       // Enable Dutch auction
  auctionParams?: AuctionParams; // Auction configuration
  minFillAmount?: string;       // Minimum fill amount
  maxFillAmount?: string;       // Maximum fill amount
  partialFillAllowed?: boolean; // Allow partial fills
  expirationTime?: number;      // Order expiration
}
```

### Resolver Configuration

```typescript
interface ResolverInfo {
  address: string;              // Resolver address
  reputation: number;           // Reputation score (0-100)
  successRate: number;          // Success rate (0-1)
  averageGasUsed: string;       // Average gas consumption
  totalVolumeHandled: string;   // Total volume handled
  isActive: boolean;            // Active status
  lastActiveTime: number;       // Last activity timestamp
  supportedTokens: string[];    // Supported token list
}
```

## MEV Protection Analysis

### Protection Levels

- **High**: Long auction duration (>5 min), partial fills allowed, multiple resolvers
- **Medium**: Standard auction duration (2-5 min), competitive environment
- **Low**: Short auction duration (<2 min), limited resolver participation

### Risk Factors

- Short auction duration
- Large order size
- No partial fills allowed
- Limited resolver competition
- High network congestion

### Estimated Savings

```typescript
const mevAnalysis = resolverService.estimateMEVProtection(order);
console.log(`Protection Level: ${mevAnalysis.protectionLevel}`);
console.log(`Estimated Savings: ${mevAnalysis.estimatedSavings}`);
console.log(`Risk Factors: ${mevAnalysis.riskFactors.join(', ')}`);
```

## Best Practices

### For Users

1. **Auction Duration**: Use 3-5 minutes for optimal price discovery
2. **Initial Rate**: Start 1-3% above market rate
3. **Partial Fills**: Enable for better execution probability
4. **Order Size**: Consider breaking large orders into smaller chunks

### For Resolvers

1. **Profitability**: Maintain minimum 0.05% profit margin
2. **Gas Optimization**: Use dynamic gas pricing
3. **Reputation**: Maintain high success rate (>90%)
4. **Monitoring**: Implement real-time order monitoring

### For Developers

1. **Error Handling**: Implement comprehensive error handling
2. **Rate Limiting**: Respect API rate limits
3. **Testing**: Use testnet for development and testing
4. **Security**: Never expose private keys in code

## Performance Metrics

### Auction Efficiency

- **Fill Rate**: Percentage of orders successfully filled
- **Price Improvement**: Average price improvement vs market
- **Time to Fill**: Average time from order creation to fill
- **MEV Savings**: Estimated MEV protection value

### Resolver Performance

- **Success Rate**: Percentage of successful fills
- **Profit Margin**: Average profit per fill
- **Gas Efficiency**: Gas usage optimization
- **Response Time**: Time to respond to profitable orders

## Troubleshooting

### Common Issues

1. **Order Not Filled**
   - Check auction duration and rate adjustment
   - Verify resolver availability
   - Ensure sufficient liquidity

2. **Low Profitability**
   - Adjust initial rate parameters
   - Optimize gas pricing
   - Improve resolver efficiency

3. **High Gas Costs**
   - Use gas optimization strategies
   - Batch multiple operations
   - Monitor network congestion

### Debug Mode

```typescript
// Enable debug logging
const fusionService = createFusionService({
  ...config,
  debug: true
});
```

## Examples

See the `/examples` directory for complete implementation examples:

- `dutch-auction.ts` - Basic Dutch auction usage
- `complete-auction-demo.ts` - Comprehensive demo with all features
- `resolver-bot.ts` - Resolver implementation example

## API Reference

For detailed API documentation, see the TypeScript definitions in `/src/types/index.ts`.

## Contributing

Contributions are welcome! Please read the contributing guidelines and submit pull requests for any improvements.

## License

MIT License - see LICENSE file for details.