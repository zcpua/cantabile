CREATE TABLE `users` (
	`openid` text PRIMARY KEY NOT NULL,
	`unionid` text,
	`nickname` text,
	`avatar_url` text,
	`created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	`updated_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL
);
--> statement-breakpoint
CREATE TABLE `favorites` (
	`openid` text NOT NULL,
	`performance_id` text NOT NULL,
	`created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	PRIMARY KEY(`openid`, `performance_id`),
	FOREIGN KEY (`openid`) REFERENCES `users`(`openid`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`performance_id`) REFERENCES `performances`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE TABLE `tickets` (
	`openid` text NOT NULL,
	`performance_id` text NOT NULL,
	`created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	PRIMARY KEY(`openid`, `performance_id`),
	FOREIGN KEY (`openid`) REFERENCES `users`(`openid`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`performance_id`) REFERENCES `performances`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `favorites_openid_idx` ON `favorites` (`openid`);--> statement-breakpoint
CREATE INDEX `tickets_openid_idx` ON `tickets` (`openid`);
