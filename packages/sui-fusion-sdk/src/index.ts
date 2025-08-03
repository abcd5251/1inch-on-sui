// Core services
import { FusionService } from './services/FusionService';
import { AuctionService } from './services/AuctionService';
import { ResolverService } from './services/ResolverService';
import { NetworkFactory } from './core/NetworkFactory';
import { TransactionBuilder } from './core/TransactionBuilder';
import type { SuiFusionConfig } from './types';

export { FusionService, AuctionService, ResolverService, NetworkFactory, TransactionBuilder };

// Type exports
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
  // Dutch Auction types
  AuctionDetails,
  FusionOrderParams,
  FusionOrder,
  OrderFill,
  ResolverInfo,
  AuctionQuote,
  AuctionParams
} from './types';

// Enum exports
export { PresetEnum } from './types';

// Utility exports
export {
  TokenFormatter,
  NumberUtils
} from './utils/formatters';

export {
  AddressValidator,
  AmountValidator,
  NetworkValidator,
  ParamValidator,
  ValidationUtils
} from './utils/validators';

export {
  ErrorCode,
  SuiFusionSDKError,
  NetworkError,
  RPCError,
  ValidationError,
  InvalidAddressError,
  InvalidAmountError,
  InvalidTokenTypeError,
  TransactionError,
  InsufficientBalanceError,
  InsufficientGasError,
  OrderError,
  OrderNotFoundError,
  OrderExpiredError,
  QuoteError,
  NoRouteFoundError,
  PriceImpactTooHighError,
  ErrorHandler
} from './utils/errors';

// Configuration exports
export {
  NETWORK_CONFIGS,
  DEFAULT_NETWORK,
  getNetworkConfig,
  getSupportedNetworks,
  isValidNetwork
} from './config/networks';

// Version
export const VERSION = '1.0.0';

/**
 * Create a new Fusion service instance
 */
export function createFusionService(config: SuiFusionConfig): FusionService {
  return new FusionService(config);
}

/**
 * Default export for convenience
 */
export default {
  FusionService,
  AuctionService,
  ResolverService,
  NetworkFactory,
  TransactionBuilder,
  createFusionService,
  VERSION
};