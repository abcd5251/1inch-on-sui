/**
 * Integration test setup and utility functions
 * Used to configure test environment and provide test tools
 */

import { beforeAll, afterAll, beforeEach, afterEach } from 'bun:test';
import { DatabaseManager, getDatabaseManager } from '../../src/config/database.js';
import { RedisService } from '../../src/services/redis/redisService.js';
import { logger } from '../../src/utils/logger.js';
import { EnhancedCrossChainRelayer } from '../../src/index.js';

// Test environment configuration
export const TEST_CONFIG = {
  database: {
    path: ':memory:', // Use in-memory database for testing
  },
  redis: {
    host: process.env.REDIS_TEST_HOST || 'localhost',
    port: parseInt(process.env.REDIS_TEST_PORT || '6379'),
    db: parseInt(process.env.REDIS_TEST_DB || '1'), // Use test database
    keyPrefix: 'test:1inch:fusion:',
  },
  ethereum: {
    rpcUrl: process.env.ETHEREUM_TEST_RPC || 'http://localhost:8545',
    contractAddress: '0x1234567890123456789012345678901234567890',
    startBlock: 0,
  },
  sui: {
    rpcUrl: process.env.SUI_TEST_RPC || 'https://fullnode.testnet.sui.io:443',
    packageId: '0x1234567890123456789012345678901234567890123456789012345678901234567890',
    startCheckpoint: 0,
  },
  api: {
    port: parseInt(process.env.TEST_API_PORT || '3002'),
    baseUrl: `http://localhost:${process.env.TEST_API_PORT || '3002'}`,
  },
};

/**
 * Test data generator
 */
export class TestDataGenerator {
  static generateSwapParams() {
    const orderId = `test_order_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    
    return {
      orderId,
      maker: '0x1234567890123456789012345678901234567890',
      taker: '0x0987654321098765432109876543210987654321',
      makingAmount: '1000000000000000000', // 1 ETH
      takingAmount: '2000000000', // 2000 SUI
      makingToken: '0x0000000000000000000000000000000000000000', // ETH
      takingToken: '0x2::sui::SUI', // SUI
      sourceChain: 'ethereum',
      targetChain: 'sui',
      secretHash: '0x1234567890123456789012345678901234567890123456789012345678901234',
      timeLock: Math.floor(Date.now() / 1000) + 3600, // Expires in 1 hour
      sourceContract: '0x1234567890123456789012345678901234567890',
      targetContract: '0x1234567890123456789012345678901234567890123456789012345678901234567890',
      metadata: {
        testData: true,
        generatedAt: Date.now(),
      },
    };
  }

  static generateClientSecret() {
    return {
      secret: new Uint8Array(32).fill(1), // Test secret
      hash: '0x1234567890123456789012345678901234567890123456789012345678901234',
      alias: 'test-secret-alias',
      purpose: 'test-swap',
    };
  }

  static generateEventData(chain: 'ethereum' | 'sui', eventType: string) {
    const baseEvent = {
      id: `event_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      type: eventType,
      chainId: chain === 'ethereum' ? '1' : 'sui:testnet',
      blockNumber: Math.floor(Math.random() * 1000000),
      transactionHash: `0x${Math.random().toString(16).substr(2, 64)}`,
      logIndex: 0,
      timestamp: Math.floor(Date.now() / 1000),
      data: {},
    };

    if (chain === 'ethereum') {
      return {
        ...baseEvent,
        contractAddress: TEST_CONFIG.ethereum.contractAddress,
        data: {
          orderId: `test_order_${Date.now()}`,
          maker: '0x1234567890123456789012345678901234567890',
          amount: '1000000000000000000',
          secretHash: '0x1234567890123456789012345678901234567890123456789012345678901234',
        },
      };
    } else {
      return {
        ...baseEvent,
        data: {
          orderId: `test_order_${Date.now()}`,
          sender: '0x1234567890123456789012345678901234567890123456789012345678901234567890',
          amount: '2000000000',
          secretHash: '0x1234567890123456789012345678901234567890123456789012345678901234',
        },
      };
    }
  }
}

/**
 * Test environment manager
 */
export class TestEnvironment {
  private static instance: TestEnvironment;
  private dbManager: DatabaseManager;
  private redisService: RedisService;
  private relayer: EnhancedCrossChainRelayer;
  private isSetup = false;

  private constructor() {
    this.dbManager = getDatabaseManager();
    this.redisService = new RedisService(TEST_CONFIG.redis);
  }

  static getInstance(): TestEnvironment {
    if (!TestEnvironment.instance) {
      TestEnvironment.instance = new TestEnvironment();
    }
    return TestEnvironment.instance;
  }

  async setup(): Promise<void> {
    if (this.isSetup) {
      return;
    }

    try {
      logger.info('Setting up test environment...');

      // Initialize database
      await this.dbManager.initialize();
      
      // Initialize Redis
      await this.redisService.connect();
      
      // Clean up test data
      await this.cleanup();

      this.isSetup = true;
      logger.info('Test environment setup complete');
    } catch (error) {
      logger.error('Failed to setup test environment:', error);
      throw error;
    }
  }

  async teardown(): Promise<void> {
    if (!this.isSetup) {
      return;
    }

    try {
      logger.info('Tearing down test environment...');

      // Stop relayer
      if (this.relayer) {
        await this.relayer.stop();
      }

      // Clean up test data
      await this.cleanup();

      // Close connections
      await this.redisService.disconnect();
      await this.dbManager.close();

      this.isSetup = false;
      logger.info('Test environment teardown complete');
    } catch (error) {
      logger.error('Failed to teardown test environment:', error);
      throw error;
    }
  }

  async cleanup(): Promise<void> {
    try {
      // Clean up database
      const db = this.dbManager.getDatabase();
      const { swaps, eventLogs, metrics } = await import('../../src/schema/index.js');
      const { webhooks } = await import('../../src/schema/webhooks.js');
      
      await db.delete(swaps);
      await db.delete(eventLogs);
      await db.delete(metrics);
      await db.delete(webhooks);

      // Clean up Redis
      const client = this.redisService.getClient();
      const keys = await client.keys(`${TEST_CONFIG.redis.keyPrefix}*`);
      if (keys.length > 0) {
        await client.del(...keys);
      }

      logger.debug('Test data cleanup complete');
    } catch (error) {
      logger.error('Failed to cleanup test data:', error);
      throw error;
    }
  }

  getDatabaseManager(): DatabaseManager {
    return this.dbManager;
  }

  getRedisService(): RedisService {
    return this.redisService;
  }

  getRelayer(): EnhancedCrossChainRelayer {
    return this.relayer;
  }

  setRelayer(relayer: EnhancedCrossChainRelayer): void {
    this.relayer = relayer;
  }
}

/**
 * API test client
 */
export class ApiTestClient {
  private baseUrl: string;

  constructor(baseUrl = TEST_CONFIG.api.baseUrl) {
    this.baseUrl = baseUrl;
  }

  async request(endpoint: string, options: RequestInit = {}): Promise<Response> {
    const url = `${this.baseUrl}${endpoint}`;
    const defaultHeaders = {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${process.env.API_TOKEN || 'dev-token-change-in-production'}`,
    };

    return fetch(url, {
      ...options,
      headers: {
        ...defaultHeaders,
        ...options.headers,
      },
    });
  }

  async get(endpoint: string): Promise<Response> {
    return this.request(endpoint, { method: 'GET' });
  }

  async post(endpoint: string, data?: any): Promise<Response> {
    return this.request(endpoint, {
      method: 'POST',
      body: data ? JSON.stringify(data) : undefined,
    });
  }

  async put(endpoint: string, data?: any): Promise<Response> {
    return this.request(endpoint, {
      method: 'PUT',
      body: data ? JSON.stringify(data) : undefined,
    });
  }

  async delete(endpoint: string): Promise<Response> {
    return this.request(endpoint, { method: 'DELETE' });
  }
}

/**
 * Test assertion utilities
 */
export class TestAssertions {
  static async waitFor(
    condition: () => Promise<boolean> | boolean,
    timeout = 5000,
    interval = 100
  ): Promise<void> {
    const start = Date.now();
    
    while (Date.now() - start < timeout) {
      if (await condition()) {
        return;
      }
      await new Promise(resolve => setTimeout(resolve, interval));
    }
    
    throw new Error(`Condition not met within ${timeout}ms`);
  }

  static async eventually(
    fn: () => Promise<void>,
    timeout = 5000,
    interval = 100
  ): Promise<void> {
    const start = Date.now();
    let lastError: Error | null = null;
    
    while (Date.now() - start < timeout) {
      try {
        await fn();
        return;
      } catch (error) {
        lastError = error as Error;
        await new Promise(resolve => setTimeout(resolve, interval));
      }
    }
    
    throw lastError || new Error(`Function did not succeed within ${timeout}ms`);
  }
}

// Global test hooks
let testEnv: TestEnvironment;

beforeAll(async () => {
  testEnv = TestEnvironment.getInstance();
  await testEnv.setup();
});

afterAll(async () => {
  if (testEnv) {
    await testEnv.teardown();
  }
});

beforeEach(async () => {
  if (testEnv) {
    await testEnv.cleanup();
  }
});

export { testEnv };