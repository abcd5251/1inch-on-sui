import { RelayerApiService } from "./RelayerApiService";
import { MockRelayerService } from "./MockRelayerService";
import {
  CreateSwapRequest,
  SwapData,
  SwapQueryParams,
  SwapStats,
  UpdateSwapStatusRequest,
} from "../../types/swap";

/**
 * Unified Relayer Service Interface
 * Provides a common interface for both real and mock relayer services
 */
interface IRelayerService {
  getSwaps(params?: SwapQueryParams): Promise<{ success: boolean; data?: { data: SwapData[]; total: number; page: number; limit: number }; error?: string }>;
  getSwapById(id: string): Promise<{ success: boolean; data?: SwapData; error?: string }>;
  getSwapByOrderId(orderId: string): Promise<SwapData | null>;
  createSwap(swapData: CreateSwapRequest): Promise<{ success: boolean; data?: SwapData; error?: string }>;
  updateSwapStatus(id: string, updateData: UpdateSwapStatusRequest): Promise<{ success: boolean; data?: SwapData; error?: string }>;
  deleteSwap(id: string): Promise<{ success: boolean; message: string }>;
  getSwapStats(): Promise<{ success: boolean; data?: SwapStats; error?: string }>;
  getSwapEvents(id: string, page?: number, limit?: number): Promise<{ events: any[]; total: number; page: number; limit: number }>;
  healthCheck(): Promise<{ success: boolean; status?: string; timestamp?: string; error?: string }>;
}

/**
 * Configuration for the unified relayer service
 */
export interface UnifiedRelayerConfig {
  useMockService?: boolean;
  baseUrl?: string;
  timeout?: number;
  enableAutoDemo?: boolean; // Automatically add demo data
}

/**
 * Unified Relayer Service
 * Automatically switches between real and mock services based on configuration
 */
export class UnifiedRelayerService implements IRelayerService {
  private service: IRelayerService;
  private config: UnifiedRelayerConfig;
  private isUsingMock: boolean;

  constructor(config: UnifiedRelayerConfig = {}) {
    this.config = {
      useMockService: config.useMockService ?? this.shouldUseMockService(),
      baseUrl: config.baseUrl,
      timeout: config.timeout,
      enableAutoDemo: config.enableAutoDemo ?? false,
      ...config,
    };

    this.isUsingMock = this.config.useMockService!;

    if (this.isUsingMock) {
      console.log('🎭 UnifiedRelayerService: Using MockRelayerService for demo');
      this.service = new MockRelayerService();
      
      // Auto-generate demo data if enabled
      if (this.config.enableAutoDemo) {
        this.initializeDemoData();
      }
    } else {
      console.log('🚀 UnifiedRelayerService: Using real RelayerApiService');
      this.service = new RelayerApiService(this.config.baseUrl, this.config.timeout);
    }
  }

  /**
   * Determine if mock service should be used based on environment
   */
  private shouldUseMockService(): boolean {
    // Use mock service if:
    // 1. Explicitly in development mode
    // 2. Demo mode is enabled
    // 3. No relayer API URL is configured
    // 4. Running in demo environment
    
    const isDevelopment = process.env.NODE_ENV === 'development';
    const isDemoMode = process.env.NEXT_PUBLIC_DEMO_MODE === 'true';
    const hasRelayerUrl = !!process.env.NEXT_PUBLIC_RELAYER_API_URL;
    const isLocalhost = typeof window !== 'undefined' && window.location.hostname === 'localhost';
    
    return isDevelopment || isDemoMode || !hasRelayerUrl || isLocalhost;
  }

  /**
   * Initialize demo data for mock service
   */
  private initializeDemoData(): void {
    if (this.service instanceof MockRelayerService) {
      // Add a few random swaps for demo
      for (let i = 0; i < 3; i++) {
        setTimeout(() => {
          this.service.addRandomSwap();
        }, i * 1000);
      }
    }
  }

  /**
   * Get service type and status
   */
  public getServiceInfo(): {
    type: 'mock' | 'real';
    config: UnifiedRelayerConfig;
    status?: any;
  } {
    const info = {
      type: this.isUsingMock ? 'mock' as const : 'real' as const,
      config: this.config,
    };

    if (this.isUsingMock && this.service instanceof MockRelayerService) {
      return {
        ...info,
        status: this.service.getServiceStatus(),
      };
    }

    return info;
  }

  /**
   * Switch between mock and real service
   */
  public switchService(useMock: boolean, newConfig?: Partial<UnifiedRelayerConfig>): void {
    this.config = { ...this.config, ...newConfig, useMockService: useMock };
    this.isUsingMock = useMock;

    if (useMock) {
      console.log('🎭 Switching to MockRelayerService');
      this.service = new MockRelayerService();
      if (this.config.enableAutoDemo) {
        this.initializeDemoData();
      }
    } else {
      console.log('🚀 Switching to real RelayerApiService');
      this.service = new RelayerApiService(this.config.baseUrl, this.config.timeout);
    }
  }

  /**
   * Mock service control methods (only available when using mock)
   */
  public getMockControls(): {
    setOnlineStatus: (online: boolean) => void;
    setLatency: (latency: number) => void;
    setSuccessRate: (rate: number) => void;
    addRandomSwap: () => SwapData;
    getServiceStatus: () => any;
  } | null {
    if (this.isUsingMock && this.service instanceof MockRelayerService) {
      return {
        setOnlineStatus: (online: boolean) => this.service.setOnlineStatus(online),
        setLatency: (latency: number) => this.service.setLatency(latency),
        setSuccessRate: (rate: number) => this.service.setSuccessRate(rate),
        addRandomSwap: () => this.service.addRandomSwap(),
        getServiceStatus: () => this.service.getServiceStatus(),
      };
    }
    return null;
  }

  // Proxy all interface methods to the active service
  
  async getSwaps(params?: SwapQueryParams) {
    try {
      return await this.service.getSwaps(params);
    } catch (error) {
      console.error('UnifiedRelayerService.getSwaps error:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error occurred',
      };
    }
  }

  async getSwapById(id: string) {
    try {
      return await this.service.getSwapById(id);
    } catch (error) {
      console.error('UnifiedRelayerService.getSwapById error:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error occurred',
      };
    }
  }

  async getSwapByOrderId(orderId: string) {
    try {
      return await this.service.getSwapByOrderId(orderId);
    } catch (error) {
      console.error('UnifiedRelayerService.getSwapByOrderId error:', error);
      return null;
    }
  }

  async createSwap(swapData: CreateSwapRequest) {
    try {
      return await this.service.createSwap(swapData);
    } catch (error) {
      console.error('UnifiedRelayerService.createSwap error:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error occurred',
      };
    }
  }

  async updateSwapStatus(id: string, updateData: UpdateSwapStatusRequest) {
    try {
      return await this.service.updateSwapStatus(id, updateData);
    } catch (error) {
      console.error('UnifiedRelayerService.updateSwapStatus error:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error occurred',
      };
    }
  }

  async deleteSwap(id: string) {
    try {
      return await this.service.deleteSwap(id);
    } catch (error) {
      console.error('UnifiedRelayerService.deleteSwap error:', error);
      return {
        success: false,
        message: error instanceof Error ? error.message : 'Unknown error occurred',
      };
    }
  }

  async getSwapStats() {
    try {
      return await this.service.getSwapStats();
    } catch (error) {
      console.error('UnifiedRelayerService.getSwapStats error:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error occurred',
      };
    }
  }

  async getSwapEvents(id: string, page?: number, limit?: number) {
    try {
      return await this.service.getSwapEvents(id, page, limit);
    } catch (error) {
      console.error('UnifiedRelayerService.getSwapEvents error:', error);
      return {
        events: [],
        total: 0,
        page: page || 1,
        limit: limit || 20,
      };
    }
  }

  async healthCheck() {
    try {
      return await this.service.healthCheck();
    } catch (error) {
      console.error('UnifiedRelayerService.healthCheck error:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error occurred',
      };
    }
  }
}

/**
 * Create default unified relayer service instance
 */
export const unifiedRelayerService = new UnifiedRelayerService({
  enableAutoDemo: true, // Enable auto demo data for better experience
});

// Export the class and types
export type { IRelayerService, UnifiedRelayerConfig };
export { RelayerApiService, MockRelayerService };