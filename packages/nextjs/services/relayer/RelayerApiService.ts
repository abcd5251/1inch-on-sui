import {
  CreateSwapRequest,
  SwapData,
  SwapQueryParams,
  SwapStats,
  SwapStatus,
  UpdateSwapStatusRequest,
} from "../../types/swap";

/**
 * Relayer API Service
 * 提供与Relayer后端API的通信接口
 */
export class RelayerApiService {
  private baseUrl: string;
  private timeout: number;

  constructor(
    baseUrl: string = process.env.NEXT_PUBLIC_RELAYER_API_URL || "http://localhost:3001",
    timeout: number = 10000,
  ) {
    this.baseUrl = baseUrl.replace(/\/$/, ""); // 移除末尾斜杠
    this.timeout = timeout;
  }

  /**
   * 通用请求方法
   */
  private async request<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
    const url = `${this.baseUrl}${endpoint}`;
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), this.timeout);

    try {
      const response = await fetch(url, {
        ...options,
        signal: controller.signal,
        headers: {
          "Content-Type": "application/json",
          ...options.headers,
        },
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(
          `API请求失败: ${response.status} ${response.statusText}${errorData.message ? ` - ${errorData.message}` : ""}`,
        );
      }

      return await response.json();
    } catch (error) {
      clearTimeout(timeoutId);
      if (error instanceof Error) {
        if (error.name === "AbortError") {
          throw new Error("请求超时");
        }
        throw error;
      }
      throw new Error("未知错误");
    }
  }

  /**
   * 查询交换列表
   */
  async getSwaps(
    params: SwapQueryParams = {},
  ): Promise<{ success: boolean; swaps?: SwapData[]; total?: number; page?: number; limit?: number; error?: string }> {
    const searchParams = new URLSearchParams();

    Object.entries(params).forEach(([key, value]) => {
      if (value !== undefined && value !== null) {
        searchParams.append(key, String(value));
      }
    });

    const queryString = searchParams.toString();
    const endpoint = `/api/swaps${queryString ? `?${queryString}` : ""}`;

    return this.request<{ success: boolean; swaps?: SwapData[]; total?: number; page?: number; limit?: number; error?: string }>(endpoint);
  }

  /**
   * 根据ID查询交换
   */
  async getSwapById(id: string): Promise<{ success: boolean; data?: SwapData; error?: string }> {
    return this.request<{ success: boolean; data?: SwapData; error?: string }>(`/api/swaps/${id}`);
  }

  /**
   * 根据订单ID查询交换
   */
  async getSwapByOrderId(orderId: string): Promise<SwapData | null> {
    return this.request<SwapData | null>(`/api/swaps/order/${orderId}`);
  }

  /**
   * 创建新的交换
   */
  async createSwap(swapData: CreateSwapRequest): Promise<{ success: boolean; data: SwapData }> {
    return this.request<{ success: boolean; data: SwapData }>("/api/swaps", {
      method: "POST",
      body: JSON.stringify(swapData),
    });
  }

  /**
   * 更新交换状态
   */
  async updateSwapStatus(id: string, updateData: UpdateSwapStatusRequest): Promise<{ success: boolean; data?: SwapData; error?: string }> {
    return this.request<{ success: boolean; data?: SwapData; error?: string }>(`/api/swaps/${id}`, {
      method: "PUT",
      body: JSON.stringify(updateData),
    });
  }

  /**
   * 删除交换
   */
  async deleteSwap(id: string): Promise<{ success: boolean; message: string }> {
    return this.request<{ success: boolean; message: string }>(`/api/swaps/${id}`, {
      method: "DELETE",
    });
  }

  /**
   * 获取交换统计信息
   */
  async getSwapStats(): Promise<{ success: boolean; data?: SwapStats; error?: string }> {
    return this.request<{ success: boolean; data?: SwapStats; error?: string }>("/api/swaps/stats");
  }

  /**
   * 获取交换相关事件
   */
  async getSwapEvents(
    id: string,
    page: number = 1,
    limit: number = 20,
  ): Promise<{
    events: any[];
    total: number;
    page: number;
    limit: number;
  }> {
    const searchParams = new URLSearchParams({
      page: String(page),
      limit: String(limit),
    });

    return this.request<{
      events: any[];
      total: number;
      page: number;
      limit: number;
    }>(`/api/swaps/${id}/events?${searchParams.toString()}`);
  }

  /**
   * 健康检查
   */
  async healthCheck(): Promise<{ success: boolean; status?: string; timestamp?: string; error?: string }> {
    return this.request<{ success: boolean; status?: string; timestamp?: string; error?: string }>("/health");
  }

  /**
   * 设置基础URL
   */
  setBaseUrl(url: string): void {
    this.baseUrl = url.replace(/\/$/, "");
  }

  /**
   * 设置请求超时时间
   */
  setTimeout(timeout: number): void {
    this.timeout = timeout;
  }
}

// 创建默认实例
export const relayerApiService = new RelayerApiService();

// 导出类型
export type { SwapData, SwapStatus, SwapQueryParams, SwapStats, CreateSwapRequest, UpdateSwapStatusRequest };
