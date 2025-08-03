import { SuiNetworkFactory, SuiNetworkUtils } from "./SuiNetworkFactory";
import { SuiNetwork } from "./suiConfig";
import { SuiClient } from "@mysten/sui/client";
import { Ed25519Keypair } from "@mysten/sui/keypairs/ed25519";
import { Transaction } from "@mysten/sui/transactions";

export interface SwapTransactionParams {
  fromTokenType: string;
  toTokenType: string;
  amount: string;
  minAmountOut: string;
  walletAddress: string;
  slippage: number;
  deadline?: number;
}

export interface OrderTransactionParams {
  fromTokenType: string;
  toTokenType: string;
  amount: string;
  walletAddress: string;
  slippage: number;
  expirationTime?: number;
  orderType?: "market" | "limit";
  limitPrice?: string;
}

export interface TransactionResult {
  success: boolean;
  transactionDigest?: string;
  error?: string;
  gasUsed?: string;
  effects?: any;
}

/**
 * Builder class for constructing Sui transactions for Fusion operations
 */
export class SuiTransactionBuilder {
  private client: SuiClient;
  private networkFactory: SuiNetworkFactory;
  private packageId: string;

  constructor(
    private network: SuiNetwork,
    packageId?: string,
  ) {
    this.networkFactory = SuiNetworkFactory.getInstance(network);
    this.client = this.networkFactory.getClient();
    this.packageId = packageId || this.networkFactory.getPackageId();
  }

  /**
   * Create a swap transaction
   */
  async createSwapTransaction(params: SwapTransactionParams): Promise<Transaction> {
    const tx = new Transaction();

    try {
      // Set gas budget
      tx.setGasBudget(this.networkFactory.getGasBudget());

      // Add swap move call
      const swapResult = tx.moveCall({
        target: `${this.packageId}::fusion_swap::swap`,
        arguments: [
          tx.pure.string(params.fromTokenType),
          tx.pure.string(params.toTokenType),
          tx.pure.u64(params.amount),
          tx.pure.u64(params.minAmountOut),
          tx.pure.u64(params.deadline || this.getDefaultDeadline()),
        ],
        typeArguments: [params.fromTokenType, params.toTokenType],
      });

      // Transfer the result to the user
      tx.transferObjects([swapResult], params.walletAddress);

      return tx;
    } catch (error) {
      throw new Error(`Failed to create swap transaction: ${error}`);
    }
  }

  /**
   * Create a limit order transaction
   */
  async createOrderTransaction(params: OrderTransactionParams): Promise<Transaction> {
    const tx = new Transaction();

    try {
      // Set gas budget
      tx.setGasBudget(this.networkFactory.getGasBudget());

      const expirationTime = params.expirationTime || SuiNetworkUtils.calculateExpirationTime();

      // Add create order move call
      const orderResult = tx.moveCall({
        target: `${this.packageId}::fusion_order::create_order`,
        arguments: [
          tx.pure.string(params.fromTokenType),
          tx.pure.string(params.toTokenType),
          tx.pure.u64(params.amount),
          tx.pure.address(params.walletAddress),
          tx.pure.u64(expirationTime),
          tx.pure.u8(params.orderType === "limit" ? 1 : 0),
          tx.pure.u64(params.limitPrice || "0"),
        ],
        typeArguments: [params.fromTokenType, params.toTokenType],
      });

      // Share the order object
      tx.transferObjects([orderResult], params.walletAddress);

      return tx;
    } catch (error) {
      throw new Error(`Failed to create order transaction: ${error}`);
    }
  }

  /**
   * Create a cancel order transaction
   */
  async createCancelOrderTransaction(orderId: string, walletAddress: string): Promise<Transaction> {
    const tx = new Transaction();

    try {
      // Set gas budget
      tx.setGasBudget(this.networkFactory.getGasBudget());

      // Add cancel order move call
      tx.moveCall({
        target: `${this.packageId}::fusion_order::cancel_order`,
        arguments: [tx.object(orderId), tx.pure.address(walletAddress)],
      });

      return tx;
    } catch (error) {
      throw new Error(`Failed to create cancel order transaction: ${error}`);
    }
  }

  /**
   * Create a fill order transaction
   */
  async createFillOrderTransaction(orderId: string, fillerAddress: string, fillAmount?: string): Promise<Transaction> {
    const tx = new Transaction();

    try {
      // Set gas budget
      tx.setGasBudget(this.networkFactory.getGasBudget());

      // Add fill order move call
      tx.moveCall({
        target: `${this.packageId}::fusion_order::fill_order`,
        arguments: [
          tx.object(orderId),
          tx.pure.address(fillerAddress),
          tx.pure.u64(fillAmount || "0"), // 0 means fill entire order
        ],
      });

      return tx;
    } catch (error) {
      throw new Error(`Failed to create fill order transaction: ${error}`);
    }
  }

  /**
   * Execute a transaction with a keypair
   */
  async executeTransaction(transaction: Transaction, keypair: Ed25519Keypair): Promise<TransactionResult> {
    try {
      // Sign and execute the transaction
      const result = await this.client.signAndExecuteTransaction({
        transaction,
        signer: keypair,
        options: {
          showEffects: true,
          showEvents: true,
          showObjectChanges: true,
        },
      });

      // Check if transaction was successful
      if (result.effects?.status?.status === "success") {
        return {
          success: true,
          transactionDigest: result.digest,
          gasUsed: result.effects.gasUsed?.computationCost,
          effects: result.effects,
        };
      } else {
        return {
          success: false,
          error: result.effects?.status?.error || "Transaction failed",
          transactionDigest: result.digest,
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
   * Simulate a transaction to estimate gas and check for errors
   */
  async simulateTransaction(transaction: Transaction): Promise<{
    success: boolean;
    gasEstimate?: string;
    error?: string;
    effects?: any;
  }> {
    try {
      // Build the transaction bytes
      const txBytes = await transaction.build({ client: this.client });

      // Simulate the transaction
      const result = await this.client.dryRunTransactionBlock({
        transactionBlock: txBytes,
      });

      if (result.effects.status.status === "success") {
        return {
          success: true,
          gasEstimate: result.effects.gasUsed?.computationCost,
          effects: result.effects,
        };
      } else {
        return {
          success: false,
          error: result.effects.status.error || "Simulation failed",
        };
      }
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : "Simulation error",
      };
    }
  }

  /**
   * Get transaction status
   */
  async getTransactionStatus(transactionDigest: string) {
    try {
      const result = await this.client.getTransactionBlock({
        digest: transactionDigest,
        options: {
          showEffects: true,
          showEvents: true,
          showInput: true,
          showObjectChanges: true,
        },
      });

      return {
        success: true,
        transaction: result,
        status: result.effects?.status?.status,
        gasUsed: result.effects?.gasUsed,
        events: result.events,
        objectChanges: result.objectChanges,
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : "Failed to get transaction status",
      };
    }
  }

  /**
   * Get user's coin objects for a specific token type
   */
  async getUserCoins(address: string, coinType: string) {
    try {
      const coins = await this.client.getCoins({
        owner: address,
        coinType,
      });

      return {
        success: true,
        coins: coins.data,
        totalBalance: coins.data.reduce((sum, coin) => sum + BigInt(coin.balance), BigInt(0)).toString(),
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : "Failed to get user coins",
        coins: [],
        totalBalance: "0",
      };
    }
  }

  /**
   * Get user's orders
   */
  async getUserOrders(address: string) {
    try {
      // Query for objects owned by the user that are order objects
      const objects = await this.client.getOwnedObjects({
        owner: address,
        filter: {
          StructType: `${this.packageId}::fusion_order::Order`,
        },
        options: {
          showContent: true,
          showType: true,
        },
      });

      return {
        success: true,
        orders: objects.data,
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : "Failed to get user orders",
        orders: [],
      };
    }
  }

  /**
   * Get order details by ID
   */
  async getOrderDetails(orderId: string) {
    try {
      const object = await this.client.getObject({
        id: orderId,
        options: {
          showContent: true,
          showType: true,
        },
      });

      return {
        success: true,
        order: object,
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : "Failed to get order details",
      };
    }
  }

  /**
   * Get default deadline (1 hour from now)
   */
  private getDefaultDeadline(): number {
    return Math.floor(Date.now() / 1000) + 3600; // 1 hour
  }

  /**
   * Calculate minimum amount out with slippage
   */
  static calculateMinAmountOut(expectedAmount: string, slippagePercent: number): string {
    const amount = BigInt(expectedAmount);
    const slippageBps = BigInt(Math.floor(slippagePercent * 100)); // Convert to basis points
    const minAmount = (amount * (BigInt(10000) - slippageBps)) / BigInt(10000);
    return minAmount.toString();
  }

  /**
   * Validate transaction parameters
   */
  static validateSwapParams(params: SwapTransactionParams): { valid: boolean; error?: string } {
    if (!SuiNetworkUtils.isValidTokenType(params.fromTokenType)) {
      return { valid: false, error: "Invalid from token type" };
    }

    if (!SuiNetworkUtils.isValidTokenType(params.toTokenType)) {
      return { valid: false, error: "Invalid to token type" };
    }

    if (BigInt(params.amount) <= 0) {
      return { valid: false, error: "Amount must be greater than 0" };
    }

    if (params.slippage < 0 || params.slippage > 100) {
      return { valid: false, error: "Slippage must be between 0 and 100" };
    }

    return { valid: true };
  }

  /**
   * Validate order parameters
   */
  static validateOrderParams(params: OrderTransactionParams): { valid: boolean; error?: string } {
    const swapValidation = this.validateSwapParams({
      fromTokenType: params.fromTokenType,
      toTokenType: params.toTokenType,
      amount: params.amount,
      minAmountOut: "0",
      walletAddress: params.walletAddress,
      slippage: params.slippage,
    });

    if (!swapValidation.valid) {
      return swapValidation;
    }

    if (params.orderType === "limit" && (!params.limitPrice || BigInt(params.limitPrice) <= 0)) {
      return { valid: false, error: "Limit price must be specified for limit orders" };
    }

    return { valid: true };
  }

  /**
   * Get network factory instance
   */
  getNetworkFactory(): SuiNetworkFactory {
    return this.networkFactory;
  }

  /**
   * Get client instance
   */
  getClient(): SuiClient {
    return this.client;
  }

  /**
   * Get package ID
   */
  getPackageId(): string {
    return this.packageId;
  }

  /**
   * Update package ID
   */
  setPackageId(packageId: string): void {
    this.packageId = packageId;
  }
}

/**
 * Factory for creating transaction builders
 */
export class SuiTransactionBuilderFactory {
  private static instances: Map<string, SuiTransactionBuilder> = new Map();

  /**
   * Get or create a transaction builder for a network
   */
  static getInstance(network: SuiNetwork, packageId?: string): SuiTransactionBuilder {
    const key = `${network}-${packageId || "default"}`;

    if (!this.instances.has(key)) {
      this.instances.set(key, new SuiTransactionBuilder(network, packageId));
    }

    return this.instances.get(key)!;
  }

  /**
   * Create a new transaction builder
   */
  static create(network: SuiNetwork, packageId?: string): SuiTransactionBuilder {
    return new SuiTransactionBuilder(network, packageId);
  }

  /**
   * Clear all cached instances
   */
  static clearCache(): void {
    this.instances.clear();
  }
}
