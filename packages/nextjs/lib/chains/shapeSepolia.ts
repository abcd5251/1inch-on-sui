/**
 * Shape Sepolia testnet chain configuration
 * Chain ID: 11011
 */

import { defineChain } from 'viem'

export const shapeSepolia = defineChain({
  id: 11011,
  name: 'Shape Sepolia Testnet',
  nativeCurrency: {
    name: 'Ether',
    symbol: 'ETH',
    decimals: 18,
  },
  rpcUrls: {
    default: {
      http: ['https://shape-sepolia.g.alchemy.com/v2/Z58lRRk-gDFV440CQdMgKOJgPd5MFMLb'],
    },
    public: {
      http: ['https://11011.rpc.thirdweb.com'],
    },
  },
  blockExplorers: {
    default: {
      name: 'Shape Sepolia Explorer',
      url: 'https://explorer-sepolia.shape.network',
    },
    alchemy: {
      name: 'Alchemy Explorer',
      url: 'https://shape-sepolia-explorer.alchemy.com',
    },
  },
  testnet: true,
  contracts: {
    // Add contract addresses as they become available
    multicall3: {
      address: '0xca11bde05977b3631167028862be2a173976ca11',
      blockCreated: 1,
    },
  },
})