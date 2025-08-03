/**
 * Placeholder hook for Ethereum Fusion SDK
 * This is a stub to prevent import errors
 */

export const ETHEREUM_TOKENS = [
  {
    address: "0xA0b86a33E6441c9E35ED50Ce2Eb8a7Cf7f85da0B",
    symbol: "WETH",
    name: "Wrapped Ethereum",
    decimals: 18,
  },
  {
    address: "0xA0b86a33E6441c9E35ED50Ce2Eb8a7Cf7f85da0C",
    symbol: "USDC",
    name: "USD Coin",
    decimals: 6,
  },
];

export const useEthereumFusionSDK = () => {
  return {
    sdk: null,
    isInitialized: false,
    isLoading: false,
    error: null,
    tokens: ETHEREUM_TOKENS,
    initialize: () => Promise.resolve(),
  };
};

export default useEthereumFusionSDK;