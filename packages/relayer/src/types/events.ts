/**
 * Event-related type definitions
 * Defines interfaces for cross-chain event monitoring and processing
 */

// HTLC Event Types for Cross-Chain Communication
export enum HTLCEventType {
  HTLC_CREATED = 'HTLC_CREATED',
  HTLC_WITHDRAWN = 'HTLC_WITHDRAWN',
  HTLC_REFUNDED = 'HTLC_REFUNDED',
}

export interface BaseHTLCEvent {
  type: HTLCEventType;
  chain: 'ethereum' | 'sui';
  contractId: string;
  blockNumber: number;
  txHash: string;
  timestamp: number;
}

export interface EthereumHTLCEvent extends BaseHTLCEvent {
  chain: 'ethereum';
  // HTLC_CREATED specific fields
  sender?: string;
  receiver?: string;
  tokenContract?: string;
  amount?: string;
  hashlock?: string;
  timelock?: string;
  targetChainId?: string;
  // HTLC_WITHDRAWN specific fields  
  preimage?: string;
}

export interface SuiHTLCEvent extends BaseHTLCEvent {
  chain: 'sui';
  // HTLC_CREATED specific fields
  sender?: string;
  receiver?: string;
  amount?: string;
  hashlock?: string;
  timelock?: string;
  sourceChainId?: string;
  // HTLC_WITHDRAWN specific fields
  preimage?: string;
}

export type HTLCEvent = EthereumHTLCEvent | SuiHTLCEvent;

/**
 * Enhanced event type system
 */

/**
 * Chain event base interface
 */
export interface ChainEvent {
  id: string;
  type: string;
  chainId: string;
  blockNumber: number;
  transactionHash: string;
  logIndex: number;
  timestamp: number;
  data: Record<string, any>;
  contractAddress?: string;
}

/**
 * Cross-chain swap event interface
 */
export interface CrossChainSwapEvent extends ChainEvent {
  orderId: string;
  maker: string;
  taker?: string;
  makingAmount: string;
  takingAmount: string;
  makingToken: string;
  takingToken: string;
  sourceChain: string;
  targetChain: string;
  secretHash: string;
  timeLock: number;
}

/**
 * Event processing result interface
 */
export interface EventProcessingResult {
  success: boolean;
  eventId: string;
  processingTime: number;
  action?: string;
  data?: any;
  error?: string;
}

/**
 * Monitor configuration interface
 */
export interface MonitorConfig {
  ethereum: EthereumMonitorConfig;
  sui: SuiMonitorConfig;
}

/**
 * Ethereum monitor configuration
 */
export interface EthereumMonitorConfig {
  rpcUrl: string;
  contractAddresses: string[];
  startBlock: number;
  confirmations: number;
  batchSize: number;
  pollInterval?: number;
  maxReconnectAttempts?: number;
}

/**
 * Sui monitor configuration
 */
export interface SuiMonitorConfig {
  rpcUrl: string;
  packageIds: string[];
  startCheckpoint: number;
  batchSize: number;
  pollInterval?: number;
  maxReconnectAttempts?: number;
}

/**
 * Event type enumeration
 */
export enum EventType {
  ORDER_CREATED = 'OrderCreated',
  ORDER_FILLED = 'OrderFilled',
  SECRET_REVEALED = 'SecretRevealed',
  SWAP_COMPLETED = 'SwapCompleted',
  SWAP_REFUNDED = 'SwapRefunded',
  CROSS_CHAIN_INITIATED = 'CrossChainInitiated',
  CROSS_CHAIN_CONFIRMED = 'CrossChainConfirmed',
}

/**
 * Chain type enumeration
 */
export enum ChainType {
  ETHEREUM = 'ethereum',
  SUI = 'sui',
}

// Cross-chain swap status tracking
export enum SwapStatus {
  PENDING = 'PENDING',
  ETHEREUM_LOCKED = 'ETHEREUM_LOCKED',
  SUI_LOCKED = 'SUI_LOCKED',
  COMPLETED = 'COMPLETED',
  REFUNDED = 'REFUNDED',
  FAILED = 'FAILED',
}

export interface CrossChainSwap {
  id: string;
  status: SwapStatus;
  ethereumContractId?: string;
  suiContractId?: string;
  initiator: string;
  receiver: string;
  amount: string;
  hashlock: string;
  preimage?: string;
  timelock: number;
  createdAt: number;
  updatedAt: number;
  errors?: string[];
}

// Relayer service event types
export interface RelayerEvent {
  type: 'SWAP_CREATED' | 'SWAP_UPDATED' | 'SWAP_COMPLETED' | 'SWAP_FAILED';
  swapId: string;
  data: any;
  timestamp: number;
}

// WebSocket message types for real-time updates
export interface WebSocketMessage {
  type: 'htlc_event' | 'swap_status' | 'error' | 'heartbeat';
  data: any;
  timestamp: number;
}