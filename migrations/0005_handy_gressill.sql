CREATE TABLE `notification_delivery_log` (
	`id` text PRIMARY KEY NOT NULL,
	`user_id` text NOT NULL,
	`candidate_id` text NOT NULL,
	`signal_id` text NOT NULL,
	`deduplication_key` text NOT NULL,
	`signal_type` text NOT NULL,
	`urgency` text NOT NULL,
	`subscription_id` text,
	`delivered_at` text NOT NULL,
	`created_at` text NOT NULL,
	FOREIGN KEY (`user_id`) REFERENCES `user`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`subscription_id`) REFERENCES `push_subscriptions`(`id`) ON UPDATE no action ON DELETE set null
);
--> statement-breakpoint
CREATE INDEX `notification_delivery_log_user_id_idx` ON `notification_delivery_log` (`user_id`);--> statement-breakpoint
CREATE UNIQUE INDEX `notification_delivery_log_user_dedup_unique` ON `notification_delivery_log` (`user_id`,`deduplication_key`);--> statement-breakpoint
CREATE TABLE `notification_preferences` (
	`id` text PRIMARY KEY NOT NULL,
	`user_id` text NOT NULL,
	`signal_type` text NOT NULL,
	`enabled` integer DEFAULT false NOT NULL,
	`created_at` text NOT NULL,
	`updated_at` text NOT NULL,
	FOREIGN KEY (`user_id`) REFERENCES `user`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `notification_preferences_user_id_idx` ON `notification_preferences` (`user_id`);--> statement-breakpoint
CREATE UNIQUE INDEX `notification_preferences_user_signal_unique` ON `notification_preferences` (`user_id`,`signal_type`);--> statement-breakpoint
CREATE TABLE `push_subscriptions` (
	`id` text PRIMARY KEY NOT NULL,
	`user_id` text NOT NULL,
	`endpoint` text NOT NULL,
	`p256dh` text NOT NULL,
	`auth` text NOT NULL,
	`created_at` text NOT NULL,
	`updated_at` text NOT NULL,
	`revoked_at` text,
	FOREIGN KEY (`user_id`) REFERENCES `user`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `push_subscriptions_user_id_idx` ON `push_subscriptions` (`user_id`);--> statement-breakpoint
CREATE UNIQUE INDEX `push_subscriptions_endpoint_unique` ON `push_subscriptions` (`endpoint`);