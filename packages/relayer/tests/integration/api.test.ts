/**
 * API integration tests
 * Test ElysiaJS REST API endpoints and middleware
 */

import { describe, it, expect, beforeEach } from 'bun:test';
import { SwapStatus } from '../../src/schema/index.js';
import { TestDataGenerator, ApiTestClient, testEnv, TestAssertions } from './setup.js';
import { EnhancedCrossChainRelayer } from '../../src/index.js';

describe('API Integration Tests', () => {
  let apiClient: ApiTestClient;
  let relayer: EnhancedCrossChainRelayer;

  beforeEach(async () => {
    // Create and start relayer instance
    relayer = new EnhancedCrossChainRelayer();
    testEnv.setRelayer(relayer);
    
    await relayer.initialize();
    await relayer.start();
    
    // Wait for server startup
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    apiClient = new ApiTestClient();
  });

  describe('Health Endpoints', () => {
    it('should return health status', async () => {
      const response = await apiClient.get('/health');
      expect(response.status).toBe(200);
      
      const data = await response.json();
      expect(data.success).toBe(true);
      expect(data.status).toBe('healthy');
      expect(data.timestamp).toBeTruthy();
    });

    it('should return detailed health status', async () => {
      const response = await apiClient.get('/health/detailed');
      expect(response.status).toBe(200);
      
      const data = await response.json();
      expect(data.success).toBe(true);
      expect(data.services).toBeTruthy();
      expect(data.services.database).toBeTruthy();
      expect(data.services.redis).toBeTruthy();
      expect(data.services.eventMonitor).toBeTruthy();
    });

    it('should return readiness status', async () => {
      const response = await apiClient.get('/health/ready');
      expect(response.status).toBe(200);
      
      const data = await response.json();
      expect(data.success).toBe(true);
      expect(data.ready).toBe(true);
    });

    it('should return liveness status', async () => {
      const response = await apiClient.get('/health/live');
      expect(response.status).toBe(200);
      
      const data = await response.json();
      expect(data.success).toBe(true);
      expect(data.alive).toBe(true);
    });
  });

  describe('Swaps Endpoints', () => {
    describe('POST /api/swaps', () => {
      it('should create a new swap', async () => {
        const swapParams = TestDataGenerator.generateSwapParams();
        
        const response = await apiClient.post('/api/swaps', swapParams);
        expect(response.status).toBe(201);
        
        const data = await response.json();
        expect(data.success).toBe(true);
        expect(data.data.orderId).toBe(swapParams.orderId);
        expect(data.data.status).toBe(SwapStatus.PENDING);
      });

      it('should validate required fields', async () => {
        const invalidParams = { orderId: 'test' }; // Missing required fields
        
        const response = await apiClient.post('/api/swaps', invalidParams);
        expect(response.status).toBe(400);
        
        const data = await response.json();
        expect(data.success).toBe(false);
        expect(data.error).toBe('Validation failed');
      });

      it('should prevent duplicate order IDs', async () => {
        const swapParams = TestDataGenerator.generateSwapParams();
        
        // Create first swap
        await apiClient.post('/api/swaps', swapParams);
        
        // Try to create duplicate swap
        const response = await apiClient.post('/api/swaps', swapParams);
        expect(response.status).toBe(409);
        
        const data = await response.json();
        expect(data.success).toBe(false);
        expect(data.error).toContain('already exists');
      });
    });

    describe('GET /api/swaps', () => {
      beforeEach(async () => {
        // Create some test data
        for (let i = 0; i < 5; i++) {
          const params = TestDataGenerator.generateSwapParams();
          await apiClient.post('/api/swaps', params);
        }
      });

      it('should list swaps with pagination', async () => {
        const response = await apiClient.get('/api/swaps?page=1&limit=3');
        expect(response.status).toBe(200);
        
        const data = await response.json();
        expect(data.success).toBe(true);
        expect(data.data).toHaveLength(3);
        expect(data.pagination).toBeTruthy();
        expect(data.pagination.page).toBe(1);
        expect(data.pagination.limit).toBe(3);
        expect(data.pagination.total).toBe(5);
      });

      it('should filter swaps by status', async () => {
        const response = await apiClient.get('/api/swaps?status=PENDING');
        expect(response.status).toBe(200);
        
        const data = await response.json();
        expect(data.success).toBe(true);
        expect(data.data.every(swap => swap.status === SwapStatus.PENDING)).toBe(true);
      });

      it('should filter swaps by chain', async () => {
        const response = await apiClient.get('/api/swaps?sourceChain=ethereum');
        expect(response.status).toBe(200);
        
        const data = await response.json();
        expect(data.success).toBe(true);
        expect(data.data.every(swap => swap.sourceChain === 'ethereum')).toBe(true);
      });
    });

    describe('GET /api/swaps/:orderId', () => {
      let testSwap: any;

      beforeEach(async () => {
        const swapParams = TestDataGenerator.generateSwapParams();
        const response = await apiClient.post('/api/swaps', swapParams);
        const data = await response.json();
        testSwap = data.data;
      });

      it('should get swap by order ID', async () => {
        const response = await apiClient.get(`/api/swaps/${testSwap.orderId}`);
        expect(response.status).toBe(200);
        
        const data = await response.json();
        expect(data.success).toBe(true);
        expect(data.data.orderId).toBe(testSwap.orderId);
        expect(data.data.id).toBe(testSwap.id);
      });

      it('should return 404 for non-existent swap', async () => {
        const response = await apiClient.get('/api/swaps/non-existent-order');
        expect(response.status).toBe(404);
        
        const data = await response.json();
        expect(data.success).toBe(false);
        expect(data.error).toContain('not found');
      });
    });

    describe('PUT /api/swaps/:orderId/status', () => {
      let testSwap: any;

      beforeEach(async () => {
        const swapParams = TestDataGenerator.generateSwapParams();
        const response = await apiClient.post('/api/swaps', swapParams);
        const data = await response.json();
        testSwap = data.data;
      });

      it('should update swap status', async () => {
        const updateData = {
          status: SwapStatus.ACTIVE,
          substatus: 'initiated',
        };
        
        const response = await apiClient.put(`/api/swaps/${testSwap.orderId}/status`, updateData);
        expect(response.status).toBe(200);
        
        const data = await response.json();
        expect(data.success).toBe(true);
        expect(data.data.status).toBe(SwapStatus.ACTIVE);
        expect(data.data.substatus).toBe('initiated');
      });

      it('should validate status transitions', async () => {
        const updateData = { status: 'INVALID_STATUS' };
        
        const response = await apiClient.put(`/api/swaps/${testSwap.orderId}/status`, updateData);
        expect(response.status).toBe(400);
        
        const data = await response.json();
        expect(data.success).toBe(false);
        expect(data.error).toBe('Validation failed');
      });
    });

    describe('POST /api/swaps/:orderId/complete', () => {
      let testSwap: any;

      beforeEach(async () => {
        const swapParams = TestDataGenerator.generateSwapParams();
        const response = await apiClient.post('/api/swaps', swapParams);
        const data = await response.json();
        testSwap = data.data;
      });

      it('should complete swap with secret', async () => {
        const completeData = {
          secret: '0x1234567890123456789012345678901234567890123456789012345678901234',
          transactionHash: '0x' + 'a'.repeat(64),
        };
        
        const response = await apiClient.post(`/api/swaps/${testSwap.orderId}/complete`, completeData);
        expect(response.status).toBe(200);
        
        const data = await response.json();
        expect(data.success).toBe(true);
        expect(data.data.status).toBe(SwapStatus.COMPLETED);
        expect(data.data.secret).toBe(completeData.secret);
        expect(data.data.targetTransactionHash).toBe(completeData.transactionHash);
      });

      it('should validate secret format', async () => {
        const completeData = {
          secret: 'invalid-secret',
          transactionHash: '0x' + 'a'.repeat(64),
        };
        
        const response = await apiClient.post(`/api/swaps/${testSwap.orderId}/complete`, completeData);
        expect(response.status).toBe(400);
        
        const data = await response.json();
        expect(data.success).toBe(false);
        expect(data.error).toBe('Validation failed');
      });
    });

    describe('POST /api/swaps/:orderId/refund', () => {
      let testSwap: any;

      beforeEach(async () => {
        const swapParams = TestDataGenerator.generateSwapParams();
        const response = await apiClient.post('/api/swaps', swapParams);
        const data = await response.json();
        testSwap = data.data;
      });

      it('should refund swap', async () => {
        const refundData = {
          transactionHash: '0x' + 'b'.repeat(64),
        };
        
        const response = await apiClient.post(`/api/swaps/${testSwap.orderId}/refund`, refundData);
        expect(response.status).toBe(200);
        
        const data = await response.json();
        expect(data.success).toBe(true);
        expect(data.data.status).toBe(SwapStatus.REFUNDED);
        expect(data.data.refundTransactionHash).toBe(refundData.transactionHash);
      });
    });

    describe('GET /api/swaps/stats', () => {
      beforeEach(async () => {
        // Create swaps with different statuses
        const params1 = TestDataGenerator.generateSwapParams();
        const params2 = TestDataGenerator.generateSwapParams();
        const params3 = TestDataGenerator.generateSwapParams();
        
        await apiClient.post('/api/swaps', params1);
        const response2 = await apiClient.post('/api/swaps', params2);
        const response3 = await apiClient.post('/api/swaps', params3);
        
        const swap2 = (await response2.json()).data;
        const swap3 = (await response3.json()).data;
        
        // Complete one swap
        await apiClient.post(`/api/swaps/${swap2.orderId}/complete`, {
          secret: '0x1234567890123456789012345678901234567890123456789012345678901234',
          transactionHash: '0x' + 'a'.repeat(64),
        });
        
        // Refund one swap
        await apiClient.post(`/api/swaps/${swap3.orderId}/refund`, {
          transactionHash: '0x' + 'b'.repeat(64),
        });
      });

      it('should return swap statistics', async () => {
        const response = await apiClient.get('/api/swaps/stats');
        expect(response.status).toBe(200);
        
        const data = await response.json();
        expect(data.success).toBe(true);
        expect(data.data).toBeTruthy();
        expect(data.data.totalSwaps).toBe(3);
        expect(data.data.completedSwaps).toBe(1);
        expect(data.data.refundedSwaps).toBe(1);
        expect(typeof data.data.successRate).toBe('number');
      });
    });
  });

  describe('Metrics Endpoints', () => {
    it('should return basic metrics', async () => {
      const response = await apiClient.get('/metrics');
      expect(response.status).toBe(200);
      
      const data = await response.json();
      expect(data.success).toBe(true);
      expect(data.metrics).toBeTruthy();
      expect(data.timestamp).toBeTruthy();
    });

    it('should return detailed metrics by category', async () => {
      const response = await apiClient.get('/metrics/swaps');
      expect(response.status).toBe(200);
      
      const data = await response.json();
      expect(data.success).toBe(true);
      expect(data.metrics).toBeTruthy();
      expect(data.category).toBe('swaps');
    });

    it('should return metrics for specific time range', async () => {
      const from = Math.floor(Date.now() / 1000) - 3600; // 1 hour ago
      const to = Math.floor(Date.now() / 1000);
      
      const response = await apiClient.get(`/metrics?from=${from}&to=${to}`);
      expect(response.status).toBe(200);
      
      const data = await response.json();
      expect(data.success).toBe(true);
      expect(data.timeRange).toBeTruthy();
      expect(data.timeRange.from).toBe(from);
      expect(data.timeRange.to).toBe(to);
    });
  });

  describe('Error Handling', () => {
    it('should handle validation errors', async () => {
      const response = await apiClient.post('/api/swaps', { invalid: 'data' });
      expect(response.status).toBe(400);
      
      const data = await response.json();
      expect(data.success).toBe(false);
      expect(data.error).toBe('Validation failed');
      expect(data.details).toBeTruthy();
    });

    it('should handle not found errors', async () => {
      const response = await apiClient.get('/api/swaps/non-existent');
      expect(response.status).toBe(404);
      
      const data = await response.json();
      expect(data.success).toBe(false);
      expect(data.error).toBe('Resource not found');
    });

    it('should handle internal server errors gracefully', async () => {
      // This test may need to simulate internal errors, skip specific implementation for now
      // In actual environment, can be triggered by interrupting database connection etc.
    });
  });

  describe('Authentication and CORS', () => {
    it('should require valid bearer token', async () => {
      const clientWithoutAuth = new ApiTestClient();
      
      // Remove Authorization header
      const response = await clientWithoutAuth.request('/api/swaps', {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      });
      
      expect(response.status).toBe(401);
    });

    it('should handle CORS preflight requests', async () => {
      const response = await fetch(`${apiClient['baseUrl']}/api/swaps`, {
        method: 'OPTIONS',
        headers: {
          'Origin': 'http://localhost:3000',
          'Access-Control-Request-Method': 'POST',
          'Access-Control-Request-Headers': 'Content-Type,Authorization',
        },
      });
      
      expect(response.status).toBe(200);
      expect(response.headers.get('Access-Control-Allow-Origin')).toBeTruthy();
      expect(response.headers.get('Access-Control-Allow-Methods')).toBeTruthy();
    });
  });

  describe('Rate Limiting and Performance', () => {
    it('should handle concurrent requests', async () => {
      const promises: Promise<Response>[] = [];
      
      for (let i = 0; i < 10; i++) {
        const swapParams = TestDataGenerator.generateSwapParams();
        promises.push(apiClient.post('/api/swaps', swapParams));
      }
      
      const responses = await Promise.all(promises);
      
      // All requests should succeed
      responses.forEach(response => {
        expect(response.status).toBe(201);
      });
    });

    it('should return response within reasonable time', async () => {
      const start = Date.now();
      
      const response = await apiClient.get('/health');
      
      const duration = Date.now() - start;
      expect(duration).toBeLessThan(1000); // Should respond within 1 second
      expect(response.status).toBe(200);
    });
  });
});