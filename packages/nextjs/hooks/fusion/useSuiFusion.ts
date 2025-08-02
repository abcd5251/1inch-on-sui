import { useState, useCallback, useEffect } from "react";
import { SuiFusionService, SuiFusionServiceConfig, SuiSwapParams, SuiQuoteParams, SuiOrderInfo, SuiQuote } from "~~/services/fusion/SuiFusionService";
import { useCurrentAccount } from "@mysten/dapp-kit";
import { notification } from "~~/utils/scaffold-eth";

export interface UseSuiFusionConfig {
  network: 'mainnet' | 'testnet' | 'devnet' | 'localnet';
  rpcUrl?: string;
  packageId?: string;
}

export interface SuiFusionState {
  isInitialized: boolean;
  isLoading: boolean;
  error: string | null;
  quote: SuiQuote | null;
  lastOrder: SuiOrderInfo | null;
  orders: SuiOrderInfo[];
}

export const useSuiFusion = (config: UseSuiFusionConfig) => {
  const currentAccount = useCurrentAccount();
  const [fusionService] = useState(() => new SuiFusionService(config));
  const [state, setState] = useState<SuiFusionState>({
    isInitialized: false,
    isLoading: false,
    error: null,
    quote: null,
    lastOrder: null,
    orders: [],
  });

  const updateState = useCallback((updates: Partial<SuiFusionState>) => {
    setState(prev => ({ ...prev, ...updates }));
  }, []);

  const handleError = useCallback((error: any, operation: string) => {
    const errorMessage = error instanceof Error ? error.message : String(error);
    console.error(`Sui Fusion ${operation} error:`, error);
    updateState({ error: errorMessage, isLoading: false });
    notification.error(`${operation} failed: ${errorMessage}`);
  }, [updateState]);

  const initializeWithPrivateKey = useCallback(async (privateKey: string) => {
    updateState({ isLoading: true, error: null });
    try {
      await fusionService.initializeWithPrivateKey(privateKey);
      updateState({ isInitialized: true, isLoading: false });
      notification.success("Sui Fusion service initialized successfully");
    } catch (error) {
      handleError(error, "initialize");
    }
  }, [fusionService, updateState, handleError]);

  const getQuote = useCallback(async (params: SuiQuoteParams): Promise<SuiQuote | null> => {
    updateState({ isLoading: true, error: null });
    try {
      const quote = await fusionService.getQuote(params);
      updateState({ quote, isLoading: false });
      return quote;
    } catch (error) {
      handleError(error, "get quote");
      return null;
    }
  }, [fusionService, updateState, handleError]);

  const createOrder = useCallback(async (params: SuiSwapParams): Promise<SuiOrderInfo | null> => {
    updateState({ isLoading: true, error: null });
    try {
      const order = await fusionService.createOrder(params);
      updateState({ lastOrder: order, isLoading: false });
      notification.success(`Order created successfully! Order ID: ${order.orderId.slice(0, 8)}...`);
      return order;
    } catch (error) {
      handleError(error, "create order");
      return null;
    }
  }, [fusionService, updateState, handleError]);

  const getActiveOrders = useCallback(async (address?: string, page: number = 1, limit: number = 10) => {
    const walletAddress = address || currentAccount?.address;
    if (!walletAddress) {
      handleError(new Error("No wallet address available"), "get active orders");
      return { items: [], total: 0 };
    }

    updateState({ isLoading: true, error: null });
    try {
      const ordersResponse = await fusionService.getActiveOrders(walletAddress, page, limit);
      updateState({ orders: ordersResponse.items || [], isLoading: false });
      return ordersResponse;
    } catch (error) {
      handleError(error, "get active orders");
      return { items: [], total: 0 };
    }
  }, [fusionService, currentAccount, updateState, handleError]);

  const getOrdersByMaker = useCallback(async (address?: string, page: number = 1, limit: number = 10) => {
    const walletAddress = address || currentAccount?.address;
    if (!walletAddress) {
      handleError(new Error("No wallet address available"), "get orders by maker");
      return { items: [], total: 0 };
    }

    updateState({ isLoading: true, error: null });
    try {
      const ordersResponse = await fusionService.getOrdersByMaker(walletAddress, page, limit);
      updateState({ orders: ordersResponse.items || [], isLoading: false });
      return ordersResponse;
    } catch (error) {
      handleError(error, "get orders by maker");
      return { items: [], total: 0 };
    }
  }, [fusionService, currentAccount, updateState, handleError]);

  const getAddressFromPrivateKey = useCallback((privateKey: string): string => {
    try {
      return fusionService.getAddressFromPrivateKey(privateKey);
    } catch (error) {
      handleError(error, "get address from private key");
      return "";
    }
  }, [fusionService, handleError]);

  const getTokenTypes = useCallback(() => {
    return fusionService.getTokenTypes();
  }, [fusionService]);

  const getPackageId = useCallback(() => {
    return fusionService.getPackageId();
  }, [fusionService]);

  const getNetwork = useCallback(() => {
    return fusionService.getNetwork();
  }, [fusionService]);

  const isServiceInitialized = useCallback(() => {
    return fusionService.isInitialized();
  }, [fusionService]);

  // Auto-load orders when account changes
  useEffect(() => {
    if (currentAccount?.address && state.isInitialized) {
      getActiveOrders(currentAccount.address);
    }
  }, [currentAccount?.address, state.isInitialized, getActiveOrders]);

  return {
    // State
    ...state,
    
    // Actions
    initializeWithPrivateKey,
    getQuote,
    createOrder,
    getActiveOrders,
    getOrdersByMaker,
    
    // Utilities
    getAddressFromPrivateKey,
    getTokenTypes,
    getPackageId,
    getNetwork,
    isServiceInitialized,
    
    // Service instance (for advanced usage)
    fusionService,
  };
};