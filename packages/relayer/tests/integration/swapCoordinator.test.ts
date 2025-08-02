/**
 * Swap coordinator integration tests
 * Test complete lifecycle management of cross-chain swaps
 */

import { describe, it, expect, beforeEach } from 'bun:test';
import { SwapCoordinator } from '../../src/services/coordination/swapCoordinator.js';
import { SwapStatus } from '../../src/schema/index.js';
import { TestDataGenerator, testEnv, TestAssertions } from './setup.js';

describe('SwapCoordinator Integration Tests', () => {
  let swapCoordinator: SwapCoordinator;

  beforeEach(async () => {
    const dbManager = testEnv.getDatabaseManager();
    const redisService = testEnv.getRedisService();
    
    swapCoordinator = new SwapCoordinator(dbManager, redisService);
    await swapCoordinator.start();
  });

  describe('Swap Creation', () => {
    it('should create a new swap successfully', async () => {
      const swapParams = TestDataGenerator.generateSwapParams();
      
      const createdSwap = await swapCoordinator.createSwap(swapParams);
      
      expect(createdSwap).toBeTruthy();
      expect(createdSwap.id).toStartWith('swap_');
      expect(createdSwap.orderId).toBe(swapParams.orderId);
      expect(createdSwap.status).toBe(SwapStatus.PENDING);
      expect(createdSwap.maker).toBe(swapParams.maker);
      expect(createdSwap.sourceChain).toBe(swapParams.sourceChain);
      expect(createdSwap.targetChain).toBe(swapParams.targetChain);
    });

    it('should prevent duplicate order IDs', async () => {
      const swapParams = TestDataGenerator.generateSwapParams();
      
      // Create first swap
      await swapCoordinator.createSwap(swapParams);
      
      // Try to create second swap with same order ID
      await expect(swapCoordinator.createSwap(swapParams))
        .rejects.toThrow('already exists');
    });

    it('should cache created swap in Redis', async () => {
      const swapParams = TestDataGenerator.generateSwapParams();
      const redisService = testEnv.getRedisService();
      
      const createdSwap = await swapCoordinator.createSwap(swapParams);
      
      // Check Redis cache
      const cachedSwap = await swapCoordinator.getSwapFromCache(swapParams.orderId);
      expect(cachedSwap).toBeTruthy();
      expect(cachedSwap.id).toBe(createdSwap.id);
      expect(cachedSwap.orderId).toBe(swapParams.orderId);
    });

    it('should emit swapCreated event', async () => {
      const swapParams = TestDataGenerator.generateSwapParams();
      let eventEmitted = false;
      let emittedSwap;
      
      swapCoordinator.on('swapCreated', (swap) => {
        eventEmitted = true;
        emittedSwap = swap;
      });
      
      const createdSwap = await swapCoordinator.createSwap(swapParams);
      
      // Wait for event to be triggered
      await TestAssertions.waitFor(() => eventEmitted);
      
      expect(eventEmitted).toBe(true);
      expect(emittedSwap.id).toBe(createdSwap.id);
    });
  });

  describe('Swap Status Updates', () => {
    let testSwap;

    beforeEach(async () => {
      const swapParams = TestDataGenerator.generateSwapParams();
      testSwap = await swapCoordinator.createSwap(swapParams);
    });

    it('should update swap status successfully', async () => {
      const updatedSwap = await swapCoordinator.updateSwapStatus(
        testSwap.orderId,
        SwapStatus.ACTIVE,
        { substatus: 'initiated' }
      );
      
      expect(updatedSwap.status).toBe(SwapStatus.ACTIVE);
      expect(updatedSwap.substatus).toBe('initiated');
      expect(updatedSwap.updatedAt).toBeGreaterThan(testSwap.updatedAt);
    });

    it('should update cached swap in Redis', async () => {
      await swapCoordinator.updateSwapStatus(
        testSwap.orderId,
        SwapStatus.ACTIVE
      );
      
      const cachedSwap = await swapCoordinator.getSwapFromCache(testSwap.orderId);
      expect(cachedSwap.status).toBe(SwapStatus.ACTIVE);
    });

    it('should emit swapStatusChanged event', async () => {
      let eventEmitted = false;
      let emittedSwap, emittedStatus;
      
      swapCoordinator.on('swapStatusChanged', (swap, status) => {
        eventEmitted = true;
        emittedSwap = swap;
        emittedStatus = status;
      });
      
      await swapCoordinator.updateSwapStatus(
        testSwap.orderId,
        SwapStatus.ACTIVE
      );
      
      await TestAssertions.waitFor(() => eventEmitted);
      
      expect(eventEmitted).toBe(true);
      expect(emittedStatus).toBe(SwapStatus.ACTIVE);
    });

    it('should throw error for non-existent swap', async () => {
      await expect(swapCoordinator.updateSwapStatus(
        'non-existent-order-id',
        SwapStatus.ACTIVE
      )).rejects.toThrow('not found');
    });
  });

  describe('Swap Completion', () => {
    let testSwap;

    beforeEach(async () => {
      const swapParams = TestDataGenerator.generateSwapParams();
      testSwap = await swapCoordinator.createSwap(swapParams);
    });

    it('should complete swap successfully', async () => {
      const secret = '0x1234567890123456789012345678901234567890123456789012345678901234';
      const txHash = '0x' + 'a'.repeat(64);
      
      const completedSwap = await swapCoordinator.completeSwap(
        testSwap.orderId,
        secret,
        txHash
      );
      
      expect(completedSwap.status).toBe(SwapStatus.COMPLETED);
      expect(completedSwap.secret).toBe(secret);
      expect(completedSwap.targetTransactionHash).toBe(txHash);
    });

    it('should emit swapCompleted event', async () => {
      let eventEmitted = false;
      let emittedSwap;
      
      swapCoordinator.on('swapCompleted', (swap) => {
        eventEmitted = true;
        emittedSwap = swap;
      });
      
      const secret = '0x1234567890123456789012345678901234567890123456789012345678901234';
      const txHash = '0x' + 'a'.repeat(64);
      
      await swapCoordinator.completeSwap(testSwap.orderId, secret, txHash);
      
      await TestAssertions.waitFor(() => eventEmitted);
      
      expect(eventEmitted).toBe(true);
      expect(emittedSwap.status).toBe(SwapStatus.COMPLETED);
    });
  });

  describe('Swap Refund', () => {
    let testSwap;

    beforeEach(async () => {
      const swapParams = TestDataGenerator.generateSwapParams();
      testSwap = await swapCoordinator.createSwap(swapParams);
    });

    it('should refund swap successfully', async () => {
      const txHash = '0x' + 'b'.repeat(64);
      
      const refundedSwap = await swapCoordinator.refundSwap(
        testSwap.orderId,
        txHash
      );
      
      expect(refundedSwap.status).toBe(SwapStatus.REFUNDED);
      expect(refundedSwap.refundTransactionHash).toBe(txHash);
    });

    it('should emit swapRefunded event', async () => {
      let eventEmitted = false;
      let emittedSwap;
      
      swapCoordinator.on('swapRefunded', (swap) => {
        eventEmitted = true;
        emittedSwap = swap;
      });
      
      const txHash = '0x' + 'b'.repeat(64);
      await swapCoordinator.refundSwap(testSwap.orderId, txHash);
      
      await TestAssertions.waitFor(() => eventEmitted);
      
      expect(eventEmitted).toBe(true);
      expect(emittedSwap.status).toBe(SwapStatus.REFUNDED);
    });
  });

  describe('Swap Failure', () => {
    let testSwap;

    beforeEach(async () => {
      const swapParams = TestDataGenerator.generateSwapParams();
      testSwap = await swapCoordinator.createSwap(swapParams);
    });

    it('should mark swap as failed', async () => {
      const errorMessage = 'Test error message';
      const errorCode = 'TEST_ERROR';
      
      const failedSwap = await swapCoordinator.failSwap(
        testSwap.orderId,
        errorMessage,
        errorCode
      );
      
      expect(failedSwap.status).toBe(SwapStatus.FAILED);
      expect(failedSwap.errorMessage).toBe(errorMessage);
      expect(failedSwap.errorCode).toBe(errorCode);
    });

    it('should emit swapFailed event', async () => {
      let eventEmitted = false;
      let emittedSwap;
      
      swapCoordinator.on('swapFailed', (swap) => {
        eventEmitted = true;
        emittedSwap = swap;
      });
      
      await swapCoordinator.failSwap(testSwap.orderId, 'Test error', 'TEST_ERROR');
      
      await TestAssertions.waitFor(() => eventEmitted);
      
      expect(eventEmitted).toBe(true);
      expect(emittedSwap.status).toBe(SwapStatus.FAILED);
    });
  });

  describe('Cross-Chain Operations', () => {
    let testSwap;

    beforeEach(async () => {
      const swapParams = TestDataGenerator.generateSwapParams();
      testSwap = await swapCoordinator.createSwap(swapParams);
    });

    it('should initiate cross-chain swap', async () => {
      const targetChain = 'sui';
      const secretHash = '0x1234567890123456789012345678901234567890123456789012345678901234';
      
      await swapCoordinator.initiateCrossChainSwap(
        testSwap.orderId,
        targetChain,
        secretHash
      );
      
      // Check if status is updated
      const cachedSwap = await swapCoordinator.getSwapFromCache(testSwap.orderId);
      expect(cachedSwap.status).toBe(SwapStatus.ACTIVE);
      expect(cachedSwap.substatus).toBe('cross-chain-initiated');
    });

    it('should confirm cross-chain swap', async () => {
      const txHash = '0x' + 'c'.repeat(64);
      
      await swapCoordinator.confirmCrossChainSwap(testSwap.orderId, txHash);
      
      const cachedSwap = await swapCoordinator.getSwapFromCache(testSwap.orderId);
      expect(cachedSwap.status).toBe(SwapStatus.ACTIVE);
      expect(cachedSwap.substatus).toBe('cross-chain-confirmed');
      expect(cachedSwap.targetTransactionHash).toBe(txHash);
    });
  });

  describe('Statistics and Monitoring', () => {
    it('should provide accurate statistics', async () => {
      // Create multiple swaps with different statuses
      const swap1Params = TestDataGenerator.generateSwapParams();
      const swap2Params = TestDataGenerator.generateSwapParams();
      const swap3Params = TestDataGenerator.generateSwapParams();
      
      const swap1 = await swapCoordinator.createSwap(swap1Params);
      const swap2 = await swapCoordinator.createSwap(swap2Params);
      const swap3 = await swapCoordinator.createSwap(swap3Params);
      
      // Update statuses
      await swapCoordinator.updateSwapStatus(swap1.orderId, SwapStatus.ACTIVE);
      await swapCoordinator.completeSwap(
        swap2.orderId,
        '0x1234567890123456789012345678901234567890123456789012345678901234',
        '0x' + 'a'.repeat(64)
      );
      await swapCoordinator.failSwap(swap3.orderId, 'Test failure', 'TEST');
      
      const stats = await swapCoordinator.getStats();
      
      expect(stats.totalSwaps).toBe(3);
      expect(stats.activeSwaps).toBe(1);
      expect(stats.completedSwaps).toBe(1);
      expect(stats.failedSwaps).toBe(1);
      expect(stats.refundedSwaps).toBe(0);
      expect(stats.successRate).toBe(33.33333333333333); // 1/3 completed
    });

    it('should track average completion time', async () => {
      const swapParams = TestDataGenerator.generateSwapParams();
      const swap = await swapCoordinator.createSwap(swapParams);
      
      // Wait a bit before completing
      await new Promise(resolve => setTimeout(resolve, 100));
      
      await swapCoordinator.completeSwap(
        swap.orderId,
        '0x1234567890123456789012345678901234567890123456789012345678901234',
        '0x' + 'a'.repeat(64)
      );
      
      const stats = await swapCoordinator.getStats();
      expect(stats.averageCompletionTime).toBeGreaterThan(0);
    });
  });

  describe('Cleanup and Monitoring', () => {
    it('should perform monitoring tasks', async () => {
      let statsEmitted = false;
      let emittedStats;
      
      swapCoordinator.on('statsUpdated', (stats) => {
        statsEmitted = true;
        emittedStats = stats;
      });
      
      // Manually trigger monitoring task
      await swapCoordinator['performMonitoring']();
      
      await TestAssertions.waitFor(() => statsEmitted);
      
      expect(statsEmitted).toBe(true);
      expect(emittedStats).toBeTruthy();
      expect(typeof emittedStats.totalSwaps).toBe('number');
    });

    it('should handle running state correctly', async () => {
      expect(swapCoordinator.isRunning_()).toBe(true);
      
      await swapCoordinator.stop();
      expect(swapCoordinator.isRunning_()).toBe(false);
      
      await swapCoordinator.start();
      expect(swapCoordinator.isRunning_()).toBe(true);
    });
  });
});