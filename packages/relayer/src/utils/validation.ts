/**
 * Validation utility functions
 * Provides data validation and security checks
 */

import { logger } from './logger.js';

/**
 * Validation result interface
 */
export interface ValidationResult {
  success: boolean;
  error?: string;
  errors?: string[];
}

/**
 * Swap input validation
 */
export function validateSwapInput(input: any): ValidationResult {
  const errors: string[] = [];

  // Required field check
  const requiredFields = [
    'orderId',
    'maker',
    'makingAmount',
    'takingAmount',
    'makingToken',
    'takingToken',
    'sourceChain',
    'targetChain',
    'secretHash',
    'sourceContract',
  ];

  for (const field of requiredFields) {
    if (!input[field] || (typeof input[field] === 'string' && input[field].trim() === '')) {
      errors.push(`Missing required field: ${field}`);
    }
  }

  // Address format validation
  if (input.maker && !isValidAddress(input.maker)) {
    errors.push('Invalid maker address format');
  }

  if (input.taker && !isValidAddress(input.taker)) {
    errors.push('Invalid taker address format');
  }

  // Amount validation
  if (input.makingAmount && !isValidAmount(input.makingAmount)) {
    errors.push('Invalid making amount format');
  }

  if (input.takingAmount && !isValidAmount(input.takingAmount)) {
    errors.push('Invalid taking amount format');
  }

  // Hash validation
  if (input.secretHash && !isValidHash(input.secretHash)) {
    errors.push('Invalid secret hash format');
  }

  // Time lock validation
  if (input.timeLock !== undefined && !isValidTimeLock(input.timeLock)) {
    errors.push('Invalid time lock value');
  }

  // Chain identifier validation
  if (input.sourceChain && !isValidChainId(input.sourceChain)) {
    errors.push('Invalid source chain identifier');
  }

  if (input.targetChain && !isValidChainId(input.targetChain)) {
    errors.push('Invalid target chain identifier');
  }

  return {
    success: errors.length === 0,
    errors: errors.length > 0 ? errors : undefined,
    error: errors.length > 0 ? errors.join('; ') : undefined,
  };
}

/**
 * Validate Ethereum address
 */
export function isValidEthereumAddress(address: string): boolean {
  // Basic format check
  if (!/^0x[a-fA-F0-9]{40}$/.test(address)) {
    return false;
  }

  // Can add checksum validation (EIP-55)
  return true;
}

/**
 * Validate Sui address
 */
export function isValidSuiAddress(address: string): boolean {
  // Sui addresses are typically 64-character hexadecimal strings starting with 0x
  if (!/^0x[a-fA-F0-9]{64}$/.test(address)) {
    return false;
  }

  return true;
}

/**
 * Generic address validation
 */
export function isValidAddress(address: string): boolean {
  if (!address || typeof address !== 'string') {
    return false;
  }

  // Try Ethereum address format
  if (isValidEthereumAddress(address)) {
    return true;
  }

  // Try Sui address format
  if (isValidSuiAddress(address)) {
    return true;
  }

  return false;
}

/**
 * Validate amount string
 */
export function isValidAmount(amount: string): boolean {
  if (!amount || typeof amount !== 'string') {
    return false;
  }

  // Check if it's a valid numeric string
  if (!/^\d+$/.test(amount)) {
    return false;
  }

  // Check if it's a positive number
  try {
    const num = BigInt(amount);
    return num > 0n;
  } catch {
    return false;
  }
}

/**
 * Validate hash format
 */
export function isValidHash(hash: string): boolean {
  if (!hash || typeof hash !== 'string') {
    return false;
  }

  // 32-byte hash, 64 hexadecimal characters
  return /^0x[a-fA-F0-9]{64}$/.test(hash);
}

/**
 * Validate time lock
 */
export function isValidTimeLock(timeLock: number): boolean {
  if (typeof timeLock !== 'number') {
    return false;
  }

  // Time lock should be a positive integer and not too large
  const now = Math.floor(Date.now() / 1000);
  const maxTimeLock = now + (365 * 24 * 3600); // Maximum one year

  return timeLock > 0 && timeLock <= maxTimeLock;
}

/**
 * Validate chain identifier
 */
export function isValidChainId(chainId: string): boolean {
  if (!chainId || typeof chainId !== 'string') {
    return false;
  }

  // Supported chain identifiers
  const supportedChains = [
    'ethereum',
    'ethereum-goerli',
    'ethereum-sepolia',
    'sui',
    'sui-testnet',
    'sui-devnet',
  ];

  return supportedChains.includes(chainId.toLowerCase());
}

/**
 * Validate transaction hash
 */
export function isValidTransactionHash(hash: string, chainType: 'ethereum' | 'sui'): boolean {
  if (!hash || typeof hash !== 'string') {
    return false;
  }

  switch (chainType) {
    case 'ethereum':
      // Ethereum transaction hash is 32 bytes
      return /^0x[a-fA-F0-9]{64}$/.test(hash);
    
    case 'sui':
      // Sui transaction hash is also 32 bytes
      return /^0x[a-fA-F0-9]{64}$/.test(hash);
    
    default:
      return false;
  }
}

/**
 * Validate URL format
 */
export function isValidUrl(url: string): boolean {
  try {
    new URL(url);
    return true;
  } catch {
    return false;
  }
}

/**
 * Validate email format
 */
export function isValidEmail(email: string): boolean {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
}

/**
 * Clean and validate string input
 */
export function sanitizeString(input: string, maxLength: number = 1000): string {
  if (typeof input !== 'string') {
    return '';
  }

  // Remove control characters and extra spaces
  let cleaned = input.replace(/[\x00-\x1F\x7F]/g, '').trim();
  
  // Limit length
  if (cleaned.length > maxLength) {
    cleaned = cleaned.substring(0, maxLength);
  }

  return cleaned;
}

/**
 * Validate JSON string
 */
export function isValidJSON(jsonString: string): boolean {
  try {
    JSON.parse(jsonString);
    return true;
  } catch {
    return false;
  }
}

/**
 * Validate number range
 */
export function isInRange(value: number, min: number, max: number): boolean {
  return typeof value === 'number' && value >= min && value <= max;
}

/**
 * Validate private key format
 */
export function isValidPrivateKey(key: string): boolean {
  if (!key || typeof key !== 'string') {
    return false;
  }

  // 32-byte private key, 64 hexadecimal characters (optional 0x prefix)
  return /^(0x)?[a-fA-F0-9]{64}$/.test(key);
}

/**
 * Validate signature format
 */
export function isValidSignature(signature: string): boolean {
  if (!signature || typeof signature !== 'string') {
    return false;
  }

  // Ethereum signatures are typically 65 bytes (130 hexadecimal characters)
  return /^0x[a-fA-F0-9]{130}$/.test(signature);
}

/**
 * Batch validation
 */
export function validateBatch<T>(
  items: T[],
  validator: (item: T) => ValidationResult
): ValidationResult {
  const allErrors: string[] = [];

  for (let i = 0; i < items.length; i++) {
    const result = validator(items[i]);
    if (!result.success) {
      const itemErrors = result.errors || [result.error || 'Validation failed'];
      allErrors.push(...itemErrors.map(error => `Item ${i + 1}: ${error}`));
    }
  }

  return {
    success: allErrors.length === 0,
    errors: allErrors.length > 0 ? allErrors : undefined,
    error: allErrors.length > 0 ? allErrors.join('; ') : undefined,
  };
}

/**
 * Security validation - Check for potentially malicious input
 */
export function validateSecurity(input: any): ValidationResult {
  const errors: string[] = [];

  // Check SQL injection patterns
  if (typeof input === 'string') {
    const sqlPatterns = [
      /('|(\')).*(;|=|--)/i,
      /(union|select|insert|update|delete|drop|create|alter|exec|execute)/i,
    ];

    for (const pattern of sqlPatterns) {
      if (pattern.test(input)) {
        errors.push('Potentially malicious SQL pattern detected');
        logger.security('SQL injection attempt detected', { input });
        break;
      }
    }
  }

  // Check XSS patterns
  if (typeof input === 'string') {
    const xssPatterns = [
      /<script/i,
      /javascript:/i,
      /on\w+=/i,
      /<iframe/i,
    ];

    for (const pattern of xssPatterns) {
      if (pattern.test(input)) {
        errors.push('Potentially malicious XSS pattern detected');
        logger.security('XSS attempt detected', { input });
        break;
      }
    }
  }

  return {
    success: errors.length === 0,
    errors: errors.length > 0 ? errors : undefined,
    error: errors.length > 0 ? errors.join('; ') : undefined,
  };
}