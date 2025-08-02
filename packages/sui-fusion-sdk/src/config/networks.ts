import { NetworkConfig, SuiNetwork } from '../types';

export const NETWORK_CONFIGS: Record<SuiNetwork, NetworkConfig> = {
  mainnet: {
    rpcUrl: 'https://fullnode.mainnet.sui.io',
    explorerUrl: 'https://suiscan.xyz/mainnet',
    packageId: '0x0000000000000000000000000000000000000000000000000000000000000000', // TODO: Replace with actual package ID
    chainId: 'sui:mainnet',
    gasBudget: 10000000,
    tokens: {
      SUI: {
        type: '0x2::sui::SUI',
        symbol: 'SUI',
        name: 'Sui',
        decimals: 9
      },
      USDC: {
        type: '0x5d4b302506645c37ff133b98c4b50a5ae14841659738d6d733d59d0d217a93bf::coin::COIN',
        symbol: 'USDC',
        name: 'USD Coin',
        decimals: 6
      },
      USDT: {
        type: '0xc060006111016b8a020ad5b33834984a437aaa7d3c74c18e09a95d48aceab08c::coin::COIN',
        symbol: 'USDT',
        name: 'Tether USD',
        decimals: 6
      }
    },
    dexProtocols: ['Cetus', 'Turbos', 'Aftermath']
  },
  testnet: {
    rpcUrl: 'https://fullnode.testnet.sui.io',
    explorerUrl: 'https://suiscan.xyz/testnet',
    packageId: '0x0000000000000000000000000000000000000000000000000000000000000000', // TODO: Replace with actual package ID
    chainId: 'sui:testnet',
    gasBudget: 10000000,
    tokens: {
      SUI: {
        type: '0x2::sui::SUI',
        symbol: 'SUI',
        name: 'Sui',
        decimals: 9
      },
      USDC: {
        type: '0x0000000000000000000000000000000000000000000000000000000000000000::usdc::USDC', // TODO: Replace with testnet USDC
        symbol: 'USDC',
        name: 'USD Coin (Testnet)',
        decimals: 6
      }
    },
    dexProtocols: ['Cetus', 'Turbos']
  },
  devnet: {
    rpcUrl: 'https://fullnode.devnet.sui.io',
    explorerUrl: 'https://suiscan.xyz/devnet',
    packageId: '0x0000000000000000000000000000000000000000000000000000000000000000', // TODO: Replace with actual package ID
    chainId: 'sui:devnet',
    gasBudget: 10000000,
    tokens: {
      SUI: {
        type: '0x2::sui::SUI',
        symbol: 'SUI',
        name: 'Sui',
        decimals: 9
      }
    },
    dexProtocols: ['Cetus']
  },
  localnet: {
    rpcUrl: 'http://127.0.0.1:9000',
    explorerUrl: 'http://localhost:3000',
    packageId: '0x0000000000000000000000000000000000000000000000000000000000000000', // TODO: Replace with local package ID
    chainId: 'sui:localnet',
    gasBudget: 10000000,
    tokens: {
      SUI: {
        type: '0x2::sui::SUI',
        symbol: 'SUI',
        name: 'Sui',
        decimals: 9
      }
    },
    dexProtocols: []
  }
};

export const DEFAULT_NETWORK: SuiNetwork = 'testnet';

export function getNetworkConfig(network: SuiNetwork): NetworkConfig {
  const config = NETWORK_CONFIGS[network];
  if (!config) {
    throw new Error(`Unsupported network: ${network}`);
  }
  return config;
}

export function getSupportedNetworks(): SuiNetwork[] {
  return Object.keys(NETWORK_CONFIGS) as SuiNetwork[];
}

export function isValidNetwork(network: string): network is SuiNetwork {
  return network in NETWORK_CONFIGS;
}