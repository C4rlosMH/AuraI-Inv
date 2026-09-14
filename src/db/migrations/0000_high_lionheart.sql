CREATE TABLE `accounts` (
	`id` text PRIMARY KEY NOT NULL,
	`name` text NOT NULL,
	`type` text NOT NULL,
	`balance` real DEFAULT 0 NOT NULL,
	`credit_limit` real
);
--> statement-breakpoint
CREATE TABLE `assets` (
	`id` text PRIMARY KEY NOT NULL,
	`ticker` text NOT NULL,
	`category` text NOT NULL,
	`total_titles` real DEFAULT 0 NOT NULL,
	`average_cost` real DEFAULT 0 NOT NULL
);
--> statement-breakpoint
CREATE TABLE `transactions` (
    `id` text PRIMARY KEY NOT NULL,
    `type` text NOT NULL,
    `origin_account_id` text,
    `destination_account_id` text,
    `asset_id` text,
    `quantity` real,
    `execution_price` real,
    `commission` real DEFAULT 0,
    `timestamp` integer NOT NULL,
    `concept` text,
    `category` text,
    FOREIGN KEY (`origin_account_id`) REFERENCES `accounts`(`id`) ON UPDATE no action ON DELETE no action,
    FOREIGN KEY (`destination_account_id`) REFERENCES `accounts`(`id`) ON UPDATE no action ON DELETE no action,
    FOREIGN KEY (`asset_id`) REFERENCES `assets`(`id`) ON UPDATE no action ON DELETE no action
);

CREATE TABLE IF NOT EXISTS net_worth_history (
  id TEXT PRIMARY KEY,
  date INTEGER NOT NULL,
  total_efectivo REAL NOT NULL DEFAULT 0,
  total_inversiones REAL NOT NULL DEFAULT 0,
  total_cripto REAL NOT NULL DEFAULT 0,
  net_worth REAL NOT NULL DEFAULT 0
);
