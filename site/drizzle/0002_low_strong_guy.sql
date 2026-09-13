CREATE TABLE `generation_outputs` (
	`id` text PRIMARY KEY NOT NULL,
	`generation_task_id` text NOT NULL,
	`version_id` text NOT NULL,
	`provider_audio_id` text NOT NULL,
	`source_audio_url` text NOT NULL,
	`storage_status` text DEFAULT 'pending' NOT NULL,
	`storage_attempts` integer DEFAULT 0 NOT NULL,
	`last_error_code` text,
	`created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	`updated_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	FOREIGN KEY (`generation_task_id`) REFERENCES `generation_tasks`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`version_id`) REFERENCES `music_versions`(`id`) ON UPDATE no action ON DELETE cascade,
	CONSTRAINT "generation_outputs_storage_status_check" CHECK("generation_outputs"."storage_status" in ('pending','stored','failed'))
);
--> statement-breakpoint
CREATE UNIQUE INDEX `idx_generation_outputs_version` ON `generation_outputs` (`version_id`);--> statement-breakpoint
CREATE UNIQUE INDEX `idx_generation_outputs_task_audio` ON `generation_outputs` (`generation_task_id`,`provider_audio_id`);--> statement-breakpoint
CREATE INDEX `idx_generation_outputs_storage_status` ON `generation_outputs` (`storage_status`,`updated_at`);--> statement-breakpoint
ALTER TABLE `generation_tasks` ADD `approved_lyric_id` text REFERENCES lyrics(id);