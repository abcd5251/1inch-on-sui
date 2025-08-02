/**
 * WebCrypto API utilities for secure client-side secret generation
 * Implements browser-based cryptographic operations for Sui Fusion Protocol
 */
import { fromHex, toHex } from "@mysten/utils";

// Cryptographic configuration constants
export const CRYPTO_CONFIG = {
  // Secret generation parameters
  SECRET_LENGTH: 32, // 256 bits
  SALT_LENGTH: 32, // 256 bits
  IV_LENGTH: 12, // 96 bits for AES-GCM

  // Key derivation parameters
  PBKDF2_ITERATIONS: 100000, // OWASP recommended minimum
  AES_KEY_LENGTH: 256,

  // Hash algorithms
  HASH_ALGORITHM: "SHA-256" as const,
  ENCRYPTION_ALGORITHM: "AES-GCM" as const,

  // Storage prefix
  STORAGE_PREFIX: "sui_fusion_",
} as const;

/**
 * Secret key pair interface
 */
export interface SecretKeyPair {
  privateKey: Uint8Array;
  publicKey: Uint8Array;
  keyId: string;
  createdAt: number;
}

/**
 * Encrypted secret data
 */
export interface EncryptedSecret {
  encryptedData: string;
  iv: string;
  salt: string;
  keyId: string;
  algorithm: string;
  iterations: number;
  createdAt: number;
}

/**
 * Secret hash result
 */
export interface SecretHash {
  hash: string;
  algorithm: string;
  preimage: Uint8Array;
}

/**
 * Check browser support for WebCrypto API
 */
export function isWebCryptoSupported(): boolean {
  return (
    typeof window !== "undefined" &&
    window.crypto &&
    window.crypto.subtle &&
    typeof window.crypto.getRandomValues === "function"
  );
}

/**
 * Generate cryptographically secure random bytes
 */
export function generateSecureRandom(length: number): Uint8Array {
  if (!isWebCryptoSupported()) {
    throw new Error("WebCrypto API not supported in this environment");
  }

  const buffer = new Uint8Array(length);
  window.crypto.getRandomValues(buffer);
  return buffer;
}

/**
 * Generate client secret value
 * Uses browser's WebCrypto API to generate high-quality random numbers
 */
export async function generateClientSecret(): Promise<Uint8Array> {
  if (!isWebCryptoSupported()) {
    throw new Error("WebCrypto API not supported in this environment");
  }

  // Generate 256-bit secure random secret
  const secret = generateSecureRandom(CRYPTO_CONFIG.SECRET_LENGTH);

  // Validate secret quality (entropy check)
  if (!validateSecretEntropy(secret)) {
    // If entropy is insufficient, regenerate
    return generateClientSecret();
  }

  return secret;
}

/**
 * Compute hash value of secret
 * Supports multiple hash algorithms, defaults to SHA-256
 */
export async function computeSecretHash(
  secret: Uint8Array,
  algorithm: string = CRYPTO_CONFIG.HASH_ALGORITHM,
): Promise<SecretHash> {
  if (!isWebCryptoSupported()) {
    throw new Error("WebCrypto API not supported in this environment");
  }

  try {
    const hashBuffer = await window.crypto.subtle.digest(algorithm, secret);
    const hashArray = new Uint8Array(hashBuffer);

    return {
      hash: toHex(hashArray),
      algorithm,
      preimage: secret.slice(), // Return copy
    };
  } catch (error) {
    throw new Error(`Failed to compute hash: ${error instanceof Error ? error.message : "Unknown error"}`);
  }
}

/**
 * Derive key for encrypted storage
 * Uses PBKDF2 to derive encryption key from user password
 */
export async function deriveEncryptionKey(password: string, salt: Uint8Array): Promise<CryptoKey> {
  if (!isWebCryptoSupported()) {
    throw new Error("WebCrypto API not supported in this environment");
  }

  try {
    // Convert password to key material
    const encoder = new TextEncoder();
    const passwordBuffer = encoder.encode(password);

    const baseKey = await window.crypto.subtle.importKey("raw", passwordBuffer, "PBKDF2", false, ["deriveKey"]);

    // Use PBKDF2 to derive AES key
    const derivedKey = await window.crypto.subtle.deriveKey(
      {
        name: "PBKDF2",
        salt: salt,
        iterations: CRYPTO_CONFIG.PBKDF2_ITERATIONS,
        hash: CRYPTO_CONFIG.HASH_ALGORITHM,
      },
      baseKey,
      {
        name: CRYPTO_CONFIG.ENCRYPTION_ALGORITHM,
        length: CRYPTO_CONFIG.AES_KEY_LENGTH,
      },
      false,
      ["encrypt", "decrypt"],
    );

    return derivedKey;
  } catch (error) {
    throw new Error(`Failed to derive encryption key: ${error instanceof Error ? error.message : "Unknown error"}`);
  }
}

/**
 * Encrypt secret data
 * Uses AES-GCM to encrypt client secret
 */
export async function encryptSecret(secret: Uint8Array, password: string): Promise<EncryptedSecret> {
  if (!isWebCryptoSupported()) {
    throw new Error("WebCrypto API not supported in this environment");
  }

  try {
    // Generate random salt and initialization vector
    const salt = generateSecureRandom(CRYPTO_CONFIG.SALT_LENGTH);
    const iv = generateSecureRandom(CRYPTO_CONFIG.IV_LENGTH);

    // Derive encryption key
    const key = await deriveEncryptionKey(password, salt);

    // Encrypt secret
    const encryptedBuffer = await window.crypto.subtle.encrypt(
      {
        name: CRYPTO_CONFIG.ENCRYPTION_ALGORITHM,
        iv: iv,
      },
      key,
      secret,
    );

    const keyId = await generateKeyId(salt, iv);

    return {
      encryptedData: toHex(new Uint8Array(encryptedBuffer)),
      iv: toHex(iv),
      salt: toHex(salt),
      keyId,
      algorithm: CRYPTO_CONFIG.ENCRYPTION_ALGORITHM,
      iterations: CRYPTO_CONFIG.PBKDF2_ITERATIONS,
      createdAt: Date.now(),
    };
  } catch (error) {
    throw new Error(`Failed to encrypt secret: ${error instanceof Error ? error.message : "Unknown error"}`);
  }
}

/**
 * Decrypt secret data
 */
export async function decryptSecret(encryptedSecret: EncryptedSecret, password: string): Promise<Uint8Array> {
  if (!isWebCryptoSupported()) {
    throw new Error("WebCrypto API not supported in this environment");
  }

  try {
    // Parse encryption parameters
    const salt = fromHex(encryptedSecret.salt);
    const iv = fromHex(encryptedSecret.iv);
    const encryptedData = fromHex(encryptedSecret.encryptedData);

    // Derive decryption key
    const key = await deriveEncryptionKey(password, salt);

    // Decrypt data
    const decryptedBuffer = await window.crypto.subtle.decrypt(
      {
        name: encryptedSecret.algorithm,
        iv: iv,
      },
      key,
      encryptedData,
    );

    return new Uint8Array(decryptedBuffer);
  } catch (error) {
    throw new Error(`Failed to decrypt secret: ${error instanceof Error ? error.message : "Unknown error"}`);
  }
}

/**
 * Generate key identifier
 */
async function generateKeyId(salt: Uint8Array, iv: Uint8Array): Promise<string> {
  const combined = new Uint8Array(salt.length + iv.length);
  combined.set(salt);
  combined.set(iv, salt.length);

  const hashBuffer = await window.crypto.subtle.digest(CRYPTO_CONFIG.HASH_ALGORITHM, combined);
  const hashArray = new Uint8Array(hashBuffer);

  return toHex(hashArray).substring(0, 16); // Use first 8 bytes as ID
}

/**
 * Validate secret entropy quality
 * Simple entropy check to ensure secret is not all zeros or repetitive patterns
 */
function validateSecretEntropy(secret: Uint8Array): boolean {
  // Check if all zeros
  const isAllZeros = secret.every(byte => byte === 0);
  if (isAllZeros) return false;

  // Check if all same value
  const firstByte = secret[0];
  const isAllSame = secret.every(byte => byte === firstByte);
  if (isAllSame) return false;

  // Simple repetitive pattern check
  if (secret.length >= 4) {
    let repeatingCount = 0;
    for (let i = 0; i < secret.length - 1; i++) {
      if (secret[i] === secret[i + 1]) {
        repeatingCount++;
      }
    }
    // If more than 50% of bytes are repetitive, consider entropy insufficient
    if (repeatingCount > secret.length * 0.5) return false;
  }

  return true;
}

/**
 * Generate secret timestamp signature
 * Used to verify secret timeliness
 */
export async function generateTimestampSignature(secret: Uint8Array, timestamp: number): Promise<string> {
  const timestampBytes = new ArrayBuffer(8);
  const view = new DataView(timestampBytes);
  view.setBigUint64(0, BigInt(timestamp), false); // big-endian

  const combined = new Uint8Array(secret.length + 8);
  combined.set(secret);
  combined.set(new Uint8Array(timestampBytes), secret.length);

  const hashBuffer = await window.crypto.subtle.digest(CRYPTO_CONFIG.HASH_ALGORITHM, combined);
  return toHex(new Uint8Array(hashBuffer));
}

/**
 * Verify secret timestamp signature
 */
export async function verifyTimestampSignature(
  secret: Uint8Array,
  timestamp: number,
  signature: string,
): Promise<boolean> {
  try {
    const expectedSignature = await generateTimestampSignature(secret, timestamp);
    return expectedSignature === signature;
  } catch {
    return false;
  }
}

/**
 * Clear sensitive data
 * Securely zero sensitive data in memory
 */
export function secureClearArray(array: Uint8Array): void {
  if (array && array.fill) {
    array.fill(0);
  }
}

/**
 * Export utility functions for testing
 */
export const testUtils = {
  validateSecretEntropy,
  generateKeyId,
};
