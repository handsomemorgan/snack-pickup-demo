ALTER TABLE `merchants` ADD `login_key_hash` text;--> statement-breakpoint
ALTER TABLE `merchants` ADD `last_heartbeat` integer;--> statement-breakpoint
ALTER TABLE `merchants` ADD `subtitle` text DEFAULT '校园小吃街 · 预约自取' NOT NULL;--> statement-breakpoint
ALTER TABLE `merchants` ADD `description` text DEFAULT '提前选好，按约定时间取餐。' NOT NULL;--> statement-breakpoint
ALTER TABLE `merchants` ADD `accent` text DEFAULT '#ea531a' NOT NULL;--> statement-breakpoint
ALTER TABLE `merchants` ADD `hero_image` text;--> statement-breakpoint
ALTER TABLE `products` ADD `description` text DEFAULT '' NOT NULL;--> statement-breakpoint
ALTER TABLE `products` ADD `image_data` text;