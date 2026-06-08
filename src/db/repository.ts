import { asc, desc, eq, isNull } from "drizzle-orm";
import { articles as staticArticles } from "@/data/articles";
import { composers as staticComposers } from "@/data/composers";
import { performances as staticPerformances } from "@/data/performances";
import type { Article, Composer, MusicPeriod, Performance, Work } from "@/data/types";
import { works as staticWorks } from "@/data/works";
import { getDatabaseRuntime } from "./index";
import * as pgSchema from "./schema.pg";
import * as sqliteSchema from "./schema.sqlite";

type JsonRecord = Record<string, unknown>;
type ComposerRow = typeof pgSchema.composers.$inferSelect | typeof sqliteSchema.composers.$inferSelect;
type WorkRow = typeof pgSchema.works.$inferSelect | typeof sqliteSchema.works.$inferSelect;
type PerformanceRow = typeof pgSchema.performances.$inferSelect | typeof sqliteSchema.performances.$inferSelect;
type ArticleRow = typeof pgSchema.articles.$inferSelect | typeof sqliteSchema.articles.$inferSelect;

export async function listComposers(): Promise<Composer[]> {
  const runtime = getDatabaseRuntime();
  if (runtime === "static") return staticComposers;

  if (runtime === "postgres") {
    const { getPostgresDb } = await import("./postgres");
    const rows = await getPostgresDb().select().from(pgSchema.composers).orderBy(asc(pgSchema.composers.birthYear));
    return rows.map(mapComposerRow);
  }

  const { getD1Db } = await import("./d1");
  const rows = await (await getD1Db()).select().from(sqliteSchema.composers).orderBy(asc(sqliteSchema.composers.birthYear));
  return rows.map(mapComposerRow);
}

export async function listWorks(): Promise<Work[]> {
  const runtime = getDatabaseRuntime();
  if (runtime === "static") return staticWorks;

  if (runtime === "postgres") {
    const { getPostgresDb } = await import("./postgres");
    const rows = await getPostgresDb().select().from(pgSchema.works).orderBy(isNull(pgSchema.works.year), asc(pgSchema.works.year));
    return rows.map(mapWorkRow);
  }

  const { getD1Db } = await import("./d1");
  const rows = await (await getD1Db()).select().from(sqliteSchema.works).orderBy(isNull(sqliteSchema.works.year), asc(sqliteSchema.works.year));
  return rows.map(mapWorkRow);
}

export async function listPerformances(): Promise<Performance[]> {
  const runtime = getDatabaseRuntime();
  if (runtime === "static") return staticPerformances;

  if (runtime === "postgres") {
    const { getPostgresDb } = await import("./postgres");
    const rows = await getPostgresDb().select().from(pgSchema.performances).orderBy(asc(pgSchema.performances.startsAt));
    return rows.map(mapPerformanceRow);
  }

  const { getD1Db } = await import("./d1");
  const rows = await (await getD1Db()).select().from(sqliteSchema.performances).orderBy(asc(sqliteSchema.performances.startsAt));
  return rows.map(mapPerformanceRow);
}

export async function listArticles(): Promise<Article[]> {
  const runtime = getDatabaseRuntime();
  if (runtime === "static") return staticArticles;

  if (runtime === "postgres") {
    const { getPostgresDb } = await import("./postgres");
    const rows = await getPostgresDb().select().from(pgSchema.articles).orderBy(desc(pgSchema.articles.publishedAt));
    return rows.map(mapArticleRow);
  }

  const { getD1Db } = await import("./d1");
  const rows = await (await getD1Db()).select().from(sqliteSchema.articles).orderBy(desc(sqliteSchema.articles.publishedAt));
  return rows.map(mapArticleRow);
}

export async function findComposerBySlug(slug: string): Promise<Composer | undefined> {
  const runtime = getDatabaseRuntime();
  if (runtime === "static") return staticComposers.find((composer) => composer.slug === slug);

  if (runtime === "postgres") {
    const { getPostgresDb } = await import("./postgres");
    const [row] = await getPostgresDb().select().from(pgSchema.composers).where(eq(pgSchema.composers.slug, slug)).limit(1);
    return row ? mapComposerRow(row) : undefined;
  }

  const { getD1Db } = await import("./d1");
  const [row] = await (await getD1Db()).select().from(sqliteSchema.composers).where(eq(sqliteSchema.composers.slug, slug)).limit(1);
  return row ? mapComposerRow(row) : undefined;
}

export async function findComposerById(id: string): Promise<Composer | undefined> {
  const runtime = getDatabaseRuntime();
  if (runtime === "static") return staticComposers.find((composer) => composer.id === id);

  if (runtime === "postgres") {
    const { getPostgresDb } = await import("./postgres");
    const [row] = await getPostgresDb().select().from(pgSchema.composers).where(eq(pgSchema.composers.id, id)).limit(1);
    return row ? mapComposerRow(row) : undefined;
  }

  const { getD1Db } = await import("./d1");
  const [row] = await (await getD1Db()).select().from(sqliteSchema.composers).where(eq(sqliteSchema.composers.id, id)).limit(1);
  return row ? mapComposerRow(row) : undefined;
}

export async function findWorkBySlug(slug: string): Promise<Work | undefined> {
  const runtime = getDatabaseRuntime();
  if (runtime === "static") return staticWorks.find((work) => work.slug === slug);

  if (runtime === "postgres") {
    const { getPostgresDb } = await import("./postgres");
    const [row] = await getPostgresDb().select().from(pgSchema.works).where(eq(pgSchema.works.slug, slug)).limit(1);
    return row ? mapWorkRow(row) : undefined;
  }

  const { getD1Db } = await import("./d1");
  const [row] = await (await getD1Db()).select().from(sqliteSchema.works).where(eq(sqliteSchema.works.slug, slug)).limit(1);
  return row ? mapWorkRow(row) : undefined;
}

export async function findWorkById(id: string): Promise<Work | undefined> {
  const runtime = getDatabaseRuntime();
  if (runtime === "static") return staticWorks.find((work) => work.id === id);

  if (runtime === "postgres") {
    const { getPostgresDb } = await import("./postgres");
    const [row] = await getPostgresDb().select().from(pgSchema.works).where(eq(pgSchema.works.id, id)).limit(1);
    return row ? mapWorkRow(row) : undefined;
  }

  const { getD1Db } = await import("./d1");
  const [row] = await (await getD1Db()).select().from(sqliteSchema.works).where(eq(sqliteSchema.works.id, id)).limit(1);
  return row ? mapWorkRow(row) : undefined;
}

export async function findArticleBySlug(slug: string): Promise<Article | undefined> {
  const runtime = getDatabaseRuntime();
  if (runtime === "static") return staticArticles.find((article) => article.slug === slug);

  if (runtime === "postgres") {
    const { getPostgresDb } = await import("./postgres");
    const [row] = await getPostgresDb().select().from(pgSchema.articles).where(eq(pgSchema.articles.slug, slug)).limit(1);
    return row ? mapArticleRow(row) : undefined;
  }

  const { getD1Db } = await import("./d1");
  const [row] = await (await getD1Db()).select().from(sqliteSchema.articles).where(eq(sqliteSchema.articles.slug, slug)).limit(1);
  return row ? mapArticleRow(row) : undefined;
}

function mapComposerRow(row: ComposerRow): Composer {
  return {
    id: row.id,
    slug: row.slug,
    name: row.name,
    nameCn: row.nameCn,
    birthYear: row.birthYear,
    deathYear: row.deathYear ?? undefined,
    country: row.country,
    period: row.period as MusicPeriod,
    portraitUrl: row.portraitUrl,
    shortBio: row.shortBio,
    bio: row.bio,
    styleTags: asStringArray(row.styleTags),
    timeline: asTimeline(row.timeline),
    starterWorkIds: asStringArray(row.starterWorkIds),
    relatedComposerIds: asStringArray(row.relatedComposerIds),
    featured: Boolean(row.featured),
  };
}

function mapWorkRow(row: WorkRow): Work {
  return {
    id: row.id,
    slug: row.slug,
    composerId: row.composerId,
    title: row.title,
    titleCn: row.titleCn,
    year: row.year ?? undefined,
    genre: row.genre,
    period: row.period as MusicPeriod,
    description: row.description,
    movements: asStringArray(row.movements),
    listeningLinks: asListeningLinks(row.listeningLinks),
    featured: Boolean(row.featured),
  };
}

function mapPerformanceRow(row: PerformanceRow): Performance {
  return {
    id: row.id,
    title: row.title,
    city: row.city,
    venue: row.venue,
    startsAt: asIsoString(row.startsAt),
    artists: asStringArray(row.artists),
    program: asProgram(row.program),
    ticketUrl: row.ticketUrl ?? undefined,
    sourceUrl: row.sourceUrl,
    sourceName: row.sourceName,
  };
}

function mapArticleRow(row: ArticleRow): Article {
  return {
    id: row.id,
    slug: row.slug,
    title: row.title,
    excerpt: row.excerpt,
    coverUrl: row.coverUrl,
    category: row.category,
    publishedAt: asIsoString(row.publishedAt),
    content: row.content,
    relatedComposerIds: asStringArray(row.relatedComposerIds),
    relatedWorkIds: asStringArray(row.relatedWorkIds),
  };
}

function asStringArray(value: unknown) {
  const parsed = parseJson(value);
  return Array.isArray(parsed) ? parsed.filter((item): item is string => typeof item === "string") : [];
}

function asTimeline(value: unknown): Composer["timeline"] {
  const parsed = parseJson(value);
  if (!Array.isArray(parsed)) return [];

  return parsed.flatMap((item) => {
    if (!isRecord(item) || typeof item.year !== "number" || typeof item.event !== "string") return [];
    return [{ year: item.year, event: item.event }];
  });
}

function asListeningLinks(value: unknown): Work["listeningLinks"] {
  const parsed = parseJson(value);
  if (!Array.isArray(parsed)) return [];

  return parsed.flatMap((item) => {
    if (!isRecord(item) || typeof item.platform !== "string" || typeof item.url !== "string") return [];
    return [{ platform: item.platform, url: item.url }];
  });
}

function asProgram(value: unknown): Performance["program"] {
  const parsed = parseJson(value);
  if (!Array.isArray(parsed)) return [];

  return parsed.flatMap((item) => {
    if (!isRecord(item) || typeof item.displayTitle !== "string") return [];

    return [{
      composerId: typeof item.composerId === "string" ? item.composerId : undefined,
      workId: typeof item.workId === "string" ? item.workId : undefined,
      displayTitle: item.displayTitle,
    }];
  });
}

function parseJson(value: unknown) {
  if (typeof value !== "string") return value;

  try {
    return JSON.parse(value) as unknown;
  } catch {
    return value;
  }
}

function asIsoString(value: Date | string) {
  return value instanceof Date ? value.toISOString() : value;
}

function isRecord(value: unknown): value is JsonRecord {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}
