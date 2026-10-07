CREATE TABLE `license_events` (
	`id` text PRIMARY KEY NOT NULL,
	`merchant_id` text NOT NULL,
	`kind` text NOT NULL,
	`expires_at` integer NOT NULL,
	`created_at` integer NOT NULL
);
--> statement-breakpoint
CREATE TABLE `merchants` (
	`id` text PRIMARY KEY NOT NULL,
	`name` text NOT NULL,
	`license_token` text NOT NULL,
	`license_expires` integer NOT NULL,
	`suspended` integer DEFAULT 0 NOT NULL,
	`printer_online` integer DEFAULT 1 NOT NULL,
	`capacity` integer DEFAULT 6 NOT NULL,
	`payment_label` text NOT NULL,
	`payment_qr` text,
	`updated_at` integer NOT NULL
);
--> statement-breakpoint
CREATE TABLE `orders` (
	`id` text PRIMARY KEY NOT NULL,
	`merchant_id` text NOT NULL,
	`idempotency_key` text NOT NULL,
	`request_hash` text NOT NULL,
	`access_hash` text NOT NULL,
	`pickup_code` text NOT NULL,
	`pickup_at` integer NOT NULL,
	`quantity` integer NOT NULL,
	`total` integer NOT NULL,
	`items` text NOT NULL,
	`note` text NOT NULL,
	`spice` text NOT NULL,
	`alias` text NOT NULL,
	`status` text NOT NULL,
	`payment_state` text NOT NULL,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL,
	FOREIGN KEY (`merchant_id`) REFERENCES `merchants`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE UNIQUE INDEX `orders_idempotency_key_unique` ON `orders` (`idempotency_key`);--> statement-breakpoint
CREATE UNIQUE INDEX `orders_pickup_code_unique` ON `orders` (`pickup_code`);--> statement-breakpoint
CREATE INDEX `idx_orders_merchant_pickup` ON `orders` (`merchant_id`,`pickup_at`);--> statement-breakpoint
CREATE INDEX `idx_orders_status_created` ON `orders` (`status`,`created_at`);--> statement-breakpoint
CREATE TABLE `print_jobs` (
	`id` text PRIMARY KEY NOT NULL,
	`order_id` text NOT NULL,
	`status` text NOT NULL,
	`receipt` text NOT NULL,
	`provider_id` text,
	`error` text,
	`attempts` integer DEFAULT 0 NOT NULL,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL,
	FOREIGN KEY (`order_id`) REFERENCES `orders`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE UNIQUE INDEX `print_jobs_order_id_unique` ON `print_jobs` (`order_id`);--> statement-breakpoint
CREATE INDEX `idx_print_jobs_status` ON `print_jobs` (`status`);--> statement-breakpoint
CREATE TABLE `products` (
	`id` text PRIMARY KEY NOT NULL,
	`merchant_id` text NOT NULL,
	`name` text NOT NULL,
	`category` text NOT NULL,
	`price` integer NOT NULL,
	`active` integer DEFAULT 1 NOT NULL,
	`sort` integer NOT NULL,
	`updated_at` integer NOT NULL,
	FOREIGN KEY (`merchant_id`) REFERENCES `merchants`(`id`) ON UPDATE no action ON DELETE no action
);
