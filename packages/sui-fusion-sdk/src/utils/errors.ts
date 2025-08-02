import { SuiFusionError } from '../types';

/**
 * Error codes for Sui Fusion SDK
 */
export enum ErrorCode {
  // Network errors
  NETWORK_ERROR = 'NETWORK_ERROR',
  RPC_ERROR = 'RPC_ERROR',
  CONNECTION_TIMEOUT = 'CONNECTION_TIMEOUT',
  
  // Validation errors
  INVALID_ADDRESS = 'INVALID_ADDRESS',
  INVALID_AMOUNT = 'INVALID_AMOUNT',
  INVALID_TOKEN_TYPE = 'INVALID_TOKEN_TYPE',
  INVALID_SLIPPAGE = 'INVALID_SLIPPAGE',
  INVALID_NETWORK = 'INVALID_NETWORK',
  
  // Transaction errors
  INSUFFICIENT_BALANCE = 'INSUFFICIENT_BALANCE',
  INSUFFICIENT_GAS = 'INSUFFICIENT_GAS',
  TRANSACTION_FAILED = 'TRANSACTION_FAILED',
  TRANSACTION_TIMEOUT = 'TRANSACTION_TIMEOUT',
  
  // Order errors
  ORDER_NOT_FOUND = 'ORDER_NOT_FOUND',
  ORDER_EXPIRED = 'ORDER_EXPIRED',
  ORDER_CANCELLED = 'ORDER_CANCELLED',
  ORDER_ALREADY_FILLED = 'ORDER_ALREADY_FILLED',
  
  // Quote errors
  NO_ROUTE_FOUND = 'NO_ROUTE_FOUND',
  PRICE_IMPACT_TOO_HIGH = 'PRICE_IMPACT_TOO_HIGH',
  LIQUIDITY_INSUFFICIENT = 'LIQUIDITY_INSUFFICIENT',
  
  // Authentication errors
  INVALID_PRIVATE_KEY = 'INVALID_PRIVATE_KEY',
  WALLET_NOT_CONNECTED = 'WALLET_NOT_CONNECTED',
  UNAUTHORIZED = 'UNAUTHORIZED',
  
  // Configuration errors
  INVALID_CONFIG = 'INVALID_CONFIG',
  MISSING_PACKAGE_ID = 'MISSING_PACKAGE_ID',
  UNSUPPORTED_NETWORK = 'UNSUPPORTED_NETWORK',
  
  // General errors
  UNKNOWN_ERROR = 'UNKNOWN_ERROR',
  INTERNAL_ERROR = 'INTERNAL_ERROR',
  NOT_IMPLEMENTED = 'NOT_IMPLEMENTED'
}

/**
 * Base error class for Sui Fusion SDK
 */
export class SuiFusionSDKError extends Error implements SuiFusionError {
  public readonly code: string;
  public readonly details?: any;

  constructor(code: ErrorCode, message: string, details?: any) {
    super(message);
    this.name = 'SuiFusionSDKError';
    this.code = code;
    this.details = details;
    
    // Maintains proper stack trace for where our error was thrown (only available on V8)
    if (Error.captureStackTrace) {
      Error.captureStackTrace(this, SuiFusionSDKError);
    }
  }

  /**
   * Convert to plain object
   */
  toJSON(): SuiFusionError {
    return {
      code: this.code,
      message: this.message,
      details: this.details
    };
  }
}

/**
 * Network related errors
 */
export class NetworkError extends SuiFusionSDKError {
  constructor(message: string, details?: any) {
    super(ErrorCode.NETWORK_ERROR, message, details);
    this.name = 'NetworkError';
  }
}

export class RPCError extends SuiFusionSDKError {
  constructor(message: string, details?: any) {
    super(ErrorCode.RPC_ERROR, message, details);
    this.name = 'RPCError';
  }
}

/**
 * Validation related errors
 */
export class ValidationError extends SuiFusionSDKError {
  constructor(code: ErrorCode, message: string, details?: any) {
    super(code, message, details);
    this.name = 'ValidationError';
  }
}

export class InvalidAddressError extends ValidationError {
  constructor(address: string) {
    super(ErrorCode.INVALID_ADDRESS, `Invalid Sui address: ${address}`, { address });
    this.name = 'InvalidAddressError';
  }
}

export class InvalidAmountError extends ValidationError {
  constructor(amount: string) {
    super(ErrorCode.INVALID_AMOUNT, `Invalid amount: ${amount}`, { amount });
    this.name = 'InvalidAmountError';
  }
}

export class InvalidTokenTypeError extends ValidationError {
  constructor(tokenType: string) {
    super(ErrorCode.INVALID_TOKEN_TYPE, `Invalid token type: ${tokenType}`, { tokenType });
    this.name = 'InvalidTokenTypeError';
  }
}

/**
 * Transaction related errors
 */
export class TransactionError extends SuiFusionSDKError {
  constructor(code: ErrorCode, message: string, details?: any) {
    super(code, message, details);
    this.name = 'TransactionError';
  }
}

export class InsufficientBalanceError extends TransactionError {
  constructor(required: string, available: string, token: string) {
    super(
      ErrorCode.INSUFFICIENT_BALANCE,
      `Insufficient balance. Required: ${required} ${token}, Available: ${available} ${token}`,
      { required, available, token }
    );
    this.name = 'InsufficientBalanceError';
  }
}

export class InsufficientGasError extends TransactionError {
  constructor(required: string, available: string) {
    super(
      ErrorCode.INSUFFICIENT_GAS,
      `Insufficient gas. Required: ${required}, Available: ${available}`,
      { required, available }
    );
    this.name = 'InsufficientGasError';
  }
}

/**
 * Order related errors
 */
export class OrderError extends SuiFusionSDKError {
  constructor(code: ErrorCode, message: string, details?: any) {
    super(code, message, details);
    this.name = 'OrderError';
  }
}

export class OrderNotFoundError extends OrderError {
  constructor(orderId: string) {
    super(
      ErrorCode.ORDER_NOT_FOUND,
      `Order not found: ${orderId}`,
      { orderId }
    );
    this.name = 'OrderNotFoundError';
  }
}

export class OrderExpiredError extends OrderError {
  constructor(orderId: string, expirationTime: number) {
    super(
      ErrorCode.ORDER_EXPIRED,
      `Order expired: ${orderId}`,
      { orderId, expirationTime }
    );
    this.name = 'OrderExpiredError';
  }
}

/**
 * Quote related errors
 */
export class QuoteError extends SuiFusionSDKError {
  constructor(code: ErrorCode, message: string, details?: any) {
    super(code, message, details);
    this.name = 'QuoteError';
  }
}

export class NoRouteFoundError extends QuoteError {
  constructor(fromToken: string, toToken: string) {
    super(
      ErrorCode.NO_ROUTE_FOUND,
      `No route found from ${fromToken} to ${toToken}`,
      { fromToken, toToken }
    );
    this.name = 'NoRouteFoundError';
  }
}

export class PriceImpactTooHighError extends QuoteError {
  constructor(priceImpact: number, maxPriceImpact: number) {
    super(
      ErrorCode.PRICE_IMPACT_TOO_HIGH,
      `Price impact too high: ${priceImpact}% (max: ${maxPriceImpact}%)`,
      { priceImpact, maxPriceImpact }
    );
    this.name = 'PriceImpactTooHighError';
  }
}

/**
 * Error handling utilities
 */
export class ErrorHandler {
  /**
   * Wrap async function with error handling
   */
  static async withErrorHandling<T>(
    fn: () => Promise<T>,
    context: string = 'Operation'
  ): Promise<T> {
    try {
      return await fn();
    } catch (error) {
      if (error instanceof SuiFusionSDKError) {
        throw error;
      }
      
      // Convert unknown errors to SDK errors
      throw new SuiFusionSDKError(
        ErrorCode.UNKNOWN_ERROR,
        `${context} failed: ${error instanceof Error ? error.message : String(error)}`,
        { originalError: error }
      );
    }
  }

  /**
   * Parse RPC error and convert to appropriate SDK error
   */
  static parseRPCError(error: any): SuiFusionSDKError {
    if (error?.code) {
      switch (error.code) {
        case -32602:
          return new ValidationError(ErrorCode.INVALID_CONFIG, 'Invalid parameters', error);
        case -32603:
          return new RPCError('Internal RPC error', error);
        default:
          return new RPCError(`RPC error (${error.code}): ${error.message}`, error);
      }
    }
    
    if (error?.message?.includes('insufficient')) {
      if (error.message.includes('gas')) {
        return new InsufficientGasError('Unknown', 'Unknown');
      } else {
        return new InsufficientBalanceError('Unknown', 'Unknown', 'Unknown');
      }
    }
    
    return new RPCError(error?.message || 'Unknown RPC error', error);
  }

  /**
   * Check if error is retryable
   */
  static isRetryableError(error: SuiFusionSDKError): boolean {
    const retryableCodes = [
      ErrorCode.NETWORK_ERROR,
      ErrorCode.CONNECTION_TIMEOUT,
      ErrorCode.RPC_ERROR
    ];
    
    return retryableCodes.includes(error.code as ErrorCode);
  }

  /**
   * Get user-friendly error message
   */
  static getUserFriendlyMessage(error: SuiFusionSDKError): string {
    switch (error.code) {
      case ErrorCode.INSUFFICIENT_BALANCE:
        return 'You don\'t have enough tokens for this transaction.';
      case ErrorCode.INSUFFICIENT_GAS:
        return 'You don\'t have enough SUI to pay for gas fees.';
      case ErrorCode.INVALID_ADDRESS:
        return 'The provided address is not valid.';
      case ErrorCode.INVALID_AMOUNT:
        return 'The amount entered is not valid.';
      case ErrorCode.NO_ROUTE_FOUND:
        return 'No trading route found for this token pair.';
      case ErrorCode.PRICE_IMPACT_TOO_HIGH:
        return 'Price impact is too high for this trade.';
      case ErrorCode.TRANSACTION_FAILED:
        return 'Transaction failed. Please try again.';
      case ErrorCode.NETWORK_ERROR:
        return 'Network connection error. Please check your internet connection.';
      default:
        return error.message;
    }
  }
}