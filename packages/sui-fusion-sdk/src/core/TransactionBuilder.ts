import { Transaction } from '@mysten/sui/transactions';
import { SuiClient } from '@mysten/sui/client';
import { Ed25519Keypair } from '@mysten/sui/keypairs/ed25519';
import { SwapTransactionParams, TransactionResult, NetworkConfig, AuctionDetails } from '../types';
import { TransactionError, InsufficientGasError, ErrorCode } from '../utils/errors';
import { NumberUtils } from '../utils/formatters';

/**
 * Transaction builder for Sui Fusion operations
 */
export class TransactionBuilder {
  private client: SuiClient;
  private config: NetworkConfig;

  constructor(client: SuiClient, config: NetworkConfig) {
    this.client = client;
    this.config = config;
  }

  /**
   * Build swap transaction
   */
  async buildSwapTransaction(params: SwapTransactionParams): Promise<Transaction> {
    try {
      const tx = new Transaction();
      
      // Set gas budget
      tx.setGasBudget(this.config.gasBudget);
      
      // Add swap move call
      tx.moveCall({
        target: `${this.config.packageId}::fusion::swap`,
        arguments: [
          tx.pure.string(params.fromTokenType),
          tx.pure.string(params.toTokenType),
          tx.pure.u64(params.amount),
          tx.pure.u64(params.minAmountOut),
          tx.pure.u64(params.deadline || Date.now() + 300000) // 5 minutes default
        ],
        typeArguments: [params.fromTokenType, params.toTokenType]
      });
      
      return tx;
    } catch (error) {
      throw new TransactionError(
        ErrorCode.TRANSACTION_FAILED,
        `Failed to build swap transaction: ${error instanceof Error ? error.message : String(error)}`,
        { params, error }
      );
    }
  }

  /**
   * Build order creation transaction
   */
  async buildCreateOrderTransaction(
    fromToken: string,
    toToken: string,
    amount: string,
    expirationTime: number,
    minAmountOut?: string
  ): Promise<Transaction> {
    try {
      const tx = new Transaction();
      
      tx.setGasBudget(this.config.gasBudget);
      
      tx.moveCall({
        target: `${this.config.packageId}::fusion::create_order`,
        arguments: [
          tx.pure.string(fromToken),
          tx.pure.string(toToken),
          tx.pure.u64(amount),
          tx.pure.u64(minAmountOut || '0'),
          tx.pure.u64(expirationTime)
        ],
        typeArguments: [fromToken, toToken]
      });
      
      return tx;
    } catch (error) {
      throw new TransactionError(
        ErrorCode.TRANSACTION_FAILED,
        `Failed to build create order transaction: ${error instanceof Error ? error.message : String(error)}`,
        { fromToken, toToken, amount, error }
      );
    }
  }

  /**
   * Build Fusion order transaction with Dutch auction
   */
  async buildCreateFusionOrderTransaction(
    fromToken: string,
    toToken: string,
    amount: string,
    auctionDetails: AuctionDetails,
    expirationTime: number,
    minFillAmount?: string,
    maxFillAmount?: string,
    partialFillAllowed: boolean = false
  ): Promise<Transaction> {
    try {
      const tx = new Transaction();
      
      tx.setGasBudget(this.config.gasBudget);
      
      tx.moveCall({
        target: `${this.config.packageId}::fusion::create_auction_order`,
        arguments: [
          tx.pure.string(fromToken),
          tx.pure.string(toToken),
          tx.pure.u64(amount),
          tx.pure.u64(auctionDetails.startTime),
          tx.pure.u64(auctionDetails.duration),
          tx.pure.string(auctionDetails.startRate),
          tx.pure.string(auctionDetails.endRate),
          tx.pure.u8(auctionDetails.priceDecayFunction === 'exponential' ? 1 : 0),
          tx.pure.u64(expirationTime),
          tx.pure.u64(minFillAmount || '0'),
          tx.pure.u64(maxFillAmount || amount),
          tx.pure.bool(partialFillAllowed)
        ],
        typeArguments: [fromToken, toToken]
      });
      
      return tx;
    } catch (error) {
      throw new TransactionError(
        ErrorCode.TRANSACTION_FAILED,
        `Failed to build Fusion order transaction: ${error instanceof Error ? error.message : String(error)}`,
        { fromToken, toToken, amount, auctionDetails, error }
      );
    }
  }

  /**
   * Build order cancellation transaction
   */
  async buildCancelOrderTransaction(orderId: string): Promise<Transaction> {
    try {
      const tx = new Transaction();
      
      tx.setGasBudget(this.config.gasBudget);
      
      tx.moveCall({
        target: `${this.config.packageId}::fusion::cancel_order`,
        arguments: [
          tx.pure.string(orderId)
        ]
      });
      
      return tx;
    } catch (error) {
      throw new TransactionError(
        ErrorCode.TRANSACTION_FAILED,
        `Failed to build cancel order transaction: ${error instanceof Error ? error.message : String(error)}`,
        { orderId, error }
      );
    }
  }

  /**
   * Build order fulfillment transaction
   */
  async buildFulfillOrderTransaction(
    orderId: string,
    fromToken: string,
    toToken: string
  ): Promise<Transaction> {
    try {
      const tx = new Transaction();
      
      tx.setGasBudget(this.config.gasBudget);
      
      tx.moveCall({
        target: `${this.config.packageId}::fusion::fulfill_order`,
        arguments: [
          tx.pure.string(orderId)
        ],
        typeArguments: [fromToken, toToken]
      });
      
      return tx;
    } catch (error) {
      throw new TransactionError(
        ErrorCode.TRANSACTION_FAILED,
        `Failed to build fulfill order transaction: ${error instanceof Error ? error.message : String(error)}`,
        { orderId, error }
      );
    }
  }

  /**
   * Build Fusion order fill transaction (for Resolvers)
   */
  async buildFillFusionOrderTransaction(
    orderId: string,
    fillAmount: string,
    resolverAddress: string,
    fromToken: string,
    toToken: string
  ): Promise<Transaction> {
    try {
      const tx = new Transaction();
      
      tx.setGasBudget(this.config.gasBudget);
      
      tx.moveCall({
        target: `${this.config.packageId}::fusion::fill_auction_order`,
        arguments: [
          tx.pure.string(orderId),
          tx.pure.u64(fillAmount),
          tx.pure.address(resolverAddress)
        ],
        typeArguments: [fromToken, toToken]
      });
      
      return tx;
    } catch (error) {
      throw new TransactionError(
        ErrorCode.TRANSACTION_FAILED,
        `Failed to build fill Fusion order transaction: ${error instanceof Error ? error.message : String(error)}`,
        { orderId, fillAmount, resolverAddress, error }
      );
    }
  }

  /**
   * Execute transaction
   */
  async executeTransaction(
    transaction: Transaction,
    keypair: Ed25519Keypair
  ): Promise<TransactionResult> {
    try {
      // Sign and execute transaction
      const result = await this.client.signAndExecuteTransaction({
        transaction,
        signer: keypair,
        options: {
          showEffects: true,
          showEvents: true,
          showObjectChanges: true
        }
      });

      // Check if transaction was successful
      if (result.effects?.status?.status !== 'success') {
        throw new TransactionError(
          ErrorCode.TRANSACTION_FAILED,
          `Transaction failed: ${result.effects?.status?.error || 'Unknown error'}`,
          { result }
        );
      }

      return {
        success: true,
        transactionDigest: result.digest,
        gasUsed: result.effects?.gasUsed?.computationCost || '0',
        effects: result.effects
      };
    } catch (error) {
      if (error instanceof TransactionError) {
        throw error;
      }

      // Handle specific error types
      if (error instanceof Error) {
        if (error.message.includes('insufficient gas')) {
          throw new InsufficientGasError('Unknown', 'Unknown');
        }
        
        if (error.message.includes('insufficient funds')) {
          throw new TransactionError(
            ErrorCode.INSUFFICIENT_BALANCE,
            'Insufficient funds for transaction',
            { error }
          );
        }
      }

      throw new TransactionError(
        ErrorCode.TRANSACTION_FAILED,
        `Transaction execution failed: ${error instanceof Error ? error.message : String(error)}`,
        { error }
      );
    }
  }

  /**
   * Simulate transaction to estimate gas
   */
  async simulateTransaction(
    transaction: Transaction,
    address: string
  ): Promise<{ gasUsed: string; success: boolean; error?: string }> {
    try {
      const result = await this.client.dryRunTransactionBlock({
        transactionBlock: await transaction.build({ client: this.client }),
      });

      const gasUsed = result.effects.gasUsed?.computationCost || '0';
      const success = result.effects.status?.status === 'success';
      const error = result.effects.status?.error;

      return {
        gasUsed,
        success,
        error
      };
    } catch (error) {
      throw new TransactionError(
        ErrorCode.TRANSACTION_FAILED,
        `Transaction simulation failed: ${error instanceof Error ? error.message : String(error)}`,
        { error }
      );
    }
  }

  /**
   * Get transaction status
   */
  async getTransactionStatus(digest: string): Promise<{
    status: 'success' | 'failure' | 'pending';
    gasUsed?: string;
    error?: string;
  }> {
    try {
      const result = await this.client.getTransactionBlock({
        digest,
        options: {
          showEffects: true
        }
      });

      const status = result.effects?.status?.status === 'success' ? 'success' : 'failure';
      const gasUsed = result.effects?.gasUsed?.computationCost;
      const error = result.effects?.status?.error;

      return {
        status,
        gasUsed,
        error
      };
    } catch (error) {
      // If transaction not found, it might still be pending
      if (error instanceof Error && error.message.includes('not found')) {
        return { status: 'pending' };
      }

      throw new TransactionError(
        ErrorCode.TRANSACTION_FAILED,
        `Failed to get transaction status: ${error instanceof Error ? error.message : String(error)}`,
        { digest, error }
      );
    }
  }

  /**
   * Wait for transaction confirmation
   */
  async waitForTransaction(
    digest: string,
    timeoutMs: number = 30000
  ): Promise<TransactionResult> {
    const startTime = Date.now();
    
    while (Date.now() - startTime < timeoutMs) {
      try {
        const status = await this.getTransactionStatus(digest);
        
        if (status.status === 'success') {
          return {
            success: true,
            transactionDigest: digest,
            gasUsed: status.gasUsed || '0'
          };
        } else if (status.status === 'failure') {
          return {
            success: false,
            transactionDigest: digest,
            error: status.error || 'Transaction failed'
          };
        }
        
        // Wait before next check
        await new Promise(resolve => setTimeout(resolve, 1000));
      } catch (error) {
        // Continue waiting if there's an error checking status
        await new Promise(resolve => setTimeout(resolve, 1000));
      }
    }
    
    throw new TransactionError(
      ErrorCode.TRANSACTION_TIMEOUT,
      `Transaction confirmation timeout after ${timeoutMs}ms`,
      { digest, timeoutMs }
    );
  }

  /**
   * Estimate gas for transaction
   */
  async estimateGas(
    transaction: Transaction,
    address: string
  ): Promise<string> {
    const simulation = await this.simulateTransaction(transaction, address);
    return simulation.gasUsed;
  }

  /**
   * Check if address has sufficient gas
   */
  async checkGasSufficiency(
    address: string,
    requiredGas: string
  ): Promise<boolean> {
    try {
      const balance = await this.client.getBalance({
        owner: address,
        coinType: '0x2::sui::SUI'
      });

      const availableBalance = BigInt(balance.totalBalance);
      const requiredGasBN = BigInt(requiredGas);

      return availableBalance >= requiredGasBN;
    } catch (error) {
      throw new TransactionError(
        ErrorCode.TRANSACTION_FAILED,
        `Failed to check gas sufficiency: ${error instanceof Error ? error.message : String(error)}`,
        { address, requiredGas, error }
      );
    }
  }
}