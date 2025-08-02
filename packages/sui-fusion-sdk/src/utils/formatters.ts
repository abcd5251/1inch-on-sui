import { TokenInfo } from '../types';

/**
 * Token formatting utilities
 */
export class TokenFormatter {
  /**
   * Format token amount from smallest unit to human readable
   */
  static formatAmount(amount: string | number, decimals: number): string {
    const amountBN = BigInt(amount);
    const divisor = BigInt(10 ** decimals);
    const quotient = amountBN / divisor;
    const remainder = amountBN % divisor;
    
    if (remainder === 0n) {
      return quotient.toString();
    }
    
    const remainderStr = remainder.toString().padStart(decimals, '0');
    const trimmedRemainder = remainderStr.replace(/0+$/, '');
    
    return `${quotient}.${trimmedRemainder}`;
  }

  /**
   * Parse human readable amount to smallest unit
   */
  static parseAmount(amount: string, decimals: number): string {
    const [integer, decimal = ''] = amount.split('.');
    const paddedDecimal = decimal.padEnd(decimals, '0').slice(0, decimals);
    const result = BigInt(integer + paddedDecimal);
    return result.toString();
  }

  /**
   * Format amount with token symbol
   */
  static formatWithSymbol(amount: string | number, token: TokenInfo): string {
    const formatted = this.formatAmount(amount, token.decimals);
    return `${formatted} ${token.symbol}`;
  }

  /**
   * Format percentage
   */
  static formatPercentage(value: number, decimals: number = 2): string {
    return `${value.toFixed(decimals)}%`;
  }

  /**
   * Format price impact
   */
  static formatPriceImpact(impact: number): string {
    const formatted = Math.abs(impact).toFixed(2);
    const sign = impact < 0 ? '-' : '+';
    return `${sign}${formatted}%`;
  }

  /**
   * Format gas amount
   */
  static formatGas(gasAmount: string | number): string {
    const gas = typeof gasAmount === 'string' ? parseInt(gasAmount) : gasAmount;
    if (gas < 1000) {
      return gas.toString();
    } else if (gas < 1000000) {
      return `${(gas / 1000).toFixed(1)}K`;
    } else {
      return `${(gas / 1000000).toFixed(1)}M`;
    }
  }

  /**
   * Format address for display
   */
  static formatAddress(address: string, startChars: number = 6, endChars: number = 4): string {
    if (address.length <= startChars + endChars) {
      return address;
    }
    return `${address.slice(0, startChars)}...${address.slice(-endChars)}`;
  }

  /**
   * Format transaction hash
   */
  static formatTxHash(hash: string): string {
    return this.formatAddress(hash, 8, 6);
  }

  /**
   * Format timestamp to readable date
   */
  static formatTimestamp(timestamp: number): string {
    return new Date(timestamp).toLocaleString();
  }

  /**
   * Format duration in milliseconds to human readable
   */
  static formatDuration(ms: number): string {
    const seconds = Math.floor(ms / 1000);
    const minutes = Math.floor(seconds / 60);
    const hours = Math.floor(minutes / 60);
    const days = Math.floor(hours / 24);

    if (days > 0) {
      return `${days}d ${hours % 24}h`;
    } else if (hours > 0) {
      return `${hours}h ${minutes % 60}m`;
    } else if (minutes > 0) {
      return `${minutes}m ${seconds % 60}s`;
    } else {
      return `${seconds}s`;
    }
  }

  /**
   * Format rate between two tokens
   */
  static formatRate(fromAmount: string, toAmount: string, fromToken: TokenInfo, toToken: TokenInfo): string {
    const fromFormatted = this.formatAmount(fromAmount, fromToken.decimals);
    const toFormatted = this.formatAmount(toAmount, toToken.decimals);
    const rate = parseFloat(toFormatted) / parseFloat(fromFormatted);
    return `1 ${fromToken.symbol} = ${rate.toFixed(6)} ${toToken.symbol}`;
  }
}

/**
 * Number utilities
 */
export class NumberUtils {
  /**
   * Convert MIST to SUI
   */
  static mistToSui(mist: string | number): number {
    const mistBN = BigInt(mist);
    const suiBN = mistBN / BigInt(1e9);
    const remainder = mistBN % BigInt(1e9);
    return parseFloat(`${suiBN}.${remainder.toString().padStart(9, '0')}`);
  }

  /**
   * Convert SUI to MIST
   */
  static suiToMist(sui: string | number): string {
    const suiStr = sui.toString();
    const [integer, decimal = ''] = suiStr.split('.');
    const paddedDecimal = decimal.padEnd(9, '0').slice(0, 9);
    return (BigInt(integer) * BigInt(1e9) + BigInt(paddedDecimal)).toString();
  }

  /**
   * Calculate percentage
   */
  static calculatePercentage(part: number, total: number): number {
    if (total === 0) return 0;
    return (part / total) * 100;
  }

  /**
   * Calculate slippage amount
   */
  static calculateSlippageAmount(amount: string, slippagePercent: number): string {
    const amountBN = BigInt(amount);
    const slippageBN = BigInt(Math.floor(slippagePercent * 100));
    const slippageAmount = (amountBN * slippageBN) / BigInt(10000);
    return slippageAmount.toString();
  }

  /**
   * Calculate minimum amount out with slippage
   */
  static calculateMinAmountOut(expectedAmount: string, slippagePercent: number): string {
    const expectedBN = BigInt(expectedAmount);
    const slippageAmount = this.calculateSlippageAmount(expectedAmount, slippagePercent);
    const minAmount = expectedBN - BigInt(slippageAmount);
    return minAmount.toString();
  }
}