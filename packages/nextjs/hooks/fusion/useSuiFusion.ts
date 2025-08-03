import { useCallback, useEffect, useState } from "react";
import { useCurrentAccount } from "@mysten/dapp-kit";
import {
  FusionService,
  AuctionService,
  Order,
  OrderParams,
  Quote,
  QuoteParams,
  SuiFusionConfig,
  FusionOrderParams,
  FusionOrder,
  AuctionQuote,
  AuctionParams,
  createFusionService,
} from "~~/services/fusion";
import { MockFusionService } from "~~/services/fusion/MockFusionService";
import { notification } from "~~/utils/scaffold-eth";

export interface UseSuiFusionConfig {
  network: "mainnet" | "testnet" | "devnet" | "localnet";
  rpcUrl?: string;
  packageId?: string;
  useMockService?: boolean;
}

export interface SuiFusionState {
  isInitialized: boolean;
  isLoading: boolean;
  error: string | null;
  quote: Quote | null;
  auctionQuote: AuctionQuote | null;
  lastOrder: Order | null;
  lastFusionOrder: FusionOrder | null;
  orders: Order[];
  fusionOrders: FusionOrder[];
}

export const useSuiFusion = (config: UseSuiFusionConfig) => {
  const currentAccount = useCurrentAccount();
  const [fusionService] = useState(() => {
    const sdkConfig: SuiFusionConfig = {
      network: config.network as any,
      rpcUrl: config.rpcUrl,
      packageId: config.packageId,
    };
    
    // Use mock service for demo purposes or when explicitly requested
    if (config.useMockService !== false) {
      return new MockFusionService(sdkConfig);
    }
    
    return createFusionService(sdkConfig);
  });
  const [state, setState] = useState<SuiFusionState>({
    isInitialized: false,
    isLoading: false,
    error: null,
    quote: null,
    auctionQuote: null,
    lastOrder: null,
    lastFusionOrder: null,
    orders: [],
    fusionOrders: [],
  });

  const updateState = useCallback((updates: Partial<SuiFusionState>) => {
    setState(prev => ({ ...prev, ...updates }));
  }, []);

  const handleError = useCallback(
    (error: any, operation: string) => {
      const errorMessage = error instanceof Error ? error.message : String(error);
      console.error(`Sui Fusion ${operation} error:`, error);
      updateState({ error: errorMessage, isLoading: false });
      notification.error(`${operation} failed: ${errorMessage}`);
    },
    [updateState],
  );

  const initializeWithPrivateKey = useCallback(
    async (privateKey: string) => {
      updateState({ isLoading: true, error: null });
      try {
        // The new SDK handles initialization differently
        await fusionService.initialize();
        updateState({ isInitialized: true, isLoading: false });
        notification.success("Sui Fusion service initialized successfully");
        
        // Load mock fusion orders if using mock service
        if (config.useMockService !== false) {
          await loadMockFusionOrders();
        }
      } catch (error) {
        handleError(error, "initialize");
      }
    },
    [fusionService, updateState, handleError],
  );

  const loadMockFusionOrders = useCallback(
    async () => {
      try {
        updateState({ isLoading: true, error: null });
        
        // Get all orders from mock service (which includes fusion orders)
        const ordersResponse = await fusionService.getOrders({
          limit: 50 // Get more orders for demo
        });
        
        // If it's a MockFusionService, it has fusionOrders populated
        if ((fusionService as any).mockFusionOrders) {
          const fusionOrders = (fusionService as any).mockFusionOrders || [];
          updateState({ 
            orders: ordersResponse.items || [], 
            fusionOrders: fusionOrders,
            isLoading: false 
          });
        } else {
          updateState({ 
            orders: ordersResponse.items || [], 
            isLoading: false 
          });
        }
      } catch (error) {
        handleError(error, "load mock fusion orders");
      }
    },
    [fusionService, updateState, handleError],
  );

  const getQuote = useCallback(
    async (params: QuoteParams): Promise<Quote | null> => {
      updateState({ isLoading: true, error: null });
      try {
        const quote = await fusionService.getQuote(params);
        updateState({ quote, isLoading: false });
        return quote;
      } catch (error) {
        handleError(error, "get quote");
        return null;
      }
    },
    [fusionService, updateState, handleError],
  );

  const getAuctionQuote = useCallback(
    async (params: QuoteParams, auctionParams?: AuctionParams): Promise<AuctionQuote | null> => {
      updateState({ isLoading: true, error: null });
      try {
        const auctionQuote = await fusionService.getAuctionQuote(params, auctionParams);
        updateState({ auctionQuote, isLoading: false });
        return auctionQuote;
      } catch (error) {
        handleError(error, "get auction quote");
        return null;
      }
    },
    [fusionService, updateState, handleError],
  );

  const createOrder = useCallback(
    async (params: OrderParams): Promise<Order | null> => {
      updateState({ isLoading: true, error: null });
      try {
        const order = await fusionService.createOrder(params);
        updateState({ lastOrder: order, isLoading: false });
        notification.success(`Order created successfully! Order ID: ${order.id.slice(0, 8)}...`);
        return order;
      } catch (error) {
        handleError(error, "create order");
        return null;
      }
    },
    [fusionService, updateState, handleError],
  );

  const createFusionOrder = useCallback(
    async (params: FusionOrderParams): Promise<FusionOrder | null> => {
      updateState({ isLoading: true, error: null });
      try {
        const order = await fusionService.createFusionOrder(params);
        updateState({ lastFusionOrder: order, isLoading: false });
        notification.success(`Fusion order created successfully! Order ID: ${order.id.slice(0, 8)}...`);
        return order;
      } catch (error) {
        handleError(error, "create fusion order");
        return null;
      }
    },
    [fusionService, updateState, handleError],
  );

  const getActiveOrders = useCallback(
    async (address?: string, page: number = 1, limit: number = 10) => {
      // For mock service, load all mock data
      if (config.useMockService !== false) {
        await loadMockFusionOrders();
        return { items: state.fusionOrders, total: state.fusionOrders.length, page: 1, limit: 50, hasNext: false, hasPrev: false };
      }

      const walletAddress = address || currentAccount?.address;
      if (!walletAddress) {
        handleError(new Error("No wallet address available"), "get active orders");
        return { items: [], total: 0 };
      }

      updateState({ isLoading: true, error: null });
      try {
        const ordersResponse = await fusionService.getOrders({
          maker: walletAddress,
          status: ['pending'],
          offset: (page - 1) * limit,
          limit
        });
        updateState({ orders: ordersResponse.items || [], isLoading: false });
        return ordersResponse;
      } catch (error) {
        handleError(error, "get active orders");
        return { items: [], total: 0, page: 1, limit: 10, hasNext: false, hasPrev: false };
      }
    },
    [fusionService, currentAccount, updateState, handleError, config.useMockService, loadMockFusionOrders, state.fusionOrders],
  );

  const getOrdersByMaker = useCallback(
    async (address?: string, page: number = 1, limit: number = 10) => {
      const walletAddress = address || currentAccount?.address;
      if (!walletAddress) {
        handleError(new Error("No wallet address available"), "get orders by maker");
        return { items: [], total: 0, page: 1, limit: 10, hasNext: false, hasPrev: false };
      }

      updateState({ isLoading: true, error: null });
      try {
        const ordersResponse = await fusionService.getOrders({
          maker: walletAddress,
          offset: (page - 1) * limit,
          limit
        });
        updateState({ orders: ordersResponse.items || [], isLoading: false });
        return ordersResponse;
      } catch (error) {
        handleError(error, "get orders by maker");
        return { items: [], total: 0, page: 1, limit: 10, hasNext: false, hasPrev: false };
      }
    },
    [fusionService, currentAccount, updateState, handleError],
  );

  const getWalletAddress = useCallback(() => {
    try {
      return fusionService.getAddress();
    } catch (error) {
      console.warn("Wallet not connected or initialized");
      return "";
    }
  }, [fusionService]);

  const getNetworkInfo = useCallback(() => {
    return fusionService.getNetworkInfo();
  }, [fusionService]);

  const isServiceInitialized = useCallback(() => {
    return fusionService.isInitialized();
  }, [fusionService]);

  const isWalletConnected = useCallback(() => {
    return fusionService.isWalletConnected();
  }, [fusionService]);

  const getBalance = useCallback(
    async (tokenType: string, address?: string) => {
      try {
        return await fusionService.getBalance(tokenType, address);
      } catch (error) {
        handleError(error, "get balance");
        return null;
      }
    },
    [fusionService, handleError],
  );

  const getAllBalances = useCallback(
    async (address?: string) => {
      try {
        return await fusionService.getAllBalances(address);
      } catch (error) {
        handleError(error, "get all balances");
        return [];
      }
    },
    [fusionService, handleError],
  );

  // Auto-initialize mock service and load orders
  useEffect(() => {
    if (config.useMockService !== false && !state.isInitialized) {
      initializeWithPrivateKey("demo-key");
    }
  }, [config.useMockService, state.isInitialized, initializeWithPrivateKey]);

  // Auto-load orders when account changes
  useEffect(() => {
    if (currentAccount?.address && state.isInitialized) {
      getActiveOrders(currentAccount.address);
    }
  }, [currentAccount?.address, state.isInitialized, getActiveOrders]);

  return {
    // State
    ...state,

    // Core Actions
    initializeWithPrivateKey,
    getQuote,
    getAuctionQuote,
    createOrder,
    createFusionOrder,
    getActiveOrders,
    getOrdersByMaker,
    loadMockFusionOrders,

    // Wallet & Balance
    getWalletAddress,
    getBalance,
    getAllBalances,
    isWalletConnected,

    // Network & Utils
    getNetworkInfo,
    isServiceInitialized,

    // Service instance (for advanced usage)
    fusionService,
  };
};
