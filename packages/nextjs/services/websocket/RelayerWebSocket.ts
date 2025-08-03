import { useUnifiedStore } from '../store/unifiedStore';
import type { AuctionDetails, FusionOrder } from '@1inch/sui-fusion-sdk';

export interface WebSocketMessage {
  type: 'auction_update' | 'auction_filled' | 'auction_expired' | 'bid_placed' | 'order_status';
  data: any;
  timestamp: number;
}

export interface AuctionUpdateMessage {
  auctionId: string;
  auctionDetails: AuctionDetails;
  order?: FusionOrder;
}

export interface BidPlacedMessage {
  auctionId: string;
  bidder: string;
  price: number;
  timestamp: number;
  txHash: string;
}

/**
 * WebSocket service for real-time auction monitoring
 * Connects to the relayer backend for live updates
 */
export class RelayerWebSocket {
  private ws: WebSocket | null = null;
  private reconnectAttempts = 0;
  private maxReconnectAttempts = 5;
  private reconnectDelay = 1000;
  private isIntentionallyDisconnected = false;
  private subscriptions = new Set<string>();

  constructor(private url: string = 'ws://localhost:3001') {}

  /**
   * Connect to the WebSocket server
   */
  connect(): Promise<void> {
    return new Promise((resolve, reject) => {
      if (this.ws?.readyState === WebSocket.OPEN) {
        resolve();
        return;
      }

      this.isIntentionallyDisconnected = false;
      const store = useUnifiedStore.getState();
      
      store.setWebSocketConnected(false);
      store.setWebSocketError(undefined);

      try {
        this.ws = new WebSocket(this.url);

        this.ws.onopen = () => {
          console.log('🔗 WebSocket connected to relayer');
          this.reconnectAttempts = 0;
          store.setWebSocketConnected(true);
          store.resetReconnectAttempts();
          
          // Re-subscribe to existing subscriptions
          this.subscriptions.forEach(subscription => {
            this.subscribe(subscription);
          });
          
          resolve();
        };

        this.ws.onmessage = (event) => {
          try {
            const message: WebSocketMessage = JSON.parse(event.data);
            this.handleMessage(message);
          } catch (error) {
            console.error('Failed to parse WebSocket message:', error);
          }
        };

        this.ws.onclose = (event) => {
          console.log('🔌 WebSocket disconnected:', event.code, event.reason);
          store.setWebSocketConnected(false);
          
          if (!this.isIntentionallyDisconnected && this.reconnectAttempts < this.maxReconnectAttempts) {
            this.scheduleReconnect();
          }
        };

        this.ws.onerror = (error) => {
          console.error('❌ WebSocket error:', error);
          store.setWebSocketError('Connection failed');
          reject(error);
        };

      } catch (error) {
        console.error('Failed to create WebSocket connection:', error);
        store.setWebSocketError('Failed to connect');
        reject(error);
      }
    });
  }

  /**
   * Disconnect from the WebSocket server
   */
  disconnect(): void {
    this.isIntentionallyDisconnected = true;
    this.subscriptions.clear();
    
    if (this.ws) {
      this.ws.close(1000, 'Client disconnect');
      this.ws = null;
    }
    
    const store = useUnifiedStore.getState();
    store.setWebSocketConnected(false);
    store.resetReconnectAttempts();
  }

  /**
   * Subscribe to auction updates for a specific auction
   */
  subscribe(auctionId: string): void {
    this.subscriptions.add(auctionId);
    
    if (this.ws?.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify({
        type: 'subscribe',
        auctionId,
        timestamp: Date.now()
      }));
      
      const store = useUnifiedStore.getState();
      store.addWebSocketSubscription(auctionId);
      store.addAuctionToMonitor(auctionId);
      
      console.log(`📡 Subscribed to auction: ${auctionId}`);
    }
  }

  /**
   * Unsubscribe from auction updates
   */
  unsubscribe(auctionId: string): void {
    this.subscriptions.delete(auctionId);
    
    if (this.ws?.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify({
        type: 'unsubscribe',
        auctionId,
        timestamp: Date.now()
      }));
    }
    
    const store = useUnifiedStore.getState();
    store.removeWebSocketSubscription(auctionId);
    store.removeAuctionFromMonitor(auctionId);
    
    console.log(`📡 Unsubscribed from auction: ${auctionId}`);
  }

  /**
   * Send a ping to keep connection alive
   */
  ping(): void {
    if (this.ws?.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify({
        type: 'ping',
        timestamp: Date.now()
      }));
    }
  }

  /**
   * Check if connected
   */
  isConnected(): boolean {
    return this.ws?.readyState === WebSocket.OPEN;
  }

  /**
   * Get current subscriptions
   */
  getSubscriptions(): string[] {
    return Array.from(this.subscriptions);
  }

  /**
   * Handle incoming WebSocket messages
   */
  private handleMessage(message: WebSocketMessage): void {
    const store = useUnifiedStore.getState();
    
    switch (message.type) {
      case 'auction_update':
        this.handleAuctionUpdate(message.data as AuctionUpdateMessage);
        break;
        
      case 'auction_filled':
        this.handleAuctionFilled(message.data);
        store.addAuctionNotification({
          auctionId: message.data.auctionId,
          type: 'auction_won',
          message: `Auction filled at ${message.data.fillPrice}`
        });
        break;
        
      case 'auction_expired':
        this.handleAuctionExpired(message.data);
        store.addAuctionNotification({
          auctionId: message.data.auctionId,
          type: 'auction_ended',
          message: 'Auction expired without fills'
        });
        break;
        
      case 'bid_placed':
        this.handleBidPlaced(message.data as BidPlacedMessage);
        store.addAuctionNotification({
          auctionId: message.data.auctionId,
          type: 'bid_placed',
          message: `New bid: ${message.data.price}`
        });
        break;
        
      case 'order_status':
        this.handleOrderStatus(message.data);
        break;
        
      default:
        console.log('Unknown message type:', message.type);
    }
  }

  /**
   * Handle auction update messages
   */
  private handleAuctionUpdate(data: AuctionUpdateMessage): void {
    const store = useUnifiedStore.getState();
    store.updateAuctionDetails(data.auctionId, data.auctionDetails);
    
    console.log(`🎯 Auction update: ${data.auctionId}`, data.auctionDetails);
  }

  /**
   * Handle auction filled messages
   */
  private handleAuctionFilled(data: any): void {
    console.log(`✅ Auction filled: ${data.auctionId}`);
    // Could trigger success toast notification
  }

  /**
   * Handle auction expired messages
   */
  private handleAuctionExpired(data: any): void {
    console.log(`⏰ Auction expired: ${data.auctionId}`);
    // Could trigger expiration notification
  }

  /**
   * Handle bid placed messages
   */
  private handleBidPlaced(data: BidPlacedMessage): void {
    console.log(`💰 Bid placed on ${data.auctionId}: ${data.price} by ${data.bidder}`);
  }

  /**
   * Handle order status updates
   */
  private handleOrderStatus(data: any): void {
    console.log(`📋 Order status update: ${data.orderId} -> ${data.status}`);
  }

  /**
   * Schedule reconnection attempt
   */
  private scheduleReconnect(): void {
    const store = useUnifiedStore.getState();
    this.reconnectAttempts++;
    store.incrementReconnectAttempts();
    
    const delay = this.reconnectDelay * Math.pow(2, this.reconnectAttempts - 1);
    
    console.log(`🔄 Scheduling reconnect attempt ${this.reconnectAttempts}/${this.maxReconnectAttempts} in ${delay}ms`);
    
    setTimeout(() => {
      if (!this.isIntentionallyDisconnected) {
        this.connect().catch(error => {
          console.error('Reconnection failed:', error);
        });
      }
    }, delay);
  }
}

// Global instance for the app
export const relayerWebSocket = new RelayerWebSocket(
  process.env.NEXT_PUBLIC_RELAYER_WS_URL || 'ws://localhost:3001'
);

// React hook for using the WebSocket service
export const useRelayerWebSocket = () => {
  const isConnected = useUnifiedStore(state => state.websocket.isConnected);
  const isConnecting = useUnifiedStore(state => state.websocket.isConnecting);
  const error = useUnifiedStore(state => state.websocket.error);
  const subscriptions = useUnifiedStore(state => state.websocket.subscriptions);
  const reconnectAttempts = useUnifiedStore(state => state.websocket.reconnectAttempts);

  return {
    isConnected,
    isConnecting,
    error,
    subscriptions,
    reconnectAttempts,
    connect: () => relayerWebSocket.connect(),
    disconnect: () => relayerWebSocket.disconnect(),
    subscribe: (auctionId: string) => relayerWebSocket.subscribe(auctionId),
    unsubscribe: (auctionId: string) => relayerWebSocket.unsubscribe(auctionId),
    ping: () => relayerWebSocket.ping(),
  };
};