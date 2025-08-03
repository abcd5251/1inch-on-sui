import { NetworkEnum } from "@1inch/fusion-sdk";

export const fusionConfig = {
  // 1inch Fusion API endpoint
  apiUrl: "https://api.1inch.dev/fusion",

  // Default network (can be overridden)
  defaultNetwork: NetworkEnum.ETHEREUM,

  // Supported networks
  supportedNetworks: [NetworkEnum.ETHEREUM, NetworkEnum.BINANCE, NetworkEnum.POLYGON],

  // Token addresses for different networks
  tokens: {
    [NetworkEnum.ETHEREUM]: {
      NATIVE: "0xeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeee",
      WETH: "0xc02aaa39b223fe8d0a0e5c4f27ead9083c756cc2",
      USDC: "0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48",
      INCH: "0x111111111117dC0aa78b770fA6A738034120C302",
    },
    [NetworkEnum.BINANCE]: {
      NATIVE: "0xeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeee",
      WBNB: "0xbb4CdB9CBd36B01bD1cBaEBF2De08d9173bc095c",
      USDC: "0x8ac76a51cc950d9822d68b83fe1ad97b32cd580d",
    },
    [NetworkEnum.POLYGON]: {
      NATIVE: "0xeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeee",
      WMATIC: "0x0d500b1d8e8ef31e21c99d1db9a6444d3adf1270",
      USDC: "0x2791bca1f2de4661ed88a30c99a7a9449aa84174",
    },
  },

  // Router addresses
  routers: {
    [NetworkEnum.ETHEREUM]: "0x1111111254EEB25477B68fb85Ed929f73A960582",
    [NetworkEnum.BINANCE]: "0x1111111254EEB25477B68fb85Ed929f73A960582",
    [NetworkEnum.POLYGON]: "0x1111111254EEB25477B68fb85Ed929f73A960582",
  },

  // Default gas limits
  gasLimits: {
    approve: 50000,
    swap: 300000,
  },
};

export type FusionConfig = typeof fusionConfig;
