export type SuiNetwork = 'mainnet' | 'testnet' | 'devnet' | 'localnet';

export interface SuiFusionConfig {
  network: SuiNetwork;
  rpcUrl?: string;
  packageId?: string;
  privateKey?: string;
}

export interface QuoteParams {
  fromToken: string;
  toToken: string;
  amount: string;
  slippage?: number;
}

export interface Quote {
  fromToken: string;
  toToken: string;
  fromAmount: string;
  toAmount: string;
  rate: string;
  priceImpact: string;
  estimatedGas: string;
  route: DexProtocol[];
  validUntil?: number;
}

export interface OrderParams {
  fromToken: string;
  toToken: string;
  amount: string;
  slippage?: number;
  expirationTime?: number;
  orderType?: 'market' | 'limit';
  limitPrice?: string;
}

export interface Order {
  id: string;
  maker: string;
  fromToken: string;
  toToken: string;
  fromAmount: string;
  toAmount: string;
  status: 'pending' | 'filled' | 'cancelled' | 'expired';
  createdAt: number;
  expiresAt: number;
  txHash?: string;
  orderType: 'market' | 'limit';
  limitPrice?: string;
}

export interface Balance {
  tokenType: string;
  balance: string;
  formattedBalance: string;
  decimals: number;
  symbol: string;
}

export interface TransactionResult {
  success: boolean;
  transactionDigest?: string;
  error?: string;
  gasUsed?: string;
  effects?: any;
}

export interface NetworkInfo {
  network: SuiNetwork;
  rpcUrl: string;
  explorerUrl: string;
  packageId: string;
  chainId: string;
  isTestnet: boolean;
}

export interface DexProtocol {
  name: string;
  percentage: number;
  estimatedGas: string;
}

export interface OrderFilters {
  status?: Order['status'][];
  fromToken?: string;
  toToken?: string;
  maker?: string;
  limit?: number;
  offset?: number;
}

export interface SwapTransactionParams {
  fromTokenType: string;
  toTokenType: string;
  amount: string;
  minAmountOut: string;
  walletAddress: string;
  slippage: number;
  deadline?: number;
}

export interface TokenInfo {
  type: string;
  symbol: string;
  name: string;
  decimals: number;
  iconUrl?: string;
}

export interface NetworkConfig {
  rpcUrl: string;
  explorerUrl: string;
  packageId: string;
  chainId: string;
  tokens: Record<string, TokenInfo>;
  dexProtocols: string[];
  gasBudget: number;
}

export interface SuiFusionError {
  code: string;
  message: string;
  details?: any;
}

export interface PaginatedResult<T> {
  items: T[];
  total: number;
  page: number;
  limit: number;
  hasNext: boolean;
  hasPrev: boolean;
}

// Dutch Auction Types
export interface AuctionDetails {
  startTime: number;
  duration: number;
  startRate: string;
  endRate: string;
  currentRate?: string;
  remainingTime?: number;
  priceDecayFunction: 'linear' | 'exponential';
}

export interface FusionOrderParams extends OrderParams {
  auctionDetails?: AuctionDetails;
  enableAuction?: boolean;
  minFillAmount?: string;
  maxFillAmount?: string;
  partialFillAllowed?: boolean;
}

export interface FusionOrder extends Order {
  auctionDetails?: AuctionDetails;
  enableAuction: boolean;
  minFillAmount?: string;
  maxFillAmount?: string;
  partialFillAllowed: boolean;
  fillHistory: OrderFill[];
  currentAuctionRate?: string;
}

export interface OrderFill {
  id: string;
  orderId: string;
  resolver: string;
  fillAmount: string;
  fillRate: string;
  timestamp: number;
  txHash: string;
  gasUsed: string;
}

export interface ResolverInfo {
  address: string;
  name: string;
  reputation: number;
  totalVolume: string;
  successRate: number;
  averageGasUsed: string;
  isActive: boolean;
}

export interface AuctionQuote extends Quote {
  auctionDetails: AuctionDetails;
  estimatedFillTime: number;
  resolvers: ResolverInfo[];
  mevProtection: boolean;
}

export interface AuctionParams {
  duration?: number; // in seconds, default 180
  startRateMultiplier?: number; // default 1.05 (5% above market)
  endRateMultiplier?: number; // default 0.95 (5% below market)
  priceDecayFunction?: 'linear' | 'exponential';
  minFillAmount?: string;
  partialFillAllowed?: boolean;
}

// Preset enumeration for fusion swap speed settings
export enum PresetEnum {
  fast = 'fast',
  medium = 'medium',
  slow = 'slow'
}