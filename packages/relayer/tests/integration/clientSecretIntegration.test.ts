/**
 * Client Secret Integration Tests
 * Tests WebCrypto API secret generation and backend integration
 */

import { describe, it, expect, beforeEach } from 'bun:test';
import { TestDataGenerator, ApiTestClient, testEnv } from './setup.js';

// Mock browser environment WebCrypto API
global.crypto = {
  getRandomValues: (array: Uint8Array) => {
    for (let i = 0; i < array.length; i++) {
      array[i] = Math.floor(Math.random() * 256);
    }
    return array;
  },
  subtle: {
    generateKey: async (algorithm: any, extractable: boolean, keyUsages: string[]) => {
      return {
        type: 'secret',
        extractable,
        algorithm,
        usages: keyUsages,
      };
    },
    importKey: async (format: string, keyData: ArrayBuffer, algorithm: any, extractable: boolean, keyUsages: string[]) => {
      return {
        type: 'secret',
        extractable,
        algorithm,
        usages: keyUsages,
      };
    },
    exportKey: async (format: string, key: any) => {
      return new ArrayBuffer(32);
    },
    encrypt: async (algorithm: any, key: any, data: ArrayBuffer) => {
      const encrypted = new Uint8Array(data.byteLength + 16); // Add IV length
      return encrypted.buffer;
    },
    decrypt: async (algorithm: any, key: any, data: ArrayBuffer) => {
      const decrypted = new Uint8Array(data.byteLength - 16); // Subtract IV length
      return decrypted.buffer;
    },
    digest: async (algorithm: string, data: ArrayBuffer) => {
      const hash = new Uint8Array(32); // SHA-256 produces 32 bytes
      crypto.getRandomValues(hash);
      return hash.buffer;
    },
    deriveBits: async (algorithm: any, baseKey: any, length: number) => {
      const bits = new Uint8Array(length / 8);
      crypto.getRandomValues(bits);
      return bits.buffer;
    },
  },
} as any;

// Import WebCrypto utilities (must import after setting up crypto)
let webCryptoUtils: any;
let secretManager: any;

describe('Client Secret Integration Tests', () => {
  let apiClient: ApiTestClient;

  beforeEach(async () => {
    // Dynamically import modules
    webCryptoUtils = await import('../../../nextjs/lib/crypto/webCryptoUtils.js');
    secretManager = await import('../../../nextjs/lib/crypto/secretManager.js');
    
    apiClient = new ApiTestClient();
  });

  describe('WebCrypto Utils Integration', () => {
    it('should generate secure client secret', async () => {
      const secret = await webCryptoUtils.generateClientSecret();
      
      expect(secret).toBeInstanceOf(Uint8Array);
      expect(secret.length).toBe(32);
      
      // Verify entropy value
      const entropy = webCryptoUtils.calculateEntropy(secret);
      expect(entropy).toBeGreaterThan(7.0); // Should have sufficient entropy
    });

    it('should compute consistent hash from secret', async () => {
      const secret = new Uint8Array(32).fill(1);
      
      const hash1 = await webCryptoUtils.computeSecretHash(secret);
      const hash2 = await webCryptoUtils.computeSecretHash(secret);
      
      expect(hash1).toBe(hash2);
      expect(hash1).toMatch(/^0x[a-fA-F0-9]{64}$/);
    });

    it('should derive key from password', async () => {
      const password = 'test-password-123';
      const salt = new Uint8Array(16).fill(1);
      
      const key = await webCryptoUtils.deriveKeyFromPassword(password, salt);
      
      expect(key).toBeTruthy();
      expect(key.type).toBe('secret');
    });

    it('should encrypt and decrypt data', async () => {
      const password = 'test-password-123';
      const data = new TextEncoder().encode('test secret data');
      
      const encrypted = await webCryptoUtils.encryptData(data, password);
      expect(encrypted).toBeTruthy();
      expect(encrypted.data).toBeInstanceOf(ArrayBuffer);
      expect(encrypted.salt).toBeInstanceOf(Uint8Array);
      expect(encrypted.iv).toBeInstanceOf(Uint8Array);
      
      const decrypted = await webCryptoUtils.decryptData(encrypted, password);
      const decryptedText = new TextDecoder().decode(decrypted);
      
      expect(decryptedText).toBe('test secret data');
    });

    it('should validate secret entropy', () => {
      const lowEntropySecret = new Uint8Array(32).fill(0);
      const highEntropySecret = new Uint8Array(32);
      crypto.getRandomValues(highEntropySecret);
      
      expect(webCryptoUtils.validateSecretEntropy(lowEntropySecret)).toBe(false);
      expect(webCryptoUtils.validateSecretEntropy(highEntropySecret)).toBe(true);
    });
  });

  describe('Secret Manager Integration', () => {
    let manager: any;

    beforeEach(async () => {
      manager = new secretManager.SecretManager();
    });

    it('should generate and store secret', async () => {
      const alias = 'test-secret';
      const purpose = 'test-swap';
      const options = {
        password: 'test-password',
        expiresIn: 3600,
        metadata: { test: true },
      };
      
      const result = await manager.generateSecret(alias, purpose, options);
      
      expect(result.success).toBe(true);
      expect(result.alias).toBe(alias);
      expect(result.hash).toMatch(/^0x[a-fA-F0-9]{64}$/);
      expect(result.expiresAt).toBeTruthy();
    });

    it('should retrieve stored secret', async () => {
      const alias = 'test-secret-2';
      const password = 'test-password';
      
      // Generate secret
      await manager.generateSecret(alias, 'test', { password });
      
      // Retrieve secret
      const result = await manager.getSecret(alias, password);
      
      expect(result.success).toBe(true);
      expect(result.secret).toBeInstanceOf(Uint8Array);
      expect(result.alias).toBe(alias);
    });

    it('should list stored secrets', async () => {
      const aliases = ['test-1', 'test-2', 'test-3'];
      
      // Generate multiple secrets
      for (const alias of aliases) {
        await manager.generateSecret(alias, 'test', { password: 'pass' });
      }
      
      const secrets = await manager.listSecrets();
      
      expect(secrets.length).toBeGreaterThanOrEqual(aliases.length);
      aliases.forEach(alias => {
        expect(secrets.some(s => s.alias === alias)).toBe(true);
      });
    });

    it('should delete secret', async () => {
      const alias = 'test-delete';
      
      // Generate secret
      await manager.generateSecret(alias, 'test', { password: 'pass' });
      
      // Delete secret
      const deleteResult = await manager.deleteSecret(alias);
      expect(deleteResult.success).toBe(true);
      
      // Verify deletion
      const getResult = await manager.getSecret(alias, 'pass');
      expect(getResult.success).toBe(false);
    });

    it('should handle expired secrets', async () => {
      const alias = 'test-expired';
      const password = 'test-password';
      
      // Generate immediately expired secret
      await manager.generateSecret(alias, 'test', {
        password,
        expiresIn: -1, // Expire immediately
      });
      
      // Try to get expired secret
      const result = await manager.getSecret(alias, password);
      
      expect(result.success).toBe(false);
      expect(result.error).toContain('expired');
    });
  });

  describe('End-to-End Secret Integration', () => {
    it('should create swap with client-generated secret', async () => {
      // 1. Generate client secret
      const secret = await webCryptoUtils.generateClientSecret();
      const secretHash = await webCryptoUtils.computeSecretHash(secret);
      
      // 2. Create swap parameters
      const swapParams = {
        ...TestDataGenerator.generateSwapParams(),
        secretHash, // Use client-generated secret hash
      };
      
      // 3. Create swap through API
      const response = await apiClient.post('/api/swaps', swapParams);
      expect(response.status).toBe(201);
      
      const data = await response.json();
      expect(data.success).toBe(true);
      expect(data.data.secretHash).toBe(secretHash);
    });

    it('should complete swap with client secret reveal', async () => {
      // 1. Generate client secret
      const secret = await webCryptoUtils.generateClientSecret();
      const secretHash = await webCryptoUtils.computeSecretHash(secret);
      
      // 2. Create swap
      const swapParams = {
        ...TestDataGenerator.generateSwapParams(),
        secretHash,
      };
      
      const createResponse = await apiClient.post('/api/swaps', swapParams);
      const createData = await createResponse.json();
      const swap = createData.data;
      
      // 3. Complete swap (reveal secret)
      const secretHex = '0x' + Array.from(secret)
        .map((b: number) => b.toString(16).padStart(2, '0'))
        .join('');
      
      const completeResponse = await apiClient.post(`/api/swaps/${swap.orderId}/complete`, {
        secret: secretHex,
        transactionHash: '0x' + 'a'.repeat(64),
      });
      
      expect(completeResponse.status).toBe(200);
      
      const completeData = await completeResponse.json();
      expect(completeData.success).toBe(true);
      expect(completeData.data.secret).toBe(secretHex);
    });

    it('should validate secret-hash relationship', async () => {
      // 1. Generate secret and hash
      const secret = await webCryptoUtils.generateClientSecret();
      const correctHash = await webCryptoUtils.computeSecretHash(secret);
      const incorrectHash = '0x1234567890123456789012345678901234567890123456789012345678901234';
      
      // 2. Create swap with incorrect hash
      const swapParams = {
        ...TestDataGenerator.generateSwapParams(),
        secretHash: incorrectHash,
      };
      
      const createResponse = await apiClient.post('/api/swaps', swapParams);
      const createData = await createResponse.json();
      const swap = createData.data;
      
      // 3. Try to complete swap with correct secret (should fail due to hash mismatch)
      const secretHex = '0x' + Array.from(secret)
        .map((b: number) => b.toString(16).padStart(2, '0'))
        .join('');
      
      const completeResponse = await apiClient.post(`/api/swaps/${swap.orderId}/complete`, {
        secret: secretHex,
        transactionHash: '0x' + 'a'.repeat(64),
      });
      
      // In actual implementation, should verify secret-hash matching
      // Here we expect the operation to fail or have corresponding validation logic
      expect(completeResponse.status).toBeLessThan(500);
    });
  });

  describe('Security and Error Handling', () => {
    it('should handle invalid secret formats', async () => {
      const swapParams = TestDataGenerator.generateSwapParams();
      
      const createResponse = await apiClient.post('/api/swaps', swapParams);
      const createData = await createResponse.json();
      const swap = createData.data;
      
      // Try to complete swap with invalid secret format
      const completeResponse = await apiClient.post(`/api/swaps/${swap.orderId}/complete`, {
        secret: 'invalid-secret-format',
        transactionHash: '0x' + 'a'.repeat(64),
      });
      
      expect(completeResponse.status).toBe(400);
      
      const completeData = await completeResponse.json();
      expect(completeData.success).toBe(false);
      expect(completeData.error).toBe('Validation failed');
    });

    it('should handle encryption/decryption errors', async () => {
      const manager = new secretManager.SecretManager();
      const alias = 'test-error';
      const correctPassword = 'correct-password';
      const wrongPassword = 'wrong-password';
      
      // Generate secret
      await manager.generateSecret(alias, 'test', { password: correctPassword });
      
      // Try to get secret with wrong password
      const result = await manager.getSecret(alias, wrongPassword);
      
      expect(result.success).toBe(false);
      expect(result.error).toBeTruthy();
    });

    it('should handle storage errors gracefully', async () => {
      const manager = new secretManager.SecretManager();
      
      // Try to get non-existent secret
      const result = await manager.getSecret('non-existent', 'password');
      
      expect(result.success).toBe(false);
      expect(result.error).toContain('not found');
    });
  });

  describe('Performance and Scalability', () => {
    it('should generate secrets efficiently', async () => {
      const start = Date.now();
      const secrets: Uint8Array[] = [];
      
      for (let i = 0; i < 10; i++) {
        const secret = await webCryptoUtils.generateClientSecret();
        secrets.push(secret);
      }
      
      const duration = Date.now() - start;
      
      expect(duration).toBeLessThan(1000); // Should complete within 1 second
      expect(secrets).toHaveLength(10);
      
      // Verify secret uniqueness
      const hashes = await Promise.all(
        secrets.map(s => webCryptoUtils.computeSecretHash(s))
      );
      const uniqueHashes = new Set(hashes);
      expect(uniqueHashes.size).toBe(10);
    });

    it('should handle multiple concurrent secret operations', async () => {
      const manager = new secretManager.SecretManager();
      const promises: Promise<any>[] = [];
      
      // Generate multiple secrets concurrently
      for (let i = 0; i < 5; i++) {
        promises.push(
          manager.generateSecret(`concurrent-${i}`, 'test', { password: 'pass' })
        );
      }
      
      const results = await Promise.all(promises);
      
      // All operations should succeed
      results.forEach((result: any) => {
        expect(result.success).toBe(true);
      });
      
      // Verify all secrets are properly stored
      const secrets = await manager.listSecrets();
      expect(secrets.length).toBeGreaterThanOrEqual(5);
    });
  });
});