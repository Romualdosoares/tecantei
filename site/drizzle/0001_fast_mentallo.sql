PRAGMA foreign_keys=OFF;--> statement-breakpoint
CREATE TABLE `__new_orders` (
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
	CONSTRAINT "orders_status_check" CHECK("__new_orders"."status" in ('draft','lyrics_review','lyrics_approved','generating','preview_ready','payment_pending','paid','delivered','cancelled')),
	CONSTRAINT "orders_adjustment_status_check" CHECK("__new_orders"."adjustment_status" in ('unavailable','available','reserved','completed'))
);
--> statement-breakpoint
INSERT INTO `__new_orders`("id", "owner_id", "status", "occasion", "recipient_name", "pronunciation", "story", "style", "adjustment_status", "preview_expires_at", "created_at", "updated_at") SELECT "id", "owner_id", "status", "occasion", "recipient_name", "pronunciation", "story", "style", "adjustment_status", "preview_expires_at", "created_at", "updated_at" FROM `orders`;--> statement-breakpoint
DROP TABLE `orders`;--> statement-breakpoint
ALTER TABLE `__new_orders` RENAME TO `orders`;--> statement-breakpoint
PRAGMA foreign_keys=ON;--> statement-breakpoint
CREATE INDEX `idx_orders_owner_updated` ON `orders` (`owner_id`,`updated_at`);--> statement-breakpoint
CREATE INDEX `idx_orders_open_status` ON `orders` (`status`);