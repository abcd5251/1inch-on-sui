/**
 * Performance and Load Tests
 * Tests system performance under high load
 */

import { describe, it, expect, beforeEach } from 'bun:test';
import { TestDataGenerator, ApiTestClient, testEnv } from '../integration/setup.js';

interface PerformanceMetrics {
  requests: number;
  duration: number;
  avgResponseTime: number;
  minResponseTime: number;
  maxResponseTime: number;
  successRate: number;
  throughput: number; // requests per second
  errors: string[];
}

class PerformanceTester {
  private apiClient: ApiTestClient;
  private metrics: PerformanceMetrics;

  constructor() {
    this.apiClient = new ApiTestClient();
    this.resetMetrics();
  }

  private resetMetrics(): void {
    this.metrics = {
      requests: 0,
      duration: 0,
      avgResponseTime: 0,
      minResponseTime: Infinity,
      maxResponseTime: 0,
      successRate: 0,
      throughput: 0,
      errors: [],
    };
  }

  /**
   * Run load test
   */
  async runLoadTest(
    requestCount: number,
    concurrency: number,
    requestFn: () => Promise<Response>
  ): Promise<PerformanceMetrics> {
    this.resetMetrics();
    const startTime = Date.now();
    
    const responseTimes: number[] = [];
    const errors: string[] = [];
    let successCount = 0;

    // Create concurrent request batches
    const batches = Math.ceil(requestCount / concurrency);
    
    for (let batch = 0; batch < batches; batch++) {
      const batchSize = Math.min(concurrency, requestCount - batch * concurrency);
      const promises: Promise<void>[] = [];

      for (let i = 0; i < batchSize; i++) {
        promises.push(
          this.executeRequest(requestFn, responseTimes, errors).then(success => {
            if (success) successCount++;
          })
        );
      }

      await Promise.all(promises);
    }

    const endTime = Date.now();
    const totalDuration = endTime - startTime;

    // Calculate metrics
    this.metrics = {
      requests: requestCount,
      duration: totalDuration,
      avgResponseTime: responseTimes.length > 0 ? responseTimes.reduce((a, b) => a + b, 0) / responseTimes.length : 0,
      minResponseTime: responseTimes.length > 0 ? Math.min(...responseTimes) : 0,
      maxResponseTime: responseTimes.length > 0 ? Math.max(...responseTimes) : 0,
      successRate: (successCount / requestCount) * 100,
      throughput: (successCount / totalDuration) * 1000,
      errors,
    };

    return this.metrics;
  }

  private async executeRequest(
    requestFn: () => Promise<Response>,
    responseTimes: number[],
    errors: string[]
  ): Promise<boolean> {
    const startTime = Date.now();
    
    try {
      const response = await requestFn();
      const responseTime = Date.now() - startTime;
      responseTimes.push(responseTime);
      
      return response.ok;
    } catch (error) {
      const responseTime = Date.now() - startTime;
      responseTimes.push(responseTime);
      errors.push(error instanceof Error ? error.message : 'Unknown error');
      return false;
    }
  }

  /**
   * Run concurrency test
   */
  async runConcurrencyTest(
    concurrencyLevels: number[],
    requestFn: () => Promise<Response>
  ): Promise<Map<number, PerformanceMetrics>> {
    const results = new Map<number, PerformanceMetrics>();

    for (const concurrency of concurrencyLevels) {
      console.log(`Running concurrency test with ${concurrency} concurrent requests...`);
      
      const metrics = await this.runLoadTest(concurrency * 2, concurrency, requestFn);
      results.set(concurrency, metrics);
      
      // Wait briefly between different concurrency levels
      await new Promise(resolve => setTimeout(resolve, 1000));
    }

    return results;
  }

  /**
   * Run stress test
   */
  async runStressTest(
    duration: number, // Test duration (milliseconds)
    rampUpTime: number, // Ramp-up time (milliseconds)
    maxConcurrency: number,
    requestFn: () => Promise<Response>
  ): Promise<PerformanceMetrics[]> {
    const results: PerformanceMetrics[] = [];
    const interval = 1000; // Record metrics every second
    const rampUpInterval = rampUpTime / maxConcurrency;

    let currentConcurrency = 1;
    let activeRequests = 0;
    let totalRequests = 0;
    let successfulRequests = 0;
    const errors: string[] = [];

    const startTime = Date.now();
    let lastMetricsTime = startTime;

    // Start stress test
    const stressTestPromise = new Promise<void>((resolve) => {
      const rampUpIntervalId = setInterval(() => {
        if (currentConcurrency < maxConcurrency) {
          currentConcurrency++;
        }
      }, rampUpInterval);

      const metricsIntervalId = setInterval(() => {
        const now = Date.now();
        const intervalDuration = now - lastMetricsTime;
        
        results.push({
          requests: totalRequests,
          duration: now - startTime,
          avgResponseTime: 0, // Simplified in stress test
          minResponseTime: 0,
          maxResponseTime: 0,
          successRate: totalRequests > 0 ? (successfulRequests / totalRequests) * 100 : 0,
          throughput: (successfulRequests / (now - startTime)) * 1000,
          errors: [...errors],
        });

        lastMetricsTime = now;
      }, interval);

      setTimeout(() => {
        clearInterval(rampUpIntervalId);
        clearInterval(metricsIntervalId);
        resolve();
      }, duration);
    });

    // Continuously send requests
    const requestLoop = async () => {
      while (Date.now() - startTime < duration) {
        if (activeRequests < currentConcurrency) {
          activeRequests++;
          totalRequests++;

          this.executeRequest(requestFn, [], errors)
            .then(success => {
              if (success) successfulRequests++;
            })
            .finally(() => {
              activeRequests--;
            });
        }

        await new Promise(resolve => setTimeout(resolve, 10));
      }
    };

    await Promise.all([stressTestPromise, requestLoop()]);
    return results;
  }

  getMetrics(): PerformanceMetrics {
    return this.metrics;
  }
}

describe('Performance and Load Tests', () => {
  let performanceTester: PerformanceTester;

  beforeEach(() => {
    performanceTester = new PerformanceTester();
  });

  describe('API Load Testing', () => {
    it('should handle moderate load on health endpoint', async () => {
      const metrics = await performanceTester.runLoadTest(
        100, // 100 requests
        10,  // 10 concurrent
        () => performanceTester['apiClient'].get('/health')
      );

      expect(metrics.successRate).toBeGreaterThan(95);
      expect(metrics.avgResponseTime).toBeLessThan(500); // Average response time < 500ms
      expect(metrics.throughput).toBeGreaterThan(50); // > 50 RPS
    });

    it('should handle high load on swap creation', async () => {
      const metrics = await performanceTester.runLoadTest(
        50, // 50 swaps
        5,  // 5 concurrent
        () => {
          const swapParams = TestDataGenerator.generateSwapParams();
          return performanceTester['apiClient'].post('/api/swaps', swapParams);
        }
      );

      expect(metrics.successRate).toBeGreaterThan(90);
      expect(metrics.avgResponseTime).toBeLessThan(1000); // Swap creation might be slower
      expect(metrics.errors.length).toBeLessThan(5);
    });

    it('should handle concurrent swap queries', async () => {
      // First create some swaps for querying
      const swaps = [];
      for (let i = 0; i < 10; i++) {
        const params = TestDataGenerator.generateSwapParams();
        const response = await performanceTester['apiClient'].post('/api/swaps', params);
        const data = await response.json();
        swaps.push(data.data);
      }

      const metrics = await performanceTester.runLoadTest(
        200, // 200 queries
        20,  // 20 concurrent
        () => {
          const randomSwap = swaps[Math.floor(Math.random() * swaps.length)];
          return performanceTester['apiClient'].get(`/api/swaps/${randomSwap.orderId}`);
        }
      );

      expect(metrics.successRate).toBeGreaterThan(98);
      expect(metrics.avgResponseTime).toBeLessThan(200);
      expect(metrics.throughput).toBeGreaterThan(100);
    });
  });

  describe('Concurrency Testing', () => {
    it('should maintain performance across different concurrency levels', async () => {
      const concurrencyLevels = [1, 5, 10, 20, 50];
      
      const results = await performanceTester.runConcurrencyTest(
        concurrencyLevels,
        () => performanceTester['apiClient'].get('/health')
      );

      // Verify performance at different concurrency levels
      concurrencyLevels.forEach(level => {
        const metrics = results.get(level);
        expect(metrics).toBeTruthy();
        expect(metrics!.successRate).toBeGreaterThan(95);
        
        // Response time should not increase significantly with concurrency
        if (level <= 20) {
          expect(metrics!.avgResponseTime).toBeLessThan(1000);
        }
      });

      // Throughput should increase with concurrency
      const throughputs = concurrencyLevels.map(level => results.get(level)!.throughput);
      expect(throughputs[4]).toBeGreaterThan(throughputs[0]); // 50 concurrent > 1 concurrent
    });
  });

  describe('Stress Testing', () => {
    it('should handle sustained load over time', async () => {
      const duration = 30000; // 30 seconds
      const rampUpTime = 10000; // Reach max concurrency within 10 seconds
      const maxConcurrency = 25;

      const metricsOverTime = await performanceTester.runStressTest(
        duration,
        rampUpTime,
        maxConcurrency,
        () => performanceTester['apiClient'].get('/health')
      );

      expect(metricsOverTime.length).toBeGreaterThan(25); // At least 30 data points

      // Check system stability
      const finalMetrics = metricsOverTime[metricsOverTime.length - 1];
      expect(finalMetrics.successRate).toBeGreaterThan(90);
      expect(finalMetrics.throughput).toBeGreaterThan(30);

      // Check performance degradation
      const midPoint = Math.floor(metricsOverTime.length / 2);
      const midMetrics = metricsOverTime[midPoint];
      const degradation = (midMetrics.throughput - finalMetrics.throughput) / midMetrics.throughput;
      expect(degradation).toBeLessThan(0.3); // Performance degradation not exceeding 30%
    });
  });

  describe('Database Performance', () => {
    it('should handle high-frequency swap operations', async () => {
      const metrics = await performanceTester.runLoadTest(
        30, // 30 operations
        3,  // 3 concurrent
        async () => {
          const params = TestDataGenerator.generateSwapParams();
          
          // Create swap
          const createResponse = await performanceTester['apiClient']
            .post('/api/swaps', params);
          
          if (!createResponse.ok) {
            throw new Error('Failed to create swap');
          }

          const createData = await createResponse.json();
          const swap = createData.data;

          // Update status
          const updateResponse = await performanceTester['apiClient']
            .put(`/api/swaps/${swap.orderId}/status`, {
              status: 'ACTIVE',
              substatus: 'processing',
            });

          return updateResponse;
        }
      );

      expect(metrics.successRate).toBeGreaterThan(85);
      expect(metrics.avgResponseTime).toBeLessThan(2000);
    });

    it('should handle large result set pagination', async () => {
      // First create a large number of swap records
      console.log('Creating test data for pagination test...');
      const createPromises = [];
      for (let i = 0; i < 100; i++) {
        const params = TestDataGenerator.generateSwapParams();
        createPromises.push(
          performanceTester['apiClient'].post('/api/swaps', params)
        );
      }
      await Promise.all(createPromises);

      // Test pagination query performance
      const metrics = await performanceTester.runLoadTest(
        50, // 50 queries
        10, // 10 concurrent
        () => {
          const page = Math.floor(Math.random() * 10) + 1;
          const limit = 20;
          return performanceTester['apiClient']
            .get(`/api/swaps?page=${page}&limit=${limit}`);
        }
      );

      expect(metrics.successRate).toBeGreaterThan(95);
      expect(metrics.avgResponseTime).toBeLessThan(500);
      expect(metrics.throughput).toBeGreaterThan(50);
    });
  });

  describe('Memory and Resource Testing', () => {
    it('should not leak memory during sustained operations', async () => {
      const initialMemory = process.memoryUsage();
      
      // Execute many operations
      for (let i = 0; i < 5; i++) {
        await performanceTester.runLoadTest(
          20,
          5,
          () => performanceTester['apiClient'].get('/health')
        );
        
        // Force garbage collection (if available)
        if (global.gc) {
          global.gc();
        }
      }

      const finalMemory = process.memoryUsage();
      
      // Memory growth should not exceed reasonable limits
      const heapGrowth = finalMemory.heapUsed - initialMemory.heapUsed;
      const heapGrowthMB = heapGrowth / 1024 / 1024;
      
      expect(heapGrowthMB).toBeLessThan(50); // Not exceeding 50MB growth
    });
  });

  describe('Error Handling Under Load', () => {
    it('should gracefully handle invalid requests under load', async () => {
      const metrics = await performanceTester.runLoadTest(
        50, // 50 requests
        10, // 10 concurrent
        () => performanceTester['apiClient'].post('/api/swaps', { invalid: 'data' })
      );

      // All requests should receive appropriate error responses (not server crashes)
      expect(metrics.errors.length).toBeLessThan(5); // Network errors should be rare
      expect(metrics.avgResponseTime).toBeLessThan(1000); // Error handling should be fast
    });

    it('should handle mixed valid and invalid requests', async () => {
      const metrics = await performanceTester.runLoadTest(
        40, // 40 requests
        8,  // 8 concurrent
        () => {
          // 50% valid requests, 50% invalid requests
          if (Math.random() > 0.5) {
            const params = TestDataGenerator.generateSwapParams();
            return performanceTester['apiClient'].post('/api/swaps', params);
          } else {
            return performanceTester['apiClient'].post('/api/swaps', { invalid: 'data' });
          }
        }
      );

      // System should handle mixed requests stably
      expect(metrics.errors.length).toBeLessThan(5);
      expect(metrics.avgResponseTime).toBeLessThan(1500);
    });
  });

  describe('Performance Benchmarks', () => {
    it('should meet minimum performance requirements', async () => {
      const healthMetrics = await performanceTester.runLoadTest(
        100, 10,
        () => performanceTester['apiClient'].get('/health')
      );

      const swapQueryMetrics = await performanceTester.runLoadTest(
        20, 5,
        () => performanceTester['apiClient'].get('/api/swaps?limit=10')
      );

      // Define performance benchmarks
      const benchmarks = {
        health: { maxAvgResponseTime: 100, minThroughput: 200, minSuccessRate: 99 },
        swapQuery: { maxAvgResponseTime: 300, minThroughput: 50, minSuccessRate: 95 },
      };

      // Verify benchmarks
      expect(healthMetrics.avgResponseTime).toBeLessThan(benchmarks.health.maxAvgResponseTime);
      expect(healthMetrics.throughput).toBeGreaterThan(benchmarks.health.minThroughput);
      expect(healthMetrics.successRate).toBeGreaterThan(benchmarks.health.minSuccessRate);

      expect(swapQueryMetrics.avgResponseTime).toBeLessThan(benchmarks.swapQuery.maxAvgResponseTime);
      expect(swapQueryMetrics.throughput).toBeGreaterThan(benchmarks.swapQuery.minThroughput);
      expect(swapQueryMetrics.successRate).toBeGreaterThan(benchmarks.swapQuery.minSuccessRate);
    });
  });
});