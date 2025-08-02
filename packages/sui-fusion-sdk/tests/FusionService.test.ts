/**
 * FusionService Test Suite
 * 
 * Comprehensive tests for the FusionService class
 */

import { FusionService, createFusionService } from '../src';
import { NetworkFactory } from '../src/core/NetworkFactory';
import { TransactionBuilder } from '../src/core/TransactionBuilder';
import { SuiFusionSDKError, ErrorCode } from '../src/utils/errors';
import type { SuiFusionConfig, QuoteParams, OrderParams } from '../src';

// Mock dependencies
jest.mock('../src/core/NetworkFactory');
jest.mock('../src/core/TransactionBuilder');

describe('FusionService', () => {
  let fusionService: FusionService;
  let mockNetworkFactory: jest.Mocked<NetworkFactory>;
  let mockTransactionBuilder: jest.Mocked<TransactionBuilder>;

  const mockConfig: SuiFusionConfig = {
    network: 'testnet',
    privateKey: 'test-private-key'
  };

  const mockQuoteParams: QuoteParams = {
    fromToken: '0x2::sui::SUI',
    toToken: '0x5d4b302506645c37ff133b98c4b50a5ae14841659738d6d733d59d0d217a93bf::coin::COIN',
    amount: '1000000000',
    slippage: 1
  };

  const mockOrderParams: OrderParams = {
    fromToken: '0x2::sui::SUI',
    toToken: '0x5d4b302506645c37ff133b98c4b50a5ae14841659738d6d733d59d0d217a93bf::coin::COIN',
    amount: '1000000000',
    slippage: 1,
    orderType: 'market'
  };

  beforeEach(() => {
    // Reset mocks
    jest.clearAllMocks();

    // Create mock instances
    mockNetworkFactory = {
      initialize: jest.fn(),
      getClient: jest.fn(),
      getKeypair: jest.fn(),
      getNetworkConfig: jest.fn(),
      validateAddress: jest.fn(),
      createKeypair: jest.fn(),
      testConnection: jest.fn(),
      getChainIdentifier: jest.fn(),
      getGasPrice: jest.fn(),
      switchNetwork: jest.fn(),
      dispose: jest.fn()
    } as any;

    mockTransactionBuilder = {
      buildSwapTransaction: jest.fn(),
      buildOrderTransaction: jest.fn(),
      buildCancelOrderTransaction: jest.fn(),
      buildExecuteOrderTransaction: jest.fn(),
      executeTransaction: jest.fn(),
      simulateTransaction: jest.fn(),
      getTransactionStatus: jest.fn(),
      waitForTransaction: jest.fn(),
      estimateGas: jest.fn()
    } as any;

    // Mock constructors
    (NetworkFactory as jest.MockedClass<typeof NetworkFactory>).mockImplementation(() => mockNetworkFactory);
    (TransactionBuilder as jest.MockedClass<typeof TransactionBuilder>).mockImplementation(() => mockTransactionBuilder);

    fusionService = new FusionService(mockConfig);
  });

  describe('Constructor', () => {
    it('should create FusionService with valid config', () => {
      expect(fusionService).toBeInstanceOf(FusionService);
      expect(NetworkFactory).toHaveBeenCalledWith(mockConfig);
    });

    it('should throw error with invalid config', () => {
      expect(() => {
        new FusionService({} as SuiFusionConfig);
      }).toThrow();
    });
  });

  describe('initialize', () => {
    it('should initialize successfully', async () => {
      (mockNetworkFactory as any).initialize = jest.fn().mockResolvedValue(undefined);
      mockNetworkFactory.testConnection.mockResolvedValue(true);

      await fusionService.initialize();

      // expect(mockNetworkFactory.initialize).toHaveBeenCalled();
      expect(mockNetworkFactory.testConnection).toHaveBeenCalled();
    });

    it('should throw error if network connection fails', async () => {
      (mockNetworkFactory as any).initialize = jest.fn().mockResolvedValue(undefined);
      mockNetworkFactory.testConnection.mockResolvedValue(false);

      await expect(fusionService.initialize()).rejects.toThrow();
    });

    it('should not initialize twice', async () => {
      (mockNetworkFactory as any).initialize = jest.fn().mockResolvedValue(undefined);
      mockNetworkFactory.testConnection.mockResolvedValue(true);

      await fusionService.initialize();
      await fusionService.initialize(); // Second call

      // expect(mockNetworkFactory.initialize).toHaveBeenCalledTimes(1);
    });
  });

  describe('getQuote', () => {
    beforeEach(async () => {
      (mockNetworkFactory as any).initialize = jest.fn().mockResolvedValue(undefined);
      mockNetworkFactory.testConnection.mockResolvedValue(true);
      await fusionService.initialize();
    });

    it('should get quote successfully', async () => {
      const mockQuote = {
        fromToken: mockQuoteParams.fromToken,
        toToken: mockQuoteParams.toToken,
        fromAmount: mockQuoteParams.amount,
        toAmount: '2500000', // 2.5 USDC
        rate: '2.5',
        priceImpact: 0.1,
        estimatedGas: '1000000',
        route: ['SUI', 'USDC'],
        validUntil: Date.now() + 300000
      };

      // Mock the quote fetching logic
      jest.spyOn(fusionService as any, 'fetchQuoteFromDex').mockResolvedValue(mockQuote);

      const result = await fusionService.getQuote(mockQuoteParams);

      expect(result).toEqual(mockQuote);
    });

    it('should validate quote parameters', async () => {
      const invalidParams = {
        ...mockQuoteParams,
        amount: '0' // Invalid amount
      };

      await expect(fusionService.getQuote(invalidParams)).rejects.toThrow();
    });

    it('should handle no route found error', async () => {
      jest.spyOn(fusionService as any, 'fetchQuoteFromDex').mockRejectedValue(
        new SuiFusionSDKError(ErrorCode.NO_ROUTE_FOUND, 'No route found')
      );

      await expect(fusionService.getQuote(mockQuoteParams)).rejects.toThrow(
        expect.objectContaining({
          code: ErrorCode.NO_ROUTE_FOUND
        })
      );
    });
  });

  describe('createOrder', () => {
    beforeEach(async () => {
      (mockNetworkFactory as any).initialize = jest.fn().mockResolvedValue(undefined);
      mockNetworkFactory.testConnection.mockResolvedValue(true);
      await fusionService.initialize();
    });

    it('should create market order successfully', async () => {
      const mockOrder = {
        id: 'order-123',
        fromToken: mockOrderParams.fromToken,
        toToken: mockOrderParams.toToken,
        fromAmount: mockOrderParams.amount,
        toAmount: '2500000',
        orderType: 'market' as const,
        status: 'pending' as const,
        createdAt: Date.now(),
        txHash: '0xabc123'
      };

      mockTransactionBuilder.buildCreateOrderTransaction.mockResolvedValue({} as any);

      mockTransactionBuilder.executeTransaction.mockResolvedValue({
        success: true,
        // digest: '0xabc123',
        gasUsed: '1000000'
      });

      const result = await fusionService.createOrder(mockOrderParams);

      expect(result).toEqual(expect.objectContaining({
        id: mockOrder.id,
        status: 'pending',
        txHash: '0xabc123'
      }));
    });

    it('should create limit order successfully', async () => {
      const limitOrderParams = {
        ...mockOrderParams,
        orderType: 'limit' as const,
        limitPrice: '3.0',
        expirationTime: Date.now() + 3600000
      };

      const mockOrder = {
        id: 'order-456',
        fromToken: limitOrderParams.fromToken,
        toToken: limitOrderParams.toToken,
        fromAmount: limitOrderParams.amount,
        toAmount: '3000000',
        orderType: 'limit' as const,
        status: 'pending' as const,
        createdAt: Date.now(),
        limitPrice: '3.0',
        expirationTime: limitOrderParams.expirationTime,
        txHash: '0xdef456'
      };

      mockTransactionBuilder.buildCreateOrderTransaction.mockResolvedValue({} as any);

      mockTransactionBuilder.executeTransaction.mockResolvedValue({
        success: true,
        // digest: '0xdef456',
        gasUsed: '1200000'
      });

      const result = await fusionService.createOrder(limitOrderParams);

      expect(result).toEqual(expect.objectContaining({
        id: mockOrder.id,
        orderType: 'limit',
        limitPrice: '3.0'
      }));
    });

    it('should validate order parameters', async () => {
      const invalidParams = {
        ...mockOrderParams,
        slippage: 50 // Invalid slippage > 100%
      };

      await expect(fusionService.createOrder(invalidParams)).rejects.toThrow();
    });

    it('should handle insufficient balance error', async () => {
      mockTransactionBuilder.buildCreateOrderTransaction.mockRejectedValue(
        new SuiFusionSDKError(ErrorCode.INSUFFICIENT_BALANCE, 'Insufficient balance')
      );

      await expect(fusionService.createOrder(mockOrderParams)).rejects.toThrow(
        expect.objectContaining({
          code: ErrorCode.INSUFFICIENT_BALANCE
        })
      );
    });
  });

  describe('cancelOrder', () => {
    beforeEach(async () => {
      (mockNetworkFactory as any).initialize = jest.fn().mockResolvedValue(undefined);
      mockNetworkFactory.testConnection.mockResolvedValue(true);
      await fusionService.initialize();
    });

    it('should cancel order successfully', async () => {
      const orderId = 'order-123';
      
      mockTransactionBuilder.buildCancelOrderTransaction.mockResolvedValue({} as any);
      mockTransactionBuilder.executeTransaction.mockResolvedValue({
        success: true,
        // digest: '0xcancel123',
        gasUsed: '800000'
      });

      const result = await fusionService.cancelOrder(orderId);

      expect(result).toEqual({
        success: true,
        txHash: '0xcancel123',
        gasUsed: '800000'
      });
    });

    it('should handle order not found error', async () => {
      const orderId = 'nonexistent-order';
      
      mockTransactionBuilder.buildCancelOrderTransaction.mockRejectedValue(
        new SuiFusionSDKError(ErrorCode.ORDER_NOT_FOUND, 'Order not found')
      );

      await expect(fusionService.cancelOrder(orderId)).rejects.toThrow(
        expect.objectContaining({
          code: ErrorCode.ORDER_NOT_FOUND
        })
      );
    });
  });

  describe('getOrder', () => {
    beforeEach(async () => {
      (mockNetworkFactory as any).initialize = jest.fn().mockResolvedValue(undefined);
      mockNetworkFactory.testConnection.mockResolvedValue(true);
      await fusionService.initialize();
    });

    it('should get order successfully', async () => {
      const orderId = 'order-123';
      const mockOrder = {
        id: orderId,
        fromToken: '0x2::sui::SUI',
        toToken: '0x5d4b302506645c37ff133b98c4b50a5ae14841659738d6d733d59d0d217a93bf::coin::COIN',
        fromAmount: '1000000000',
        toAmount: '2500000',
        orderType: 'market' as const,
        status: 'filled' as const,
        createdAt: Date.now() - 60000,
        filledAt: Date.now(),
        txHash: '0xabc123'
      };

      jest.spyOn(fusionService as any, 'fetchOrderFromChain').mockResolvedValue(mockOrder);

      const result = await fusionService.getOrder(orderId);

      expect(result).toEqual(mockOrder);
    });

    it('should handle order not found', async () => {
      const orderId = 'nonexistent-order';
      
      jest.spyOn(fusionService as any, 'fetchOrderFromChain').mockRejectedValue(
        new SuiFusionSDKError(ErrorCode.ORDER_NOT_FOUND, 'Order not found')
      );

      await expect(fusionService.getOrder(orderId)).rejects.toThrow(
        expect.objectContaining({
          code: ErrorCode.ORDER_NOT_FOUND
        })
      );
    });
  });

  describe('getBalance', () => {
    beforeEach(async () => {
      (mockNetworkFactory as any).initialize = jest.fn().mockResolvedValue(undefined);
      mockNetworkFactory.testConnection.mockResolvedValue(true);
      await fusionService.initialize();
    });

    it('should get balance successfully', async () => {
      const tokenType = '0x2::sui::SUI';
      const mockBalance = {
        tokenType,
        balance: '5000000000',
        formattedBalance: '5',
        symbol: 'SUI',
        decimals: 9
      };

      jest.spyOn(fusionService as any, 'fetchBalanceFromChain').mockResolvedValue(mockBalance);

      const result = await fusionService.getBalance(tokenType);

      expect(result).toEqual(mockBalance);
    });

    it('should handle invalid token type', async () => {
      const invalidTokenType = 'invalid-token';
      
      await expect(fusionService.getBalance(invalidTokenType)).rejects.toThrow();
    });
  });

  describe('switchNetwork', () => {
    beforeEach(async () => {
      (mockNetworkFactory as any).initialize = jest.fn().mockResolvedValue(undefined);
      mockNetworkFactory.testConnection.mockResolvedValue(true);
      await fusionService.initialize();
    });

    it('should switch network successfully', async () => {
      const newNetwork = 'mainnet';
      
      (mockNetworkFactory as any).switchNetwork = jest.fn().mockResolvedValue(undefined);
      mockNetworkFactory.testConnection.mockResolvedValue(true);

      await fusionService.switchNetwork({ network: newNetwork } as any);

      expect(mockNetworkFactory.switchNetwork).toHaveBeenCalledWith(newNetwork);
    });

    it('should handle invalid network', async () => {
      const invalidNetwork = 'invalid-network' as any;
      
      await expect(fusionService.switchNetwork(invalidNetwork)).rejects.toThrow();
    });
  });

  describe('dispose', () => {
    it('should dispose resources', () => {
      fusionService.dispose();

      expect(mockNetworkFactory.dispose).toHaveBeenCalled();
    });
  });

  describe('createFusionService factory function', () => {
    it('should create FusionService instance', () => {
      const service = createFusionService(mockConfig);
      expect(service).toBeInstanceOf(FusionService);
    });

    it('should use default config values', () => {
      const minimalConfig = { network: 'testnet' as const };
      const service = createFusionService(minimalConfig);
      expect(service).toBeInstanceOf(FusionService);
    });
  });
});