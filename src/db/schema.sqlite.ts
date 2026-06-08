import { sql } from "drizzle-orm";
import { index, integer, sqliteTable, text } from "drizzle-orm/sqlite-core";
import type { Article, Composer, Performance, Work } from "@/data/types";

export const composers = sqliteTable("composers", {
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
  styleTags: text("style_tags", { mode: "json" }).$type<Composer["styleTags"]>().notNull().default([]),
  timeline: text("timeline", { mode: "json" }).$type<Composer["timeline"]>().notNull().default([]),
  starterWorkIds: text("starter_work_ids", { mode: "json" }).$type<Composer["starterWorkIds"]>().notNull().default([]),
  relatedComposerIds: text("related_composer_ids", { mode: "json" }).$type<Composer["relatedComposerIds"]>().notNull().default([]),
  featured: integer("featured", { mode: "boolean" }).notNull().default(false),
  createdAt: text("created_at").notNull().default(sql`CURRENT_TIMESTAMP`),
  updatedAt: text("updated_at").notNull().default(sql`CURRENT_TIMESTAMP`),
}, (table) => [
  index("composers_period_idx").on(table.period),
  index("composers_country_idx").on(table.country),
  index("composers_featured_idx").on(table.featured),
]);

export const works = sqliteTable("works", {
  id: text("id").primaryKey(),
  slug: text("slug").notNull().unique(),
  composerId: text("composer_id").notNull().references(() => composers.id, { onDelete: "cascade" }),
  title: text("title").notNull(),
  titleCn: text("title_cn").notNull(),
  year: integer("year"),
  genre: text("genre").notNull(),
  period: text("period").notNull(),
  description: text("description").notNull(),
  movements: text("movements", { mode: "json" }).$type<Work["movements"]>().notNull().default([]),
  listeningLinks: text("listening_links", { mode: "json" }).$type<Work["listeningLinks"]>().notNull().default([]),
  featured: integer("featured", { mode: "boolean" }).notNull().default(false),
  createdAt: text("created_at").notNull().default(sql`CURRENT_TIMESTAMP`),
  updatedAt: text("updated_at").notNull().default(sql`CURRENT_TIMESTAMP`),
}, (table) => [
  index("works_composer_id_idx").on(table.composerId),
  index("works_period_idx").on(table.period),
  index("works_genre_idx").on(table.genre),
  index("works_featured_idx").on(table.featured),
]);

export const performances = sqliteTable("performances", {
  id: text("id").primaryKey(),
  title: text("title").notNull(),
  city: text("city").notNull(),
  venue: text("venue").notNull(),
  startsAt: text("starts_at").notNull(),
  artists: text("artists", { mode: "json" }).$type<Performance["artists"]>().notNull().default([]),
  program: text("program", { mode: "json" }).$type<Performance["program"]>().notNull().default([]),
  ticketUrl: text("ticket_url"),
  sourceUrl: text("source_url").notNull(),
  sourceName: text("source_name").notNull(),
  createdAt: text("created_at").notNull().default(sql`CURRENT_TIMESTAMP`),
  updatedAt: text("updated_at").notNull().default(sql`CURRENT_TIMESTAMP`),
}, (table) => [
  index("performances_starts_at_idx").on(table.startsAt),
  index("performances_city_idx").on(table.city),
  index("performances_venue_idx").on(table.venue),
]);

export const articles = sqliteTable("articles", {
  id: text("id").primaryKey(),
  slug: text("slug").notNull().unique(),
  title: text("title").notNull(),
  excerpt: text("excerpt").notNull(),
  coverUrl: text("cover_url").notNull(),
  category: text("category").notNull(),
  publishedAt: text("published_at").notNull(),
  content: text("content").notNull(),
  relatedComposerIds: text("related_composer_ids", { mode: "json" }).$type<Article["relatedComposerIds"]>().notNull().default([]),
  relatedWorkIds: text("related_work_ids", { mode: "json" }).$type<Article["relatedWorkIds"]>().notNull().default([]),
  createdAt: text("created_at").notNull().default(sql`CURRENT_TIMESTAMP`),
  updatedAt: text("updated_at").notNull().default(sql`CURRENT_TIMESTAMP`),
}, (table) => [
  index("articles_published_at_idx").on(table.publishedAt),
  index("articles_category_idx").on(table.category),
]);
