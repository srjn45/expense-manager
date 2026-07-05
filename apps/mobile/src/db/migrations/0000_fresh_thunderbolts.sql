CREATE TABLE `app_settings` (
	`id` integer PRIMARY KEY NOT NULL,
	`default_currency` text DEFAULT 'INR' NOT NULL,
	`pin_set` integer DEFAULT 0 NOT NULL,
	`biometrics_enabled` integer DEFAULT 0 NOT NULL
);
--> statement-breakpoint
CREATE TABLE `categories` (
	`id` text PRIMARY KEY NOT NULL,
	`name` text NOT NULL,
	`color` text,
	`icon` text,
	`is_preloaded` integer DEFAULT 0 NOT NULL,
	`active` integer DEFAULT 1 NOT NULL,
	`created_at` integer NOT NULL
);
--> statement-breakpoint
CREATE TABLE `entry_tags` (
	`entry_id` text NOT NULL,
	`tag` text NOT NULL,
	PRIMARY KEY(`entry_id`, `tag`),
	FOREIGN KEY (`entry_id`) REFERENCES `ledger_entries`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `idx_entry_tags_tag` ON `entry_tags` (`tag`);--> statement-breakpoint
CREATE TABLE `ledger_entries` (
	`id` text PRIMARY KEY NOT NULL,
	`title` text NOT NULL,
	`description` text,
	`category_id` text NOT NULL,
	`amount_minor` integer NOT NULL,
	`currency` text NOT NULL,
	`occurred_on` text NOT NULL,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL,
	`deleted_at` integer,
	FOREIGN KEY (`category_id`) REFERENCES `categories`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE INDEX `idx_ledger_entries_occurred_on` ON `ledger_entries` ("occurred_on" DESC);--> statement-breakpoint
CREATE INDEX `idx_ledger_entries_deleted_at` ON `ledger_entries` (`deleted_at`);--> statement-breakpoint
CREATE INDEX `idx_ledger_entries_category_id` ON `ledger_entries` (`category_id`);--> statement-breakpoint
CREATE TABLE `tag_suggestions` (
	`tag` text PRIMARY KEY NOT NULL,
	`last_used_at` integer NOT NULL
);
