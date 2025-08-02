/**
 * Database configuration and initialization
 * Uses Drizzle ORM and SQLite/Turso for data persistence
 */

import { drizzle } from 'drizzle-orm/libsql';
import { createClient } from '@libsql/client';
import { migrate } from 'drizzle-orm/libsql/migrator';
import * as schema from '../schema/index.js';
import { logger } from '../utils/logger.js';

/**
 * Database configuration interface
 */
export interface DatabaseConfig {
  url: string;
  authToken?: string;
  syncUrl?: string;
  syncInterval?: number;
  encryptionKey?: string;
}

/**
 * Database connection manager
 */
export class DatabaseManager {
  private client: ReturnType<typeof createClient>;
  private db: ReturnType<typeof drizzle>;
  private config: DatabaseConfig;

  constructor(config: DatabaseConfig) {
    this.config = config;
    this.client = createClient({
      url: config.url,
      authToken: config.authToken,
      syncUrl: config.syncUrl,
      syncInterval: config.syncInterval || 60000, // 1 minute sync interval
      encryptionKey: config.encryptionKey,
    });
    
    this.db = drizzle(this.client, { 
      schema,
      logger: process.env.NODE_ENV === 'development'
    });
  }

  /**
   * Initialize database (run migrations)
   */
  async initialize(): Promise<void> {
    try {
      logger.info('Initializing database...');
      
      // Temporarily skip database migrations
      // await migrate(this.db, { 
      //   migrationsFolder: './drizzle/migrations' 
      // });
      
      logger.info('Database initialized successfully (migrations skipped)');
    } catch (error) {
      logger.error('Failed to initialize database:', error);
      throw error;
    }
  }

  /**
   * Get database instance
   */
  getDatabase() {
    return this.db;
  }

  /**
   * Get client instance
   */
  getClient() {
    return this.client;
  }

  /**
   * Sync database (for Turso)
   */
  async sync(): Promise<void> {
    try {
      if (this.config.syncUrl) {
        await this.client.sync();
        logger.info('Database synced successfully');
      }
    } catch (error) {
      logger.error('Failed to sync database:', error);
    }
  }

  /**
   * Close database connection
   */
  async close(): Promise<void> {
    try {
      await this.client.close();
      logger.info('Database connection closed');
    } catch (error) {
      logger.error('Failed to close database connection:', error);
    }
  }

  /**
   * Health check
   */
  async healthCheck(): Promise<boolean> {
    try {
      await this.client.execute('SELECT 1');
      return true;
    } catch (error) {
      logger.error('Database health check failed:', error);
      return false;
    }
  }

  /**
   * Get database statistics
   */
  async getStats(): Promise<{
    totalSwaps: number;
    activeSwaps: number;
    completedSwaps: number;
    failedSwaps: number;
  }> {
    try {
      const [
        totalSwaps,
        activeSwaps,
        completedSwaps,
        failedSwaps
      ] = await Promise.all([
        this.db.select().from(schema.swaps),
        this.db.select().from(schema.swaps).where(schema.eq(schema.swaps.status, 'active')),
        this.db.select().from(schema.swaps).where(schema.eq(schema.swaps.status, 'completed')),
        this.db.select().from(schema.swaps).where(schema.eq(schema.swaps.status, 'failed'))
      ]);

      return {
        totalSwaps: totalSwaps.length,
        activeSwaps: activeSwaps.length,
        completedSwaps: completedSwaps.length,
        failedSwaps: failedSwaps.length,
      };
    } catch (error) {
      logger.error('Failed to get database stats:', error);
      return {
        totalSwaps: 0,
        activeSwaps: 0,
        completedSwaps: 0,
        failedSwaps: 0,
      };
    }
  }
}

/**
 * Get database configuration
 */
export function getDatabaseConfig(): DatabaseConfig {
  const config: DatabaseConfig = {
    url: process.env.DATABASE_URL || 'file:./data/relayer.db',
  };

  // Turso configuration
  if (process.env.TURSO_DATABASE_URL) {
    config.url = process.env.TURSO_DATABASE_URL;
    config.authToken = process.env.TURSO_AUTH_TOKEN;
    config.syncUrl = process.env.TURSO_SYNC_URL;
    config.syncInterval = parseInt(process.env.TURSO_SYNC_INTERVAL || '60000');
  }

  // Encryption configuration
  if (process.env.DATABASE_ENCRYPTION_KEY) {
    config.encryptionKey = process.env.DATABASE_ENCRYPTION_KEY;
  }

  return config;
}

/**
 * Default database instance
 */
let databaseManager: DatabaseManager | null = null;

export function getDatabaseManager(): DatabaseManager {
  if (!databaseManager) {
    const config = getDatabaseConfig();
    databaseManager = new DatabaseManager(config);
  }
  return databaseManager;
}

/**
 * Database middleware (for Elysia)
 */
export function createDatabaseMiddleware() {
  const dbManager = getDatabaseManager();
  
  return {
    beforeHandle: async ({ set }: any) => {
      // Database health check
      const isHealthy = await dbManager.healthCheck();
      if (!isHealthy) {
        set.status = 503;
        return { error: 'Database unavailable' };
      }
    },
    derive: () => ({
      db: dbManager.getDatabase(),
      dbManager: dbManager,
    }),
  };
}