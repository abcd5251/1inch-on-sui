import { Elysia } from 'elysia';
import { logger } from '../utils/logger';
import { RelayerService } from '../services/relayer';
import type { WebSocketMessage } from '../types/events';
import { RelayerEvent } from '../types/events';

interface WebSocketClient {
  id: string;
  ws: any;
  subscriptions: Set<string>;
  isAlive: boolean;
  lastPing: number;
}

export function setupWebSocket(app: Elysia, relayerService: RelayerService): void {
  const clients = new Map<string, WebSocketClient>();
  let clientIdCounter = 0;

  // WebSocket endpoint
  app.ws('/ws', {
    message(ws, message) {
      handleWebSocketMessage(ws, message, clients, relayerService);
    },
    
    open(ws) {
      const clientId = `client_${++clientIdCounter}_${Date.now()}`;
      const client: WebSocketClient = {
        id: clientId,
        ws,
        subscriptions: new Set(),
        isAlive: true,
        lastPing: Date.now(),
      };
      
      clients.set(clientId, client);
      logger.info(`WebSocket client connected: ${clientId}`);
      
      // Send welcome message
      sendMessage(client, {
        type: 'heartbeat',
        data: {
          clientId,
          message: 'Connected to Cross-Chain HTLC Relayer',
          timestamp: Date.now(),
        },
        timestamp: Date.now(),
      });

      // Subscribe to relayer events
      relayerService.on('relayer_event', (event: RelayerEvent) => {
        broadcastToSubscribers(clients, 'swap_status', event);
      });

      // Subscribe to withdrawal events
      relayerService.on('withdrawal_needed', (data: any) => {
        broadcastToSubscribers(clients, 'withdrawal_needed', data);
      });
    },
    
    close(ws, code, reason) {
      const client = findClientByWs(clients, ws);
      if (client) {
        clients.delete(client.id);
        logger.info(`WebSocket client disconnected: ${client.id} (code: ${code}, reason: ${reason})`);
      }
    },
    
    error(ws, error) {
      const client = findClientByWs(clients, ws);
      logger.error(`WebSocket error for client ${client?.id || 'unknown'}:`, error);
    }
  });

  // Start heartbeat interval
  const heartbeatInterval = setInterval(() => {
    const now = Date.now();
    const timeout = 30000; // 30 seconds

    for (const [clientId, client] of clients) {
      if (!client.isAlive || (now - client.lastPing) > timeout) {
        logger.warn(`Removing inactive WebSocket client: ${clientId}`);
        clients.delete(clientId);
        try {
          client.ws.close();
        } catch (error) {
          // Ignore close errors
        }
        continue;
      }

      // Send ping
      try {
        sendMessage(client, {
          type: 'heartbeat',
          data: { ping: true },
          timestamp: now,
        });
      } catch (error) {
        logger.error(`Error sending heartbeat to client ${clientId}:`, error);
        client.isAlive = false;
      }
    }
  }, 15000); // Every 15 seconds

  // Cleanup on app shutdown
  process.on('SIGTERM', () => {
    clearInterval(heartbeatInterval);
    for (const client of clients.values()) {
      try {
        client.ws.close();
      } catch (error) {
        // Ignore close errors
      }
    }
    clients.clear();
  });

  logger.info('WebSocket server configured successfully');
}

function handleWebSocketMessage(
  ws: any, 
  message: any, 
  clients: Map<string, WebSocketClient>, 
  relayerService: RelayerService
): void {
  const client = findClientByWs(clients, ws);
  if (!client) {
    logger.warn('Received message from unknown WebSocket client');
    return;
  }

  try {
    const parsedMessage = typeof message === 'string' ? JSON.parse(message) : message;
    
    switch (parsedMessage.type) {
      case 'subscribe':
        handleSubscribe(client, parsedMessage.data);
        break;
        
      case 'unsubscribe':
        handleUnsubscribe(client, parsedMessage.data);
        break;
        
      case 'get_swaps':
        handleGetSwaps(client, relayerService, parsedMessage.data);
        break;
        
      case 'get_swap':
        handleGetSwap(client, relayerService, parsedMessage.data);
        break;
        
      case 'pong':
        client.isAlive = true;
        client.lastPing = Date.now();
        break;
        
      default:
        logger.warn(`Unknown WebSocket message type: ${parsedMessage.type}`);
        sendMessage(client, {
          type: 'error',
          data: { error: `Unknown message type: ${parsedMessage.type}` },
          timestamp: Date.now(),
        });
    }
  } catch (error) {
    logger.error(`Error handling WebSocket message from client ${client.id}:`, error);
    sendMessage(client, {
      type: 'error',
      data: { error: 'Invalid message format' },
      timestamp: Date.now(),
    });
  }
}

function handleSubscribe(client: WebSocketClient, data: any): void {
  const { topics } = data;
  
  if (!Array.isArray(topics)) {
    sendMessage(client, {
      type: 'error',
      data: { error: 'Topics must be an array' },
      timestamp: Date.now(),
    });
    return;
  }

  const validTopics = ['swap_updates', 'htlc_events', 'system_events', 'withdrawal_events'];
  const invalidTopics = topics.filter((topic: string) => !validTopics.includes(topic));
  
  if (invalidTopics.length > 0) {
    sendMessage(client, {
      type: 'error',
      data: { 
        error: `Invalid topics: ${invalidTopics.join(', ')}`,
        validTopics,
      },
      timestamp: Date.now(),
    });
    return;
  }

  topics.forEach((topic: string) => client.subscriptions.add(topic));
  
  sendMessage(client, {
    type: 'subscription_confirmed',
    data: { 
      subscribed: topics,
      totalSubscriptions: client.subscriptions.size,
    },
    timestamp: Date.now(),
  });

  logger.debug(`Client ${client.id} subscribed to topics: ${topics.join(', ')}`);
}

function handleUnsubscribe(client: WebSocketClient, data: any): void {
  const { topics } = data;
  
  if (!Array.isArray(topics)) {
    sendMessage(client, {
      type: 'error',
      data: { error: 'Topics must be an array' },
      timestamp: Date.now(),
    });
    return;
  }

  topics.forEach((topic: string) => client.subscriptions.delete(topic));
  
  sendMessage(client, {
    type: 'unsubscription_confirmed',
    data: { 
      unsubscribed: topics,
      remainingSubscriptions: Array.from(client.subscriptions),
    },
    timestamp: Date.now(),
  });

  logger.debug(`Client ${client.id} unsubscribed from topics: ${topics.join(', ')}`);
}

async function handleGetSwaps(client: WebSocketClient, relayerService: RelayerService, data: any): Promise<void> {
  try {
    const { status, limit } = data || {};
    let swaps;
    
    if (status) {
      swaps = await relayerService.getSwapsByStatus(status);
    } else {
      swaps = await relayerService.getAllActiveSwaps();
    }
    
    if (limit && typeof limit === 'number') {
      swaps = swaps.slice(0, limit);
    }
    
    sendMessage(client, {
      type: 'swaps_data',
      data: {
        swaps,
        count: swaps.length,
        status,
        timestamp: Date.now(),
      },
      timestamp: Date.now(),
    });
  } catch (error) {
    logger.error(`Error handling get_swaps for client ${client.id}:`, error);
    sendMessage(client, {
      type: 'error',
      data: { error: 'Failed to fetch swaps' },
      timestamp: Date.now(),
    });
  }
}

async function handleGetSwap(client: WebSocketClient, relayerService: RelayerService, data: any): Promise<void> {
  try {
    const { swapId } = data;
    
    if (!swapId) {
      sendMessage(client, {
        type: 'error',
        data: { error: 'swapId is required' },
        timestamp: Date.now(),
      });
      return;
    }
    
    const swap = await relayerService.getSwap(swapId);
    
    sendMessage(client, {
      type: 'swap_data',
      data: {
        swap,
        swapId,
        found: !!swap,
        timestamp: Date.now(),
      },
      timestamp: Date.now(),
    });
  } catch (error) {
    logger.error(`Error handling get_swap for client ${client.id}:`, error);
    sendMessage(client, {
      type: 'error',
      data: { error: 'Failed to fetch swap' },
      timestamp: Date.now(),
    });
  }
}

function sendMessage(client: WebSocketClient, message: WebSocketMessage): void {
  try {
    client.ws.send(JSON.stringify(message));
  } catch (error) {
    logger.error(`Error sending message to client ${client.id}:`, error);
    client.isAlive = false;
  }
}

function broadcastToSubscribers(
  clients: Map<string, WebSocketClient>, 
  topic: string, 
  data: any
): void {
  const message: WebSocketMessage = {
    type: 'htlc_event',
    data: {
      topic,
      ...data,
    },
    timestamp: Date.now(),
  };

  let sentCount = 0;
  let errorCount = 0;

  for (const client of clients.values()) {
    if (client.subscriptions.has('swap_updates') || 
        client.subscriptions.has('htlc_events') || 
        client.subscriptions.has('withdrawal_events')) {
      try {
        sendMessage(client, message);
        sentCount++;
      } catch (error) {
        errorCount++;
        logger.error(`Error broadcasting to client ${client.id}:`, error);
      }
    }
  }

  if (sentCount > 0) {
    logger.debug(`Broadcasted ${topic} event to ${sentCount} clients (${errorCount} errors)`);
  }
}

function findClientByWs(clients: Map<string, WebSocketClient>, ws: any): WebSocketClient | undefined {
  for (const client of clients.values()) {
    if (client.ws === ws) {
      return client;
    }
  }
  return undefined;
}