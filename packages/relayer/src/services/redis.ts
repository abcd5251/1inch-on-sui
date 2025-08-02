import { createClient, RedisClientType } from 'redis';
import { logger } from '../utils/logger';
import { CrossChainSwap } from '../types/events';

export class RedisClient {
  private client: RedisClientType;
  private isConnected = false;

  constructor(config: any) {
    this.client = createClient({
      host: config.host,
      port: config.port,
      password: config.password,
      database: config.db,
      retryDelayOnFailover: 100,
      enableReadyCheck: true,
      maxRetriesPerRequest: 3,
    });

    this.client.on('error', (error) => {
      logger.error('Redis client error:', error);
    });

    this.client.on('connect', () => {
      logger.info('Redis client connected');
    });

    this.client.on('ready', () => {
      logger.info('Redis client ready');
      this.isConnected = true;
    });

    this.client.on('end', () => {
      logger.info('Redis client disconnected');
      this.isConnected = false;
    });
  }

  async connect(): Promise<void> {
    try {
      await this.client.connect();
      logger.info('Redis connection established');
    } catch (error) {
      logger.error('Failed to connect to Redis:', error);
      throw error;
    }
  }

  async disconnect(): Promise<void> {
    try {
      await this.client.disconnect();
      logger.info('Redis disconnected');
    } catch (error) {
      logger.error('Error disconnecting from Redis:', error);
    }
  }

  async isHealthy(): Promise<boolean> {
    try {
      const result = await this.client.ping();
      return result === 'PONG' && this.isConnected;
    } catch (error) {
      logger.error('Redis health check failed:', error);
      return false;
    }
  }

  // Generic key-value operations
  async set(key: string, value: string, ttl?: number): Promise<void> {
    try {
      if (ttl) {
        await this.client.setEx(key, ttl, value);
      } else {
        await this.client.set(key, value);
      }
    } catch (error) {
      logger.error(`Error setting key ${key}:`, error);
      throw error;
    }
  }

  async get(key: string): Promise<string | null> {
    try {
      return await this.client.get(key);
    } catch (error) {
      logger.error(`Error getting key ${key}:`, error);
      throw error;
    }
  }

  async del(key: string): Promise<number> {
    try {
      return await this.client.del(key);
    } catch (error) {
      logger.error(`Error deleting key ${key}:`, error);
      throw error;
    }
  }

  async exists(key: string): Promise<boolean> {
    try {
      const result = await this.client.exists(key);
      return result === 1;
    } catch (error) {
      logger.error(`Error checking existence of key ${key}:`, error);
      return false;
    }
  }

  // Cross-chain swap operations
  async setSwap(swap: CrossChainSwap): Promise<void> {
    const key = `swap:${swap.id}`;
    try {
      await this.client.hSet(key, {
        data: JSON.stringify(swap),
        status: swap.status,
        createdAt: swap.createdAt.toString(),
        updatedAt: swap.updatedAt.toString(),
      });

      // Add to status-based sets for efficient querying
      await this.client.sAdd(`swaps:status:${swap.status}`, swap.id);
      
      // Add to recent swaps list (keep last 1000)
      await this.client.lPush('swaps:recent', swap.id);
      await this.client.lTrim('swaps:recent', 0, 999);
      
      logger.debug(`Swap ${swap.id} stored in Redis`);
    } catch (error) {
      logger.error(`Error storing swap ${swap.id}:`, error);
      throw error;
    }
  }

  async getSwap(swapId: string): Promise<CrossChainSwap | null> {
    const key = `swap:${swapId}`;
    try {
      const data = await this.client.hGet(key, 'data');
      if (!data) {
        return null;
      }
      return JSON.parse(data) as CrossChainSwap;
    } catch (error) {
      logger.error(`Error retrieving swap ${swapId}:`, error);
      return null;
    }
  }

  async getAllSwaps(): Promise<CrossChainSwap[]> {
    try {
      const swapIds = await this.client.lRange('swaps:recent', 0, -1);
      const swaps: CrossChainSwap[] = [];
      
      for (const swapId of swapIds) {
        const swap = await this.getSwap(swapId);
        if (swap) {
          swaps.push(swap);
        }
      }
      
      return swaps;
    } catch (error) {
      logger.error('Error retrieving all swaps:', error);
      return [];
    }
  }

  async getSwapsByStatus(status: string): Promise<CrossChainSwap[]> {
    try {
      const swapIds = await this.client.sMembers(`swaps:status:${status}`);
      const swaps: CrossChainSwap[] = [];
      
      for (const swapId of swapIds) {
        const swap = await this.getSwap(swapId);
        if (swap) {
          swaps.push(swap);
        }
      }
      
      return swaps;
    } catch (error) {
      logger.error(`Error retrieving swaps with status ${status}:`, error);
      return [];
    }
  }

  async getSwapHistory(limit = 100): Promise<CrossChainSwap[]> {
    try {
      const swapIds = await this.client.lRange('swaps:recent', 0, limit - 1);
      const swaps: CrossChainSwap[] = [];
      
      for (const swapId of swapIds) {
        const swap = await this.getSwap(swapId);
        if (swap) {
          swaps.push(swap);
        }
      }
      
      return swaps.sort((a, b) => b.updatedAt - a.updatedAt);
    } catch (error) {
      logger.error('Error retrieving swap history:', error);
      return [];
    }
  }

  async removeSwap(swapId: string): Promise<void> {
    try {
      const swap = await this.getSwap(swapId);
      if (swap) {
        // Remove from status set
        await this.client.sRem(`swaps:status:${swap.status}`, swapId);
      }
      
      // Remove swap data
      await this.client.del(`swap:${swapId}`);
      
      // Remove from recent list
      await this.client.lRem('swaps:recent', 0, swapId);
      
      logger.debug(`Swap ${swapId} removed from Redis`);
    } catch (error) {
      logger.error(`Error removing swap ${swapId}:`, error);
      throw error;
    }
  }

  // Event tracking operations
  async recordEvent(eventKey: string, eventData: any, ttl = 86400): Promise<void> {
    try {
      await this.client.setEx(eventKey, ttl, JSON.stringify(eventData));
      
      // Add to events timeline
      await this.client.zAdd('events:timeline', {
        score: Date.now(),
        value: eventKey,
      });
      
      // Keep only recent events (last 10000)
      await this.client.zRemRangeByRank('events:timeline', 0, -10001);
      
    } catch (error) {
      logger.error(`Error recording event ${eventKey}:`, error);
      throw error;
    }
  }

  async getRecentEvents(limit = 100): Promise<any[]> {
    try {
      const eventKeys = await this.client.zRevRange('events:timeline', 0, limit - 1);
      const events = [];
      
      for (const key of eventKeys) {
        const data = await this.client.get(key);
        if (data) {
          events.push(JSON.parse(data));
        }
      }
      
      return events;
    } catch (error) {
      logger.error('Error retrieving recent events:', error);
      return [];
    }
  }

  // Performance monitoring
  async recordMetric(metric: string, value: number, timestamp?: number): Promise<void> {
    try {
      const score = timestamp || Date.now();
      await this.client.zAdd(`metrics:${metric}`, {
        score,
        value: value.toString(),
      });
      
      // Keep only last 24 hours of metrics
      const oneDayAgo = Date.now() - 86400000;
      await this.client.zRemRangeByScore(`metrics:${metric}`, 0, oneDayAgo);
      
    } catch (error) {
      logger.error(`Error recording metric ${metric}:`, error);
    }
  }

  async getMetrics(metric: string, fromTime?: number, toTime?: number): Promise<Array<{value: number, timestamp: number}>> {
    try {
      const from = fromTime || Date.now() - 3600000; // Last hour by default
      const to = toTime || Date.now();
      
      const results = await this.client.zRangeByScoreWithScores(`metrics:${metric}`, from, to);
      
      return results.map(item => ({
        value: parseFloat(item.value),
        timestamp: item.score,
      }));
    } catch (error) {
      logger.error(`Error retrieving metrics for ${metric}:`, error);
      return [];
    }
  }

  // Cache operations for frequently accessed data
  async cacheSet(key: string, value: any, ttl = 300): Promise<void> {
    try {
      await this.client.setEx(`cache:${key}`, ttl, JSON.stringify(value));
    } catch (error) {
      logger.error(`Error setting cache key ${key}:`, error);
    }
  }

  async cacheGet<T>(key: string): Promise<T | null> {
    try {
      const data = await this.client.get(`cache:${key}`);
      return data ? JSON.parse(data) as T : null;
    } catch (error) {
      logger.error(`Error getting cache key ${key}:`, error);
      return null;
    }
  }

  async cacheDel(key: string): Promise<void> {
    try {
      await this.client.del(`cache:${key}`);
    } catch (error) {
      logger.error(`Error deleting cache key ${key}:`, error);
    }
  }

  // Cleanup operations
  async cleanup(): Promise<void> {
    try {
      const now = Date.now();
      const oneDayAgo = now - 86400000;
      const oneWeekAgo = now - 604800000;

      // Clean up old events
      await this.client.zRemRangeByScore('events:timeline', 0, oneWeekAgo);

      // Clean up expired swaps
      const allSwapIds = await this.client.lRange('swaps:recent', 0, -1);
      for (const swapId of allSwapIds) {
        const swap = await this.getSwap(swapId);
        if (swap && swap.updatedAt < oneWeekAgo) {
          await this.removeSwap(swapId);
        }
      }

      logger.info('Redis cleanup completed');
    } catch (error) {
      logger.error('Error during Redis cleanup:', error);
    }
  }
}