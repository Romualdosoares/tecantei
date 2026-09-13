CREATE TABLE `accounts` (
	`id` text PRIMARY KEY NOT NULL,
	`auth_subject` text NOT NULL,
	`email_normalized` text NOT NULL,
	`display_name` text,
	`created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	`updated_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `idx_accounts_auth_subject` ON `accounts` (`auth_subject`);--> statement-breakpoint
CREATE UNIQUE INDEX `idx_accounts_email` ON `accounts` (`email_normalized`);--> statement-breakpoint
CREATE TABLE `adjustment_requests` (
	`id` text PRIMARY KEY NOT NULL,
	`order_id` text NOT NULL,
	`source_version_id` text NOT NULL,
	`result_version_id` text,
	`status` text DEFAULT 'reserved' NOT NULL,
	`customer_notes` text NOT NULL,
	`created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	`updated_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	FOREIGN KEY (`order_id`) REFERENCES `orders`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`source_version_id`) REFERENCES `music_versions`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`result_version_id`) REFERENCES `music_versions`(`id`) ON UPDATE no action ON DELETE no action,
	CONSTRAINT "adjustment_requests_status_check" CHECK("adjustment_requests"."status" in ('reserved','processing','completed','technical_failure','reconciling'))
);
--> statement-breakpoint
CREATE UNIQUE INDEX `idx_adjustment_requests_order` ON `adjustment_requests` (`order_id`);--> statement-breakpoint
CREATE TABLE `cost_events` (
	`id` text PRIMARY KEY NOT NULL,
	`order_id` text NOT NULL,
	`generation_task_id` text,
	`provider` text NOT NULL,
	`operation` text NOT NULL,
	`credits_millis` integer NOT NULL,
	`usd_micros` integer,
	`status` text NOT NULL,
	`created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	FOREIGN KEY (`order_id`) REFERENCES `orders`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`generation_task_id`) REFERENCES `generation_tasks`(`id`) ON UPDATE no action ON DELETE no action,
	CONSTRAINT "cost_events_status_check" CHECK("cost_events"."status" in ('estimated','confirmed','refunded','reconciling')),
	CONSTRAINT "cost_events_credits_check" CHECK("cost_events"."credits_millis" >= 0)
);
--> statement-breakpoint
CREATE INDEX `idx_cost_events_order_created` ON `cost_events` (`order_id`,`created_at`);--> statement-breakpoint
CREATE TABLE `deliveries` (
	`id` text PRIMARY KEY NOT NULL,
	`order_id` text NOT NULL,
	`version_id` text NOT NULL,
	`full_audio_object_key` text NOT NULL,
	`share_token_hash` text NOT NULL,
	`revoked_at` text,
	`created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	FOREIGN KEY (`order_id`) REFERENCES `orders`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`version_id`) REFERENCES `music_versions`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE UNIQUE INDEX `idx_deliveries_order` ON `deliveries` (`order_id`);--> statement-breakpoint
CREATE UNIQUE INDEX `idx_deliveries_share_token` ON `deliveries` (`share_token_hash`);--> statement-breakpoint
CREATE TABLE `generation_tasks` (
	`id` text PRIMARY KEY NOT NULL,
	`order_id` text NOT NULL,
	`version_id` text,
	`request_key` text NOT NULL,
	`provider` text DEFAULT 'kie.ai' NOT NULL,
	`model` text NOT NULL,
	`external_task_id` text,
	`status` text DEFAULT 'created' NOT NULL,
	`error_code` text,
	`accepted_at` text,
	`completed_at` text,
	`created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	`updated_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	FOREIGN KEY (`order_id`) REFERENCES `orders`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`version_id`) REFERENCES `music_versions`(`id`) ON UPDATE no action ON DELETE no action,
	CONSTRAINT "generation_tasks_status_check" CHECK("generation_tasks"."status" in ('created','submitted','processing','reconciling','succeeded','failed'))
);
--> statement-breakpoint
CREATE UNIQUE INDEX `idx_generation_tasks_request_key` ON `generation_tasks` (`request_key`);--> statement-breakpoint
CREATE UNIQUE INDEX `idx_generation_tasks_external` ON `generation_tasks` (`provider`,`external_task_id`);--> statement-breakpoint
CREATE INDEX `idx_generation_tasks_order_created` ON `generation_tasks` (`order_id`,`created_at`);--> statement-breakpoint
CREATE TABLE `lyrics` (
	`id` text PRIMARY KEY NOT NULL,
	`order_id` text NOT NULL,
	`kind` text NOT NULL,
	`revision` integer NOT NULL,
	`content` text NOT NULL,
	`created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	FOREIGN KEY (`order_id`) REFERENCES `orders`(`id`) ON UPDATE no action ON DELETE cascade,
	CONSTRAINT "lyrics_kind_check" CHECK("lyrics"."kind" in ('source','proposed','approved'))
);
--> statement-breakpoint
CREATE UNIQUE INDEX `idx_lyrics_order_kind_revision` ON `lyrics` (`order_id`,`kind`,`revision`);--> statement-breakpoint
CREATE INDEX `idx_lyrics_order_created` ON `lyrics` (`order_id`,`created_at`);--> statement-breakpoint
CREATE TABLE `music_versions` (
	`id` text PRIMARY KEY NOT NULL,
	`order_id` text NOT NULL,
	`approved_lyric_id` text NOT NULL,
	`origin` text NOT NULL,
	`status` text DEFAULT 'queued' NOT NULL,
	`title` text,
	`duration_seconds` integer,
	`provider_audio_id` text,
	`full_audio_object_key` text,
	`preview_object_key` text,
	`created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	`updated_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	FOREIGN KEY (`order_id`) REFERENCES `orders`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`approved_lyric_id`) REFERENCES `lyrics`(`id`) ON UPDATE no action ON DELETE no action,
	CONSTRAINT "music_versions_origin_check" CHECK("music_versions"."origin" in ('original','adjustment')),
	CONSTRAINT "music_versions_status_check" CHECK("music_versions"."status" in ('queued','generating','ready','failed'))
);
--> statement-breakpoint
CREATE INDEX `idx_music_versions_order_created` ON `music_versions` (`order_id`,`created_at`);--> statement-breakpoint
CREATE UNIQUE INDEX `idx_music_versions_provider_audio` ON `music_versions` (`provider_audio_id`);--> statement-breakpoint
CREATE TABLE `order_selections` (
	`order_id` text PRIMARY KEY NOT NULL,
	`version_id` text NOT NULL,
	`selected_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	FOREIGN KEY (`order_id`) REFERENCES `orders`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`version_id`) REFERENCES `music_versions`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `orders` (
	`id` text PRIMARY KEY NOT NULL,
	`owner_id` text NOT NULL,
	`status` text DEFAULT 'draft' NOT NULL,
	`occasion` text NOT NULL,
	`recipient_name` text NOT NULL,
	`pronunciation` text,
	`story` text NOT NULL,
	`style` text NOT NULL,
	`adjustment_status` text DEFAULT 'unavailable' NOT NULL,
	`preview_expires_at` text,
	`created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	`updated_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	FOREIGN KEY (`owner_id`) REFERENCES `accounts`(`id`) ON UPDATE no action ON DELETE cascade,
	CONSTRAINT "orders_status_check" CHECK("orders"."status" in ('draft','lyrics_review','generating','preview_ready','payment_pending','paid','delivered','cancelled')),
	CONSTRAINT "orders_adjustment_status_check" CHECK("orders"."adjustment_status" in ('unavailable','available','reserved','completed'))
);
--> statement-breakpoint
CREATE INDEX `idx_orders_owner_updated` ON `orders` (`owner_id`,`updated_at`);--> statement-breakpoint
CREATE INDEX `idx_orders_open_status` ON `orders` (`status`);--> statement-breakpoint
CREATE TABLE `payment_events` (
	`id` text PRIMARY KEY NOT NULL,
	`payment_intent_id` text NOT NULL,
	`provider` text NOT NULL,
	`external_event_id` text NOT NULL,
	`event_type` text NOT NULL,
	`payload_hash` text NOT NULL,
	`occurred_at` text NOT NULL,
	`processed_at` text,
	`created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	FOREIGN KEY (`payment_intent_id`) REFERENCES `payment_intents`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE UNIQUE INDEX `idx_payment_events_provider_event` ON `payment_events` (`provider`,`external_event_id`);--> statement-breakpoint
CREATE INDEX `idx_payment_events_intent_created` ON `payment_events` (`payment_intent_id`,`created_at`);--> statement-breakpoint
CREATE TABLE `payment_intents` (
	`id` text PRIMARY KEY NOT NULL,
	`order_id` text NOT NULL,
	`version_id` text NOT NULL,
	`provider` text NOT NULL,
	`external_payment_id` text,
	`amount_cents` integer DEFAULT 1990 NOT NULL,
	`currency` text DEFAULT 'BRL' NOT NULL,
	`status` text DEFAULT 'created' NOT NULL,
	`created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	`updated_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	FOREIGN KEY (`order_id`) REFERENCES `orders`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`version_id`) REFERENCES `music_versions`(`id`) ON UPDATE no action ON DELETE no action,
	CONSTRAINT "payment_intents_amount_check" CHECK("payment_intents"."amount_cents" > 0),
	CONSTRAINT "payment_intents_status_check" CHECK("payment_intents"."status" in ('created','pending','confirmed','failed','cancelled','refunded'))
);
--> statement-breakpoint
CREATE UNIQUE INDEX `idx_payment_intents_external` ON `payment_intents` (`provider`,`external_payment_id`);--> statement-breakpoint
CREATE INDEX `idx_payment_intents_order_created` ON `payment_intents` (`order_id`,`created_at`);--> statement-breakpoint
CREATE TABLE `support_audit_log` (
	`id` text PRIMARY KEY NOT NULL,
	`order_id` text NOT NULL,
	`actor_subject` text NOT NULL,
	`action` text NOT NULL,
	`reason` text NOT NULL,
	`created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	FOREIGN KEY (`order_id`) REFERENCES `orders`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `idx_support_audit_order_created` ON `support_audit_log` (`order_id`,`created_at`);