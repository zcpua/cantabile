import { boolean, index, integer, jsonb, pgTable, text, timestamp } from "drizzle-orm/pg-core";
import type { Article, Composer, Performance, Work } from "@/data/types";

export const composers = pgTable("composers", {
  id: text("id").primaryKey(),
  slug: text("slug").notNull().unique(),
  name: text("name").notNull(),
  nameCn: text("name_cn").notNull(),
  birthYear: integer("birth_year").notNull(),
  deathYear: integer("death_year"),
  country: text("country").notNull(),
  period: text("period").notNull(),
  portraitUrl: text("portrait_url").notNull(),
  shortBio: text("short_bio").notNull(),
  bio: text("bio").notNull(),
  styleTags: jsonb("style_tags").$type<Composer["styleTags"]>().notNull().default([]),
  timeline: jsonb("timeline").$type<Composer["timeline"]>().notNull().default([]),
  starterWorkIds: jsonb("starter_work_ids").$type<Composer["starterWorkIds"]>().notNull().default([]),
  relatedComposerIds: jsonb("related_composer_ids").$type<Composer["relatedComposerIds"]>().notNull().default([]),
  featured: boolean("featured").notNull().default(false),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
}, (table) => [
  index("composers_period_idx").on(table.period),
  index("composers_country_idx").on(table.country),
  index("composers_featured_idx").on(table.featured),
]);

export const works = pgTable("works", {
  id: text("id").primaryKey(),
  slug: text("slug").notNull().unique(),
  composerId: text("composer_id").notNull().references(() => composers.id, { onDelete: "cascade" }),
  title: text("title").notNull(),
  titleCn: text("title_cn").notNull(),
  year: integer("year"),
  genre: text("genre").notNull(),
  period: text("period").notNull(),
  description: text("description").notNull(),
  movements: jsonb("movements").$type<Work["movements"]>().notNull().default([]),
  listeningLinks: jsonb("listening_links").$type<Work["listeningLinks"]>().notNull().default([]),
  featured: boolean("featured").notNull().default(false),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
}, (table) => [
  index("works_composer_id_idx").on(table.composerId),
  index("works_period_idx").on(table.period),
  index("works_genre_idx").on(table.genre),
  index("works_featured_idx").on(table.featured),
]);

export const performances = pgTable("performances", {
  id: text("id").primaryKey(),
  title: text("title").notNull(),
  city: text("city").notNull(),
  venue: text("venue").notNull(),
  startsAt: timestamp("starts_at", { withTimezone: true }).notNull(),
  artists: jsonb("artists").$type<Performance["artists"]>().notNull().default([]),
  program: jsonb("program").$type<Performance["program"]>().notNull().default([]),
  ticketUrl: text("ticket_url"),
  sourceUrl: text("source_url").notNull(),
  sourceName: text("source_name").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
}, (table) => [
  index("performances_starts_at_idx").on(table.startsAt),
  index("performances_city_idx").on(table.city),
  index("performances_venue_idx").on(table.venue),
]);

export const articles = pgTable("articles", {
  id: text("id").primaryKey(),
  slug: text("slug").notNull().unique(),
  title: text("title").notNull(),
  excerpt: text("excerpt").notNull(),
  coverUrl: text("cover_url").notNull(),
  category: text("category").notNull(),
  publishedAt: timestamp("published_at", { withTimezone: true }).notNull(),
  content: text("content").notNull(),
  relatedComposerIds: jsonb("related_composer_ids").$type<Article["relatedComposerIds"]>().notNull().default([]),
  relatedWorkIds: jsonb("related_work_ids").$type<Article["relatedWorkIds"]>().notNull().default([]),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
}, (table) => [
  index("articles_published_at_idx").on(table.publishedAt),
  index("articles_category_idx").on(table.category),
]);
