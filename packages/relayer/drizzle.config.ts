/**
 * Drizzle configuration for PostgreSQL
 * This file configures Drizzle Kit for database migrations and introspection
 */

import type { Config } from 'drizzle-kit';
import { config } from 'dotenv';

// Load environment variables
config();

export default {
  schema: './src/schema/index.ts',
  out: './drizzle/migrations',
  driver: 'pg',
  dbCredentials: {
    connectionString: process.env.DATABASE_URL || 'postgresql://localhost:5432/relayer',
    host: process.env.POSTGRES_HOST || 'localhost',
    port: parseInt(process.env.POSTGRES_PORT || '5432'),
    user: process.env.POSTGRES_USER || 'postgres',
    password: process.env.POSTGRES_PASSWORD || '',
    database: process.env.POSTGRES_DB || 'relayer',
    ssl: process.env.POSTGRES_SSL === 'true',
  },
  verbose: true,
  strict: true,
} satisfies Config;