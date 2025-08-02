export const suiFusionConfig = {
  // Default package ID for Sui Move contracts
  defaultPackageId: "0x1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef",
  
  // Supported networks
  supportedNetworks: ['mainnet', 'testnet', 'devnet', 'localnet'] as const,
  
  // Default network
  defaultNetwork: 'testnet' as const,
  
  // Network-specific configurations
  networks: {
    mainnet: {
      packageId: "0x1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef",
      rpcEndpoint: "https://fullnode.mainnet.sui.io:443",
      explorerUrl: "https://suiscan.xyz/mainnet",
      tokens: {
        SUI: "0x2::sui::SUI",
        USDC: "0x5d4b302506645c37ff133b98c4b50a5ae14841659738d6d733d59d0d217a93bf::coin::COIN",
        USDT: "0xc060006111016b8a020ad5b33834984a437aaa7d3c74c18e09a95d48aceab08c::coin::COIN",
        WETH: "0xaf8cd5edc19c4512f4259f0bee101a40d41ebed738ade5874359610ef8eeced5::coin::COIN",
        CETUS: "0x06864a6f921804860930db6ddbe2e16acdf8504495ea7481637a1c8b9a8fe54b::cetus::CETUS",
      },
    },
    testnet: {
      packageId: "0x1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef",
      rpcEndpoint: "https://fullnode.testnet.sui.io:443",
      explorerUrl: "https://suiscan.xyz/testnet",
      tokens: {
        SUI: "0x2::sui::SUI",
        USDC: "0x2::coin::COIN<0x123::usdc::USDC>",
        USDT: "0x2::coin::COIN<0x123::usdt::USDT>",
        WETH: "0x2::coin::COIN<0x123::weth::WETH>",
        CETUS: "0x2::coin::COIN<0x123::cetus::CETUS>",
      },
    },
    devnet: {
      packageId: "0x1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef",
      rpcEndpoint: "https://fullnode.devnet.sui.io:443",
      explorerUrl: "https://suiscan.xyz/devnet",
      tokens: {
        SUI: "0x2::sui::SUI",
        USDC: "0x2::coin::COIN<0x123::usdc::USDC>",
        USDT: "0x2::coin::COIN<0x123::usdt::USDT>",
        WETH: "0x2::coin::COIN<0x123::weth::WETH>",
        CETUS: "0x2::coin::COIN<0x123::cetus::CETUS>",
      },
    },
    localnet: {
      packageId: "0x1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef",
      rpcEndpoint: "http://127.0.0.1:9000",
      explorerUrl: "http://localhost:9001",
      tokens: {
        SUI: "0x2::sui::SUI",
        USDC: "0x2::coin::COIN<0x123::usdc::USDC>",
        USDT: "0x2::coin::COIN<0x123::usdt::USDT>",
        WETH: "0x2::coin::COIN<0x123::weth::WETH>",
        CETUS: "0x2::coin::COIN<0x123::cetus::CETUS>",
      },
    },
  },
  
  // Gas limits for different operations
  gasLimits: {
    createOrder: 1000000,
    fillOrder: 1500000,
    cancelOrder: 500000,
    approve: 300000,
  },
  
  // Default slippage tolerance (in basis points)
  defaultSlippage: 50, // 0.5%
  
  // Default order expiration time (in milliseconds)
  defaultOrderExpiration: 24 * 60 * 60 * 1000, // 24 hours
  
  // Minimum order amounts for different tokens
  minOrderAmounts: {
    SUI: "100000000", // 0.1 SUI
    USDC: "1000000", // 1 USDC
    USDT: "1000000", // 1 USDT
    WETH: "1000000000000000", // 0.001 WETH
  },
  
  // Fee structure
  fees: {
    protocolFee: 30, // 0.3% in basis points
    resolverFee: 10, // 0.1% in basis points
  },
  
  // Supported DEX protocols
  supportedDexes: [
    'Cetus',
    'Turbos',
    'Aftermath',
    'Kriya',
    'FlowX',
  ],
  
  // Move module names
  modules: {
    fusionSwap: 'fusion_swap',
    orderBook: 'order_book',
    escrow: 'escrow',
    resolver: 'resolver',
  },
  
  // Event types
  eventTypes: {
    OrderCreated: 'OrderCreated',
    OrderFilled: 'OrderFilled',
    OrderCancelled: 'OrderCancelled',
    OrderExpired: 'OrderExpired',
  },
};

export type SuiFusionConfig = typeof suiFusionConfig;
export type SuiNetwork = typeof suiFusionConfig.supportedNetworks[number];