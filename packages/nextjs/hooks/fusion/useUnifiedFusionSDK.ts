/**
 * Placeholder hook for Unified Fusion SDK
 * This is a stub to prevent import errors
 */

export type NetworkType = "ethereum" | "sui" | "polygon" | "bsc";

export const NETWORK_CONFIG = {
  ethereum: {
    name: "Ethereum",
    chainId: 1,
    rpcUrl: "https://eth-mainnet.g.alchemy.com/v2/",
  },
  sui: {
    name: "Sui",
    chainId: "sui",
    rpcUrl: "https://fullnode.mainnet.sui.io",
  },
};

export const useUnifiedFusionSDK = () => {
  return {
    sdk: null,
    currentNetwork: "ethereum" as NetworkType,
    networks: NETWORK_CONFIG,
    isInitialized: false,
    isLoading: false,
    error: null,
    switchNetwork: (network: NetworkType) => Promise.resolve(),
    initialize: () => Promise.resolve(),
  };
};

export default useUnifiedFusionSDK;