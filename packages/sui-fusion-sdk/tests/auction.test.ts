import { describe, beforeEach, it, expect, jest } from '@jest/globals';
import { AuctionService } from '../src/services/AuctionService';
import { ResolverService } from '../src/services/ResolverService';
import {
  type AuctionDetails,
  type FusionOrder,
  type ResolverInfo,
  type AuctionParams
} from '../src/types';
import { Ed25519Keypair } from '@mysten/sui/keypairs/ed25519';

/**
 * Test suite for Dutch Auction functionality
 */
describe('Dutch Auction Mechanism', () => {
  let mockAuctionDetails: AuctionDetails;
  let mockFusionOrder: FusionOrder;
  let mockResolverInfo: ResolverInfo;
  let mockTransactionBuilder: any;

  beforeEach(() => {
    // Mock auction details
    mockAuctionDetails = {
      startTime: Date.now(),
      duration: 300, // 5 minutes
      endTime: Date.now() + 300000,
      currentRate: '1.02'
    };

    // Mock fusion order
    mockFusionOrder = {
      id: 'test-order-1',
      fromToken: '0x2::sui::SUI',
      toToken: '0x...::usdc::COIN',
      fromAmount: '1000000000',
      toAmount: '2500000000',
      status: 'pending',
      createdAt: Date.now(),
      expirationTime: Date.now() + 600000,
      enableAuction: true,
      auctionDetails: mockAuctionDetails,
      minFillAmount: '100000000',
      maxFillAmount: '1000000000',
      partialFillAllowed: true,
      orderType: 'limit',
      limitPrice: '2.5',
      fillHistory: []
    };

    // Mock resolver info
    mockResolverInfo = {
      address: '0x123...abc',
      reputation: 85.5,
      successRate: 0.92,
      averageGasUsed: '2500000',
      isActive: true,
      lastActiveTime: Date.now(),
      supportedTokens: ['0x2::sui::SUI', '0x...::usdc::COIN']
    };

    // Mock transaction builder
    mockTransactionBuilder = {
      buildFillFusionOrderTransaction: jest.fn(),
      executeTransaction: jest.fn()
    };
  });

  describe('AuctionService', () => {
    describe('createAuctionDetails', () => {
      it('should create valid auction details', () => {
        const params: AuctionParams = {
          duration: 300
        };

        const details = AuctionService.createAuctionDetails('test-order');

        expect(details.startTime).toBeDefined();
        expect(details.duration).toBe(300);
        expect(details.endTime).toBeGreaterThan(details.startTime);
        expect(details.currentRate).toBeDefined();
      });

      it('should use current time as default start time', () => {
        const beforeTime = Date.now();
        
        const details = AuctionService.createAuctionDetails('test-order');
        const afterTime = Date.now();

        expect(details.startTime).toBeGreaterThanOrEqual(beforeTime);
        expect(details.startTime).toBeLessThanOrEqual(afterTime);
      });
    });

    describe('getCurrentAuctionRate', () => {
      it('should return initial rate at auction start', () => {
        const details = { ...mockAuctionDetails, startTime: Date.now() };
        const rate = AuctionService.getCurrentAuctionRate(details);
        
        expect(parseFloat(rate)).toBeGreaterThan(1.0);
      });

      it('should return lower rate as time progresses', () => {
        const startTime = Date.now() - 150000; // 2.5 minutes ago
        const details = {
          ...mockAuctionDetails,
          startTime,
          endTime: startTime + 300000
        };
        
        const rate = AuctionService.getCurrentAuctionRate(details);
        const rateNum = parseFloat(rate);
        
        expect(rateNum).toBeGreaterThan(1.0);
      });

      it('should return base rate at auction end', () => {
        const startTime = Date.now() - 300000; // 5 minutes ago
        const details = {
          ...mockAuctionDetails,
          startTime,
          endTime: startTime + 300000
        };
        
        const rate = AuctionService.getCurrentAuctionRate(details);
        
        expect(parseFloat(rate)).toBeGreaterThanOrEqual(1.0);
      });
    });

    describe('isAuctionActive', () => {
      it('should return true for active auction', () => {
        const details = {
          ...mockAuctionDetails,
          startTime: Date.now() - 60000, // 1 minute ago
          endTime: Date.now() + 240000 // 4 minutes from now
        };
        
        expect(AuctionService.isAuctionActive(details)).toBe(true);
      });

      it('should return false for expired auction', () => {
        const details = {
          ...mockAuctionDetails,
          startTime: Date.now() - 400000, // 6.67 minutes ago
          endTime: Date.now() - 100000 // 1.67 minutes ago
        };
        
        expect(AuctionService.isAuctionActive(details)).toBe(false);
      });

      it('should return false for future auction', () => {
        const details = {
          ...mockAuctionDetails,
          startTime: Date.now() + 60000, // 1 minute from now
          endTime: Date.now() + 360000 // 6 minutes from now
        };
        
        expect(AuctionService.isAuctionActive(details)).toBe(false);
      });
    });

    describe('calculateOptimalFill', () => {
      it('should calculate optimal fill amount', () => {
        const availableLiquidity = '2000000000'; // 2 SUI
        const result = AuctionService.calculateOptimalFill(mockFusionOrder, availableLiquidity);
        
        expect(result.fillAmount).toBe('1000000000'); // Full order amount
        expect(parseFloat(result.fillRate)).toBeGreaterThan(0);
      });

      it('should limit fill to available liquidity', () => {
        const availableLiquidity = '500000000'; // 0.5 SUI
        const result = AuctionService.calculateOptimalFill(mockFusionOrder, availableLiquidity);
        
        expect(result.fillAmount).toBe('500000000');
      });

      it('should respect minimum fill amount', () => {
        const availableLiquidity = '50000000'; // 0.05 SUI (below minimum)
        const result = AuctionService.calculateOptimalFill(mockFusionOrder, availableLiquidity);
        
        expect(result.fillAmount).toBe('100000000'); // Minimum fill amount
      });
    });

    describe('auction time calculations', () => {
      it('should calculate time remaining correctly', () => {
        const details = {
          ...mockAuctionDetails,
          startTime: Date.now() - 120000, // 2 minutes ago
          endTime: Date.now() + 180000 // 3 minutes from now
        };
        
        const isActive = AuctionService.isAuctionActive(details);
        
        expect(isActive).toBe(true);
      });

      it('should detect expired auction', () => {
        const details = {
          ...mockAuctionDetails,
          startTime: Date.now() - 400000,
          endTime: Date.now() - 100000
        };
        
        const isActive = AuctionService.isAuctionActive(details);
        
        expect(isActive).toBe(false);
      });
    });
  });

  describe('ResolverService', () => {
    let resolverService: ResolverService;
    let mockKeypair: Ed25519Keypair;

    beforeEach(() => {
      mockKeypair = Ed25519Keypair.generate();
      resolverService = new ResolverService(
        mockTransactionBuilder,
        mockKeypair,
        mockResolverInfo
      );
    });

    describe('analyzeOrderProfitability', () => {
      it('should analyze profitable order', () => {
        const availableLiquidity = '2000000000';
        const analysis = resolverService.analyzeOrderProfitability(
          mockFusionOrder,
          availableLiquidity
        );
        
        expect(analysis.isProfitable).toBeDefined();
        expect(analysis.expectedProfit).toBeDefined();
        expect(analysis.fillAmount).toBeDefined();
        expect(analysis.fillRate).toBeDefined();
        expect(analysis.estimatedGas).toBeDefined();
        expect(analysis.profitMargin).toBeDefined();
      });

      it('should return false for expired auction', () => {
        const expiredOrder = {
          ...mockFusionOrder,
          auctionDetails: {
            ...mockAuctionDetails,
            startTime: Date.now() - 400000,
            endTime: Date.now() - 100000,
            isActive: false
          }
        };
        
        const analysis = resolverService.analyzeOrderProfitability(
          expiredOrder,
          '2000000000'
        );
        
        expect(analysis.isProfitable).toBe(false);
        expect(analysis.expectedProfit).toBe('0');
      });
    });

    describe('getResolverStats', () => {
      it('should return resolver statistics', () => {
        const stats = resolverService.getResolverStats();
        
        expect(stats.address).toBe(mockResolverInfo.address);
        expect(stats.reputation).toBe(mockResolverInfo.reputation);
        expect(stats.successRate).toBe(mockResolverInfo.successRate);
        expect(stats.averageGasUsed).toBe(mockResolverInfo.averageGasUsed);
      });
    });

    describe('updateReputation', () => {
      it('should increase reputation on success', () => {
        const initialReputation = resolverService.getResolverStats().reputation;
        
        resolverService.updateReputation({
          success: true,
          gasUsed: '2000000',
          profitMargin: 0.15
        });
        
        const newReputation = resolverService.getResolverStats().reputation;
        expect(newReputation).toBeGreaterThan(initialReputation);
      });

      it('should decrease reputation on failure', () => {
        const initialReputation = resolverService.getResolverStats().reputation;
        
        resolverService.updateReputation({ success: false });
        
        const newReputation = resolverService.getResolverStats().reputation;
        expect(newReputation).toBeLessThan(initialReputation);
      });
    });

    describe('calculateOptimalGasPrice', () => {
      it('should return different prices for different urgency levels', () => {
        const lowGas = resolverService.calculateOptimalGasPrice('low');
        const mediumGas = resolverService.calculateOptimalGasPrice('medium');
        const highGas = resolverService.calculateOptimalGasPrice('high');
        
        expect(parseFloat(lowGas)).toBeLessThan(parseFloat(mediumGas));
        expect(parseFloat(mediumGas)).toBeLessThan(parseFloat(highGas));
      });
    });

    describe('estimateMEVProtection', () => {
      it('should estimate MEV protection for order with auction', () => {
        const analysis = resolverService.estimateMEVProtection(mockFusionOrder);
        
        expect(analysis.protectionLevel).toMatch(/^(low|medium|high)$/);
        expect(analysis.estimatedSavings).toBeDefined();
        expect(Array.isArray(analysis.riskFactors)).toBe(true);
      });

      it('should return low protection for order without auction', () => {
        const orderWithoutAuction = {
          ...mockFusionOrder,
          auctionDetails: undefined
        };
        
        const analysis = resolverService.estimateMEVProtection(orderWithoutAuction);
        
        expect(analysis.protectionLevel).toBe('low');
        expect(analysis.riskFactors).toContain('No auction mechanism');
      });
    });
  });

  describe('Integration Tests', () => {
    it('should handle complete auction lifecycle', () => {
      // Create auction
      const auctionDetails = AuctionService.createAuctionDetails('test-order');
      expect(auctionDetails.startTime).toBeDefined();
      
      // Check initial rate
      const initialRate = AuctionService.getCurrentAuctionRate(auctionDetails);
      expect(parseFloat(initialRate)).toBeGreaterThan(1.0);
      
      // Simulate time passage
      const futureDetails = {
        ...auctionDetails,
        startTime: Date.now() - 150000 // 2.5 minutes ago
      };
      
      const midRate = AuctionService.getCurrentAuctionRate(futureDetails);
      expect(parseFloat(midRate)).toBeGreaterThan(1.0);
    });

    it('should create auction details successfully', () => {
      const details = AuctionService.createAuctionDetails('test-order');
      expect(details).toBeDefined();
      expect(details.startTime).toBeGreaterThan(0);
      expect(details.endTime).toBeGreaterThan(details.startTime);
    });
  });
});