/**
 * Database schema definitions
 * Define all table structures and relationships
 */

import { sql } from 'drizzle-orm';
import { 
  pgTable, 
  varchar, 
  text,
  integer, 
  decimal,
  bytea,
  jsonb,
  index,
  uniqueIndex,
  timestamp,
  boolean
} from 'drizzle-orm/pg-core';
import { relations } from 'drizzle-orm';

/**
 * Cross-chain swap records table
 */
export const swaps = pgTable('swaps', {
  // Primary key
  id: varchar('id', { length: 255 }).primaryKey(),
  
  // Basic information
  orderId: varchar('order_id', { length: 255 }).notNull(),
  maker: varchar('maker', { length: 255 }).notNull(),
  taker: varchar('taker', { length: 255 }),
  
  // Amount information
  makingAmount: varchar('making_amount', { length: 100 }).notNull(),
  takingAmount: varchar('taking_amount', { length: 100 }).notNull(),
  makingToken: varchar('making_token', { length: 255 }).notNull(),
  takingToken: varchar('taking_token', { length: 255 }).notNull(),
  
  // Chain information
  sourceChain: varchar('source_chain', { length: 100 }).notNull(),
  targetChain: varchar('target_chain', { length: 100 }).notNull(),
  
  // HTLC information
  secretHash: varchar('secret_hash', { length: 255 }).notNull(),
  secret: varchar('secret', { length: 255 }),
  timeLock: integer('time_lock').notNull(),
  
  // Contract addresses
  sourceContract: varchar('source_contract', { length: 255 }).notNull(),
  targetContract: varchar('target_contract', { length: 255 }).notNull(),
  
  // Transaction hashes
  sourceTransactionHash: varchar('source_transaction_hash', { length: 255 }),
  targetTransactionHash: varchar('target_transaction_hash', { length: 255 }),
  refundTransactionHash: varchar('refund_transaction_hash', { length: 255 }),
  
  // Status information
  status: varchar('status', { length: 50 }).notNull().default('pending'), // pending, active, completed, failed, refunded
  substatus: varchar('substatus', { length: 100 }), // Detailed status information
  
  // Timestamps (keeping as integer for Unix timestamps)
  createdAt: integer('created_at').notNull().default(sql`extract(epoch from now())`),
  updatedAt: integer('updated_at').notNull().default(sql`extract(epoch from now())`),
  expiresAt: integer('expires_at').notNull(),
  
  // Retry information
  retryCount: integer('retry_count').notNull().default(0),
  maxRetries: integer('max_retries').notNull().default(3),
  lastRetryAt: integer('last_retry_at'),
  
  // Fee information
  estimatedGas: varchar('estimated_gas', { length: 100 }),
  actualGas: varchar('actual_gas', { length: 100 }),
  gasPrice: varchar('gas_price', { length: 100 }),
  relayerFee: varchar('relayer_fee', { length: 100 }),
  
  // Metadata
  metadata: jsonb('metadata'),
  
  // Error information
  errorMessage: text('error_message'),
  errorCode: varchar('error_code', { length: 100 }),
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
export const eventLogs = pgTable('event_logs', {
  id: varchar('id', { length: 255 }).primaryKey(),
  
  // Associated swap ID
  swapId: varchar('swap_id', { length: 255 }).references(() => swaps.id, { onDelete: 'cascade' }),
  
  // Event information
  eventType: varchar('event_type', { length: 100 }).notNull(), // OrderCreated, OrderFilled, SecretRevealed, etc.
  eventData: jsonb('event_data').notNull(),
  
  // Chain and transaction information
  chainId: varchar('chain_id', { length: 100 }).notNull(),
  blockNumber: integer('block_number').notNull(),
  transactionHash: varchar('transaction_hash', { length: 255 }).notNull(),
  logIndex: integer('log_index').notNull(),
  
  // Timestamps
  timestamp: integer('timestamp').notNull(),
  createdAt: integer('created_at').notNull().default(sql`extract(epoch from now())`),
  
  // Processing status
  processed: boolean('processed').notNull().default(false),
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
export const blockSyncStatus = pgTable('block_sync_status', {
  chainId: varchar('chain_id', { length: 100 }).primaryKey(),
  
  // Sync status
  lastSyncedBlock: integer('last_synced_block').notNull().default(0),
  currentBlock: integer('current_block').notNull().default(0),
  
  // Timestamps
  lastSyncAt: integer('last_sync_at').notNull().default(sql`extract(epoch from now())`),
  
  // Sync configuration
  batchSize: integer('batch_size').notNull().default(100),
  confirmations: integer('confirmations').notNull().default(12),
  
  // Status information
  isActive: boolean('is_active').notNull().default(true),
  errorCount: integer('error_count').notNull().default(0),
  lastError: text('last_error'),
}, (table) => ({
  lastSyncAtIdx: index('idx_block_sync_last_sync_at').on(table.lastSyncAt),
  isActiveIdx: index('idx_block_sync_is_active').on(table.isActive),
}));

/**
 * Relayer configuration table
 */
export const relayerConfig = pgTable('relayer_config', {
  key: varchar('key', { length: 255 }).primaryKey(),
  value: text('value').notNull(),
  type: varchar('type', { length: 50 }).notNull().default('string'), // string, number, boolean, json
  description: text('description'),
  
  // Timestamps
  createdAt: integer('created_at').notNull().default(sql`extract(epoch from now())`),
  updatedAt: integer('updated_at').notNull().default(sql`extract(epoch from now())`),
}, (table) => ({
  typeIdx: index('idx_relayer_config_type').on(table.type),
}));

/**
 * Notification records table
 */
export const notifications = pgTable('notifications', {
  id: varchar('id', { length: 255 }).primaryKey(),
  
  // Associated information
  swapId: varchar('swap_id', { length: 255 }).references(() => swaps.id, { onDelete: 'cascade' }),
  
  // Notification information
  type: varchar('type', { length: 50 }).notNull(), // webhook, email, telegram, etc.
  recipient: varchar('recipient', { length: 255 }).notNull(),
  title: varchar('title', { length: 255 }).notNull(),
  message: text('message').notNull(),
  data: jsonb('data'),
  
  // Status information
  status: varchar('status', { length: 50 }).notNull().default('pending'), // pending, sent, failed
  retryCount: integer('retry_count').notNull().default(0),
  maxRetries: integer('max_retries').notNull().default(3),
  
  // Timestamps
  createdAt: integer('created_at').notNull().default(sql`extract(epoch from now())`),
  sentAt: integer('sent_at'),
  
  // Error information
  errorMessage: text('error_message'),
  
  // HTTP specific fields
  httpMethod: varchar('http_method', { length: 20 }),
  httpUrl: text('http_url'),
  httpHeaders: jsonb('http_headers'),
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
export const metrics = pgTable('metrics', {
  id: varchar('id', { length: 255 }).primaryKey(),
  
  // Metric information
  name: varchar('name', { length: 255 }).notNull(),
  value: decimal('value', { precision: 15, scale: 6 }).notNull(),
  tags: jsonb('tags'), // Tags for grouping and filtering
  
  // Timestamps
  timestamp: integer('timestamp').notNull(),
  
  // Metadata
  metadata: jsonb('metadata'),
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