/**
 * Redis Service Class
 * Provides Redis connection management and caching functionality
 */

import Redis, { RedisOptions } from 'ioredis';
import { logger } from '../../utils/logger.js';

/**
 * Redis configuration interface
 */
export interface RedisConfig {
  host: string;
  port: number;
  password?: string;
  db?: number;
  keyPrefix?: string;
  maxRetriesPerRequest?: number;
  retryDelayOnFailover?: number;
  connectTimeout?: number;
  commandTimeout?: number;
  enableOfflineQueue?: boolean;
}

/**
 * Redis statistics interface
 */
export interface RedisStats {
  connected: boolean;
  ready: boolean;
  connecting: boolean;
  error?: string;
  used_memory?: number;
  connected_clients?: number;
  total_commands_processed?: number;
  keyspace_hits?: number;
  keyspace_misses?: number;
}

/**
 * Redis service class
 */
export class RedisService {
  private client: Redis;
  private config: RedisConfig;
  private isConnected = false;
  private connectionAttempts = 0;
  private maxConnectionAttempts = 5;

  constructor(config?: Partial<RedisConfig>) {
    this.config = {
      host: process.env.REDIS_HOST || 'localhost',
      port: parseInt(process.env.REDIS_PORT || '6379'),
      password: process.env.REDIS_PASSWORD,
      db: parseInt(process.env.REDIS_DB || '0'),
      keyPrefix: process.env.REDIS_KEY_PREFIX || '1inch:fusion:',
      maxRetriesPerRequest: 3,
      retryDelayOnFailover: 100,
      connectTimeout: 10000,
      commandTimeout: 5000,
      enableOfflineQueue: false,
      ...config,
    };

    this.createClient();
  }

  /**
   * Create Redis client
   */
  private createClient(): void {
    const redisOptions: RedisOptions = {
      host: this.config.host,
      port: this.config.port,
      password: this.config.password,
      db: this.config.db,
      keyPrefix: this.config.keyPrefix,
      maxRetriesPerRequest: this.config.maxRetriesPerRequest,
      retryDelayOnFailover: this.config.retryDelayOnFailover,
      connectTimeout: this.config.connectTimeout,
      commandTimeout: this.config.commandTimeout,
      enableOfflineQueue: this.config.enableOfflineQueue,
      lazyConnect: true,
    };

    this.client = new Redis(redisOptions);

    // Connection event listeners
    this.client.on('connect', () => {
      logger.info('Redis client connecting...');
    });

    this.client.on('ready', () => {
      this.isConnected = true;
      this.connectionAttempts = 0;
      logger.info('Redis client connected and ready');
    });

    this.client.on('error', (error) => {
      this.isConnected = false;
      logger.error('Redis client error:', error);
    });

    this.client.on('close', () => {
      this.isConnected = false;
      logger.warn('Redis client connection closed');
    });

    this.client.on('reconnecting', (delay) => {
      this.connectionAttempts++;
      logger.info(`Redis client reconnecting in ${delay}ms (attempt ${this.connectionAttempts})`);
    });
  }

  /**
   * Connect to Redis
   */
  async connect(): Promise<void> {
    try {
      if (this.isConnected) {
        logger.warn('Redis client is already connected');
        return;
      }

      await this.client.connect();
      logger.info('Redis service connected successfully');
    } catch (error) {
      logger.error('Failed to connect to Redis:', error);
      throw error;
    }
  }

  /**
   * Disconnect from Redis
   */
  async disconnect(): Promise<void> {
    try {
      if (this.client) {
        await this.client.quit();
        this.isConnected = false;
        logger.info('Redis service disconnected');
      }
    } catch (error) {
      logger.error('Error disconnecting from Redis:', error);
    }
  }

  /**
   * Check connection status
   */
  isConnected_(): boolean {
    return this.isConnected && this.client.status === 'ready';
  }

  /**
   * Get raw Redis client
   */
  getClient(): Redis {
    return this.client;
  }

  // ========== Basic Operations ==========

  /**
   * Set key-value
   */
  async set(key: string, value: string | number | Buffer, ttl?: number): Promise<void> {
    try {
      if (ttl) {
        await this.client.setex(key, ttl, value);
      } else {
        await this.client.set(key, value);
      }
    } catch (error) {
      logger.error(`Redis SET failed for key ${key}:`, error);
      throw error;
    }
  }

  /**
   * Get key value
   */
  async get(key: string): Promise<string | null> {
    try {
      return await this.client.get(key);
    } catch (error) {
      logger.error(`Redis GET failed for key ${key}:`, error);
      throw error;
    }
  }

  /**
   * Delete key
   */
  async del(key: string): Promise<number> {
    try {
      return await this.client.del(key);
    } catch (error) {
      logger.error(`Redis DEL failed for key ${key}:`, error);
      throw error;
    }
  }

  /**
   * Check if key exists
   */
  async exists(key: string): Promise<boolean> {
    try {
      const result = await this.client.exists(key);
      return result === 1;
    } catch (error) {
      logger.error(`Redis EXISTS failed for key ${key}:`, error);
      throw error;
    }
  }

  /**
   * Set expiration time
   */
  async expire(key: string, ttl: number): Promise<boolean> {
    try {
      const result = await this.client.expire(key, ttl);
      return result === 1;
    } catch (error) {
      logger.error(`Redis EXPIRE failed for key ${key}:`, error);
      throw error;
    }
  }

  /**
   * Get remaining expiration time
   */
  async ttl(key: string): Promise<number> {
    try {
      return await this.client.ttl(key);
    } catch (error) {
      logger.error(`Redis TTL failed for key ${key}:`, error);
      throw error;
    }
  }

  // ========== Convenience Methods ==========

  /**
   * Set key-value with expiration time
   */
  async setex(key: string, ttl: number, value: string | number | Buffer): Promise<void> {
    return this.set(key, value, ttl);
  }

  /**
   * Set JSON object
   */
  async setJSON(key: string, value: any, ttl?: number): Promise<void> {
    const jsonString = JSON.stringify(value);
    await this.set(key, jsonString, ttl);
  }

  /**
   * Get JSON object
   */
  async getJSON<T = any>(key: string): Promise<T | null> {
    const value = await this.get(key);
    if (value === null) {
      return null;
    }

    try {
      return JSON.parse(value) as T;
    } catch (error) {
      logger.error(`Failed to parse JSON for key ${key}:`, error);
      return null;
    }
  }

  /**
   * Atomic increment
   */
  async incr(key: string): Promise<number> {
    try {
      return await this.client.incr(key);
    } catch (error) {
      logger.error(`Redis INCR failed for key ${key}:`, error);
      throw error;
    }
  }

  /**
   * Atomic decrement
   */
  async decr(key: string): Promise<number> {
    try {
      return await this.client.decr(key);
    } catch (error) {
      logger.error(`Redis DECR failed for key ${key}:`, error);
      throw error;
    }
  }

  // ========== Hash Operations ==========

  /**
   * Set hash field
   */
  async hset(key: string, field: string, value: string | number): Promise<void> {
    try {
      await this.client.hset(key, field, value);
    } catch (error) {
      logger.error(`Redis HSET failed for key ${key}, field ${field}:`, error);
      throw error;
    }
  }

  /**
   * Get hash field
   */
  async hget(key: string, field: string): Promise<string | null> {
    try {
      return await this.client.hget(key, field);
    } catch (error) {
      logger.error(`Redis HGET failed for key ${key}, field ${field}:`, error);
      throw error;
    }
  }

  /**
   * Get all hash fields
   */
  async hgetall(key: string): Promise<Record<string, string>> {
    try {
      return await this.client.hgetall(key);
    } catch (error) {
      logger.error(`Redis HGETALL failed for key ${key}:`, error);
      throw error;
    }
  }

  /**
   * Delete hash field
   */
  async hdel(key: string, field: string): Promise<number> {
    try {
      return await this.client.hdel(key, field);
    } catch (error) {
      logger.error(`Redis HDEL failed for key ${key}, field ${field}:`, error);
      throw error;
    }
  }

  // ========== List Operations ==========

  /**
   * Push to left side of list
   */
  async lpush(key: string, value: string | number): Promise<number> {
    try {
      return await this.client.lpush(key, value);
    } catch (error) {
      logger.error(`Redis LPUSH failed for key ${key}:`, error);
      throw error;
    }
  }

  /**
   * Push to right side of list
   */
  async rpush(key: string, value: string | number): Promise<number> {
    try {
      return await this.client.rpush(key, value);
    } catch (error) {
      logger.error(`Redis RPUSH failed for key ${key}:`, error);
      throw error;
    }
  }

  /**
   * Pop from left side of list
   */
  async lpop(key: string): Promise<string | null> {
    try {
      return await this.client.lpop(key);
    } catch (error) {
      logger.error(`Redis LPOP failed for key ${key}:`, error);
      throw error;
    }
  }

  /**
   * Pop from right side of list
   */
  async rpop(key: string): Promise<string | null> {
    try {
      return await this.client.rpop(key);
    } catch (error) {
      logger.error(`Redis RPOP failed for key ${key}:`, error);
      throw error;
    }
  }

  /**
   * Get list length
   */
  async llen(key: string): Promise<number> {
    try {
      return await this.client.llen(key);
    } catch (error) {
      logger.error(`Redis LLEN failed for key ${key}:`, error);
      throw error;
    }
  }

  // ========== Set Operations ==========

  /**
   * Add set member
   */
  async sadd(key: string, member: string | number): Promise<number> {
    try {
      return await this.client.sadd(key, member);
    } catch (error) {
      logger.error(`Redis SADD failed for key ${key}:`, error);
      throw error;
    }
  }

  /**
   * Remove set member
   */
  async srem(key: string, member: string | number): Promise<number> {
    try {
      return await this.client.srem(key, member);
    } catch (error) {
      logger.error(`Redis SREM failed for key ${key}:`, error);
      throw error;
    }
  }

  /**
   * Check set member
   */
  async sismember(key: string, member: string | number): Promise<boolean> {
    try {
      const result = await this.client.sismember(key, member);
      return result === 1;
    } catch (error) {
      logger.error(`Redis SISMEMBER failed for key ${key}:`, error);
      throw error;
    }
  }

  /**
   * Get all set members
   */
  async smembers(key: string): Promise<string[]> {
    try {
      return await this.client.smembers(key);
    } catch (error) {
      logger.error(`Redis SMEMBERS failed for key ${key}:`, error);
      throw error;
    }
  }

  // ========== Statistics and Monitoring ==========

  /**
   * Get Redis statistics
   */
  async getStats(): Promise<RedisStats> {
    try {
      const info = await this.client.info('memory,stats,clients');
      const lines = info.split('\r\n');
      const stats: any = {};

      for (const line of lines) {
        if (line.includes(':')) {
          const [key, value] = line.split(':');
          if (value && !isNaN(Number(value))) {
            stats[key] = Number(value);
          }
        }
      }

      return {
        connected: this.isConnected,
        ready: this.client.status === 'ready',
        connecting: this.client.status === 'connecting',
        used_memory: stats.used_memory,
        connected_clients: stats.connected_clients,
        total_commands_processed: stats.total_commands_processed,
        keyspace_hits: stats.keyspace_hits,
        keyspace_misses: stats.keyspace_misses,
      };
    } catch (error) {
      logger.error('Failed to get Redis stats:', error);
      return {
        connected: this.isConnected,
        ready: false,
        connecting: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  /**
   * Get connection status
   */
  isConnected(): boolean {
    return this.isConnected_();
  }

  /**
   * Health check
   */
  async healthCheck(): Promise<boolean> {
    try {
      const result = await this.client.ping();
      return result === 'PONG';
    } catch (error) {
      logger.error('Redis health check failed:', error);
      return false;
    }
  }
}