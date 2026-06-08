CREATE TABLE `github_branches` (
	`name` text PRIMARY KEY NOT NULL,
	`current` integer DEFAULT false NOT NULL,
	`upstream` text,
	`ahead` integer,
	`behind` integer,
	`last_commit_sha` text,
	`last_commit_date` integer
);
--> statement-breakpoint
CREATE TABLE `github_commits` (
	`sha` text PRIMARY KEY NOT NULL,
	`short_sha` text NOT NULL,
	`message` text NOT NULL,
	`author` text NOT NULL,
	`author_email` text,
	`date` integer NOT NULL,
	`branch` text
);
--> statement-breakpoint
CREATE INDEX `idx_github_commits_date` ON `github_commits` (`date`);--> statement-breakpoint
CREATE TABLE `github_prs` (
	`number` integer PRIMARY KEY NOT NULL,
	`title` text NOT NULL,
	`state` text NOT NULL,
	`author` text NOT NULL,
	`url` text NOT NULL,
	`head_ref` text NOT NULL,
	`base_ref` text NOT NULL,
	`is_draft` integer DEFAULT false NOT NULL,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL
);
--> statement-breakpoint
CREATE INDEX `idx_github_prs_state` ON `github_prs` (`state`);--> statement-breakpoint
CREATE INDEX `idx_github_prs_updated` ON `github_prs` (`updated_at`);