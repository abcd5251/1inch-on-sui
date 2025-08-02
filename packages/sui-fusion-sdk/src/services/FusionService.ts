import { SuiClient } from '@mysten/sui/client';
import { Ed25519Keypair } from '@mysten/sui/keypairs/ed25519';
import {
  SuiFusionConfig,
  QuoteParams,
  Quote,
  OrderParams,
  Order,
  Balance,
  TransactionResult,
  NetworkInfo,
  OrderFilters,
  PaginatedResult,
  TokenInfo,
  FusionOrderParams,
  FusionOrder,
  AuctionQuote,
  AuctionParams,
  AuctionDetails,
  OrderFill,
  ResolverInfo
} from '../types';
import { NetworkFactory } from '../core/NetworkFactory';
import { TransactionBuilder } from '../core/TransactionBuilder';
import { AuctionService } from './AuctionService';
import {
  ErrorHandler,
  ValidationError,
  QuoteError,
  OrderError,
  NoRouteFoundError,
  OrderNotFoundError,
  ErrorCode
} from '../utils/errors';
import { ParamValidator, ValidationUtils } from '../utils/validators';
import { TokenFormatter, NumberUtils } from '../utils/formatters';

/**
 * Main Sui Fusion service class
 */
export class FusionService {
  private networkFactory: NetworkFactory;
  private transactionBuilder: TransactionBuilder;
  private initialized: boolean = false;

  constructor(config: SuiFusionConfig) {
    this.networkFactory = new NetworkFactory(config);
    this.transactionBuilder = new TransactionBuilder(
      this.networkFactory.getClient(),
      this.networkFactory.getNetworkConfig()
    );
  }

  /**
   * Initialize the service
   */
  async initialize(): Promise<void> {
    return ErrorHandler.withErrorHandling(async () => {
      // Test network connection
      await this.networkFactory.testConnection();
      this.initialized = true;
    }, 'Service initialization');
  }

  /**
   * Check if service is initialized
   */
  isInitialized(): boolean {
    return this.initialized;
  }

  /**
   * Get quote for token swap
   */
  async getQuote(params: QuoteParams): Promise<Quote> {
    this.ensureInitialized();
    
    return ErrorHandler.withErrorHandling(async () => {
      // Validate parameters
      const errors = ParamValidator.validateQuoteParams(params);
      ValidationUtils.throwIfErrors(errors, 'Quote parameters validation');

      // Get token information
      const fromTokenInfo = await this.getTokenInfo(params.fromToken);
      const toTokenInfo = await this.getTokenInfo(params.toToken);

      // Simulate the swap to get quote
      const quote = await this.simulateSwap(params, fromTokenInfo, toTokenInfo);
      
      return quote;
    }, 'Get quote');
  }

  /**
   * Get auction quote for Fusion mode swap
   */
  async getAuctionQuote(
    params: QuoteParams, 
    auctionParams: AuctionParams = {}
  ): Promise<AuctionQuote> {
    this.ensureInitialized();
    
    return ErrorHandler.withErrorHandling(async () => {
      // Validate parameters
      const errors = ParamValidator.validateQuoteParams(params);
      ValidationUtils.throwIfErrors(errors, 'Quote parameters validation');
      
      // Get base quote first
       const baseQuote = await this.getQuote(params);
       
       // Create auction details
       const auctionDetails = AuctionService.createAuctionDetails(
         baseQuote.rate,
         auctionParams
       );
       
       // Get resolver information
       const resolvers = AuctionService.getMockResolvers();
       
       // Estimate fill time
       const estimatedFillTime = AuctionService.estimateFillTime(auctionDetails);
      
      return {
        ...baseQuote,
        auctionDetails,
        estimatedFillTime,
        resolvers,
        mevProtection: true
      };
    }, 'Get auction quote');
  }

  /**
   * Create a new order
   */
  async createOrder(params: OrderParams): Promise<Order> {
    this.ensureInitialized();
    this.ensureWalletConnected();
    
    return ErrorHandler.withErrorHandling(async () => {
      // Validate parameters
      const errors = ParamValidator.validateOrderParams(params);
      ValidationUtils.throwIfErrors(errors, 'Order parameters validation');

      // Calculate minimum amount out with slippage
      const quote = await this.getQuote(params);
      const minAmountOut = NumberUtils.calculateMinAmountOut(
        quote.toAmount,
        params.slippage || 1
      );

      // Build and execute transaction
      const expirationTime = params.expirationTime || Date.now() + 3600000; // 1 hour default
      const transaction = await this.transactionBuilder.buildCreateOrderTransaction(
        params.fromToken,
        params.toToken,
        params.amount,
        minAmountOut,
        expirationTime
      );

      const result = await this.transactionBuilder.executeTransaction(
        transaction,
        this.networkFactory.getKeypair()
      );

      // Create order object
      const order: Order = {
        id: result.transactionDigest || '',
        maker: this.networkFactory.getAddress(),
        fromToken: params.fromToken,
        toToken: params.toToken,
        fromAmount: params.amount,
        toAmount: quote.toAmount,
        status: 'pending',
        createdAt: Date.now(),
        expiresAt: expirationTime,
        txHash: result.transactionDigest,
        orderType: params.orderType || 'market',
        limitPrice: params.limitPrice
      };

      return order;
    }, 'Create order');
  }

  /**
   * Create a Fusion order with Dutch auction mechanism
   */
  async createFusionOrder(params: FusionOrderParams): Promise<FusionOrder> {
    this.ensureInitialized();
    this.ensureWalletConnected();
    
    return ErrorHandler.withErrorHandling(async () => {
      // Validate parameters
      const errors = ParamValidator.validateOrderParams(params);
      ValidationUtils.throwIfErrors(errors, 'Fusion order parameters validation');

      // Get auction quote if auction is enabled
       let auctionDetails: AuctionDetails | undefined;
       if (params.enableAuction) {
         const auctionQuote = await this.getAuctionQuote(params, params.auctionDetails ? {
           duration: params.auctionDetails.duration,
           startRateMultiplier: parseFloat(params.auctionDetails.startRate),
           endRateMultiplier: parseFloat(params.auctionDetails.endRate),
           priceDecayFunction: params.auctionDetails.priceDecayFunction
         } : {});
         auctionDetails = auctionQuote.auctionDetails;
       }
       
       // Build and execute Fusion order transaction
       const expirationTime = params.expirationTime || Date.now() + 3600000; // 1 hour default
       const transaction = await this.transactionBuilder.buildCreateOrderTransaction(
         params.fromToken,
         params.toToken,
         params.amount,
         expirationTime
       );

       const result = await this.transactionBuilder.executeTransaction(
         transaction,
         this.networkFactory.getKeypair()
       );

       // Create Fusion order object
       const fusionOrder: FusionOrder = {
         id: result.transactionDigest || '',
         maker: this.networkFactory.getAddress(),
         fromToken: params.fromToken,
         toToken: params.toToken,
         fromAmount: params.amount,
         toAmount: '', // Will be calculated based on auction
         auctionDetails,
         enableAuction: params.enableAuction || false,
         minFillAmount: params.minFillAmount,
         maxFillAmount: params.maxFillAmount,
         partialFillAllowed: params.partialFillAllowed || false,
         status: 'pending',
         createdAt: Date.now(),
         expiresAt: expirationTime,
         txHash: result.transactionDigest,
         orderType: params.orderType || 'market',
         limitPrice: params.limitPrice,
         fillHistory: []
       };

      return fusionOrder;
    }, 'Create Fusion order');
  }

  /**
   * Cancel an existing order
   */
  async cancelOrder(orderId: string): Promise<TransactionResult> {
    this.ensureInitialized();
    this.ensureWalletConnected();
    
    return ErrorHandler.withErrorHandling(async () => {
      if (!orderId) {
        throw new ValidationError(ErrorCode.INVALID_ADDRESS, 'Order ID is required');
      }

      // Check if order exists and is cancellable
      const order = await this.getOrder(orderId);
      if (order.status !== 'pending') {
        throw new OrderError(
          ErrorCode.ORDER_ALREADY_FILLED,
          `Cannot cancel order with status: ${order.status}`
        );
      }

      // Build and execute cancellation transaction
      const transaction = await this.transactionBuilder.buildCancelOrderTransaction(orderId);
      const result = await this.transactionBuilder.executeTransaction(
        transaction,
        this.networkFactory.getKeypair()
      );

      return result;
    }, 'Cancel order');
  }

  /**
   * Get order by ID
   */
  async getOrder(orderId: string): Promise<Order> {
    this.ensureInitialized();
    
    return ErrorHandler.withErrorHandling(async () => {
      if (!orderId) {
        throw new ValidationError(ErrorCode.INVALID_ADDRESS, 'Order ID is required');
      }

      // Query order from blockchain
      const order = await this.queryOrderFromChain(orderId);
      if (!order) {
        throw new OrderNotFoundError(orderId);
      }

      return order;
    }, 'Get order');
  }

  /**
   * Get Fusion order by ID
   */
  async getFusionOrder(orderId: string): Promise<FusionOrder> {
    this.ensureInitialized();
    
    return ErrorHandler.withErrorHandling(async () => {
      if (!orderId) {
        throw new ValidationError(ErrorCode.INVALID_ADDRESS, 'Order ID is required');
      }

      // Query Fusion order from blockchain
      const fusionOrder = await this.queryFusionOrderFromChain(orderId);
      if (!fusionOrder) {
        throw new OrderNotFoundError(orderId);
      }

      return fusionOrder;
    }, 'Get Fusion order');
  }

  /**
   * Get orders with filters
   */
  async getOrders(filters: OrderFilters = {}): Promise<PaginatedResult<Order>> {
    this.ensureInitialized();
    
    return ErrorHandler.withErrorHandling(async () => {
      const orders = await this.queryOrdersFromChain(filters);
      
      return {
        items: orders,
        total: orders.length,
        page: Math.floor((filters.offset || 0) / (filters.limit || 10)) + 1,
        limit: filters.limit || 10,
        hasNext: orders.length === (filters.limit || 10),
        hasPrev: (filters.offset || 0) > 0
      };
    }, 'Get orders');
  }

  /**
   * Get token balance
   */
  async getBalance(tokenType: string, address?: string): Promise<Balance> {
    this.ensureInitialized();
    
    return ErrorHandler.withErrorHandling(async () => {
      const walletAddress = address || this.networkFactory.getAddress();
      
      if (!this.networkFactory.validateAddress(walletAddress)) {
        throw new ValidationError(ErrorCode.INVALID_ADDRESS, `Invalid address: ${walletAddress}`);
      }

      const client = this.networkFactory.getClient();
      const balance = await client.getBalance({
        owner: walletAddress,
        coinType: tokenType
      });

      const tokenInfo = await this.getTokenInfo(tokenType);
      const formattedBalance = TokenFormatter.formatAmount(balance.totalBalance, tokenInfo.decimals);

      return {
        tokenType,
        balance: balance.totalBalance,
        formattedBalance,
        decimals: tokenInfo.decimals,
        symbol: tokenInfo.symbol
      };
    }, 'Get balance');
  }

  /**
   * Get all balances for an address
   */
  async getAllBalances(address?: string): Promise<Balance[]> {
    this.ensureInitialized();
    
    return ErrorHandler.withErrorHandling(async () => {
      const walletAddress = address || this.networkFactory.getAddress();
      
      if (!this.networkFactory.validateAddress(walletAddress)) {
        throw new ValidationError(ErrorCode.INVALID_ADDRESS, `Invalid address: ${walletAddress}`);
      }

      const client = this.networkFactory.getClient();
      const allBalances = await client.getAllBalances({ owner: walletAddress });
      
      const balances: Balance[] = [];
      
      for (const balance of allBalances) {
        try {
          const tokenInfo = await this.getTokenInfo(balance.coinType);
          const formattedBalance = TokenFormatter.formatAmount(balance.totalBalance, tokenInfo.decimals);
          
          balances.push({
            tokenType: balance.coinType,
            balance: balance.totalBalance,
            formattedBalance,
            decimals: tokenInfo.decimals,
            symbol: tokenInfo.symbol
          });
        } catch {
          // Skip tokens we can't get info for
          continue;
        }
      }
      
      return balances;
    }, 'Get all balances');
  }

  /**
   * Get network information
   */
  getNetworkInfo(): NetworkInfo {
    return this.networkFactory.getNetworkInfo();
  }

  /**
   * Get wallet address
   */
  getAddress(): string {
    this.ensureWalletConnected();
    return this.networkFactory.getAddress();
  }

  /**
   * Check if wallet is connected
   */
  isWalletConnected(): boolean {
    return this.networkFactory.isWalletConnected();
  }

  /**
   * Switch to different network
   */
  async switchNetwork(config: SuiFusionConfig): Promise<void> {
    return ErrorHandler.withErrorHandling(async () => {
      this.networkFactory.switchNetwork(config);
      this.transactionBuilder = new TransactionBuilder(
        this.networkFactory.getClient(),
        this.networkFactory.getNetworkConfig()
      );
      this.initialized = false;
      await this.initialize();
    }, 'Switch network');
  }

  /**
   * Dispose resources
   */
  dispose(): void {
    this.networkFactory.dispose();
    this.initialized = false;
  }

  // Private helper methods

  private ensureInitialized(): void {
    if (!this.initialized) {
      throw new ValidationError(ErrorCode.INVALID_CONFIG, 'Service not initialized. Call initialize() first.');
    }
  }

  private ensureWalletConnected(): void {
    if (!this.networkFactory.isWalletConnected()) {
      throw new ValidationError(ErrorCode.WALLET_NOT_CONNECTED, 'Wallet not connected. Private key is required.');
    }
  }

  private async simulateSwap(
    params: QuoteParams,
    fromTokenInfo: TokenInfo,
    toTokenInfo: TokenInfo
  ): Promise<Quote> {
    // This is a simplified simulation - in a real implementation,
    // you would query actual DEX protocols for real quotes
    
    // Mock calculation for demonstration
    const fromAmount = params.amount;
    const rate = 1.0; // Mock 1:1 rate
    const toAmount = fromAmount;
    const priceImpact = '0.1'; // Mock 0.1% price impact
    const estimatedGas = '1000000'; // Mock gas estimate
    
    if (parseFloat(toAmount) === 0) {
      throw new NoRouteFoundError(params.fromToken, params.toToken);
    }
    
    return {
      fromToken: params.fromToken,
      toToken: params.toToken,
      fromAmount,
      toAmount,
      rate: rate.toString(),
      priceImpact,
      estimatedGas,
      route: [
        {
          name: 'Cetus',
          percentage: 100,
          estimatedGas: '1000000'
        }
      ],
      validUntil: Date.now() + 300000 // 5 minutes
    };
  }

  private async getTokenInfo(tokenType: string): Promise<TokenInfo> {
    const config = this.networkFactory.getNetworkConfig();
    
    // Check if token is in our known tokens
    for (const [symbol, tokenInfo] of Object.entries(config.tokens)) {
      if (tokenInfo.type === tokenType) {
        return tokenInfo;
      }
    }
    
    // For unknown tokens, try to get metadata from chain
    try {
      const client = this.networkFactory.getClient();
      const metadata = await client.getCoinMetadata({ coinType: tokenType });
      
      return {
        type: tokenType,
        symbol: metadata?.symbol || 'UNKNOWN',
        name: metadata?.name || 'Unknown Token',
        decimals: metadata?.decimals || 9,
        iconUrl: metadata?.iconUrl || undefined
      };
    } catch {
      // Fallback for unknown tokens
      return {
        type: tokenType,
        symbol: 'UNKNOWN',
        name: 'Unknown Token',
        decimals: 9
      };
    }
  }

  private async queryOrderFromChain(orderId: string): Promise<Order | null> {
    // This would query the actual order from the blockchain
    // For now, return null as this requires the actual smart contract implementation
    return null;
  }

  private async queryOrdersFromChain(filters: OrderFilters): Promise<Order[]> {
    // This would query orders from the blockchain based on filters
    // For now, return empty array as this requires the actual smart contract implementation
    return [];
  }

  private async queryFusionOrderFromChain(orderId: string): Promise<FusionOrder | null> {
    // This would query the actual Fusion order from the blockchain
    // For now, return null as this requires the actual smart contract implementation
    return null;
  }
}