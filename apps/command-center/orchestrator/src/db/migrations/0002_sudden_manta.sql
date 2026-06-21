CREATE TABLE `board_runs` (
	`board_id` text NOT NULL,
	`run_id` text NOT NULL,
	`producer_system` text NOT NULL,
	`slot_id` text NOT NULL,
	`joined_at` integer NOT NULL
);
--> statement-breakpoint
CREATE INDEX `idx_board_runs_board` ON `board_runs` (`board_id`);--> statement-breakpoint
CREATE UNIQUE INDEX `uq_board_runs_board_run` ON `board_runs` (`board_id`,`run_id`);--> statement-breakpoint
CREATE TABLE `boards` (
	`id` text PRIMARY KEY NOT NULL,
	`title` text NOT NULL,
	`created_at` integer NOT NULL
);
