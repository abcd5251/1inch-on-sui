import { useCallback, useEffect, useState } from "react";
import { useAccount } from "wagmi";
import { Order, Quote } from "~~/services/fusion";
import { FusionService, QuoteParams, SwapParams } from "~~/services/fusion/FusionService";
import { notification } from "~~/utils/scaffold-eth";

// Legacy type for backward compatibility
type OrderInfo = Order;

export interface UseFusionConfig {
  network: string;
  rpcUrl: string;
  authKey?: string;
}

export interface FusionState {
  isInitialized: boolean;
  isLoading: boolean;
  error: string | null;
  quote: Quote | null;
  lastOrder: OrderInfo | null;
  orders: any[];
}

export const useFusion = (config: UseFusionConfig) => {
  const { address } = useAccount();
  const [fusionService] = useState(() => new FusionService(config));
  const [state, setState] = useState<FusionState>({
    isInitialized: false,
    isLoading: false,
    error: null,
    quote: null,
    lastOrder: null,
    orders: [],
  });

  const updateState = useCallback((updates: Partial<FusionState>) => {
    setState(prev => ({ ...prev, ...updates }));
  }, []);

  const handleError = useCallback(
    (error: any, action: string) => {
      console.error(`Fusion ${action} error:`, error);
      const errorMessage = error?.message || `Failed to ${action}`;
      updateState({ error: errorMessage, isLoading: false });
      notification.error(errorMessage);
    },
    [updateState],
  );

  const initializeWithPrivateKey = useCallback(
    async (privateKey: string) => {
      try {
        updateState({ isLoading: true, error: null });
        await fusionService.initializeWithPrivateKey(privateKey);
        updateState({ isInitialized: true, isLoading: false });
        notification.success("Fusion SDK initialized successfully");
      } catch (error) {
        handleError(error, "initialize SDK");
      }
    },
    [fusionService, updateState, handleError],
  );

  const getQuote = useCallback(
    async (params: QuoteParams): Promise<Quote | null> => {
      try {
        updateState({ isLoading: true, error: null });
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

  const createOrder = useCallback(
    async (params: SwapParams): Promise<OrderInfo | null> => {
      try {
        updateState({ isLoading: true, error: null });
        const order = await fusionService.createOrder(params);
        updateState({ lastOrder: order, isLoading: false });
        notification.success("Order created successfully");
        return order;
      } catch (error) {
        handleError(error, "create order");
        return null;
      }
    },
    [fusionService, updateState, handleError],
  );

  const approveToken = useCallback(
    async (tokenAddress: string, amount: string, privateKey: string): Promise<string | null> => {
      try {
        updateState({ isLoading: true, error: null });
        const routerAddress = fusionService.getRouterAddress();
        const txHash = await fusionService.approveToken(tokenAddress, routerAddress, amount, privateKey);
        updateState({ isLoading: false });
        notification.success("Token approved successfully");
        return txHash;
      } catch (error) {
        handleError(error, "approve token");
        return null;
      }
    },
    [fusionService, updateState, handleError],
  );

  const getActiveOrders = useCallback(
    async (page: number = 1, limit: number = 10) => {
      try {
        updateState({ isLoading: true, error: null });
        const ordersResponse = await fusionService.getActiveOrders(page, limit);
        updateState({ orders: ordersResponse.items || [], isLoading: false });
        return ordersResponse;
      } catch (error) {
        handleError(error, "get active orders");
        return null;
      }
    },
    [fusionService, updateState, handleError],
  );

  const getOrdersByMaker = useCallback(
    async (makerAddress: string, page: number = 1, limit: number = 10) => {
      try {
        updateState({ isLoading: true, error: null });
        const ordersResponse = await fusionService.getOrdersByMaker(makerAddress, page, limit);
        updateState({ orders: ordersResponse.items || [], isLoading: false });
        return ordersResponse;
      } catch (error) {
        handleError(error, "get orders by maker");
        return null;
      }
    },
    [fusionService, updateState, handleError],
  );

  const getTokenAddresses = useCallback(() => {
    return fusionService.getTokenAddresses();
  }, [fusionService]);

  const getAddressFromPrivateKey = useCallback(
    (privateKey: string) => {
      return fusionService.getAddressFromPrivateKey(privateKey);
    },
    [fusionService],
  );

  // Auto-load user orders when address changes
  useEffect(() => {
    if (address && state.isInitialized) {
      getOrdersByMaker(address);
    }
  }, [address, state.isInitialized, getOrdersByMaker]);

  return {
    // State
    ...state,

    // Actions
    initializeWithPrivateKey,
    getQuote,
    createOrder,
    approveToken,
    getActiveOrders,
    getOrdersByMaker,
    getTokenAddresses,
    getAddressFromPrivateKey,

    // Utils
    clearError: () => updateState({ error: null }),
    clearQuote: () => updateState({ quote: null }),
  };
};
