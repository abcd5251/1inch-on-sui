// Export from sui-fusion-sdk
export {
  FusionService,
  AuctionService,
  ResolverService,
  NetworkFactory,
  TransactionBuilder,
  createFusionService,
} from "@1inch/sui-fusion-sdk";

export type {
  SuiNetwork,
  SuiFusionConfig,
  QuoteParams,
  Quote,
  OrderParams,
  Order,
  Balance,
  TransactionResult,
  NetworkInfo,
  DexProtocol,
  OrderFilters,
  SwapTransactionParams,
  TokenInfo,
  NetworkConfig,
  SuiFusionError,
  PaginatedResult,
  AuctionDetails,
  FusionOrderParams,
  FusionOrder,
  OrderFill,
  ResolverInfo,
  AuctionQuote,
  AuctionParams,
} from "@1inch/sui-fusion-sdk";

// Re-export MockFusionService for demo purposes
export { MockFusionService } from "./MockFusionService";

// Keep legacy config for backward compatibility
export { fusionConfig } from "./config";
