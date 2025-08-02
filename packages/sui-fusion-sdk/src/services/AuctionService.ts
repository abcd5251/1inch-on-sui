import {
  AuctionDetails,
  AuctionParams,
  AuctionQuote,
  FusionOrder,
  FusionOrderParams,
  OrderFill,
  ResolverInfo,
  QuoteParams,
  TransactionResult
} from '../types';
import { ErrorHandler, ValidationError, ErrorCode } from '../utils/errors';
import { ParamValidator } from '../utils/validators';
import { NumberUtils } from '../utils/formatters';

/**
 * Dutch Auction Service for Fusion Orders
 * Implements the core auction mechanism with price decay over time
 */
export class AuctionService {
  private static readonly DEFAULT_AUCTION_DURATION = 180; // 3 minutes
  private static readonly DEFAULT_START_RATE_MULTIPLIER = 1.05; // 5% above market
  private static readonly DEFAULT_END_RATE_MULTIPLIER = 0.95; // 5% below market
  private static readonly MIN_AUCTION_DURATION = 30; // 30 seconds
  private static readonly MAX_AUCTION_DURATION = 3600; // 1 hour

  /**
   * Create auction details for a Fusion order
   */
  static createAuctionDetails(
    marketRate: string,
    params: AuctionParams = {}
  ): AuctionDetails {
    return ErrorHandler.withErrorHandling(() => {
      const duration = params.duration || AuctionService.DEFAULT_AUCTION_DURATION;
      const startRateMultiplier = params.startRateMultiplier || AuctionService.DEFAULT_START_RATE_MULTIPLIER;
      const endRateMultiplier = params.endRateMultiplier || AuctionService.DEFAULT_END_RATE_MULTIPLIER;
      const priceDecayFunction = params.priceDecayFunction || 'linear';

      // Validate parameters
      if (duration < AuctionService.MIN_AUCTION_DURATION || duration > AuctionService.MAX_AUCTION_DURATION) {
        throw new ValidationError(
          `Auction duration must be between ${AuctionService.MIN_AUCTION_DURATION} and ${AuctionService.MAX_AUCTION_DURATION} seconds`,
          ErrorCode.VALIDATION_ERROR
        );
      }

      if (startRateMultiplier <= endRateMultiplier) {
        throw new ValidationError(
          'Start rate multiplier must be greater than end rate multiplier',
          ErrorCode.VALIDATION_ERROR
        );
      }

      const marketRateNum = parseFloat(marketRate);
      const startRate = (marketRateNum * startRateMultiplier).toString();
      const endRate = (marketRateNum * endRateMultiplier).toString();
      const startTime = Date.now();

      return {
        startTime,
        duration,
        startRate,
        endRate,
        priceDecayFunction,
        remainingTime: duration
      };
    });
  }

  /**
   * Calculate current auction rate based on time elapsed
   */
  static getCurrentAuctionRate(auctionDetails: AuctionDetails): string {
    return ErrorHandler.withErrorHandling(() => {
      const now = Date.now();
      const elapsed = (now - auctionDetails.startTime) / 1000; // Convert to seconds
      const { duration, startRate, endRate, priceDecayFunction } = auctionDetails;

      // If auction has ended, return end rate
      if (elapsed >= duration) {
        return endRate;
      }

      // If auction hasn't started, return start rate
      if (elapsed <= 0) {
        return startRate;
      }

      const startRateNum = parseFloat(startRate);
      const endRateNum = parseFloat(endRate);
      const progress = elapsed / duration; // 0 to 1

      let currentRate: number;

      if (priceDecayFunction === 'exponential') {
        // Exponential decay: faster price drop initially, slower later
        const decayFactor = Math.pow(progress, 2);
        currentRate = startRateNum - (startRateNum - endRateNum) * decayFactor;
      } else {
        // Linear decay: constant price drop rate
        currentRate = startRateNum - (startRateNum - endRateNum) * progress;
      }

      return currentRate.toString();
    });
  }

  /**
   * Update auction details with current state
   */
  static updateAuctionState(auctionDetails: AuctionDetails): AuctionDetails {
    return ErrorHandler.withErrorHandling(() => {
      const now = Date.now();
      const elapsed = (now - auctionDetails.startTime) / 1000;
      const remainingTime = Math.max(0, auctionDetails.duration - elapsed);
      const currentRate = AuctionService.getCurrentAuctionRate(auctionDetails);

      return {
        ...auctionDetails,
        currentRate,
        remainingTime
      };
    });
  }

  /**
   * Check if auction is still active
   */
  static isAuctionActive(auctionDetails: AuctionDetails): boolean {
    const now = Date.now();
    const elapsed = (now - auctionDetails.startTime) / 1000;
    return elapsed < auctionDetails.duration;
  }

  /**
   * Calculate optimal fill amount based on current auction rate
   */
  static calculateOptimalFill(
    order: FusionOrder,
    availableLiquidity: string
  ): { fillAmount: string; fillRate: string } {
    return ErrorHandler.withErrorHandling(() => {
      if (!order.auctionDetails) {
        throw new ValidationError('Order does not have auction details', ErrorCode.VALIDATION_ERROR);
      }

      const currentRate = AuctionService.getCurrentAuctionRate(order.auctionDetails);
      const maxFillAmount = order.maxFillAmount || order.fromAmount;
      const minFillAmount = order.minFillAmount || '0';
      
      // Calculate maximum possible fill based on available liquidity and order constraints
      const possibleFillAmount = NumberUtils.min(
        availableLiquidity,
        maxFillAmount
      );

      // Ensure minimum fill amount is met
      if (NumberUtils.isLessThan(possibleFillAmount, minFillAmount)) {
        throw new ValidationError(
          `Available liquidity ${possibleFillAmount} is less than minimum fill amount ${minFillAmount}`,
          ErrorCode.VALIDATION_ERROR
        );
      }

      return {
        fillAmount: possibleFillAmount,
        fillRate: currentRate
      };
    });
  }

  /**
   * Validate auction parameters
   */
  static validateAuctionParams(params: AuctionParams): void {
    ErrorHandler.withErrorHandling(() => {
      if (params.duration !== undefined) {
        ParamValidator.validatePositiveNumber(params.duration, 'duration');
        if (params.duration < AuctionService.MIN_AUCTION_DURATION || 
            params.duration > AuctionService.MAX_AUCTION_DURATION) {
          throw new ValidationError(
            `Duration must be between ${AuctionService.MIN_AUCTION_DURATION} and ${AuctionService.MAX_AUCTION_DURATION} seconds`,
            ErrorCode.VALIDATION_ERROR
          );
        }
      }

      if (params.startRateMultiplier !== undefined) {
        ParamValidator.validatePositiveNumber(params.startRateMultiplier, 'startRateMultiplier');
        if (params.startRateMultiplier <= 1) {
          throw new ValidationError(
            'Start rate multiplier must be greater than 1',
            ErrorCode.VALIDATION_ERROR
          );
        }
      }

      if (params.endRateMultiplier !== undefined) {
        ParamValidator.validatePositiveNumber(params.endRateMultiplier, 'endRateMultiplier');
        if (params.endRateMultiplier >= 1) {
          throw new ValidationError(
            'End rate multiplier must be less than 1',
            ErrorCode.VALIDATION_ERROR
          );
        }
      }

      if (params.startRateMultiplier !== undefined && params.endRateMultiplier !== undefined) {
        if (params.startRateMultiplier <= params.endRateMultiplier) {
          throw new ValidationError(
            'Start rate multiplier must be greater than end rate multiplier',
            ErrorCode.VALIDATION_ERROR
          );
        }
      }

      if (params.minFillAmount !== undefined) {
        ParamValidator.validateAmount(params.minFillAmount, 'minFillAmount');
      }
    });
  }

  /**
   * Generate mock resolver information for testing
   * In production, this would fetch from a resolver registry
   */
  static getMockResolvers(): ResolverInfo[] {
    return [
      {
        address: '0x1234567890abcdef1234567890abcdef12345678',
        name: 'Resolver Alpha',
        reputation: 95,
        totalVolume: '1000000',
        successRate: 0.98,
        averageGasUsed: '150000',
        isActive: true
      },
      {
        address: '0xabcdef1234567890abcdef1234567890abcdef12',
        name: 'Resolver Beta',
        reputation: 88,
        totalVolume: '750000',
        successRate: 0.95,
        averageGasUsed: '140000',
        isActive: true
      },
      {
        address: '0x567890abcdef1234567890abcdef1234567890ab',
        name: 'Resolver Gamma',
        reputation: 92,
        totalVolume: '500000',
        successRate: 0.97,
        averageGasUsed: '160000',
        isActive: true
      }
    ];
  }

  /**
   * Estimate fill time based on auction parameters and market conditions
   */
  static estimateFillTime(auctionDetails: AuctionDetails): number {
    // Simple estimation: assume 60% of orders fill within first 50% of auction duration
    const estimatedFillRatio = 0.5;
    return Math.floor(auctionDetails.duration * estimatedFillRatio);
  }
}