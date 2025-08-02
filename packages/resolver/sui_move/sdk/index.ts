/**
 * SUI Move Cross-Chain Auction SDK
 * 
 * Main entry point for the TypeScript SDK that provides easy integration
 * with the SUI Move cross-chain auction and escrow system.
 * 
 * @author 1inch Network
 * @version 1.0.0
 */

// Export main SDK class
export { CrossChainAuctionSDK } from './typescript-example';

// Export utility classes
export { AuctionUtils } from './typescript-example';

// Export types
export type { AuctionConfig, Escrow, Auction } from './typescript-example';

// Export example usage function
export { exampleUsage } from './typescript-example';

// Re-export commonly used Sui.js types for convenience
export type {
  SuiClient,
  Transaction
} from '@mysten/sui.js/client';

export type {
  Ed25519Keypair
} from '@mysten/sui.js/keypairs/ed25519';

// Export constants
export const CONSTANTS = {
  // Protocol constants
  PROTOCOL_FEE_BPS: 250, // 2.5%
  REVEAL_WINDOW_MS: 86400000, // 24 hours
  MIN_AUCTION_DURATION_MS: 300000, // 5 minutes
  MAX_AUCTION_DURATION_MS: 604800000, // 7 days
  
  // Sui system objects
  CLOCK_OBJECT: '0x6',
  SUI_SYSTEM: '0x3',
  SUI_FRAMEWORK: '0x2',
  
  // Gas budgets
  GAS_BUDGET: {
    CREATE_ESCROW: 10000000,
    CREATE_AUCTION: 10000000,
    PLACE_BID: 10000000,
    REVEAL_AND_RELEASE: 10000000,
    VIEW_FUNCTION: 1000000
  },
  
  // Network configurations
  NETWORKS: {
    mainnet: 'https://fullnode.mainnet.sui.io:443',
    testnet: 'https://fullnode.testnet.sui.io:443',
    devnet: 'https://fullnode.devnet.sui.io:443',
    localnet: 'http://127.0.0.1:9000'
  }
} as const;

// Export error types
export class AuctionSDKError extends Error {
  constructor(
    message: string,
    public code?: string,
    public details?: any
  ) {
    super(message);
    this.name = 'AuctionSDKError';
  }
}

export class TransactionError extends AuctionSDKError {
  constructor(
    message: string,
    public transactionDigest?: string,
    details?: any
  ) {
    super(message, 'TRANSACTION_ERROR', details);
    this.name = 'TransactionError';
  }
}

export class ConfigurationError extends AuctionSDKError {
  constructor(message: string, details?: any) {
    super(message, 'CONFIGURATION_ERROR', details);
    this.name = 'ConfigurationError';
  }
}

export class ValidationError extends AuctionSDKError {
  constructor(message: string, details?: any) {
    super(message, 'VALIDATION_ERROR', details);
    this.name = 'ValidationError';
  }
}

// Export version
export const VERSION = '1.0.0';

// Default export
import { CrossChainAuctionSDK } from './typescript-example';
export default CrossChainAuctionSDK;