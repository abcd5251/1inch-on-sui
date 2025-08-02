import {
  FusionOrder,
  OrderFill,
  ResolverInfo,
  TransactionResult,
  AuctionDetails
} from '../types';
import { AuctionService } from './AuctionService';
import { TransactionBuilder } from '../core/TransactionBuilder';
import { ErrorHandler, ValidationError, ErrorCode } from '../utils/errors';
import { NumberUtils } from '../utils/formatters';
import { Ed25519Keypair } from '@mysten/sui/keypairs/ed25519';

/**
 * Resolver Service for filling Fusion orders
 * Resolvers are independent market makers that compete to fill orders
 */
export class ResolverService {
  private transactionBuilder: TransactionBuilder;
  private resolverKeypair: Ed25519Keypair;
  private resolverInfo: ResolverInfo;

  constructor(
    transactionBuilder: TransactionBuilder,
    resolverKeypair: Ed25519Keypair,
    resolverInfo: ResolverInfo
  ) {
    this.transactionBuilder = transactionBuilder;
    this.resolverKeypair = resolverKeypair;
    this.resolverInfo = resolverInfo;
  }

  /**
   * Analyze order profitability for resolver
   */
  analyzeOrderProfitability(
    order: FusionOrder,
    availableLiquidity: string,
    gasPrice: string = '1000'
  ): {
    isProfitable: boolean;
    expectedProfit: string;
    fillAmount: string;
    fillRate: string;
    estimatedGas: string;
    profitMargin: number;
  } {
    return ErrorHandler.withErrorHandling(() => {
      if (!order.auctionDetails) {
        throw new ValidationError('Order does not have auction details', ErrorCode.VALIDATION_ERROR);
      }

      // Check if auction is still active
      if (!AuctionService.isAuctionActive(order.auctionDetails)) {
        return {
          isProfitable: false,
          expectedProfit: '0',
          fillAmount: '0',
          fillRate: '0',
          estimatedGas: '0',
          profitMargin: 0
        };
      }

      // Calculate optimal fill
      const optimalFill = AuctionService.calculateOptimalFill(order, availableLiquidity);
      const currentRate = parseFloat(optimalFill.fillRate);
      const marketRate = this.getMarketRate(order.fromToken, order.toToken);
      
      // Estimate gas cost
      const estimatedGas = this.resolverInfo.averageGasUsed;
      const gasCost = NumberUtils.multiply(estimatedGas, gasPrice);
      
      // Calculate profit
      const fillAmountNum = parseFloat(optimalFill.fillAmount);
      const expectedOutput = fillAmountNum * currentRate;
      const marketOutput = fillAmountNum * marketRate;
      const grossProfit = expectedOutput - marketOutput;
      const netProfit = grossProfit - parseFloat(gasCost);
      
      const profitMargin = grossProfit > 0 ? (netProfit / expectedOutput) * 100 : 0;
      const isProfitable = netProfit > 0 && profitMargin > 0.05; // Minimum 0.05% profit margin

      return {
        isProfitable,
        expectedProfit: netProfit.toString(),
        fillAmount: optimalFill.fillAmount,
        fillRate: optimalFill.fillRate,
        estimatedGas,
        profitMargin
      };
    });
  }

  /**
   * Fill a Fusion order
   */
  async fillOrder(
    order: FusionOrder,
    fillAmount: string,
    maxGasPrice?: string
  ): Promise<{ success: boolean; fill?: OrderFill; error?: string }> {
    return ErrorHandler.withErrorHandling(async () => {
      // Validate order can be filled
      if (order.status !== 'pending') {
        throw new ValidationError(`Order status is ${order.status}, cannot fill`, ErrorCode.VALIDATION_ERROR);
      }

      if (!order.auctionDetails) {
        throw new ValidationError('Order does not have auction details', ErrorCode.VALIDATION_ERROR);
      }

      if (!AuctionService.isAuctionActive(order.auctionDetails)) {
        throw new ValidationError('Auction has ended', ErrorCode.VALIDATION_ERROR);
      }

      // Validate fill amount
      if (order.minFillAmount && NumberUtils.isLessThan(fillAmount, order.minFillAmount)) {
        throw new ValidationError(
          `Fill amount ${fillAmount} is less than minimum ${order.minFillAmount}`,
          ErrorCode.VALIDATION_ERROR
        );
      }

      if (order.maxFillAmount && NumberUtils.isGreaterThan(fillAmount, order.maxFillAmount)) {
        throw new ValidationError(
          `Fill amount ${fillAmount} exceeds maximum ${order.maxFillAmount}`,
          ErrorCode.VALIDATION_ERROR
        );
      }

      // Check profitability before filling
      const profitability = this.analyzeOrderProfitability(order, fillAmount);
      if (!profitability.isProfitable) {
        return {
          success: false,
          error: `Order not profitable. Expected profit: ${profitability.expectedProfit}, margin: ${profitability.profitMargin}%`
        };
      }

      try {
        // Build fill transaction
        const transaction = await this.transactionBuilder.buildFillFusionOrderTransaction(
          order.id,
          fillAmount,
          this.resolverInfo.address,
          order.fromToken,
          order.toToken
        );

        // Execute transaction
        const result = await this.transactionBuilder.executeTransaction(
          transaction,
          this.resolverKeypair
        );

        if (!result.success) {
          return {
            success: false,
            error: result.error || 'Transaction failed'
          };
        }

        // Create fill record
        const fill: OrderFill = {
          id: result.transactionDigest || '',
          orderId: order.id,
          resolver: this.resolverInfo.address,
          fillAmount,
          fillRate: profitability.fillRate,
          timestamp: Date.now(),
          txHash: result.transactionDigest || '',
          gasUsed: result.gasUsed || profitability.estimatedGas
        };

        return {
          success: true,
          fill
        };

      } catch (error) {
        return {
          success: false,
          error: error instanceof Error ? error.message : String(error)
        };
      }
    });
  }

  /**
   * Monitor multiple orders and fill profitable ones
   */
  async monitorAndFillOrders(
    orders: FusionOrder[],
    maxConcurrentFills: number = 3
  ): Promise<OrderFill[]> {
    return ErrorHandler.withErrorHandling(async () => {
      const fills: OrderFill[] = [];
      const activeOrders = orders.filter(order => 
        order.status === 'pending' && 
        order.enableAuction &&
        order.auctionDetails &&
        AuctionService.isAuctionActive(order.auctionDetails)
      );

      // Sort orders by profitability
      const profitableOrders = activeOrders
        .map(order => ({
          order,
          profitability: this.analyzeOrderProfitability(order, order.fromAmount)
        }))
        .filter(item => item.profitability.isProfitable)
        .sort((a, b) => b.profitability.profitMargin - a.profitability.profitMargin)
        .slice(0, maxConcurrentFills);

      // Fill orders concurrently
      const fillPromises = profitableOrders.map(async ({ order, profitability }) => {
        try {
          const result = await this.fillOrder(order, profitability.fillAmount);
          if (result.success && result.fill) {
            fills.push(result.fill);
          }
          return result;
        } catch (error) {
          console.error(`Error filling order ${order.id}:`, error);
          return { success: false, error: String(error) };
        }
      });

      await Promise.allSettled(fillPromises);
      return fills;
    });
  }

  /**
   * Get resolver statistics
   */
  getResolverStats(): ResolverInfo {
    return { ...this.resolverInfo };
  }

  /**
   * Update resolver reputation based on fill performance
   */
  updateReputation(fillResult: { success: boolean; gasUsed?: string; profitMargin?: number }) {
    if (fillResult.success) {
      // Increase reputation for successful fills
      this.resolverInfo.reputation = Math.min(100, this.resolverInfo.reputation + 0.1);
      this.resolverInfo.successRate = Math.min(1, this.resolverInfo.successRate + 0.001);
      
      // Update average gas usage
      if (fillResult.gasUsed) {
        const currentGas = parseFloat(this.resolverInfo.averageGasUsed);
        const newGas = parseFloat(fillResult.gasUsed);
        this.resolverInfo.averageGasUsed = ((currentGas + newGas) / 2).toString();
      }
    } else {
      // Decrease reputation for failed fills
      this.resolverInfo.reputation = Math.max(0, this.resolverInfo.reputation - 0.5);
      this.resolverInfo.successRate = Math.max(0, this.resolverInfo.successRate - 0.01);
    }
  }

  /**
   * Calculate optimal gas price based on network conditions
   */
  calculateOptimalGasPrice(urgency: 'low' | 'medium' | 'high' = 'medium'): string {
    // This would typically fetch real-time gas prices from the network
    const baseGasPrice = 1000; // Base gas price in MIST
    
    const multipliers = {
      low: 1.0,
      medium: 1.2,
      high: 1.5
    };
    
    return (baseGasPrice * multipliers[urgency]).toString();
  }

  /**
   * Get current market rate for token pair
   * In production, this would fetch from DEX aggregators
   */
  private getMarketRate(fromToken: string, toToken: string): number {
    // Mock market rate - in production, fetch from price oracles/DEXs
    if (fromToken.includes('SUI') && toToken.includes('USDC')) {
      return 2.5; // 1 SUI = 2.5 USDC (example)
    }
    return 1.0; // Default 1:1 rate
  }

  /**
   * Estimate MEV protection effectiveness
   */
  estimateMEVProtection(order: FusionOrder): {
    protectionLevel: 'low' | 'medium' | 'high';
    estimatedSavings: string;
    riskFactors: string[];
  } {
    const riskFactors: string[] = [];
    let protectionLevel: 'low' | 'medium' | 'high' = 'medium';
    
    if (!order.auctionDetails) {
      riskFactors.push('No auction mechanism');
      protectionLevel = 'low';
    } else {
      const auctionDuration = order.auctionDetails.duration;
      if (auctionDuration < 60) {
        riskFactors.push('Short auction duration');
      }
      if (auctionDuration > 300) {
        protectionLevel = 'high';
      }
    }
    
    if (!order.partialFillAllowed) {
      riskFactors.push('No partial fills allowed');
    }
    
    const orderSize = parseFloat(order.fromAmount);
    if (orderSize > 10000000000) { // > 10 SUI
      riskFactors.push('Large order size');
    }
    
    // Estimate savings based on protection level
    const savingsMultiplier = {
      low: 0.001,
      medium: 0.005,
      high: 0.01
    };
    
    const estimatedSavings = (orderSize * savingsMultiplier[protectionLevel]).toString();
    
    return {
      protectionLevel,
      estimatedSavings,
      riskFactors
    };
  }
}