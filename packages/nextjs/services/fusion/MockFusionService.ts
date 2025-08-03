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
    this.generateUSDCScenarios();
  }

  /**
   * Generate USDC-specific auction scenarios for demo
   */
  private generateUSDCScenarios(): void {
    const baseDate = Date.now();
    
    // High-volume USDC cross-chain swap
    const crossChainUSDC: FusionOrder = {
      id: "0x" + "usdc".repeat(16),
      maker: this.getAddress(),
      fromToken: "USDC-ETH", // USDC on Ethereum
      toToken: "USDC-SUI", // USDC on Sui
      fromAmount: "500000000", // 500 USDC
      toAmount: "499500000", // 499.5 USDC (0.1% cross-chain fee)
      enableAuction: true,
      auctionDetails: {
        auctionId: "usdc_cross_chain",
        startTime: baseDate - 45000, // 45 seconds ago
        endTime: baseDate + 15000, // 15 seconds remaining
        duration: 60,
        startRate: "0.9998", // Start slightly above 1:1
        endRate: "0.9995", // End slightly below 1:1
        currentRate: "0.99965", // Current rate
        priceDecayFunction: "linear",
        tokenPair: "USDC-ETH/USDC-SUI",
        status: "active",
      },
      partialFillAllowed: true,
      status: 'pending',
      createdAt: baseDate - 45000,
      expiresAt: baseDate + 3555000,
      txHash: "0x" + "usdc".repeat(16),
      orderType: 'market',
      fillHistory: []
    };
    
    // Large SUI to USDC swap with competitive bidding
    const largeSwap: FusionOrder = {
      id: "0x" + "large".repeat(12) + "usdc",
      maker: this.getAddress(),
      fromToken: "0x2::sui::SUI",
      toToken: "0x2::coin::COIN<0x123::usdc::USDC>",
      fromAmount: "10000000000", // 10 SUI
      toAmount: "24850000", // 24.85 USDC
      enableAuction: true,
      auctionDetails: {
        auctionId: "large_sui_usdc",
        startTime: baseDate - 20000, // 20 seconds ago
        endTime: baseDate + 40000, // 40 seconds remaining
        duration: 60,
        startRate: "2.68", // 8% above market
        endRate: "2.28", // 8% below market
        currentRate: "2.54", // Current declining rate
        priceDecayFunction: "linear",
        tokenPair: "SUI/USDC",
        status: "active",
      },
      partialFillAllowed: true,
      status: 'pending',
      createdAt: baseDate - 20000,
      expiresAt: baseDate + 3580000,
      txHash: "0x" + "large".repeat(12) + "usdc",
      orderType: 'market',
      fillHistory: []
    };
    
    // Small arbitrage opportunity - USDC/USDT
    const arbitrage: FusionOrder = {
      id: "0x" + "arb".repeat(16),
      maker: this.getAddress(),
      fromToken: "0x2::coin::COIN<0x123::usdc::USDC>",
      toToken: "0x2::coin::COIN<0x123::usdt::USDT>",
      fromAmount: "1000000000", // 1000 USDC
      toAmount: "1002000000", // 1002 USDT (arbitrage opportunity)
      enableAuction: true,
      auctionDetails: {
        auctionId: "usdc_usdt_arb",
        startTime: baseDate - 10000, // 10 seconds ago
        endTime: baseDate + 50000, // 50 seconds remaining
        duration: 60,
        startRate: "1.003", // Start with higher rate
        endRate: "0.9998", // End slightly below parity
        currentRate: "1.0018", // Current rate
        priceDecayFunction: "linear",
        tokenPair: "USDC/USDT",
        status: "active",
      },
      partialFillAllowed: false, // Full fill only for arbitrage
      status: 'pending',
      createdAt: baseDate - 10000,
      expiresAt: baseDate + 3590000,
      txHash: "0x" + "arb".repeat(16),
      orderType: 'market',
      fillHistory: []
    };
    
    this.mockFusionOrders.push(crossChainUSDC, largeSwap, arbitrage);
    
    // Start auction simulations
    this.simulateAuctionProgress(crossChainUSDC);
    this.simulateAuctionProgress(largeSwap);
    this.simulateAuctionProgress(arbitrage);
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
            name: "Resolver 1",
            reputation: 95,
            totalVolume: "1234000000",
            successRate: 98.5,
            averageGasUsed: "0.001",
            isActive: true
          },
          {
            address: "0xresolver2",
            name: "Resolver 2", 
            reputation: 88,
            totalVolume: "892000000",
            successRate: 95.2,
            averageGasUsed: "0.0012",
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
    // Enhanced mock balance data with USDC-focused scenarios
    const mockBalances: Record<string, string> = {
      // Sui Network Tokens
      "0x2::sui::SUI": "12350000000", // 12.35 SUI
      "0x2::coin::COIN<0x123::usdc::USDC>": "50750000", // 50.75 USDC
      "0x2::coin::COIN<0x123::usdt::USDT>": "25480000", // 25.48 USDT
      "0x2::coin::COIN<0x123::weth::WETH>": "1850000000000000000", // 1.85 WETH
      
      // Cross-chain balance simulation
      "USDC-ETH": "125000000", // 125 USDC on Ethereum
      "USDC-SUI": "50750000", // 50.75 USDC on Sui
      
      // Ethereum tokens (for cross-chain scenarios)
      "ETH": "3450000000000000000", // 3.45 ETH
      "0xA0b86a33E6441d3e2DbEcC39ee4bd65A58da0e17": "125000000", // 125 USDC (Ethereum)
      "0xdac17f958d2ee523a2206206994597c13d831ec7": "75250000", // 75.25 USDT (Ethereum)
      "0x6b175474e89094c44da98b954eedeac495271d0f": "200000000000000000000", // 200 DAI
    };

    const balance = mockBalances[tokenType] || "0";
    const tokenInfo = this.getTokenInfo(tokenType);
    
    // Add USD value for realistic portfolio tracking
    const formattedBalance = (parseFloat(balance) / Math.pow(10, tokenInfo.decimals));
    let usdValue = 0;
    
    // Calculate USD values based on token type
    switch (tokenInfo.symbol) {
      case "USDC":
      case "USDT":
      case "DAI":
        usdValue = formattedBalance; // Stablecoins = $1
        break;
      case "SUI":
        usdValue = formattedBalance * 2.485; // SUI price
        break;
      case "ETH":
      case "WETH":
        usdValue = formattedBalance * 3420; // ETH price
        break;
    }

    return {
      tokenType,
      balance,
      formattedBalance: formattedBalance.toString(),
      decimals: tokenInfo.decimals,
      symbol: tokenInfo.symbol,
      usdValue
    };
  }

  async getAllBalances(address?: string): Promise<Balance[]> {
    // Enhanced token list with cross-chain USDC support
    const tokenTypes = [
      // Sui network tokens
      "0x2::sui::SUI",
      "0x2::coin::COIN<0x123::usdc::USDC>",
      "0x2::coin::COIN<0x123::usdt::USDT>",
      "0x2::coin::COIN<0x123::weth::WETH>",
      
      // Cross-chain token identifiers
      "USDC-ETH", // USDC on Ethereum
      "USDC-SUI", // USDC on Sui
      
      // Ethereum tokens for cross-chain scenarios
      "ETH",
      "0xA0b86a33E6441d3e2DbEcC39ee4bd65A58da0e17", // USDC (Ethereum)
      "0xdac17f958d2ee523a2206206994597c13d831ec7", // USDT (Ethereum)
      "0x6b175474e89094c44da98b954eedeac495271d0f", // DAI
    ];

    const balances: Balance[] = [];
    for (const tokenType of tokenTypes) {
      try {
        const balance = await this.getBalance(tokenType, address);
        // Only include non-zero balances for cleaner demo
        if (parseFloat(balance.formattedBalance) > 0) {
          balances.push(balance);
        }
      } catch (error) {
        console.warn(`Failed to get balance for ${tokenType}:`, error);
      }
    }

    // Sort by USD value for better UX
    return balances.sort((a, b) => (b.usdValue || 0) - (a.usdValue || 0));
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
    // Base date: July 27, 2025 12:00:00 UTC
    const baseDate = new Date('2025-07-27T12:00:00Z').getTime();
    const now = baseDate + Math.floor(Math.random() * 86400000); // Random time within 24 hours after base date
    this.mockOrders = [
      {
        id: "0x" + "1".repeat(64),
        maker: this.getAddress(),
        fromToken: "0x2::sui::SUI",
        toToken: "0x2::coin::COIN<0x123::usdc::USDC>",
        fromAmount: "1000000000",
        toAmount: "2500000",
        status: 'pending',
        createdAt: baseDate - 1800000, // 30 minutes before base date
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
        createdAt: baseDate - 7200000, // 2 hours before base date
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
        createdAt: baseDate - 86400000, // 1 day before base date
        expiresAt: baseDate - 3600000, // Expired 1 hour before base date
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
          startTime: baseDate - 30000, // 30 seconds before base date
          duration: 60, // 1 minute total
          startRate: "2.70", // 8% above market (2.5 * 1.08)
          endRate: "2.30", // 8% below market (2.5 * 0.92)
          currentRate: "2.50", // Current market rate
          priceDecayFunction: "linear",
          remainingTime: 30
        },
        minFillAmount: "100000000", // 0.1 SUI minimum
        maxFillAmount: "2000000000", // Full amount
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
          startTime: baseDate - 180000, // 3 minutes before base date
          duration: 60,
          startRate: "2.70",
          endRate: "2.30",
          currentRate: "2.45", // Final rate when filled
          priceDecayFunction: "linear",
          remainingTime: 0
        },
        partialFillAllowed: true,
        status: 'filled',
        createdAt: baseDate - 180000,
        expiresAt: baseDate + 3420000,
        txHash: "0x" + "5".repeat(64),
        orderType: 'market',
        fillHistory: [
          {
            id: "fill_001",
            orderId: "0x" + "5".repeat(64),
            resolver: "0xresolver1",
            fillAmount: "5000000000",
            fillRate: "2.45",
            timestamp: baseDate - 120000,
            txHash: "0xfill001",
            gasUsed: "0.0015"
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
          startTime: baseDate - 300000, // 5 minutes before base date
          duration: 60,
          startRate: "0.368", // 0.368 SUI per USDC (8% below market)
          endRate: "0.432", // 0.432 SUI per USDC (8% above market)
          currentRate: "0.400", // Final rate
          priceDecayFunction: "linear",
          remainingTime: 0
        },
        partialFillAllowed: true,
        status: 'filled',
        createdAt: baseDate - 300000,
        expiresAt: baseDate + 3300000,
        txHash: "0x" + "6".repeat(64),
        orderType: 'market',
        fillHistory: [
          {
            id: "fill_002",
            orderId: "0x" + "6".repeat(64),
            resolver: "0xresolver1",
            fillAmount: "60000000", // 60 USDC
            fillRate: "0.395",
            timestamp: baseDate - 250000,
            txHash: "0xfill002",
            gasUsed: "0.0012"
          },
          {
            id: "fill_003",
            orderId: "0x" + "6".repeat(64),
            resolver: "0xresolver2",
            fillAmount: "40000000", // 40 USDC
            fillRate: "0.405",
            timestamp: baseDate - 240000,
            txHash: "0xfill003",
            gasUsed: "0.0018"
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
        createdAt: baseDate - 600000, // 10 minutes before base date
        expiresAt: baseDate + 3000000,
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
          startTime: baseDate - 1800000, // 30 minutes before base date
          duration: 60,
          startRate: "2.70",
          endRate: "2.30", 
          currentRate: "2.30", // Reached end rate but not filled
          priceDecayFunction: "linear",
          remainingTime: 0
        },
        partialFillAllowed: true,
        status: 'expired',
        createdAt: baseDate - 1800000,
        expiresAt: baseDate + 1800000,
        txHash: "0x" + "8".repeat(64),
        orderType: 'market',
        fillHistory: []
      }
    ];
  }

  private getMockExchangeRate(fromToken: string, toToken: string): number {
    // Enhanced mock exchange rates with USDC-specific scenarios
    const rates: Record<string, number> = {
      // SUI to stablecoins
      "SUI_to_USDC": 2.485, // Slightly below 2.5 for realistic spread
      "SUI_to_USDT": 2.492, // Slightly different from USDC
      
      // Stablecoins to SUI
      "USDC_to_SUI": 0.4016, // 1/2.49 for realistic inverse
      "USDT_to_SUI": 0.4008, // Slightly different rate
      
      // Cross-chain scenarios
      "ETH_to_USDC": 3420.0, // ETH price in USDC
      "USDC_to_ETH": 0.000292, // 1/3420
      
      // WETH scenarios 
      "SUI_to_WETH": 0.000727, // SUI to WETH
      "WETH_to_SUI": 1375.5, // WETH to SUI
      "WETH_to_USDC": 3418.0, // WETH to USDC
      "USDC_to_WETH": 0.000293, // USDC to WETH
      
      // Stablecoin pairs (realistic depegging scenarios)
      "USDC_to_USDT": 0.9998, // Slight depeg for realism
      "USDT_to_USDC": 1.0002,
      
      // DAI scenarios (Ethereum specific)
      "DAI_to_USDC": 1.0001,
      "USDC_to_DAI": 0.9999,
      "ETH_to_DAI": 3419.5,
      "DAI_to_ETH": 0.000293,
    };

    const fromSymbol = this.getTokenSymbol(fromToken);
    const toSymbol = this.getTokenSymbol(toToken);
    const rateKey = `${fromSymbol}_to_${toSymbol}`;

    // Add small random variation (±0.1%) for realistic market movement
    const baseRate = rates[rateKey] || 1;
    const variation = 1 + (Math.random() - 0.5) * 0.002; // ±0.1%
    
    return baseRate * variation;
  }

  private getTokenSymbol(tokenType: string): string {
    // Enhanced token symbol detection for cross-chain scenarios
    if (tokenType.includes("sui::SUI") || tokenType === "SUI") return "SUI";
    if (tokenType.includes("usdc") || tokenType === "USDC") return "USDC";
    if (tokenType.includes("usdt") || tokenType === "USDT") return "USDT";
    if (tokenType.includes("weth") || tokenType === "WETH") return "WETH";
    if (tokenType.includes("ETH") || tokenType === "ETH") return "ETH";
    if (tokenType.includes("dai") || tokenType === "DAI") return "DAI";
    
    // Handle cross-chain token prefixes
    if (tokenType.includes("USDC-ETH")) return "USDC";
    if (tokenType.includes("USDC-SUI")) return "USDC";
    
    return "UNKNOWN";
  }

  private getTokenInfo(tokenType: string) {
    const tokenMap: Record<string, { symbol: string; decimals: number }> = {
      // Sui network tokens
      "0x2::sui::SUI": { symbol: "SUI", decimals: 9 },
      "0x2::coin::COIN<0x123::usdc::USDC>": { symbol: "USDC", decimals: 6 },
      "0x2::coin::COIN<0x123::usdt::USDT>": { symbol: "USDT", decimals: 6 },
      "0x2::coin::COIN<0x123::weth::WETH>": { symbol: "WETH", decimals: 18 },
      
      // Cross-chain token support
      "USDC-ETH": { symbol: "USDC", decimals: 6 },
      "USDC-SUI": { symbol: "USDC", decimals: 6 },
      
      // Ethereum network tokens
      "ETH": { symbol: "ETH", decimals: 18 },
      "0x0000000000000000000000000000000000000000": { symbol: "ETH", decimals: 18 },
      "0xA0b86a33E6441d3e2DbEcC39ee4bd65A58da0e17": { symbol: "USDC", decimals: 6 },
      "0xdac17f958d2ee523a2206206994597c13d831ec7": { symbol: "USDT", decimals: 6 },
      "0x6b175474e89094c44da98b954eedeac495271d0f": { symbol: "DAI", decimals: 18 },
    };

    return tokenMap[tokenType] || { symbol: "UNKNOWN", decimals: 9 };
  }

  private simulateAuctionProgress(order: FusionOrder): void {
    if (!order.auctionDetails) return;

    const updateInterval = 1000; // Update every 1 second for 1-minute demo
    const interval = setInterval(() => {
      if (order.auctionDetails) {
        const elapsed = Date.now() - order.auctionDetails.startTime;
        const remaining = Math.max(0, (order.auctionDetails.startTime + order.auctionDetails.duration * 1000) - Date.now());
        
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
            id: `fill_${Date.now()}`,
            orderId: order.id,
            resolver: progress > 0.6 ? "0xresolver2" : "0xresolver1", // Resolver competition
            fillAmount: order.fromAmount,
            fillRate: currentRate.toString(),
            timestamp: Date.now(),
            txHash: `0xfill${Date.now()}`,
            gasUsed: "0.002"
          });
          clearInterval(interval);
        }
      }
    }, updateInterval);
  }
}