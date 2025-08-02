/**
 * Database schema definitions
 * Define all table structures and relationships
 */

import { sql } from 'drizzle-orm';
import { 
  sqliteTable, 
  text, 
  integer, 
  real,
  blob,
  index,
  uniqueIndex
} from 'drizzle-orm/sqlite-core';
import { relations } from 'drizzle-orm';

/**
 * Cross-chain swap records table
 */
export const swaps = sqliteTable('swaps', {
  // Primary key
  id: text('id').primaryKey(),
  
  // Basic information
  orderId: text('order_id').notNull(),
  maker: text('maker').notNull(),
  taker: text('taker'),
  
  // Amount information
  makingAmount: text('making_amount').notNull(),
  takingAmount: text('taking_amount').notNull(),
  makingToken: text('making_token').notNull(),
  takingToken: text('taking_token').notNull(),
  
  // Chain information
  sourceChain: text('source_chain').notNull(),
  targetChain: text('target_chain').notNull(),
  
  // HTLC information
  secretHash: text('secret_hash').notNull(),
  secret: text('secret'),
  timeLock: integer('time_lock').notNull(),
  
  // Contract addresses
  sourceContract: text('source_contract').notNull(),
  targetContract: text('target_contract').notNull(),
  
  // Transaction hashes
  sourceTransactionHash: text('source_transaction_hash'),
  targetTransactionHash: text('target_transaction_hash'),
  refundTransactionHash: text('refund_transaction_hash'),
  
  // Status information
  status: text('status').notNull().default('pending'), // pending, active, completed, failed, refunded
  substatus: text('substatus'), // Detailed status information
  
  // Timestamps
  createdAt: integer('created_at').notNull().default(sql`(unixepoch())`),
  updatedAt: integer('updated_at').notNull().default(sql`(unixepoch())`),
  expiresAt: integer('expires_at').notNull(),
  
  // Retry information
  retryCount: integer('retry_count').notNull().default(0),
  maxRetries: integer('max_retries').notNull().default(3),
  lastRetryAt: integer('last_retry_at'),
  
  // Fee information
  estimatedGas: text('estimated_gas'),
  actualGas: text('actual_gas'),
  gasPrice: text('gas_price'),
  relayerFee: text('relayer_fee'),
  
  // Metadata
  metadata: text('metadata', { mode: 'json' }),
  
  // Error information
  errorMessage: text('error_message'),
  errorCode: text('error_code'),
}, (table) => ({
  // Indexes
  orderIdIdx: index('idx_swaps_order_id').on(table.orderId),
  makerIdx: index('idx_swaps_maker').on(table.maker),
  takerIdx: index('idx_swaps_taker').on(table.taker),
  statusIdx: index('idx_swaps_status').on(table.status),
  secretHashIdx: uniqueIndex('idx_swaps_secret_hash').on(table.secretHash),
  createdAtIdx: index('idx_swaps_created_at').on(table.createdAt),
  expiresAtIdx: index('idx_swaps_expires_at').on(table.expiresAt),
  sourceChainIdx: index('idx_swaps_source_chain').on(table.sourceChain),
  targetChainIdx: index('idx_swaps_target_chain').on(table.targetChain),
}));

/**
 * Event logs table
 */
export const eventLogs = sqliteTable('event_logs', {
  id: text('id').primaryKey(),
  
  // Associated swap ID
  swapId: text('swap_id').references(() => swaps.id, { onDelete: 'cascade' }),
  
  // Event information
  eventType: text('event_type').notNull(), // OrderCreated, OrderFilled, SecretRevealed, etc.
  eventData: text('event_data', { mode: 'json' }).notNull(),
  
  // Chain and transaction information
  chainId: text('chain_id').notNull(),
  blockNumber: integer('block_number').notNull(),
  transactionHash: text('transaction_hash').notNull(),
  logIndex: integer('log_index').notNull(),
  
  // Timestamps
  timestamp: integer('timestamp').notNull(),
  createdAt: integer('created_at').notNull().default(sql`(unixepoch())`),
  
  // Processing status
  processed: integer('processed', { mode: 'boolean' }).notNull().default(false),
  processedAt: integer('processed_at'),
  
  // Error information
  errorMessage: text('error_message'),
}, (table) => ({
  swapIdIdx: index('idx_event_logs_swap_id').on(table.swapId),
  eventTypeIdx: index('idx_event_logs_event_type').on(table.eventType),
  chainIdIdx: index('idx_event_logs_chain_id').on(table.chainId),
  blockNumberIdx: index('idx_event_logs_block_number').on(table.blockNumber),
  transactionHashIdx: index('idx_event_logs_transaction_hash').on(table.transactionHash),
  timestampIdx: index('idx_event_logs_timestamp').on(table.timestamp),
  processedIdx: index('idx_event_logs_processed').on(table.processed),
  // Composite index for deduplication
  uniqueEventIdx: uniqueIndex('idx_event_logs_unique').on(
    table.chainId, 
    table.transactionHash, 
    table.logIndex
  ),
}));

/**
 * Block sync status table
 */
export const blockSyncStatus = sqliteTable('block_sync_status', {
  chainId: text('chain_id').primaryKey(),
  
  // Sync status
  lastSyncedBlock: integer('last_synced_block').notNull().default(0),
  currentBlock: integer('current_block').notNull().default(0),
  
  // Timestamps
  lastSyncAt: integer('last_sync_at').notNull().default(sql`(unixepoch())`),
  
  // Sync configuration
  batchSize: integer('batch_size').notNull().default(100),
  confirmations: integer('confirmations').notNull().default(12),
  
  // Status information
  isActive: integer('is_active', { mode: 'boolean' }).notNull().default(true),
  errorCount: integer('error_count').notNull().default(0),
  lastError: text('last_error'),
}, (table) => ({
  lastSyncAtIdx: index('idx_block_sync_last_sync_at').on(table.lastSyncAt),
  isActiveIdx: index('idx_block_sync_is_active').on(table.isActive),
}));

/**
 * Relayer configuration table
 */
export const relayerConfig = sqliteTable('relayer_config', {
  key: text('key').primaryKey(),
  value: text('value').notNull(),
  type: text('type').notNull().default('string'), // string, number, boolean, json
  description: text('description'),
  
  // Timestamps
  createdAt: integer('created_at').notNull().default(sql`(unixepoch())`),
  updatedAt: integer('updated_at').notNull().default(sql`(unixepoch())`),
}, (table) => ({
  typeIdx: index('idx_relayer_config_type').on(table.type),
}));

/**
 * Notification records table
 */
export const notifications = sqliteTable('notifications', {
  id: text('id').primaryKey(),
  
  // Associated information
  swapId: text('swap_id').references(() => swaps.id, { onDelete: 'cascade' }),
  
  // Notification information
  type: text('type').notNull(), // webhook, email, telegram, etc.
  recipient: text('recipient').notNull(),
  title: text('title').notNull(),
  message: text('message').notNull(),
  data: text('data', { mode: 'json' }),
  
  // Status information
  status: text('status').notNull().default('pending'), // pending, sent, failed
  retryCount: integer('retry_count').notNull().default(0),
  maxRetries: integer('max_retries').notNull().default(3),
  
  // Timestamps
  createdAt: integer('created_at').notNull().default(sql`(unixepoch())`),
  sentAt: integer('sent_at'),
  
  // Error information
  errorMessage: text('error_message'),
  
  // HTTP specific fields
  httpMethod: text('http_method'),
  httpUrl: text('http_url'),
  httpHeaders: text('http_headers', { mode: 'json' }),
  httpStatusCode: integer('http_status_code'),
  httpResponse: text('http_response'),
}, (table) => ({
  swapIdIdx: index('idx_notifications_swap_id').on(table.swapId),
  typeIdx: index('idx_notifications_type').on(table.type),
  statusIdx: index('idx_notifications_status').on(table.status),
  createdAtIdx: index('idx_notifications_created_at').on(table.createdAt),
}));

/**
 * Performance metrics table
 */
export const metrics = sqliteTable('metrics', {
  id: text('id').primaryKey(),
  
  // Metric information
  name: text('name').notNull(),
  value: real('value').notNull(),
  tags: text('tags', { mode: 'json' }), // Tags for grouping and filtering
  
  // Timestamps
  timestamp: integer('timestamp').notNull(),
  
  // Metadata
  metadata: text('metadata', { mode: 'json' }),
}, (table) => ({
  nameIdx: index('idx_metrics_name').on(table.name),
  timestampIdx: index('idx_metrics_timestamp').on(table.timestamp),
  nameTimestampIdx: index('idx_metrics_name_timestamp').on(table.name, table.timestamp),
}));

// ========== Relationship Definitions ==========

/**
 * Swap records relationships
 */
export const swapsRelations = relations(swaps, ({ many }) => ({
  eventLogs: many(eventLogs),
  notifications: many(notifications),
}));

/**
 * Event logs relationships
 */
export const eventLogsRelations = relations(eventLogs, ({ one }) => ({
  swap: one(swaps, {
    fields: [eventLogs.swapId],
    references: [swaps.id],
  }),
}));

/**
 * Notification records relationships
 */
export const notificationsRelations = relations(notifications, ({ one }) => ({
  swap: one(swaps, {
    fields: [notifications.swapId],
    references: [swaps.id],
  }),
}));

// ========== Type Exports ==========

export type Swap = typeof swaps.$inferSelect;
export type NewSwap = typeof swaps.$inferInsert;

export type EventLog = typeof eventLogs.$inferSelect;
export type NewEventLog = typeof eventLogs.$inferInsert;

export type BlockSyncStatus = typeof blockSyncStatus.$inferSelect;
export type NewBlockSyncStatus = typeof blockSyncStatus.$inferInsert;

export type RelayerConfig = typeof relayerConfig.$inferSelect;
export type NewRelayerConfig = typeof relayerConfig.$inferInsert;

export type Notification = typeof notifications.$inferSelect;
export type NewNotification = typeof notifications.$inferInsert;

export type Metric = typeof metrics.$inferSelect;
export type NewMetric = typeof metrics.$inferInsert;

// ========== Constant Definitions ==========

/**
 * Swap status enumeration
 */
export const SwapStatus = {
  PENDING: 'pending',
  ACTIVE: 'active',
  COMPLETED: 'completed',
  FAILED: 'failed',
  REFUNDED: 'refunded',
} as const;

/**
 * Event type enumeration
 */
export const EventType = {
  ORDER_CREATED: 'OrderCreated',
  ORDER_FILLED: 'OrderFilled',
  SECRET_REVEALED: 'SecretRevealed',
  SWAP_COMPLETED: 'SwapCompleted',
  SWAP_REFUNDED: 'SwapRefunded',
  CROSS_CHAIN_INITIATED: 'CrossChainInitiated',
  CROSS_CHAIN_CONFIRMED: 'CrossChainConfirmed',
} as const;

/**
 * Notification type enumeration
 */
export const NotificationType = {
  WEBHOOK: 'webhook',
  EMAIL: 'email',
  TELEGRAM: 'telegram',
  SLACK: 'slack',
} as const;