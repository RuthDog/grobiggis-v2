CREATE TABLE `growing_batches` (
	`id` text PRIMARY KEY NOT NULL,
	`user_id` text NOT NULL,
	`plant_id` text NOT NULL,
	`variety` text,
	`start_type` text NOT NULL,
	`start_date` text NOT NULL,
	`status` text NOT NULL,
	`completed_at` text,
	`created_at` text NOT NULL,
	`updated_at` text NOT NULL
);
--> statement-breakpoint
CREATE INDEX `growing_batches_user_id_idx` ON `growing_batches` (`user_id`);--> statement-breakpoint
CREATE INDEX `growing_batches_user_id_id_idx` ON `growing_batches` (`user_id`,`id`);--> statement-breakpoint
CREATE TABLE `growing_events` (
	`id` text PRIMARY KEY NOT NULL,
	`user_id` text NOT NULL,
	`batch_id` text NOT NULL,
	`event_type` text NOT NULL,
	`title` text NOT NULL,
	`start_date` text NOT NULL,
	`end_date` text NOT NULL,
	`status` text NOT NULL,
	`source` text NOT NULL,
	`note` text,
	`created_at` text NOT NULL,
	`updated_at` text NOT NULL,
	FOREIGN KEY (`batch_id`) REFERENCES `growing_batches`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `growing_events_user_id_idx` ON `growing_events` (`user_id`);--> statement-breakpoint
CREATE INDEX `growing_events_batch_id_idx` ON `growing_events` (`batch_id`);