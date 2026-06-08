CREATE TABLE `articles` (
	`id` text PRIMARY KEY NOT NULL,
	`slug` text NOT NULL,
	`title` text NOT NULL,
	`excerpt` text NOT NULL,
	`cover_url` text NOT NULL,
	`category` text NOT NULL,
	`published_at` text NOT NULL,
	`content` text NOT NULL,
	`related_composer_ids` text DEFAULT '[]' NOT NULL,
	`related_work_ids` text DEFAULT '[]' NOT NULL,
	`created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	`updated_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `articles_slug_unique` ON `articles` (`slug`);--> statement-breakpoint
CREATE INDEX `articles_published_at_idx` ON `articles` (`published_at`);--> statement-breakpoint
CREATE INDEX `articles_category_idx` ON `articles` (`category`);--> statement-breakpoint
CREATE TABLE `composers` (
	`id` text PRIMARY KEY NOT NULL,
	`slug` text NOT NULL,
	`name` text NOT NULL,
	`name_cn` text NOT NULL,
	`birth_year` integer NOT NULL,
	`death_year` integer,
	`country` text NOT NULL,
	`period` text NOT NULL,
	`portrait_url` text NOT NULL,
	`short_bio` text NOT NULL,
	`bio` text NOT NULL,
	`style_tags` text DEFAULT '[]' NOT NULL,
	`timeline` text DEFAULT '[]' NOT NULL,
	`starter_work_ids` text DEFAULT '[]' NOT NULL,
	`related_composer_ids` text DEFAULT '[]' NOT NULL,
	`featured` integer DEFAULT false NOT NULL,
	`created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	`updated_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `composers_slug_unique` ON `composers` (`slug`);--> statement-breakpoint
CREATE INDEX `composers_period_idx` ON `composers` (`period`);--> statement-breakpoint
CREATE INDEX `composers_country_idx` ON `composers` (`country`);--> statement-breakpoint
CREATE INDEX `composers_featured_idx` ON `composers` (`featured`);--> statement-breakpoint
CREATE TABLE `performances` (
	`id` text PRIMARY KEY NOT NULL,
	`title` text NOT NULL,
	`city` text NOT NULL,
	`venue` text NOT NULL,
	`starts_at` text NOT NULL,
	`artists` text DEFAULT '[]' NOT NULL,
	`program` text DEFAULT '[]' NOT NULL,
	`ticket_url` text,
	`source_url` text NOT NULL,
	`source_name` text NOT NULL,
	`created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	`updated_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL
);
--> statement-breakpoint
CREATE INDEX `performances_starts_at_idx` ON `performances` (`starts_at`);--> statement-breakpoint
CREATE INDEX `performances_city_idx` ON `performances` (`city`);--> statement-breakpoint
CREATE INDEX `performances_venue_idx` ON `performances` (`venue`);--> statement-breakpoint
CREATE TABLE `works` (
	`id` text PRIMARY KEY NOT NULL,
	`slug` text NOT NULL,
	`composer_id` text NOT NULL,
	`title` text NOT NULL,
	`title_cn` text NOT NULL,
	`year` integer,
	`genre` text NOT NULL,
	`period` text NOT NULL,
	`description` text NOT NULL,
	`movements` text DEFAULT '[]' NOT NULL,
	`listening_links` text DEFAULT '[]' NOT NULL,
	`featured` integer DEFAULT false NOT NULL,
	`created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	`updated_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	FOREIGN KEY (`composer_id`) REFERENCES `composers`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE UNIQUE INDEX `works_slug_unique` ON `works` (`slug`);--> statement-breakpoint
CREATE INDEX `works_composer_id_idx` ON `works` (`composer_id`);--> statement-breakpoint
CREATE INDEX `works_period_idx` ON `works` (`period`);--> statement-breakpoint
CREATE INDEX `works_genre_idx` ON `works` (`genre`);--> statement-breakpoint
CREATE INDEX `works_featured_idx` ON `works` (`featured`);