/**
 * 交换状态枚举
 */
export enum SwapStatus {
  PENDING = 'pending',
  CONFIRMED = 'confirmed',
  EXECUTING = 'executing',
  COMPLETED = 'completed',
  FAILED = 'failed',
  CANCELLED = 'cancelled',
  EXPIRED = 'expired',
}

/**
 * 交换数据接口
 */
export interface SwapData {
  id: string;
  orderId: string;
  maker: string;
  taker?: string;
  makerAsset: string;
  takerAsset: string;
  makerAmount: string;
  takerAmount: string;
  makerChain: string;
  takerChain: string;
  status: SwapStatus;
  createdAt: number;
  updatedAt: number;
  expiresAt: number;
  signature?: string;
  txHash?: string;
  errorMessage?: string;
  metadata?: Record<string, any>;
}

/**
 * 创建交换请求
 */
export interface CreateSwapRequest {
  orderId: string;
  maker: string;
  taker?: string;
  makerAsset: string;
  takerAsset: string;
  makerAmount: string;
  takerAmount: string;
  makerChain: string;
  takerChain: string;
  expiresAt: number;
  signature?: string;
  metadata?: Record<string, any>;
}

/**
 * 更新交换状态请求
 */
export interface UpdateSwapStatusRequest {
  status: SwapStatus;
  txHash?: string;
  errorMessage?: string;
  metadata?: Record<string, any>;
}

/**
 * 交换查询参数
 */
export interface SwapQueryParams {
  maker?: string;
  taker?: string;
  status?: SwapStatus;
  makerChain?: string;
  takerChain?: string;
  createdAfter?: number;
  createdBefore?: number;
  limit?: number;
  offset?: number;
  sortBy?: 'createdAt' | 'updatedAt' | 'expiresAt';
  sortOrder?: 'asc' | 'desc';
}

/**
 * 交换统计信息
 */
export interface SwapStats {
  total: number;
  pending: number;
  confirmed: number;
  executing: number;
  completed: number;
  failed: number;
  cancelled: number;
  expired: number;
  totalVolume: string;
  last24hVolume: string;
  last7dVolume: string;
}

/**
 * 交换事件
 */
export interface SwapEvent {
  id: string;
  swapId: string;
  type: 'created' | 'updated' | 'status_changed' | 'completed' | 'failed' | 'cancelled';
  data: Record<string, any>;
  timestamp: number;
}

/**
 * WebSocket消息类型
 */
export interface SwapWebSocketMessage {
  type: 'swap_created' | 'swap_updated' | 'swap_status_changed' | 'swap_error' | 'swap_subscribed' | 'swap_unsubscribed';
  data: SwapData | { swapId: string };
  timestamp: number;
}

/**
 * API响应包装器
 */
export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
  timestamp: number;
}

/**
 * 分页响应
 */
export interface PaginatedResponse<T = any> {
  data: T[];
  total: number;
  limit: number;
  offset: number;
  hasMore: boolean;
}

/**
 * 交换进度信息
 */
export interface SwapProgress {
  swapId: string;
  currentStep: number;
  totalSteps: number;
  stepName: string;
  stepDescription: string;
  estimatedTimeRemaining?: number;
  txHash?: string;
  blockNumber?: number;
  confirmations?: number;
  requiredConfirmations?: number;
}

/**
 * 交换配置
 */
export interface SwapConfig {
  minAmount: string;
  maxAmount: string;
  feeRate: number;
  confirmationsRequired: number;
  timeoutDuration: number;
  supportedChains: string[];
  supportedAssets: string[];
}

/**
 * 交换验证结果
 */
export interface SwapValidationResult {
  isValid: boolean;
  errors: string[];
  warnings: string[];
}

/**
 * 交换估算
 */
export interface SwapEstimate {
  estimatedGas: string;
  estimatedFee: string;
  estimatedTime: number;
  priceImpact: number;
  minimumReceived: string;
  route: string[];
}

/**
 * 交换过滤器
 */
export interface SwapFilter {
  status?: SwapStatus[];
  chains?: string[];
  assets?: string[];
  dateRange?: {
    start: number;
    end: number;
  };
  amountRange?: {
    min: string;
    max: string;
  };
}

/**
 * 交换排序选项
 */
export interface SwapSortOptions {
  field: 'createdAt' | 'updatedAt' | 'expiresAt' | 'makerAmount' | 'takerAmount';
  direction: 'asc' | 'desc';
}

/**
 * 交换搜索选项
 */
export interface SwapSearchOptions {
  query?: string;
  filters?: SwapFilter;
  sort?: SwapSortOptions;
  pagination?: {
    limit: number;
    offset: number;
  };
}

// 导出所有类型
export type {
  SwapData,
  CreateSwapRequest,
  UpdateSwapStatusRequest,
  SwapQueryParams,
  SwapStats,
  SwapEvent,
  SwapWebSocketMessage,
  ApiResponse,
  PaginatedResponse,
  SwapProgress,
  SwapConfig,
  SwapValidationResult,
  SwapEstimate,
  SwapFilter,
  SwapSortOptions,
  SwapSearchOptions,
};