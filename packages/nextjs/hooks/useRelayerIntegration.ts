/**
 * Relayer Integration Hook
 * Combines HTTP API and WebSocket functionality for real-time swap management
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import { relayerApiService } from '../services/relayer/RelayerApiService';
import { useRelayerWebSocket } from './useRelayerWebSocket';
import { SwapData, SwapStatus, CreateSwapRequest } from '../types/swap';
import { WebSocketMessage, SwapWebSocketMessage } from '../types/relayer';

export interface RelayerIntegrationState {
  // Connection status
  isConnected: boolean;
  isConnecting: boolean;
  connectionError: string | null;
  
  // Swap management
  swaps: Map<string, SwapData>;
  activeSwaps: SwapData[];
  swapHistory: SwapData[];
  
  // Loading states
  isCreatingSwap: boolean;
  isLoadingSwaps: boolean;
  
  // Error handling
  lastError: string | null;
}

export interface RelayerIntegrationActions {
  // Swap operations
  createSwap: (swapData: CreateSwapRequest) => Promise<SwapData | null>;
  getSwapStatus: (orderId: string) => Promise<SwapStatus | null>;
  refreshSwaps: () => Promise<void>;
  subscribeToSwap: (orderId: string) => void;
  unsubscribeFromSwap: (orderId: string) => void;
  
  // Connection management
  connect: () => void;
  disconnect: () => void;
  reconnect: () => void;
  
  // Error handling
  clearError: () => void;
}

export interface UseRelayerIntegrationOptions {
  autoConnect?: boolean;
  autoRefresh?: boolean;
  refreshInterval?: number;
  maxRetries?: number;
  retryDelay?: number;
}

/**
 * Main hook for Relayer integration
 */
export function useRelayerIntegration(
  options: UseRelayerIntegrationOptions = {}
): [RelayerIntegrationState, RelayerIntegrationActions] {
  const {
    autoConnect = true,
    autoRefresh = true,
    refreshInterval = 30000, // 30 seconds
    maxRetries = 3,
    retryDelay = 1000,
  } = options;

  // State management
  const [swaps, setSwaps] = useState<Map<string, SwapData>>(new Map());
  const [isCreatingSwap, setIsCreatingSwap] = useState(false);
  const [isLoadingSwaps, setIsLoadingSwaps] = useState(false);
  const [lastError, setLastError] = useState<string | null>(null);
  const [connectionError, setConnectionError] = useState<string | null>(null);

  // Refs for cleanup
  const refreshIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const subscribedSwapsRef = useRef<Set<string>>(new Set());

  // WebSocket integration
  const {
    isConnected,
    isConnecting,
    connect: wsConnect,
    disconnect: wsDisconnect,
    sendMessage,
    lastMessage,
    error: wsError,
  } = useRelayerWebSocket({
    url: process.env.NEXT_PUBLIC_RELAYER_WS_URL || 'ws://localhost:3001/ws',
    autoConnect,
    maxRetries,
    retryDelay,
  });

  // Handle WebSocket messages
  useEffect(() => {
    if (!lastMessage) return;

    try {
      const message: WebSocketMessage = JSON.parse(lastMessage);
      
      switch (message.type) {
        case 'swapCreated':
        case 'swapUpdated':
        case 'swapStatusChanged':
          handleSwapUpdate(message as SwapWebSocketMessage);
          break;
        case 'swapError':
          handleSwapError(message as SwapWebSocketMessage);
          break;
        case 'error':
          setLastError(message.data?.message || 'WebSocket error occurred');
          break;
        default:
          console.log('Unhandled WebSocket message:', message);
      }
    } catch (error) {
      console.error('Failed to parse WebSocket message:', error);
    }
  }, [lastMessage]);

  // Handle WebSocket errors
  useEffect(() => {
    if (wsError) {
      setConnectionError(wsError);
    } else {
      setConnectionError(null);
    }
  }, [wsError]);

  // Handle swap updates from WebSocket
  const handleSwapUpdate = useCallback((message: SwapWebSocketMessage) => {
    if (!message.data) return;

    setSwaps(prevSwaps => {
      const newSwaps = new Map(prevSwaps);
      newSwaps.set(message.data.orderId, message.data);
      return newSwaps;
    });
  }, []);

  // Handle swap errors from WebSocket
  const handleSwapError = useCallback((message: SwapWebSocketMessage) => {
    if (message.data?.errorMessage) {
      setLastError(`Swap ${message.data.orderId}: ${message.data.errorMessage}`);
    }
  }, []);

  // Create new swap
  const createSwap = useCallback(async (swapData: CreateSwapRequest): Promise<SwapData | null> => {
    setIsCreatingSwap(true);
    setLastError(null);

    try {
      const newSwap = await relayerApiService.createSwap(swapData);
      
      // Add to local state
      setSwaps(prevSwaps => {
        const newSwaps = new Map(prevSwaps);
        newSwaps.set(newSwap.orderId, newSwap);
        return newSwaps;
      });

      // Auto-subscribe to updates
      subscribeToSwap(newSwap.orderId);

      return newSwap;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to create swap';
      setLastError(errorMessage);
      return null;
    } finally {
      setIsCreatingSwap(false);
    }
  }, []);

  // Get swap status
  const getSwapStatus = useCallback(async (orderId: string): Promise<SwapStatus | null> => {
    try {
      const swap = await relayerApiService.getSwapByOrderId(orderId);
      if (!swap) return null;

      return {
        orderId: swap.orderId,
        status: swap.status,
        sourceTransactionHash: swap.sourceTransactionHash,
        targetTransactionHash: swap.targetTransactionHash,
        secret: swap.secret,
        errorMessage: swap.errorMessage,
        createdAt: swap.createdAt,
        updatedAt: swap.updatedAt,
      };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to get swap status';
      setLastError(errorMessage);
      return null;
    }
  }, []);

  // Refresh swaps from API
  const refreshSwaps = useCallback(async () => {
    setIsLoadingSwaps(true);
    setLastError(null);

    try {
      const response = await relayerApiService.getSwaps({ limit: 100 });
      
      const swapsMap = new Map<string, SwapData>();
      response.swaps.forEach(swap => {
        swapsMap.set(swap.orderId, swap);
      });
      
      setSwaps(swapsMap);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to refresh swaps';
      setLastError(errorMessage);
    } finally {
      setIsLoadingSwaps(false);
    }
  }, []);

  // Subscribe to swap updates via WebSocket
  const subscribeToSwap = useCallback((orderId: string) => {
    if (!isConnected || subscribedSwapsRef.current.has(orderId)) return;

    sendMessage(JSON.stringify({
      type: 'subscribe',
      data: { swapId: orderId }
    }));

    subscribedSwapsRef.current.add(orderId);
  }, [isConnected, sendMessage]);

  // Unsubscribe from swap updates
  const unsubscribeFromSwap = useCallback((orderId: string) => {
    if (!isConnected || !subscribedSwapsRef.current.has(orderId)) return;

    sendMessage(JSON.stringify({
      type: 'unsubscribe',
      data: { swapId: orderId }
    }));

    subscribedSwapsRef.current.delete(orderId);
  }, [isConnected, sendMessage]);

  // Connection management
  const connect = useCallback(() => {
    setConnectionError(null);
    wsConnect();
  }, [wsConnect]);

  const disconnect = useCallback(() => {
    wsDisconnect();
    subscribedSwapsRef.current.clear();
  }, [wsDisconnect]);

  const reconnect = useCallback(() => {
    disconnect();
    setTimeout(() => connect(), 1000);
  }, [connect, disconnect]);

  // Error handling
  const clearError = useCallback(() => {
    setLastError(null);
    setConnectionError(null);
  }, []);

  // Auto-refresh setup
  useEffect(() => {
    if (!autoRefresh || !isConnected) return;

    refreshIntervalRef.current = setInterval(refreshSwaps, refreshInterval);

    return () => {
      if (refreshIntervalRef.current) {
        clearInterval(refreshIntervalRef.current);
      }
    };
  }, [autoRefresh, isConnected, refreshSwaps, refreshInterval]);

  // Initial data load
  useEffect(() => {
    if (isConnected && swaps.size === 0) {
      refreshSwaps();
    }
  }, [isConnected, refreshSwaps, swaps.size]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (refreshIntervalRef.current) {
        clearInterval(refreshIntervalRef.current);
      }
      subscribedSwapsRef.current.clear();
    };
  }, []);

  // Computed values
  const activeSwaps = Array.from(swaps.values()).filter(
    swap => !['completed', 'failed', 'cancelled'].includes(swap.status)
  );
  
  const swapHistory = Array.from(swaps.values()).filter(
    swap => ['completed', 'failed', 'cancelled'].includes(swap.status)
  );

  // State object
  const state: RelayerIntegrationState = {
    isConnected,
    isConnecting,
    connectionError,
    swaps,
    activeSwaps,
    swapHistory,
    isCreatingSwap,
    isLoadingSwaps,
    lastError,
  };

  // Actions object
  const actions: RelayerIntegrationActions = {
    createSwap,
    getSwapStatus,
    refreshSwaps,
    subscribeToSwap,
    unsubscribeFromSwap,
    connect,
    disconnect,
    reconnect,
    clearError,
  };

  return [state, actions];
}

export default useRelayerIntegration;