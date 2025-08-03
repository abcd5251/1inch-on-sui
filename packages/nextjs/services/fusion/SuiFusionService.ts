import { SuiNetworkFactory, SuiNetworkUtils } from "./SuiNetworkFactory";
import { SuiTransactionBuilder, SuiTransactionBuilderFactory } from "./SuiTransactionBuilder";
import { suiFusionConfig } from "./suiConfig";
import { SuiClient } from "@mysten/sui/client";
import { Ed25519Keypair } from "@mysten/sui/keypairs/ed25519";

export interface SuiFusionServiceConfig {
  network: "mainnet" | "testnet" | "devnet" | "localnet";
  rpcUrl?: string;
  packageId?: string;
}

export interface SuiSwapParams {
  fromTokenType: string;
  toTokenType: string;
  amount: string;
  walletAddress: string;
  slippage?: number;
}

export interface SuiQuoteParams {
  fromTokenType: string;
  toTokenType: string;
  amount: string;
}

export interface SuiOrderInfo {
  orderId: string;
  maker: string;
  fromToken: string;
  toToken: string;
  fromAmount: string;
  toAmount: string;
  status: "pending" | "filled" | "cancelled" | "expired";
  createdAt: number;
  expiresAt: number;
  txHash?: string;
}

export interface SuiQuote {
  fromToken: string;
  toToken: string;
  fromAmount: string;
  toAmount: string;
  rate: string;
  priceImpact: string;
  estimatedGas: string;
  route: string[];
}

export class SuiFusionService {
  private client: SuiClient;
  private config: SuiFusionServiceConfig;
  private keypair: Ed25519Keypair | null = null;
  private networkFactory: SuiNetworkFactory;
  private transactionBuilder: SuiTransactionBuilder;

  constructor(config: SuiFusionServiceConfig) {
    this.config = config;
    this.networkFactory = SuiNetworkFactory.getInstance(config.network);
    this.client = this.networkFactory.getClient();
    this.transactionBuilder = SuiTransactionBuilderFactory.getInstance(
      config.network,
      config.packageId || suiFusionConfig.defaultPackageId,
    );
  }

  /**
   * Initialize with private key
   */
  async initializeWithPrivateKey(privateKey: string): Promise<void> {
    try {
      this.keypair = this.networkFactory.createKeypair(privateKey);

      // Verify the keypair works by getting the address
      const address = this.keypair.getPublicKey().toSuiAddress();
      console.log("Initialized with address:", address);
    } catch (error) {
      throw new Error(`Failed to initialize with private key: ${error}`);
    }
  }

  /**
   * Get quote for token swap
   */
  async getQuote(params: SuiQuoteParams): Promise<SuiQuote> {
    // Mock implementation - in real scenario, this would call Sui DEX aggregators
    const mockQuote: SuiQuote = {
      fromToken: params.fromTokenType,
      toToken: params.toTokenType,
      fromAmount: params.amount,
      toAmount: this.calculateMockToAmount(params.amount, params.fromTokenType, params.toTokenType),
      rate: "1.0",
      priceImpact: "0.1%",
      estimatedGas: "0.001",
      route: [params.fromTokenType, params.toTokenType],
    };

    return mockQuote;
  }

  /**
   * Create a swap order
   */
  async createOrder(params: SuiSwapParams): Promise<SuiOrderInfo> {
    if (!this.keypair) {
      throw new Error("Service not initialized. Call initializeWithPrivateKey first.");
    }

    try {
      // Create transaction using the transaction builder
      const transaction = await this.transactionBuilder.createOrderTransaction({
        fromTokenType: params.fromTokenType,
        toTokenType: params.toTokenType,
        amount: params.amount,
        walletAddress: params.walletAddress,
        slippage: params.slippage,
        orderType: "market",
      });

      // Execute transaction
      const result = await this.transactionBuilder.executeTransaction(transaction, this.keypair);

      if (!result.success) {
        throw new Error(result.error || "Transaction failed");
      }

      const orderId = result.transactionDigest!;
      const now = Date.now();

      const orderInfo: SuiOrderInfo = {
        orderId,
        maker: params.walletAddress,
        fromToken: params.fromTokenType,
        toToken: params.toTokenType,
        fromAmount: params.amount,
        toAmount: "0", // Will be filled when order is executed
        status: "pending",
        createdAt: now,
        expiresAt: now + 24 * 60 * 60 * 1000, // 24 hours
        txHash: result.transactionDigest || "",
      };

      return orderInfo;
    } catch (error) {
      throw new Error(`Failed to create order: ${error}`);
    }
  }

  /**
   * Get active orders for an address
   */
  async getActiveOrders(
    address: string,
    page: number = 1,
    limit: number = 10,
  ): Promise<{ items: SuiOrderInfo[]; total: number }> {
    try {
      // Get orders from the blockchain using transaction builder
      const ordersResult = await this.transactionBuilder.getUserOrders(address);

      if (!ordersResult.success) {
        throw new Error(ordersResult.error || "Failed to fetch orders");
      }

      // Transform blockchain data to our format
      const orders: SuiOrderInfo[] = ordersResult.orders.map(order => ({
        orderId: order.data?.objectId || "unknown",
        maker: address,
        fromToken: "0x2::sui::SUI", // Would extract from order content
        toToken: "0x2::coin::COIN<0x123::usdc::USDC>", // Would extract from order content
        fromAmount: "1000000000", // Would extract from order content
        toAmount: "2500000", // Would extract from order content
        status: "pending",
        createdAt: Date.now() - 3600000, // Would extract from order content
        expiresAt: Date.now() + 82800000, // Would extract from order content
        txHash: order.data?.objectId,
      }));

      const startIndex = (page - 1) * limit;
      const endIndex = startIndex + limit;
      const paginatedOrders = orders.slice(startIndex, endIndex);

      return {
        items: paginatedOrders,
        total: orders.length,
      };
    } catch {
      // Fallback to mock data if blockchain query fails
      const mockOrders: SuiOrderInfo[] = [
        {
          orderId: "0x1234567890abcdef",
          maker: address,
          fromToken: "0x2::sui::SUI",
          toToken: "0x2::coin::COIN<0x123::usdc::USDC>",
          fromAmount: "1000000000", // 1 SUI
          toAmount: "2500000", // 2.5 USDC
          status: "pending",
          createdAt: Date.now() - 3600000, // 1 hour ago
          expiresAt: Date.now() + 82800000, // 23 hours from now
          txHash: "0x1234567890abcdef",
        },
      ];

      const startIndex = (page - 1) * limit;
      const endIndex = startIndex + limit;
      const paginatedOrders = mockOrders.slice(startIndex, endIndex);

      return {
        items: paginatedOrders,
        total: mockOrders.length,
      };
    }
  }

  /**
   * Get orders by maker address
   */
  async getOrdersByMaker(
    address: string,
    page: number = 1,
    limit: number = 10,
  ): Promise<{ items: SuiOrderInfo[]; total: number }> {
    return this.getActiveOrders(address, page, limit);
  }

  /**
   * Get address from private key
   */
  getAddressFromPrivateKey(privateKey: string): string {
    try {
      const cleanPrivateKey = privateKey.startsWith("0x") ? privateKey.slice(2) : privateKey;
      const privateKeyBytes = fromHEX(cleanPrivateKey);
      const keypair = Ed25519Keypair.fromSecretKey(privateKeyBytes);
      return keypair.getPublicKey().toSuiAddress();
    } catch (error) {
      throw new Error(`Failed to get address from private key: ${error}`);
    }
  }

  /**
   * Get supported tokens for current network
   */
  getTokenTypes(): Record<string, string> {
    return suiFusionConfig.tokens[this.config.network] || {};
  }

  /**
   * Get package ID for current network
   */
  getPackageId(): string {
    return this.config.packageId || suiFusionConfig.packages[this.config.network] || suiFusionConfig.defaultPackageId;
  }

  /**
   * Calculate mock to amount (for demo purposes)
   */
  private calculateMockToAmount(fromAmount: string, fromToken: string, toToken: string): string {
    const amount = parseFloat(fromAmount);

    // Mock exchange rates
    const rates: Record<string, number> = {
      SUI_to_USDC: 2.5,
      USDC_to_SUI: 0.4,
      SUI_to_WETH: 0.0015,
      WETH_to_SUI: 666.67,
    };

    const fromSymbol = this.getTokenSymbol(fromToken);
    const toSymbol = this.getTokenSymbol(toToken);
    const rateKey = `${fromSymbol}_to_${toSymbol}`;
    const rate = rates[rateKey] || 1;

    return Math.floor(amount * rate).toString();
  }

  /**
   * Get token symbol from token type
   */
  private getTokenSymbol(tokenType: string): string {
    if (tokenType.includes("sui::SUI")) return "SUI";
    if (tokenType.includes("usdc")) return "USDC";
    if (tokenType.includes("weth")) return "WETH";
    return "UNKNOWN";
  }

  /**
   * Check if service is initialized
   */
  isInitialized(): boolean {
    return this.keypair !== null;
  }

  /**
   * Get current network
   */
  getNetwork(): string {
    return this.config.network;
  }

  /**
   * Get network information
   */
  getNetworkInfo() {
    return {
      network: this.config.network,
      packageId: this.config.packageId || suiFusionConfig.defaultPackageId,
      rpcUrl: this.networkFactory.getRpcUrl(),
      explorerUrl: this.networkFactory.getExplorerUrl(),
      isTestnet: this.networkFactory.isTestnet(),
      isMainnet: this.networkFactory.isMainnet(),
    };
  }

  /**
   * Get network factory
   */
  getNetworkFactory(): SuiNetworkFactory {
    return this.networkFactory;
  }

  /**
   * Get transaction builder
   */
  getTransactionBuilder(): SuiTransactionBuilder {
    return this.transactionBuilder;
  }

  /**
   * Get user's token balance
   */
  async getTokenBalance(
    walletAddress: string,
    tokenType: string,
  ): Promise<{
    success: boolean;
    balance?: string;
    formattedBalance?: string;
    error?: string;
  }> {
    try {
      const coinsResult = await this.transactionBuilder.getUserCoins(walletAddress, tokenType);

      if (!coinsResult.success) {
        return {
          success: false,
          error: coinsResult.error,
        };
      }

      const decimals = SuiNetworkUtils.getTokenDecimals(tokenType);
      const formattedBalance = SuiNetworkUtils.formatTokenAmount(coinsResult.totalBalance, decimals);

      return {
        success: true,
        balance: coinsResult.totalBalance,
        formattedBalance: formattedBalance.toString(),
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
      };
    }
  }

  /**
   * Cancel an order
   */
  async cancelOrder(
    orderId: string,
    walletAddress: string,
  ): Promise<{
    success: boolean;
    transactionHash?: string;
    error?: string;
  }> {
    if (!this.keypair) {
      throw new Error("Service not initialized. Call initializeWithPrivateKey first.");
    }

    try {
      const transaction = await this.transactionBuilder.createCancelOrderTransaction(orderId, walletAddress);
      const result = await this.transactionBuilder.executeTransaction(transaction, this.keypair);

      if (result.success) {
        return {
          success: true,
          transactionHash: result.transactionDigest!,
        };
      } else {
        return {
          success: false,
          error: result.error || "Transaction failed",
        };
      }
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
      };
    }
  }

  /**
   * Get network status
   */
  async getNetworkStatus() {
    return await this.networkFactory.getNetworkStatus();
  }
}
