CREATE TABLE `growing_spaces` (
	`id` text PRIMARY KEY NOT NULL,
	`user_id` text NOT NULL,
	`name` text NOT NULL,
	`type` text NOT NULL,
	`created_at` text NOT NULL,
	`updated_at` text NOT NULL
);
--> statement-breakpoint
CREATE INDEX `growing_spaces_user_id_idx` ON `growing_spaces` (`user_id`);--> statement-breakpoint
CREATE TABLE `plant_placements` (
	`id` text PRIMARY KEY NOT NULL,
	`user_id` text NOT NULL,
	`space_id` text NOT NULL,
	`batch_id` text NOT NULL,
	`placed_at` text NOT NULL,
	`removed_at` text,
	FOREIGN KEY (`space_id`) REFERENCES `growing_spaces`(`id`) ON UPDATE no action ON DELETE restrict,
	FOREIGN KEY (`batch_id`) REFERENCES `growing_batches`(`id`) ON UPDATE no action ON DELETE restrict
);
--> statement-breakpoint
CREATE INDEX `plant_placements_user_id_idx` ON `plant_placements` (`user_id`);--> statement-breakpoint
CREATE INDEX `plant_placements_space_id_idx` ON `plant_placements` (`space_id`);--> statement-breakpoint
CREATE INDEX `plant_placements_batch_id_idx` ON `plant_placements` (`batch_id`);--> statement-breakpoint
CREATE INDEX `plant_placements_removed_at_idx` ON `plant_placements` (`removed_at`);--> statement-breakpoint
CREATE UNIQUE INDEX `plant_placements_active_batch_unique` ON `plant_placements` (`batch_id`) WHERE "plant_placements"."removed_at" IS NULL;