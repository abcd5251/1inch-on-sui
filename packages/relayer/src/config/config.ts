import { config as loadEnv } from 'dotenv';
import { z } from 'zod';

// Load environment variables
loadEnv();

// Configuration schema validation
const configSchema = z.object({
  server: z.object({
    port: z.number().default(3001),
    environment: z.enum(['development', 'production', 'test']).default('development'),
  }),
  ethereum: z.object({
    rpcUrl: z.string().url(),
    wsUrl: z.string().url().optional(),
    chainId: z.number(),
    htlcContractAddress: z.string().regex(/^0x[a-fA-F0-9]{40}$/),
    privateKey: z.string().optional(),
    startBlock: z.number().optional(),
    confirmations: z.number().default(12),
  }),
  sui: z.object({
    rpcUrl: z.string().url(),
    wsUrl: z.string().url().optional(),
    network: z.enum(['mainnet', 'testnet', 'devnet']).default('testnet'),
    packageId: z.string(),
    privateKey: z.string().optional(),
    gasObjectId: z.string().optional(),
  }),
  redis: z.object({
    host: z.string().default('localhost'),
    port: z.number().default(6379),
    password: z.string().optional(),
    db: z.number().default(0),
  }),
  monitoring: z.object({
    enabled: z.boolean().default(true),
    pollInterval: z.number().default(5000), // 5 seconds
    maxRetries: z.number().default(3),
    retryDelay: z.number().default(1000), // 1 second
  }),
  logging: z.object({
    level: z.enum(['error', 'warn', 'info', 'debug']).default('info'),
    format: z.enum(['json', 'simple']).default('simple'),
    file: z.string().optional(),
  }),
});

// Parse and validate configuration
export const config = configSchema.parse({
  server: {
    port: parseInt(process.env.PORT || '3001'),
    environment: process.env.NODE_ENV || 'development',
  },
  ethereum: {
    rpcUrl: process.env.ETHEREUM_RPC_URL || 'https://eth-sepolia.g.alchemy.com/v2/your-api-key',
    wsUrl: process.env.ETHEREUM_WS_URL,
    chainId: parseInt(process.env.ETHEREUM_CHAIN_ID || '11155111'), // Sepolia testnet
    htlcContractAddress: process.env.ETHEREUM_HTLC_CONTRACT || '0x0000000000000000000000000000000000000000',
    privateKey: process.env.ETHEREUM_PRIVATE_KEY,
    startBlock: process.env.ETHEREUM_START_BLOCK ? parseInt(process.env.ETHEREUM_START_BLOCK) : undefined,
    confirmations: parseInt(process.env.ETHEREUM_CONFIRMATIONS || '12'),
  },
  sui: {
    rpcUrl: process.env.SUI_RPC_URL || 'https://fullnode.testnet.sui.io:443',
    wsUrl: process.env.SUI_WS_URL,
    network: process.env.SUI_NETWORK || 'testnet',
    packageId: process.env.SUI_PACKAGE_ID || '0x0000000000000000000000000000000000000000000000000000000000000000',
    privateKey: process.env.SUI_PRIVATE_KEY,
    gasObjectId: process.env.SUI_GAS_OBJECT_ID,
  },
  redis: {
    host: process.env.REDIS_HOST || 'localhost',
    port: parseInt(process.env.REDIS_PORT || '6379'),
    password: process.env.REDIS_PASSWORD,
    db: parseInt(process.env.REDIS_DB || '0'),
  },
  monitoring: {
    enabled: process.env.MONITORING_ENABLED !== 'false',
    pollInterval: parseInt(process.env.POLL_INTERVAL || '5000'),
    maxRetries: parseInt(process.env.MAX_RETRIES || '3'),
    retryDelay: parseInt(process.env.RETRY_DELAY || '1000'),
  },
  logging: {
    level: process.env.LOG_LEVEL || 'info',
    format: process.env.LOG_FORMAT || 'simple',
    file: process.env.LOG_FILE,
  },
});

export type Config = z.infer<typeof configSchema>;