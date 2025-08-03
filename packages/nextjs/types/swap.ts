/**
 * 交换状态枚举
 */
export type SwapStatus = "pending" | "active" | "completed" | "failed" | "refunded";

/**
 * 基础交换数据接口
 */
export interface SwapData {
  id: string;
  orderId: string;
  maker: string;
  taker?: string;

  // 金额和代币信息
  makingAmount: string;
  takingAmount: string;
  makingToken: string;
  takingToken: string;

  // 链信息
  sourceChain: string;
  targetChain: string;

  // 状态信息
  status: SwapStatus;
  substatus?: string;

  // HTLC相关
  secretHash: string;
  secret?: string;
  timeLock: number;

  // 合约地址
  sourceContract: string;
  targetContract?: string;

  // 交易哈希
  sourceTransactionHash?: string;
  targetTransactionHash?: string;
  refundTransactionHash?: string;

  // 错误信息
  errorMessage?: string;
  errorCode?: string;

  // 时间戳
  createdAt: string;
  updatedAt: string;
  expiresAt?: string;

  // 元数据
  metadata?: Record<string, any>;
}

/**
 * 创建交换请求接口
 */
export interface CreateSwapRequest {
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

  sourceContract: string;
  targetContract?: string;

  metadata?: Record<string, any>;
}

/**
 * 更新交换状态请求接口
 */
export interface UpdateSwapStatusRequest {
  status: SwapStatus;
  substatus?: string;
  taker?: string;
  secret?: string;
  sourceTransactionHash?: string;
  targetTransactionHash?: string;
  refundTransactionHash?: string;
  errorMessage?: string;
  errorCode?: string;
  metadata?: Record<string, any>;
}

/**
 * 交换查询参数接口
 */
export interface SwapQueryParams {
  // 分页参数
  page?: number;
  limit?: number;

  // 过滤参数
  status?: SwapStatus;
  maker?: string;
  taker?: string;
  sourceChain?: string;
  targetChain?: string;

  // 时间范围
  fromDate?: string;
  toDate?: string;

  // 排序参数
  sortBy?: "createdAt" | "updatedAt" | "expiresAt" | "makingAmount";
  sortOrder?: "asc" | "desc";
}

/**
 * 交换统计信息接口
 */
export interface SwapStats {
  totalSwaps: number;
  statusCounts: Record<SwapStatus, number>;
  totalVolume: {
    makingAmount: string;
    takingAmount: string;
  };
  chainStats: Record<
    string,
    {
      count: number;
      volume: string;
    }
  >;
}

/**
 * 交换事件接口
 */
export interface SwapEvent {
  id: string;
  swapId: string;
  eventType: string;
  eventData: Record<string, any>;
  transactionHash?: string;
  blockNumber?: number;
  createdAt: string;
}

/**
 * WebSocket消息类型
 */
export interface SwapWebSocketMessage {
  type: "swap_created" | "swap_updated" | "swap_status_changed" | "swap_error";
  data: SwapData;
  timestamp: string;
}

/**
 * API响应包装器
 */
export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: {
    code: string;
    message: string;
    details?: any;
  };
  timestamp: string;
}

/**
 * 分页响应接口
 */
export interface PaginatedResponse<T> {
  items: T[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

/**
 * 交换进度状态
 */
export interface SwapProgress {
  step: number;
  totalSteps: number;
  currentStep: string;
  description: string;
  completed: boolean;
  error?: string;
}

/**
 * 交换配置接口
 */
export interface SwapConfig {
  minAmount: string;
  maxAmount: string;
  fee: string;
  timeLockDuration: number;
  supportedChains: string[];
  supportedTokens: Record<
    string,
    {
      address: string;
      decimals: number;
      symbol: string;
      name: string;
    }
  >;
}

/**
 * 交换验证结果
 */
export interface SwapValidationResult {
  valid: boolean;
  errors: string[];
  warnings: string[];
}

/**
 * 交换估算结果
 */
export interface SwapEstimate {
  estimatedGas: string;
  estimatedFee: string;
  estimatedTime: number; // 秒
  priceImpact: string;
  minimumReceived: string;
}
