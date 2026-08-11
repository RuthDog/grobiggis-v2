CREATE TABLE `shopping_list_items` (
	`id` text PRIMARY KEY NOT NULL,
	`user_id` text NOT NULL,
	`plant_id` text NOT NULL,
	`created_at` text NOT NULL
);
--> statement-breakpoint
CREATE INDEX `shopping_list_items_user_id_idx` ON `shopping_list_items` (`user_id`);--> statement-breakpoint
CREATE UNIQUE INDEX `shopping_list_items_user_plant_unique` ON `shopping_list_items` (`user_id`,`plant_id`);