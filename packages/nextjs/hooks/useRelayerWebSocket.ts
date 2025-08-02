import { useEffect, useRef, useState, useCallback } from 'react';
import { SwapData, SwapWebSocketMessage } from '../types/swap';

/**
 * WebSocket连接状态
 */
export type WebSocketStatus = 'connecting' | 'connected' | 'disconnected' | 'error';

/**
 * WebSocket事件处理器
 */
export interface WebSocketEventHandlers {
  onSwapCreated?: (swap: SwapData) => void;
  onSwapUpdated?: (swap: SwapData) => void;
  onSwapStatusChanged?: (swap: SwapData) => void;
  onSwapError?: (swap: SwapData) => void;
  onConnect?: () => void;
  onDisconnect?: () => void;
  onError?: (error: Event) => void;
}

/**
 * WebSocket配置选项
 */
export interface WebSocketOptions {
  url?: string;
  reconnectInterval?: number;
  maxReconnectAttempts?: number;
  heartbeatInterval?: number;
  autoReconnect?: boolean;
}

/**
 * Relayer WebSocket Hook
 * 提供与Relayer后端的实时WebSocket连接
 */
export function useRelayerWebSocket(
  handlers: WebSocketEventHandlers = {},
  options: WebSocketOptions = {}
) {
  const {
    url = process.env.NEXT_PUBLIC_RELAYER_WS_URL || 'ws://localhost:3001/ws',
    reconnectInterval = 3000,
    maxReconnectAttempts = 5,
    heartbeatInterval = 30000,
    autoReconnect = true,
  } = options;

  const [status, setStatus] = useState<WebSocketStatus>('disconnected');
  const [lastMessage, setLastMessage] = useState<SwapWebSocketMessage | null>(null);
  const [connectionAttempts, setConnectionAttempts] = useState(0);

  const wsRef = useRef<WebSocket | null>(null);
  const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const heartbeatTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const isManuallyClosedRef = useRef(false);

  /**
   * 清理定时器
   */
  const clearTimeouts = useCallback(() => {
    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current);
      reconnectTimeoutRef.current = null;
    }
    if (heartbeatTimeoutRef.current) {
      clearTimeout(heartbeatTimeoutRef.current);
      heartbeatTimeoutRef.current = null;
    }
  }, []);

  /**
   * 发送心跳包
   */
  const sendHeartbeat = useCallback(() => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify({ type: 'ping' }));
      
      heartbeatTimeoutRef.current = setTimeout(() => {
        sendHeartbeat();
      }, heartbeatInterval);
    }
  }, [heartbeatInterval]);

  /**
   * 处理WebSocket消息
   */
  const handleMessage = useCallback((event: MessageEvent) => {
    try {
      const message: SwapWebSocketMessage = JSON.parse(event.data);
      setLastMessage(message);

      // 处理不同类型的消息
      switch (message.type) {
        case 'swap_created':
          handlers.onSwapCreated?.(message.data);
          break;
        case 'swap_updated':
          handlers.onSwapUpdated?.(message.data);
          break;
        case 'swap_status_changed':
          handlers.onSwapStatusChanged?.(message.data);
          break;
        case 'swap_error':
          handlers.onSwapError?.(message.data);
          break;
        default:
          console.log('Unknown message type:', message.type);
      }
    } catch (error) {
      console.error('Failed to parse WebSocket message:', error);
    }
  }, [handlers]);

  /**
   * 连接WebSocket
   */
  const connect = useCallback(() => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      return;
    }

    try {
      setStatus('connecting');
      isManuallyClosedRef.current = false;
      
      const ws = new WebSocket(url);
      wsRef.current = ws;

      ws.onopen = () => {
        console.log('WebSocket connected to Relayer');
        setStatus('connected');
        setConnectionAttempts(0);
        handlers.onConnect?.();
        
        // 开始心跳
        sendHeartbeat();
      };

      ws.onmessage = handleMessage;

      ws.onclose = (event) => {
        console.log('WebSocket disconnected:', event.code, event.reason);
        setStatus('disconnected');
        clearTimeouts();
        handlers.onDisconnect?.();

        // 自动重连
        if (!isManuallyClosedRef.current && autoReconnect && connectionAttempts < maxReconnectAttempts) {
          setConnectionAttempts(prev => prev + 1);
          reconnectTimeoutRef.current = setTimeout(() => {
            connect();
          }, reconnectInterval);
        }
      };

      ws.onerror = (error) => {
        console.error('WebSocket error:', error);
        setStatus('error');
        handlers.onError?.(error);
      };

    } catch (error) {
      console.error('Failed to create WebSocket connection:', error);
      setStatus('error');
    }
  }, [url, autoReconnect, connectionAttempts, maxReconnectAttempts, reconnectInterval, handlers, sendHeartbeat, handleMessage, clearTimeouts]);

  /**
   * 断开WebSocket连接
   */
  const disconnect = useCallback(() => {
    isManuallyClosedRef.current = true;
    clearTimeouts();
    
    if (wsRef.current) {
      wsRef.current.close();
      wsRef.current = null;
    }
    
    setStatus('disconnected');
    setConnectionAttempts(0);
  }, [clearTimeouts]);

  /**
   * 发送消息
   */
  const sendMessage = useCallback((message: any) => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify(message));
      return true;
    }
    console.warn('WebSocket is not connected');
    return false;
  }, []);

  /**
   * 订阅特定交换的更新
   */
  const subscribeToSwap = useCallback((swapId: string) => {
    return sendMessage({
      type: 'subscribe',
      data: { swapId }
    });
  }, [sendMessage]);

  /**
   * 取消订阅特定交换的更新
   */
  const unsubscribeFromSwap = useCallback((swapId: string) => {
    return sendMessage({
      type: 'unsubscribe',
      data: { swapId }
    });
  }, [sendMessage]);

  /**
   * 重新连接
   */
  const reconnect = useCallback(() => {
    disconnect();
    setTimeout(() => {
      setConnectionAttempts(0);
      connect();
    }, 100);
  }, [disconnect, connect]);

  // 组件挂载时自动连接
  useEffect(() => {
    connect();
    
    // 组件卸载时断开连接
    return () => {
      disconnect();
    };
  }, []);

  // 清理定时器
  useEffect(() => {
    return () => {
      clearTimeouts();
    };
  }, [clearTimeouts]);

  return {
    status,
    lastMessage,
    connectionAttempts,
    isConnected: status === 'connected',
    isConnecting: status === 'connecting',
    isDisconnected: status === 'disconnected',
    hasError: status === 'error',
    connect,
    disconnect,
    reconnect,
    sendMessage,
    subscribeToSwap,
    unsubscribeFromSwap,
  };
}

/**
 * 简化版本的WebSocket Hook，只监听交换状态变化
 */
export function useSwapStatusUpdates(onSwapUpdate?: (swap: SwapData) => void) {
  return useRelayerWebSocket({
    onSwapUpdated: onSwapUpdate,
    onSwapStatusChanged: onSwapUpdate,
  });
}

/**
 * 监听特定交换的WebSocket Hook
 */
export function useSwapWebSocket(swapId: string, onSwapUpdate?: (swap: SwapData) => void) {
  const { subscribeToSwap, unsubscribeFromSwap, ...rest } = useRelayerWebSocket({
    onSwapUpdated: onSwapUpdate,
    onSwapStatusChanged: onSwapUpdate,
  });

  useEffect(() => {
    if (swapId && rest.isConnected) {
      subscribeToSwap(swapId);
      
      return () => {
        unsubscribeFromSwap(swapId);
      };
    }
  }, [swapId, rest.isConnected, subscribeToSwap, unsubscribeFromSwap]);

  return rest;
}