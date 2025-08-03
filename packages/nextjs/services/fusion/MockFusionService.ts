import {
  FusionService,
  AuctionService,
  Order,
  OrderParams,
  Quote,
  QuoteParams,
  SuiFusionConfig,
  FusionOrderParams,
  FusionOrder,
  AuctionQuote,
  AuctionParams,
  Balance,
  NetworkInfo,
  TransactionResult,
  PaginatedResult,
  OrderFilters,
  AuctionDetails,
} from "@1inch/sui-fusion-sdk";

/**
 * Mock implementation of FusionService for demo purposes
 * This allows us to test the UI without needing actual smart contracts
 */
export class MockFusionService extends FusionService {
  private mockOrders: Order[] = [];
  private mockFusionOrders: FusionOrder[] = [];
  private mockOrderCounter = 1;

  constructor(config: SuiFusionConfig) {
    super(config);
    this.generateMockData();
  }

  async initialize(): Promise<void> {
    // Mock initialization - always succeeds
    await new Promise(resolve => setTimeout(resolve, 500));
    return Promise.resolve();
  }

  isInitialized(): boolean {
    return true;
  }

  isWalletConnected(): boolean {
    return true;
  }

  getAddress(): string {
    return "0x1234567890abcdef1234567890abcdef12345678";
  }

  async getQuote(params: QuoteParams): Promise<Quote> {
    // Simulate network delay
    await new Promise(resolve => setTimeout(resolve, 800));

    // Mock calculation
    const fromAmount = params.amount;
    const rate = this.getMockExchangeRate(params.fromToken, params.toToken);
    const toAmount = (parseFloat(fromAmount) * rate).toString();

    return {
      fromToken: params.fromToken,
      toToken: params.toToken,
      fromAmount,
      toAmount,
      rate: rate.toString(),
      priceImpact: "0.12",
      estimatedGas: "150000",
      route: [
        {
          name: "Cetus Protocol",
          percentage: 70,
          estimatedGas: "100000"
        },
        {
          name: "Turbos Finance",
          percentage: 30,
          estimatedGas: "50000"
        }
      ],
      validUntil: Date.now() + 300000 // 5 minutes
    };
  }

  async getAuctionQuote(params: QuoteParams, auctionParams?: AuctionParams): Promise<AuctionQuote> {
    // Get base quote first
    const baseQuote = await this.getQuote(params);
    
    // Default to 60 seconds (1 minute) for demo
    const duration = auctionParams?.duration || 60;
    
    // Create auction details
    const auctionDetails: AuctionDetails = {
      startTime: Date.now(),
      endTime: Date.now() + duration * 1000,
      duration: duration,
      startRate: (parseFloat(baseQuote.rate) * (auctionParams?.startRateMultiplier || 1.08)).toString(),
      endRate: (parseFloat(baseQuote.rate) * (auctionParams?.endRateMultiplier || 0.92)).toString(),
      currentRate: baseQuote.rate,
      priceDecayFunction: auctionParams?.priceDecayFunction || "linear",
      remainingTime: duration
    };

    return {
      ...baseQuote,
      auctionDetails,
      estimatedFillTime: Math.floor(duration * 0.6), // Estimated 60% through auction
      resolvers: [
        {
          address: "0xresolver1",
          reputation: 95,
          fillCount: 1234,
          avgFillTime: 35,
          isActive: true
        },
        {
          address: "0xresolver2", 
          reputation: 88,
          fillCount: 892,
          avgFillTime: 42,
          isActive: true
        }
      ],
      mevProtection: true
    };
  }

  async createOrder(params: OrderParams): Promise<Order> {
    await new Promise(resolve => setTimeout(resolve, 1000));

    const orderId = `0x${this.mockOrderCounter.toString(16).padStart(64, '0')}`;
    this.mockOrderCounter++;

    const order: Order = {
      id: orderId,
      maker: this.getAddress(),
      fromToken: params.fromToken,
      toToken: params.toToken,
      fromAmount: params.amount,
      toAmount: (parseFloat(params.amount) * this.getMockExchangeRate(params.fromToken, params.toToken)).toString(),
      status: 'pending',
      createdAt: Date.now(),
      expiresAt: params.expirationTime || (Date.now() + 3600000),
      txHash: orderId,
      orderType: params.orderType || 'market',
      limitPrice: params.limitPrice
    };

    this.mockOrders.push(order);
    return order;
  }

  async createFusionOrder(params: FusionOrderParams): Promise<FusionOrder> {
    await new Promise(resolve => setTimeout(resolve, 1200));

    const orderId = `0x${this.mockOrderCounter.toString(16).padStart(64, '0')}`;
    this.mockOrderCounter++;

    let auctionDetails: AuctionDetails | undefined;
    if (params.enableAuction && params.auctionDetails) {
      auctionDetails = {
        startTime: Date.now(),
        endTime: Date.now() + (params.auctionDetails.duration || 60) * 1000, // Default 1 minute
        duration: params.auctionDetails.duration || 60,
        startRate: params.auctionDetails.startRate,
        endRate: params.auctionDetails.endRate,
        currentRate: params.auctionDetails.startRate,
        priceDecayFunction: params.auctionDetails.priceDecayFunction || "linear",
        remainingTime: params.auctionDetails.duration || 60
      };
    }

    const fusionOrder: FusionOrder = {
      id: orderId,
      maker: this.getAddress(),
      fromToken: params.fromToken,
      toToken: params.toToken,
      fromAmount: params.amount,
      toAmount: (parseFloat(params.amount) * this.getMockExchangeRate(params.fromToken, params.toToken)).toString(),
      auctionDetails,
      enableAuction: params.enableAuction || false,
      minFillAmount: params.minFillAmount,
      maxFillAmount: params.maxFillAmount,
      partialFillAllowed: params.partialFillAllowed || false,
      status: 'pending',
      createdAt: Date.now(),
      expiresAt: params.expirationTime || (Date.now() + 3600000),
      txHash: orderId,
      orderType: params.orderType || 'market',
      limitPrice: params.limitPrice,
      fillHistory: []
    };

    this.mockFusionOrders.push(fusionOrder);

    // Simulate auction progress
    if (auctionDetails) {
      this.simulateAuctionProgress(fusionOrder);
    }

    return fusionOrder;
  }

  async getOrders(filters: OrderFilters = {}): Promise<PaginatedResult<Order>> {
    let filteredOrders = [...this.mockOrders];

    // Apply filters
    if (filters.maker) {
      filteredOrders = filteredOrders.filter(order => order.maker === filters.maker);
    }
    if (filters.status) {
      filteredOrders = filteredOrders.filter(order => filters.status!.includes(order.status));
    }

    const offset = filters.offset || 0;
    const limit = filters.limit || 10;
    const total = filteredOrders.length;
    const items = filteredOrders.slice(offset, offset + limit);

    return {
      items,
      total,
      page: Math.floor(offset / limit) + 1,
      limit,
      hasNext: offset + limit < total,
      hasPrev: offset > 0
    };
  }

  async getFusionOrder(orderId: string): Promise<FusionOrder> {
    const order = this.mockFusionOrders.find(o => o.id === orderId);
    if (!order) {
      throw new Error(`Fusion order not found: ${orderId}`);
    }
    return order;
  }

  async getBalance(tokenType: string, address?: string): Promise<Balance> {
    // Mock balance data
    const mockBalances: Record<string, string> = {
      "0x2::sui::SUI": "5000000000", // 5 SUI
      "0x2::coin::COIN<0x123::usdc::USDC>": "10000000", // 10 USDC
      "0x2::coin::COIN<0x123::usdt::USDT>": "25000000", // 25 USDT
      "0x2::coin::COIN<0x123::weth::WETH>": "2500000000000000000", // 2.5 WETH
    };

    const balance = mockBalances[tokenType] || "0";
    const tokenInfo = this.getTokenInfo(tokenType);

    return {
      tokenType,
      balance,
      formattedBalance: (parseFloat(balance) / Math.pow(10, tokenInfo.decimals)).toString(),
      decimals: tokenInfo.decimals,
      symbol: tokenInfo.symbol
    };
  }

  async getAllBalances(address?: string): Promise<Balance[]> {
    const tokenTypes = [
      "0x2::sui::SUI",
      "0x2::coin::COIN<0x123::usdc::USDC>",
      "0x2::coin::COIN<0x123::usdt::USDT>",
      "0x2::coin::COIN<0x123::weth::WETH>",
    ];

    const balances: Balance[] = [];
    for (const tokenType of tokenTypes) {
      try {
        const balance = await this.getBalance(tokenType, address);
        balances.push(balance);
      } catch (error) {
        console.warn(`Failed to get balance for ${tokenType}:`, error);
      }
    }

    return balances;
  }

  getNetworkInfo(): NetworkInfo {
    return {
      network: "testnet",
      rpcUrl: "https://fullnode.testnet.sui.io",
      packageId: "0x1234567890abcdef",
      explorerUrl: "https://testnet.suivision.xyz",
      chainId: "testnet"
    };
  }

  private generateMockData(): void {
    // Generate diverse existing orders for demo
    const now = Date.now();
    this.mockOrders = [
      {
        id: "0x" + "1".repeat(64),
        maker: this.getAddress(),
        fromToken: "0x2::sui::SUI",
        toToken: "0x2::coin::COIN<0x123::usdc::USDC>",
        fromAmount: "1000000000",
        toAmount: "2500000",
        status: 'pending',
        createdAt: now - 1800000, // 30 minutes ago
        expiresAt: now + 1800000, // 30 minutes from now
        txHash: "0x" + "1".repeat(64),
        orderType: 'market'
      },
      {
        id: "0x" + "3".repeat(64),
        maker: this.getAddress(),
        fromToken: "0x2::coin::COIN<0x123::usdc::USDC>",
        toToken: "0x2::sui::SUI",
        fromAmount: "50000000", // 50 USDC
        toAmount: "20000000000", // 20 SUI
        status: 'filled',
        createdAt: now - 7200000, // 2 hours ago
        expiresAt: now + 7200000,
        txHash: "0x" + "3".repeat(64),
        orderType: 'limit'
      },
      {
        id: "0x" + "4".repeat(64),
        maker: this.getAddress(),
        fromToken: "0x2::coin::COIN<0x123::weth::WETH>",
        toToken: "0x2::sui::SUI",
        fromAmount: "500000000000000000", // 0.5 WETH
        toAmount: "333000000000", // 333 SUI
        status: 'expired',
        createdAt: now - 86400000, // 1 day ago
        expiresAt: now - 3600000, // Expired 1 hour ago
        txHash: "0x" + "4".repeat(64),
        orderType: 'market'
      }
    ];

    this.mockFusionOrders = [
      // Active Dutch Auction
      {
        id: "0x" + "2".repeat(64),
        maker: this.getAddress(),
        fromToken: "0x2::sui::SUI",
        toToken: "0x2::coin::COIN<0x123::usdc::USDC>",
        fromAmount: "2000000000", // 2 SUI
        toAmount: "5000000", // 5 USDC
        enableAuction: true,
        auctionDetails: {
          startTime: now - 30000, // 30 seconds ago
          endTime: now + 30000, // 30 seconds from now
          duration: 60, // 1 minute total
          startRate: "2.70", // 8% above market (2.5 * 1.08)
          endRate: "2.30", // 8% below market (2.5 * 0.92)
          currentRate: "2.50", // Current market rate
          priceDecayFunction: "linear",
          remainingTime: 30
        },
        partialFillAllowed: true,
        status: 'pending',
        createdAt: now - 30000,
        expiresAt: now + 3570000,
        txHash: "0x" + "2".repeat(64),
        orderType: 'market',
        fillHistory: []
      },
      // Completed Dutch Auction with Fill History
      {
        id: "0x" + "5".repeat(64),
        maker: this.getAddress(),
        fromToken: "0x2::sui::SUI",
        toToken: "0x2::coin::COIN<0x123::usdc::USDC>",
        fromAmount: "5000000000", // 5 SUI
        toAmount: "12500000", // 12.5 USDC
        enableAuction: true,
        auctionDetails: {
          startTime: now - 180000, // 3 minutes ago
          endTime: now - 120000, // Ended 2 minutes ago
          duration: 60,
          startRate: "2.70",
          endRate: "2.30",
          currentRate: "2.45", // Final rate when filled
          priceDecayFunction: "linear",
          remainingTime: 0
        },
        partialFillAllowed: true,
        status: 'filled',
        createdAt: now - 180000,
        expiresAt: now + 3420000,
        txHash: "0x" + "5".repeat(64),
        orderType: 'market',
        fillHistory: [
          {
            fillId: "fill_001",
            resolver: "0xresolver1",
            fillAmount: "5000000000",
            fillRate: "2.45",
            timestamp: now - 120000,
            txHash: "0xfill001"
          }
        ]
      },
      // Large Dutch Auction with Partial Fills
      {
        id: "0x" + "6".repeat(64),
        maker: this.getAddress(),
        fromToken: "0x2::coin::COIN<0x123::usdc::USDC>",
        toToken: "0x2::sui::SUI", 
        fromAmount: "100000000", // 100 USDC
        toAmount: "40000000000", // 40 SUI
        enableAuction: true,
        auctionDetails: {
          startTime: now - 300000, // 5 minutes ago
          endTime: now - 240000, // Ended 4 minutes ago
          duration: 60,
          startRate: "0.368", // 0.368 SUI per USDC (8% below market)
          endRate: "0.432", // 0.432 SUI per USDC (8% above market)
          currentRate: "0.400", // Final rate
          priceDecayFunction: "linear",
          remainingTime: 0
        },
        partialFillAllowed: true,
        status: 'filled',
        createdAt: now - 300000,
        expiresAt: now + 3300000,
        txHash: "0x" + "6".repeat(64),
        orderType: 'market',
        fillHistory: [
          {
            fillId: "fill_002",
            resolver: "0xresolver1",
            fillAmount: "60000000", // 60 USDC
            fillRate: "0.395",
            timestamp: now - 250000,
            txHash: "0xfill002"
          },
          {
            fillId: "fill_003", 
            resolver: "0xresolver2",
            fillAmount: "40000000", // 40 USDC
            fillRate: "0.405",
            timestamp: now - 240000,
            txHash: "0xfill003"
          }
        ]
      },
      // Regular Fusion Order without Auction
      {
        id: "0x" + "7".repeat(64),
        maker: this.getAddress(),
        fromToken: "0x2::coin::COIN<0x123::weth::WETH>",
        toToken: "0x2::coin::COIN<0x123::usdc::USDC>",
        fromAmount: "1000000000000000000", // 1 WETH
        toAmount: "2800000000", // 2800 USDC
        enableAuction: false,
        partialFillAllowed: false,
        status: 'pending',
        createdAt: now - 600000, // 10 minutes ago
        expiresAt: now + 3000000,
        txHash: "0x" + "7".repeat(64),
        orderType: 'limit',
        fillHistory: []
      },
      // Expired Dutch Auction
      {
        id: "0x" + "8".repeat(64),
        maker: this.getAddress(),
        fromToken: "0x2::sui::SUI",
        toToken: "0x2::coin::COIN<0x123::usdt::USDT>",
        fromAmount: "3000000000", // 3 SUI
        toAmount: "7500000", // 7.5 USDT
        enableAuction: true,
        auctionDetails: {
          startTime: now - 1800000, // 30 minutes ago
          endTime: now - 1740000, // Ended 29 minutes ago
          duration: 60,
          startRate: "2.70",
          endRate: "2.30", 
          currentRate: "2.30", // Reached end rate but not filled
          priceDecayFunction: "linear",
          remainingTime: 0
        },
        partialFillAllowed: true,
        status: 'expired',
        createdAt: now - 1800000,
        expiresAt: now + 1800000,
        txHash: "0x" + "8".repeat(64),
        orderType: 'market',
        fillHistory: []
      }
    ];
  }

  private getMockExchangeRate(fromToken: string, toToken: string): number {
    // Mock exchange rates
    const rates: Record<string, number> = {
      "SUI_to_USDC": 2.5,
      "USDC_to_SUI": 0.4,
      "SUI_to_WETH": 0.0015,
      "WETH_to_SUI": 666.67,
      "USDC_to_USDT": 0.999,
      "USDT_to_USDC": 1.001,
    };

    const fromSymbol = this.getTokenSymbol(fromToken);
    const toSymbol = this.getTokenSymbol(toToken);
    const rateKey = `${fromSymbol}_to_${toSymbol}`;

    return rates[rateKey] || 1;
  }

  private getTokenSymbol(tokenType: string): string {
    if (tokenType.includes("sui::SUI")) return "SUI";
    if (tokenType.includes("usdc")) return "USDC";
    if (tokenType.includes("usdt")) return "USDT";
    if (tokenType.includes("weth")) return "WETH";
    return "UNKNOWN";
  }

  private getTokenInfo(tokenType: string) {
    const tokenMap: Record<string, { symbol: string; decimals: number }> = {
      "0x2::sui::SUI": { symbol: "SUI", decimals: 9 },
      "0x2::coin::COIN<0x123::usdc::USDC>": { symbol: "USDC", decimals: 6 },
      "0x2::coin::COIN<0x123::usdt::USDT>": { symbol: "USDT", decimals: 6 },
      "0x2::coin::COIN<0x123::weth::WETH>": { symbol: "WETH", decimals: 18 },
    };

    return tokenMap[tokenType] || { symbol: "UNKNOWN", decimals: 9 };
  }

  private simulateAuctionProgress(order: FusionOrder): void {
    if (!order.auctionDetails) return;

    const updateInterval = 1000; // Update every 1 second for 1-minute demo
    const interval = setInterval(() => {
      if (order.auctionDetails) {
        const elapsed = Date.now() - order.auctionDetails.startTime;
        const remaining = Math.max(0, order.auctionDetails.endTime - Date.now());
        
        if (remaining <= 0) {
          order.status = 'expired';
          clearInterval(interval);
          return;
        }

        // Update current rate based on linear decay
        const progress = elapsed / (order.auctionDetails.duration * 1000);
        const startRate = parseFloat(order.auctionDetails.startRate);
        const endRate = parseFloat(order.auctionDetails.endRate);
        const currentRate = startRate - (startRate - endRate) * progress;
        
        order.auctionDetails.currentRate = currentRate.toString();
        order.auctionDetails.remainingTime = Math.floor(remaining / 1000);

        // Optimized fill chances for 1-minute demo
        // Progressive increase in fill probability for better demo experience
        let fillChance = 0.005; // Base 0.5% chance
        if (progress > 0.3) fillChance = 0.015; // 1.5% after 30%
        if (progress > 0.5) fillChance = 0.035; // 3.5% after 50%
        if (progress > 0.7) fillChance = 0.06; // 6% after 70%
        if (progress > 0.85) fillChance = 0.12; // 12% in final 15%
        
        if (Math.random() < fillChance) {
          order.status = 'filled';
          order.fillHistory?.push({
            fillId: `fill_${Date.now()}`,
            resolver: progress > 0.6 ? "0xresolver2" : "0xresolver1", // Resolver competition
            fillAmount: order.fromAmount,
            fillRate: currentRate.toString(),
            timestamp: Date.now(),
            txHash: `0xfill${Date.now()}`
          });
          clearInterval(interval);
        }
      }
    }, updateInterval);
  }
}