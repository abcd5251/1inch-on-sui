/**
 * Database configuration and initialization
 * Uses Drizzle ORM and PostgreSQL for data persistence
 */

import { Elysia } from 'elysia';
import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import { migrate } from 'drizzle-orm/postgres-js/migrator';
import { eq } from 'drizzle-orm';
import * as schema from '../schema/index.js';
import { logger } from '../utils/logger.js';

/**
 * Database configuration interface
 */
export interface DatabaseConfig {
  connectionString: string;
  host?: string;
  port?: number;
  database?: string;
  username?: string;
  password?: string;
  ssl?: boolean;
  max?: number; // Maximum number of connections in pool
}

/**
 * Database connection manager
 */
export class DatabaseManager {
  private client: ReturnType<typeof postgres>;
  private db: ReturnType<typeof drizzle>;
  private config: DatabaseConfig;

  constructor(config: DatabaseConfig) {
    this.config = config;
    this.client = postgres(config.connectionString, {
      host: config.host,
      port: config.port,
      database: config.database,
      username: config.username,
      password: config.password,
      ssl: config.ssl ? 'require' : false,
      max: config.max || 20, // Maximum number of connections in pool
      idle_timeout: 20,
      connect_timeout: 10,
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
      logger.info('Initializing PostgreSQL database...');
      
      // Run database migrations
      await migrate(this.db, { 
        migrationsFolder: './drizzle/migrations' 
      });
      
      logger.info('PostgreSQL database initialized successfully');
    } catch (error) {
      logger.error('Failed to initialize PostgreSQL database:', error);
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
   * Test database connection
   */
  async testConnection(): Promise<void> {
    try {
      await this.client`SELECT 1 as test`;
      logger.info('PostgreSQL connection test successful');
    } catch (error) {
      logger.error('PostgreSQL connection test failed:', error);
      throw error;
    }
  }

  /**
   * Close database connection
   */
  async close(): Promise<void> {
    try {
      await this.client.end();
      logger.info('PostgreSQL connection closed');
    } catch (error) {
      logger.error('Failed to close PostgreSQL connection:', error);
    }
  }

  /**
   * Health check
   */
  async healthCheck(): Promise<boolean> {
    try {
      await this.client`SELECT 1 as health_check`;
      return true;
    } catch (error) {
      logger.error('PostgreSQL health check failed:', error);
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
        this.db.select().from(schema.swaps).where(eq(schema.swaps.status, 'active')),
        this.db.select().from(schema.swaps).where(eq(schema.swaps.status, 'completed')),
        this.db.select().from(schema.swaps).where(eq(schema.swaps.status, 'failed'))
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
    connectionString: process.env.DATABASE_URL || 'postgresql://localhost:5432/relayer',
    host: process.env.POSTGRES_HOST || 'localhost',
    port: parseInt(process.env.POSTGRES_PORT || '5432'),
    database: process.env.POSTGRES_DB || 'relayer',
    username: process.env.POSTGRES_USER || 'postgres',
    password: process.env.POSTGRES_PASSWORD || '',
    ssl: process.env.POSTGRES_SSL === 'true',
    max: parseInt(process.env.POSTGRES_MAX_CONNECTIONS || '20'),
  };

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
  
  return new Elysia({ name: 'database' })
    .derive(() => ({
      db: dbManager.getDatabase(),
      dbManager: dbManager,
    }))
    .onBeforeHandle(async ({ set }) => {
      // Database health check
      const isHealthy = await dbManager.healthCheck();
      if (!isHealthy) {
        set.status = 503;
        return { error: 'Database unavailable' };
      }
    });
}