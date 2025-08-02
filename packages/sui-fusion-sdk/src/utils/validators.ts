import { SuiNetwork, QuoteParams, OrderParams } from '../types';
import { isValidSuiAddress } from '@mysten/sui/utils';

/**
 * Address validation utilities
 */
export class AddressValidator {
  /**
   * Validate Sui address format
   */
  static isValidAddress(address: string): boolean {
    try {
      return isValidSuiAddress(address);
    } catch {
      return false;
    }
  }

  /**
   * Validate and normalize address
   */
  static normalizeAddress(address: string): string {
    if (!this.isValidAddress(address)) {
      throw new Error(`Invalid Sui address: ${address}`);
    }
    return address.startsWith('0x') ? address : `0x${address}`;
  }

  /**
   * Validate token type format
   */
  static isValidTokenType(tokenType: string): boolean {
    // Basic validation for Sui token type format
    const tokenTypeRegex = /^0x[a-fA-F0-9]+::[a-zA-Z_][a-zA-Z0-9_]*::[a-zA-Z_][a-zA-Z0-9_]*$/;
    return tokenTypeRegex.test(tokenType);
  }

  /**
   * Validate package ID format
   */
  static isValidPackageId(packageId: string): boolean {
    return this.isValidAddress(packageId);
  }
}

/**
 * Amount validation utilities
 */
export class AmountValidator {
  /**
   * Validate amount string
   */
  static isValidAmount(amount: string): boolean {
    if (!amount || amount.trim() === '') {
      return false;
    }

    // Check if it's a valid number
    const num = parseFloat(amount);
    if (isNaN(num) || num < 0) {
      return false;
    }

    // Check for valid decimal format
    const decimalRegex = /^\d+(\.\d+)?$/;
    return decimalRegex.test(amount.trim());
  }

  /**
   * Validate amount is positive
   */
  static isPositiveAmount(amount: string): boolean {
    if (!this.isValidAmount(amount)) {
      return false;
    }
    return parseFloat(amount) > 0;
  }

  /**
   * Validate amount has valid decimal places
   */
  static hasValidDecimals(amount: string, maxDecimals: number): boolean {
    if (!this.isValidAmount(amount)) {
      return false;
    }

    const parts = amount.split('.');
    if (parts.length === 1) {
      return true; // No decimals
    }

    return parts[1].length <= maxDecimals;
  }

  /**
   * Validate minimum amount
   */
  static meetsMinimum(amount: string, minimum: string): boolean {
    if (!this.isValidAmount(amount) || !this.isValidAmount(minimum)) {
      return false;
    }
    return parseFloat(amount) >= parseFloat(minimum);
  }

  /**
   * Validate maximum amount
   */
  static meetsMaximum(amount: string, maximum: string): boolean {
    if (!this.isValidAmount(amount) || !this.isValidAmount(maximum)) {
      return false;
    }
    return parseFloat(amount) <= parseFloat(maximum);
  }
}

/**
 * Network validation utilities
 */
export class NetworkValidator {
  private static readonly SUPPORTED_NETWORKS: SuiNetwork[] = ['mainnet', 'testnet', 'devnet', 'localnet'];

  /**
   * Validate network name
   */
  static isValidNetwork(network: string): network is SuiNetwork {
    return this.SUPPORTED_NETWORKS.includes(network as SuiNetwork);
  }

  /**
   * Validate RPC URL format
   */
  static isValidRpcUrl(url: string): boolean {
    try {
      const urlObj = new URL(url);
      return ['http:', 'https:'].includes(urlObj.protocol);
    } catch {
      return false;
    }
  }
}

/**
 * Parameter validation utilities
 */
export class ParamValidator {
  /**
   * Validate quote parameters
   */
  static validateQuoteParams(params: QuoteParams): string[] {
    const errors: string[] = [];

    if (!AddressValidator.isValidTokenType(params.fromToken)) {
      errors.push('Invalid fromToken format');
    }

    if (!AddressValidator.isValidTokenType(params.toToken)) {
      errors.push('Invalid toToken format');
    }

    if (params.fromToken === params.toToken) {
      errors.push('fromToken and toToken cannot be the same');
    }

    if (!AmountValidator.isPositiveAmount(params.amount)) {
      errors.push('Amount must be a positive number');
    }

    if (params.slippage !== undefined) {
      if (typeof params.slippage !== 'number' || params.slippage < 0 || params.slippage > 100) {
        errors.push('Slippage must be a number between 0 and 100');
      }
    }

    return errors;
  }

  /**
   * Validate order parameters
   */
  static validateOrderParams(params: OrderParams): string[] {
    const errors: string[] = [];

    // Validate basic quote params
    const quoteErrors = this.validateQuoteParams(params);
    errors.push(...quoteErrors);

    if (params.expirationTime !== undefined) {
      if (typeof params.expirationTime !== 'number' || params.expirationTime <= Date.now()) {
        errors.push('Expiration time must be a future timestamp');
      }
    }

    if (params.orderType && !['market', 'limit'].includes(params.orderType)) {
      errors.push('Order type must be either "market" or "limit"');
    }

    if (params.orderType === 'limit') {
      if (!params.limitPrice || !AmountValidator.isPositiveAmount(params.limitPrice)) {
        errors.push('Limit price is required for limit orders and must be positive');
      }
    }

    return errors;
  }

  /**
   * Validate slippage percentage
   */
  static validateSlippage(slippage: number): boolean {
    return typeof slippage === 'number' && slippage >= 0 && slippage <= 100;
  }

  /**
   * Validate gas budget
   */
  static validateGasBudget(gasBudget: number): boolean {
    return typeof gasBudget === 'number' && gasBudget > 0 && gasBudget <= 1000000000; // 1 SUI max
  }

  /**
   * Validate private key format
   */
  static validatePrivateKey(privateKey: string): boolean {
    // Basic validation for hex private key
    const hexRegex = /^[0-9a-fA-F]{64}$/;
    return hexRegex.test(privateKey.replace('0x', ''));
  }
}

/**
 * General validation utilities
 */
export class ValidationUtils {
  /**
   * Validate required fields
   */
  static validateRequired<T>(obj: T, requiredFields: (keyof T)[]): string[] {
    const errors: string[] = [];
    
    for (const field of requiredFields) {
      if (obj[field] === undefined || obj[field] === null || obj[field] === '') {
        errors.push(`${String(field)} is required`);
      }
    }
    
    return errors;
  }

  /**
   * Validate object against schema
   */
  static validateSchema<T>(obj: any, schema: Record<keyof T, (value: any) => boolean>): string[] {
    const errors: string[] = [];
    
    for (const [key, validator] of Object.entries(schema)) {
      if (obj[key] !== undefined && !(validator as (value: any) => boolean)(obj[key])) {
        errors.push(`Invalid ${key}`);
      }
    }
    
    return errors;
  }

  /**
   * Throw validation error if any errors exist
   */
  static throwIfErrors(errors: string[], context: string = 'Validation'): void {
    if (errors.length > 0) {
      throw new Error(`${context} failed: ${errors.join(', ')}`);
    }
  }
}