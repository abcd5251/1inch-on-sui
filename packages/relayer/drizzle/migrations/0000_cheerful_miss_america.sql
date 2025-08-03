CREATE TABLE IF NOT EXISTS "block_sync_status" (
	"chain_id" varchar(100) PRIMARY KEY NOT NULL,
	"last_synced_block" integer DEFAULT 0 NOT NULL,
	"current_block" integer DEFAULT 0 NOT NULL,
	"last_sync_at" integer DEFAULT extract(epoch from now()) NOT NULL,
	"batch_size" integer DEFAULT 100 NOT NULL,
	"confirmations" integer DEFAULT 12 NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"error_count" integer DEFAULT 0 NOT NULL,
	"last_error" text
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "event_logs" (
	"id" varchar(255) PRIMARY KEY NOT NULL,
	"swap_id" varchar(255),
	"event_type" varchar(100) NOT NULL,
	"event_data" jsonb NOT NULL,
	"chain_id" varchar(100) NOT NULL,
	"block_number" integer NOT NULL,
	"transaction_hash" varchar(255) NOT NULL,
	"log_index" integer NOT NULL,
	"timestamp" integer NOT NULL,
	"created_at" integer DEFAULT extract(epoch from now()) NOT NULL,
	"processed" boolean DEFAULT false NOT NULL,
	"processed_at" integer,
	"error_message" text
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "metrics" (
	"id" varchar(255) PRIMARY KEY NOT NULL,
	"name" varchar(255) NOT NULL,
	"value" numeric(15, 6) NOT NULL,
	"tags" jsonb,
	"timestamp" integer NOT NULL,
	"metadata" jsonb
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "notifications" (
	"id" varchar(255) PRIMARY KEY NOT NULL,
	"swap_id" varchar(255),
	"type" varchar(50) NOT NULL,
	"recipient" varchar(255) NOT NULL,
	"title" varchar(255) NOT NULL,
	"message" text NOT NULL,
	"data" jsonb,
	"status" varchar(50) DEFAULT 'pending' NOT NULL,
	"retry_count" integer DEFAULT 0 NOT NULL,
	"max_retries" integer DEFAULT 3 NOT NULL,
	"created_at" integer DEFAULT extract(epoch from now()) NOT NULL,
	"sent_at" integer,
	"error_message" text,
	"http_method" varchar(20),
	"http_url" text,
	"http_headers" jsonb,
	"http_status_code" integer,
	"http_response" text
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "relayer_config" (
	"key" varchar(255) PRIMARY KEY NOT NULL,
	"value" text NOT NULL,
	"type" varchar(50) DEFAULT 'string' NOT NULL,
	"description" text,
	"created_at" integer DEFAULT extract(epoch from now()) NOT NULL,
	"updated_at" integer DEFAULT extract(epoch from now()) NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "swaps" (
	"id" varchar(255) PRIMARY KEY NOT NULL,
	"order_id" varchar(255) NOT NULL,
	"maker" varchar(255) NOT NULL,
	"taker" varchar(255),
	"making_amount" varchar(100) NOT NULL,
	"taking_amount" varchar(100) NOT NULL,
	"making_token" varchar(255) NOT NULL,
	"taking_token" varchar(255) NOT NULL,
	"source_chain" varchar(100) NOT NULL,
	"target_chain" varchar(100) NOT NULL,
	"secret_hash" varchar(255) NOT NULL,
	"secret" varchar(255),
	"time_lock" integer NOT NULL,
	"source_contract" varchar(255) NOT NULL,
	"target_contract" varchar(255) NOT NULL,
	"source_transaction_hash" varchar(255),
	"target_transaction_hash" varchar(255),
	"refund_transaction_hash" varchar(255),
	"status" varchar(50) DEFAULT 'pending' NOT NULL,
	"substatus" varchar(100),
	"created_at" integer DEFAULT extract(epoch from now()) NOT NULL,
	"updated_at" integer DEFAULT extract(epoch from now()) NOT NULL,
	"expires_at" integer NOT NULL,
	"retry_count" integer DEFAULT 0 NOT NULL,
	"max_retries" integer DEFAULT 3 NOT NULL,
	"last_retry_at" integer,
	"estimated_gas" varchar(100),
	"actual_gas" varchar(100),
	"gas_price" varchar(100),
	"relayer_fee" varchar(100),
	"metadata" jsonb,
	"error_message" text,
	"error_code" varchar(100)
);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_block_sync_last_sync_at" ON "block_sync_status" ("last_sync_at");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_block_sync_is_active" ON "block_sync_status" ("is_active");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_event_logs_swap_id" ON "event_logs" ("swap_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_event_logs_event_type" ON "event_logs" ("event_type");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_event_logs_chain_id" ON "event_logs" ("chain_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_event_logs_block_number" ON "event_logs" ("block_number");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_event_logs_transaction_hash" ON "event_logs" ("transaction_hash");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_event_logs_timestamp" ON "event_logs" ("timestamp");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_event_logs_processed" ON "event_logs" ("processed");--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "idx_event_logs_unique" ON "event_logs" ("chain_id","transaction_hash","log_index");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_metrics_name" ON "metrics" ("name");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_metrics_timestamp" ON "metrics" ("timestamp");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_metrics_name_timestamp" ON "metrics" ("name","timestamp");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_notifications_swap_id" ON "notifications" ("swap_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_notifications_type" ON "notifications" ("type");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_notifications_status" ON "notifications" ("status");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_notifications_created_at" ON "notifications" ("created_at");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_relayer_config_type" ON "relayer_config" ("type");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_swaps_order_id" ON "swaps" ("order_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_swaps_maker" ON "swaps" ("maker");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_swaps_taker" ON "swaps" ("taker");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_swaps_status" ON "swaps" ("status");--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "idx_swaps_secret_hash" ON "swaps" ("secret_hash");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_swaps_created_at" ON "swaps" ("created_at");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_swaps_expires_at" ON "swaps" ("expires_at");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_swaps_source_chain" ON "swaps" ("source_chain");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_swaps_target_chain" ON "swaps" ("target_chain");--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "event_logs" ADD CONSTRAINT "event_logs_swap_id_swaps_id_fk" FOREIGN KEY ("swap_id") REFERENCES "swaps"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "notifications" ADD CONSTRAINT "notifications_swap_id_swaps_id_fk" FOREIGN KEY ("swap_id") REFERENCES "swaps"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
