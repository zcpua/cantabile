CREATE TABLE `notification_credits` (
	`openid` text NOT NULL,
	`performance_id` text NOT NULL,
	`kind` text NOT NULL,
	`granted_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	`consumed_at` text,
	`attempts` integer DEFAULT 0 NOT NULL,
	`failed_at` text,
	PRIMARY KEY(`openid`, `performance_id`, `kind`),
	FOREIGN KEY (`openid`) REFERENCES `users`(`openid`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`performance_id`) REFERENCES `performances`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `notification_credits_pending_idx` ON `notification_credits` (`performance_id`,`kind`);--> statement-breakpoint
CREATE TABLE `sale_state_transitions` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`performance_id` text NOT NULL,
	`from_state` text NOT NULL,
	`to_state` text NOT NULL,
	`detected_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	`notified_at` text,
	FOREIGN KEY (`performance_id`) REFERENCES `performances`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE UNIQUE INDEX `sale_state_transitions_event_unique` ON `sale_state_transitions` (`performance_id`,`from_state`,`to_state`,`detected_at`);--> statement-breakpoint
CREATE INDEX `sale_state_transitions_pending_idx` ON `sale_state_transitions` (`to_state`,`notified_at`);--> statement-breakpoint
ALTER TABLE `performances` ADD `sale_state` text DEFAULT 'unknown' NOT NULL;--> statement-breakpoint
CREATE INDEX `performances_sale_state_idx` ON `performances` (`sale_state`);