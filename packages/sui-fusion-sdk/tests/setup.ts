/**
 * Jest Test Setup
 * 
 * Global test configuration and setup for the Sui Fusion SDK test suite
 */

// Extend Jest matchers
import 'jest';

// Mock environment variables for testing
process.env.NODE_ENV = 'test';

// Global test timeout
jest.setTimeout(30000);

// Mock console methods to reduce noise in tests
const originalConsoleError = console.error;
const originalConsoleWarn = console.warn;

beforeAll(() => {
  // Suppress console.error and console.warn in tests unless explicitly needed
  console.error = jest.fn();
  console.warn = jest.fn();
});

afterAll(() => {
  // Restore original console methods
  console.error = originalConsoleError;
  console.warn = originalConsoleWarn;
});

// Global test utilities
(global as any).testUtils = {
  // Mock Sui address
  mockSuiAddress: '0x1234567890abcdef1234567890abcdef12345678',
  
  // Mock transaction hash
  mockTxHash: '0xabcdef1234567890abcdef1234567890abcdef1234567890abcdef1234567890',
  
  // Mock private key for testing
  mockPrivateKey: 'suiprivkey1qqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqq',
  
  // Common test tokens
  tokens: {
    SUI: '0x2::sui::SUI',
    USDC: '0x5d4b302506645c37ff133b98c4b50a5ae14841659738d6d733d59d0d217a93bf::coin::COIN',
    USDT: '0xc060006111016b8a020ad5b33834984a437aaa7d3c74c18e09a95d48aceab08c::coin::COIN'
  },
  
  // Helper to create mock quote
  createMockQuote: (overrides = {}) => ({
    fromToken: (global as any).testUtils.tokens.SUI,
    toToken: (global as any).testUtils.tokens.USDC,
    fromAmount: '1000000000',
    toAmount: '2500000',
    rate: '2.5',
    priceImpact: 0.1,
    estimatedGas: '1000000',
    route: ['SUI', 'USDC'],
    validUntil: Date.now() + 300000,
    ...overrides
  }),
  
  // Helper to create mock order
  createMockOrder: (overrides = {}) => ({
    id: 'order-' + Math.random().toString(36).substr(2, 9),
    fromToken: (global as any).testUtils.tokens.SUI,
    toToken: (global as any).testUtils.tokens.USDC,
    fromAmount: '1000000000',
    toAmount: '2500000',
    orderType: 'market' as const,
    status: 'pending' as const,
    createdAt: Date.now(),
    txHash: (global as any).testUtils.mockTxHash,
    ...overrides
  }),
  
  // Helper to create mock balance
  createMockBalance: (overrides = {}) => ({
    tokenType: (global as any).testUtils.tokens.SUI,
    balance: '5000000000',
    formattedBalance: '5',
    symbol: 'SUI',
    decimals: 9,
    ...overrides
  }),
  
  // Helper to create mock transaction result
  createMockTransactionResult: (overrides = {}) => ({
    success: true,
    txHash: (global as any).testUtils.mockTxHash,
    gasUsed: '1000000',
    ...overrides
  }),
  
  // Helper to wait for async operations
  wait: (ms: number) => new Promise(resolve => setTimeout(resolve, ms)),
  
  // Helper to create mock network config
  createMockNetworkConfig: (network = 'testnet', overrides = {}) => ({
    name: network,
    rpcUrl: `https://fullnode.${network}.sui.io`,
    explorerUrl: `https://explorer.sui.io/?network=${network}`,
    packageId: '0x' + '1'.repeat(64),
    chainId: network === 'mainnet' ? '1' : '2',
    gasBudget: 10000000,
    supportedTokens: {
      SUI: {
        type: (global as any).testUtils.tokens.SUI,
        symbol: 'SUI',
        decimals: 9,
        name: 'Sui'
      },
      USDC: {
        type: (global as any).testUtils.tokens.USDC,
        symbol: 'USDC',
        decimals: 6,
        name: 'USD Coin'
      }
    },
    dexProtocols: ['cetus', 'turbos'],
    ...overrides
  })
};

// Declare global types for TypeScript
declare global {
  namespace NodeJS {
    interface Global {
      testUtils: {
        mockSuiAddress: string;
        mockTxHash: string;
        mockPrivateKey: string;
        tokens: {
          SUI: string;
          USDC: string;
          USDT: string;
        };
        createMockQuote: (overrides?: any) => any;
        createMockOrder: (overrides?: any) => any;
        createMockBalance: (overrides?: any) => any;
        createMockTransactionResult: (overrides?: any) => any;
        wait: (ms: number) => Promise<void>;
        createMockNetworkConfig: (network?: string, overrides?: any) => any;
      };
    }
  }
}

// Export for use in tests
export {};