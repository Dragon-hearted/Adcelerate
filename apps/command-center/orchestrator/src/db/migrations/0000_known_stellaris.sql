CREATE TABLE `approvals` (
	`id` text PRIMARY KEY NOT NULL,
	`session_id` text NOT NULL,
	`kind` text NOT NULL,
	`tool_name` text,
	`tool_input` text,
	`question` text,
	`choices` text,
	`status` text NOT NULL,
	`decision` text,
	`created_at` integer NOT NULL,
	`responded_at` integer
);
--> statement-breakpoint
CREATE INDEX `idx_approvals_session` ON `approvals` (`session_id`);--> statement-breakpoint
CREATE INDEX `idx_approvals_status` ON `approvals` (`status`);--> statement-breakpoint
CREATE TABLE `events` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`seq` integer NOT NULL,
	`source_app` text NOT NULL,
	`session_id` text NOT NULL,
	`agent_name` text,
	`hook_event_type` text NOT NULL,
	`payload` text NOT NULL,
	`tool_name` text,
	`tool_use_id` text,
	`summary` text,
	`model_name` text,
	`cost_usd` real,
	`timestamp` integer NOT NULL
);
--> statement-breakpoint
CREATE INDEX `idx_events_session` ON `events` (`session_id`);--> statement-breakpoint
CREATE INDEX `idx_events_session_seq` ON `events` (`session_id`,`seq`);--> statement-breakpoint
CREATE INDEX `idx_events_type` ON `events` (`hook_event_type`);--> statement-breakpoint
CREATE INDEX `idx_events_ts` ON `events` (`timestamp`);--> statement-breakpoint
CREATE TABLE `sessions` (
	`session_id` text PRIMARY KEY NOT NULL,
	`name` text NOT NULL,
	`role` text NOT NULL,
	`model` text NOT NULL,
	`state` text NOT NULL,
	`cwd` text NOT NULL,
	`started_at` integer NOT NULL,
	`ended_at` integer,
	`input_tokens` integer DEFAULT 0 NOT NULL,
	`output_tokens` integer DEFAULT 0 NOT NULL,
	`cost_usd` real DEFAULT 0 NOT NULL
);
--> statement-breakpoint
CREATE TABLE `token_events` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`ts` integer NOT NULL,
	`session_id` text NOT NULL,
	`cwd` text,
	`git_branch` text,
	`model` text NOT NULL,
	`input` integer DEFAULT 0 NOT NULL,
	`cache_read` integer DEFAULT 0 NOT NULL,
	`cache_write_5m` integer DEFAULT 0 NOT NULL,
	`cache_write_1h` integer DEFAULT 0 NOT NULL,
	`output` integer DEFAULT 0 NOT NULL,
	`cost_usd` real,
	`request_id` text,
	`transcript_file` text NOT NULL,
	`transcript_line_offset` integer NOT NULL,
	`inode` integer
);
--> statement-breakpoint
CREATE INDEX `idx_token_events_ts` ON `token_events` (`ts`);--> statement-breakpoint
CREATE INDEX `idx_token_events_session` ON `token_events` (`session_id`);--> statement-breakpoint
CREATE INDEX `idx_token_events_model` ON `token_events` (`model`);--> statement-breakpoint
CREATE INDEX `idx_token_events_cwd` ON `token_events` (`cwd`);--> statement-breakpoint
CREATE UNIQUE INDEX `uq_token_events_dedupe` ON `token_events` (`transcript_file`,`inode`,`transcript_line_offset`);--> statement-breakpoint
CREATE TABLE `transcript_offsets` (
	`file` text PRIMARY KEY NOT NULL,
	`offset` integer NOT NULL,
	`updated_at` integer NOT NULL,
	`inode` integer
);
