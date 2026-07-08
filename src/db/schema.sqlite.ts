import { sql } from "drizzle-orm";
import { index, integer, primaryKey, sqliteTable, text, uniqueIndex } from "drizzle-orm/sqlite-core";
import type { Article, Composer, Performance, SaleState, Work } from "@/data/types";

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
  imageUrl: text("image_url"),
  priceLabel: text("price_label"),
  saleStatus: text("sale_status"),
  saleState: text("sale_state").$type<SaleState>().notNull().default("unknown"),
  address: text("address"),
  intro: text("intro"),
  isClassical: integer("is_classical", { mode: "boolean" }),
  sourceId: text("source_id"),
  sourceMetadata: text("source_metadata", { mode: "json" }).$type<Performance["sourceMetadata"]>(),
  createdAt: text("created_at").notNull().default(sql`CURRENT_TIMESTAMP`),
  updatedAt: text("updated_at").notNull().default(sql`CURRENT_TIMESTAMP`),
}, (table) => [
  index("performances_starts_at_idx").on(table.startsAt),
  index("performances_city_idx").on(table.city),
  index("performances_venue_idx").on(table.venue),
  index("performances_sale_state_idx").on(table.saleState),
  uniqueIndex("performances_source_id_unique").on(table.sourceId),
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

// Wechat mini-program user, identified by openid injected by the cloud-hosting gateway.
export const users = sqliteTable("users", {
  openid: text("openid").primaryKey(),
  unionid: text("unionid"),
  nickname: text("nickname"),
  avatarUrl: text("avatar_url"),
  avatarFileId: text("avatar_file_id"),
  createdAt: text("created_at").notNull().default(sql`CURRENT_TIMESTAMP`),
  updatedAt: text("updated_at").notNull().default(sql`CURRENT_TIMESTAMP`),
});

export const favorites = sqliteTable("favorites", {
  openid: text("openid").notNull().references(() => users.openid, { onDelete: "cascade" }),
  performanceId: text("performance_id").notNull().references(() => performances.id, { onDelete: "cascade" }),
  createdAt: text("created_at").notNull().default(sql`CURRENT_TIMESTAMP`),
}, (table) => [
  primaryKey({ columns: [table.openid, table.performanceId] }),
  index("favorites_openid_idx").on(table.openid),
]);

export const tickets = sqliteTable("tickets", {
  openid: text("openid").notNull().references(() => users.openid, { onDelete: "cascade" }),
  performanceId: text("performance_id").notNull().references(() => performances.id, { onDelete: "cascade" }),
  createdAt: text("created_at").notNull().default(sql`CURRENT_TIMESTAMP`),
}, (table) => [
  primaryKey({ columns: [table.openid, table.performanceId] }),
  index("tickets_openid_idx").on(table.openid),
]);

export const saleStateTransitions = sqliteTable("sale_state_transitions", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  performanceId: text("performance_id").notNull().references(() => performances.id, { onDelete: "cascade" }),
  fromState: text("from_state").notNull(),
  toState: text("to_state").notNull(),
  detectedAt: text("detected_at").notNull().default(sql`CURRENT_TIMESTAMP`),
  notifiedAt: text("notified_at"),
}, (table) => [
  uniqueIndex("sale_state_transitions_event_unique").on(
    table.performanceId,
    table.fromState,
    table.toState,
    table.detectedAt,
  ),
  index("sale_state_transitions_pending_idx").on(table.toState, table.notifiedAt),
]);

export const notificationCredits = sqliteTable("notification_credits", {
  openid: text("openid").notNull().references(() => users.openid, { onDelete: "cascade" }),
  performanceId: text("performance_id").notNull().references(() => performances.id, { onDelete: "cascade" }),
  kind: text("kind").notNull(),
  grantedAt: text("granted_at").notNull().default(sql`CURRENT_TIMESTAMP`),
  consumedAt: text("consumed_at"),
  attempts: integer("attempts").notNull().default(0),
  failedAt: text("failed_at"),
}, (table) => [
  primaryKey({ columns: [table.openid, table.performanceId, table.kind] }),
  index("notification_credits_pending_idx").on(table.performanceId, table.kind),
]);
