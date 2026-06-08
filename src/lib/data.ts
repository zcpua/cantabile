import { articles as staticArticles } from "@/data/articles";
import { composers as staticComposers } from "@/data/composers";
import { performances as staticPerformances } from "@/data/performances";
import { articleCategories } from "@/data/site";
import type { Article, Composer, MusicPeriod, Performance, Work } from "@/data/types";
import { works as staticWorks } from "@/data/works";
import type { Locale } from "@/i18n/config";
import { supabase } from "@/lib/supabase";
import { uniqueCities, uniqueComposerPeriods, uniqueCountries, uniqueGenres, uniqueVenues, uniqueWorkPeriods } from "./filters";

type JsonRecord = Record<string, unknown>;

type ComposerRow = {
  id: string;
  slug: string;
  name: string;
  name_cn: string;
  birth_year: number;
  death_year: number | null;
  country: string;
  period: MusicPeriod;
  portrait_url: string;
  short_bio: string;
  bio: string;
  style_tags: unknown;
  timeline: unknown;
  starter_work_ids: unknown;
  related_composer_ids: unknown;
  featured: boolean | null;
};

type WorkRow = {
  id: string;
  slug: string;
  composer_id: string;
  title: string;
  title_cn: string;
  year: number | null;
  genre: string;
  period: MusicPeriod;
  description: string;
  movements: unknown;
  listening_links: unknown;
  featured: boolean | null;
};

type PerformanceRow = {
  id: string;
  title: string;
  city: string;
  venue: string;
  starts_at: string;
  artists: unknown;
  program: unknown;
  ticket_url: string | null;
  source_url: string;
  source_name: string;
};

type ArticleRow = {
  id: string;
  slug: string;
  title: string;
  excerpt: string;
  cover_url: string;
  category: string;
  published_at: string;
  content: string;
  related_composer_ids: unknown;
  related_work_ids: unknown;
};

const asStringArray = (value: unknown) => Array.isArray(value) ? value.filter((item): item is string => typeof item === "string") : [];

function asTimeline(value: unknown): Composer["timeline"] {
  if (!Array.isArray(value)) return [];

  return value.flatMap((item) => {
    if (!isRecord(item) || typeof item.year !== "number" || typeof item.event !== "string") return [];
    return [{ year: item.year, event: item.event }];
  });
}

function asListeningLinks(value: unknown): Work["listeningLinks"] {
  if (!Array.isArray(value)) return [];

  return value.flatMap((item) => {
    if (!isRecord(item) || typeof item.platform !== "string" || typeof item.url !== "string") return [];
    return [{ platform: item.platform, url: item.url }];
  });
}

function asProgram(value: unknown): Performance["program"] {
  if (!Array.isArray(value)) return [];

  return value.flatMap((item) => {
    if (!isRecord(item) || typeof item.displayTitle !== "string") return [];

    return [{
      composerId: typeof item.composerId === "string" ? item.composerId : undefined,
      workId: typeof item.workId === "string" ? item.workId : undefined,
      displayTitle: item.displayTitle,
    }];
  });
}

function isRecord(value: unknown): value is JsonRecord {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

function mapComposerRow(row: ComposerRow): Composer {
  return {
    id: row.id,
    slug: row.slug,
    name: row.name,
    nameCn: row.name_cn,
    birthYear: row.birth_year,
    deathYear: row.death_year ?? undefined,
    country: row.country,
    period: row.period,
    portraitUrl: row.portrait_url,
    shortBio: row.short_bio,
    bio: row.bio,
    styleTags: asStringArray(row.style_tags),
    timeline: asTimeline(row.timeline),
    starterWorkIds: asStringArray(row.starter_work_ids),
    relatedComposerIds: asStringArray(row.related_composer_ids),
    featured: row.featured ?? undefined,
  };
}

function mapWorkRow(row: WorkRow): Work {
  return {
    id: row.id,
    slug: row.slug,
    composerId: row.composer_id,
    title: row.title,
    titleCn: row.title_cn,
    year: row.year ?? undefined,
    genre: row.genre,
    period: row.period,
    description: row.description,
    movements: asStringArray(row.movements),
    listeningLinks: asListeningLinks(row.listening_links),
    featured: row.featured ?? undefined,
  };
}

function mapPerformanceRow(row: PerformanceRow): Performance {
  return {
    id: row.id,
    title: row.title,
    city: row.city,
    venue: row.venue,
    startsAt: row.starts_at,
    artists: asStringArray(row.artists),
    program: asProgram(row.program),
    ticketUrl: row.ticket_url ?? undefined,
    sourceUrl: row.source_url,
    sourceName: row.source_name,
  };
}

function mapArticleRow(row: ArticleRow): Article {
  return {
    id: row.id,
    slug: row.slug,
    title: row.title,
    excerpt: row.excerpt,
    coverUrl: row.cover_url,
    category: row.category,
    publishedAt: row.published_at,
    content: row.content,
    relatedComposerIds: asStringArray(row.related_composer_ids),
    relatedWorkIds: asStringArray(row.related_work_ids),
  };
}

function ensureNoError(error: { message: string } | null, table: string) {
  if (error) throw new Error(`Failed to load ${table}: ${error.message}`);
}

export async function getComposers() {
  if (!supabase) return staticComposers;

  const { data, error } = await supabase.from("composers").select("*").order("birth_year", { ascending: true });
  ensureNoError(error, "composers");
  return (data as ComposerRow[]).map(mapComposerRow);
}

export async function getWorks() {
  if (!supabase) return staticWorks;

  const { data, error } = await supabase.from("works").select("*").order("year", { ascending: true, nullsFirst: false });
  ensureNoError(error, "works");
  return (data as WorkRow[]).map(mapWorkRow);
}

export async function getPerformances() {
  if (!supabase) return staticPerformances;

  const { data, error } = await supabase.from("performances").select("*").order("starts_at", { ascending: true });
  ensureNoError(error, "performances");
  return (data as PerformanceRow[]).map(mapPerformanceRow);
}

export async function getArticles() {
  if (!supabase) return staticArticles;

  const { data, error } = await supabase.from("articles").select("*").order("published_at", { ascending: false });
  ensureNoError(error, "articles");
  return (data as ArticleRow[]).map(mapArticleRow);
}

export async function getComposerBySlug(slug: string) {
  if (!supabase) return staticComposers.find((composer) => composer.slug === slug);

  const { data, error } = await supabase.from("composers").select("*").eq("slug", slug).maybeSingle();
  ensureNoError(error, "composer");
  return data ? mapComposerRow(data as ComposerRow) : undefined;
}

export async function getComposerById(id: string) {
  if (!supabase) return staticComposers.find((composer) => composer.id === id);

  const { data, error } = await supabase.from("composers").select("*").eq("id", id).maybeSingle();
  ensureNoError(error, "composer");
  return data ? mapComposerRow(data as ComposerRow) : undefined;
}

export async function getWorkBySlug(slug: string) {
  if (!supabase) return staticWorks.find((work) => work.slug === slug);

  const { data, error } = await supabase.from("works").select("*").eq("slug", slug).maybeSingle();
  ensureNoError(error, "work");
  return data ? mapWorkRow(data as WorkRow) : undefined;
}

export async function getWorkById(id: string) {
  if (!supabase) return staticWorks.find((work) => work.id === id);

  const { data, error } = await supabase.from("works").select("*").eq("id", id).maybeSingle();
  ensureNoError(error, "work");
  return data ? mapWorkRow(data as WorkRow) : undefined;
}

export async function getArticleBySlug(slug: string) {
  if (!supabase) return staticArticles.find((article) => article.slug === slug);

  const { data, error } = await supabase.from("articles").select("*").eq("slug", slug).maybeSingle();
  ensureNoError(error, "article");
  return data ? mapArticleRow(data as ArticleRow) : undefined;
}

export async function getWorksByComposerId(composerId: string) {
  const works = await getWorks();
  return works.filter((work) => work.composerId === composerId);
}

export async function getPerformancesForComposer(composerId: string) {
  const performances = await getPerformances();
  return performances.filter((performance) => performance.program.some((item) => item.composerId === composerId));
}

export async function getPerformancesForWork(workId: string) {
  const performances = await getPerformances();
  return performances.filter((performance) => performance.program.some((item) => item.workId === workId));
}

export async function getRelatedComposers(composerId: string) {
  const [composer, composers] = await Promise.all([getComposerById(composerId), getComposers()]);
  if (!composer) return [];

  return composer.relatedComposerIds.flatMap((id) => {
    const item = composers.find((composer) => composer.id === id);
    return item ? [item] : [];
  });
}

export async function getFeaturedComposers(limit = 6) {
  const composers = await getComposers();
  return composers.filter((composer) => composer.featured).slice(0, limit);
}

export async function getFeaturedWorks(limit = 6) {
  const works = await getWorks();
  return works.filter((work) => work.featured).slice(0, limit);
}

export async function getUpcomingPerformances(limit?: number) {
  const performances = await getPerformances();
  const sorted = [...performances].sort((a, b) => new Date(a.startsAt).getTime() - new Date(b.startsAt).getTime());

  return typeof limit === "number" ? sorted.slice(0, limit) : sorted;
}

export async function getComposerWorkCount(composerId: string) {
  const works = await getWorks();
  return works.filter((work) => work.composerId === composerId).length;
}

export function getComposerWorkCounts(composers: Composer[], works: Work[]) {
  return Object.fromEntries(composers.map((composer) => [composer.id, works.filter((work) => work.composerId === composer.id).length]));
}

export async function getHomePageData() {
  const [composers, works, performances, articles] = await Promise.all([getComposers(), getWorks(), getPerformances(), getArticles()]);

  return {
    composers,
    works,
    performances,
    articles,
    featuredComposers: composers.filter((composer) => composer.featured).slice(0, 6),
    featuredWorks: works.filter((work) => work.featured).slice(0, 6),
    upcoming: [...performances].sort((a, b) => new Date(a.startsAt).getTime() - new Date(b.startsAt).getTime()).slice(0, 3),
    beginnerArticles: articles.slice(0, 3),
    composerWorkCounts: getComposerWorkCounts(composers, works),
  };
}

export async function getComposerDirectoryData(locale?: Locale) {
  const [composers, works] = await Promise.all([getComposers(), getWorks()]);

  return {
    composers,
    workCounts: getComposerWorkCounts(composers, works),
    periods: uniqueComposerPeriods(composers, locale),
    countries: uniqueCountries(composers, locale),
  };
}

export async function getWorkDirectoryData(locale?: Locale) {
  const [works, composers] = await Promise.all([getWorks(), getComposers()]);

  return {
    works,
    composers,
    genres: uniqueGenres(works, locale),
    periods: uniqueWorkPeriods(works, locale),
  };
}

export async function getPerformanceDirectoryData(locale?: Locale) {
  const [performances, composers] = await Promise.all([getPerformances(), getComposers()]);

  return {
    performances,
    composers,
    cities: uniqueCities(performances, locale),
    venues: uniqueVenues(performances, locale),
  };
}

export async function getArticleDirectoryData() {
  const articles = await getArticles();
  const categories = Array.from(new Set([...articleCategories, ...articles.map((article) => article.category)])).filter(Boolean);

  return { articles, categories };
}

export async function getComposerDetailData(slug: string) {
  const [composer, allComposers, allWorks, performances] = await Promise.all([getComposerBySlug(slug), getComposers(), getWorks(), getPerformances()]);
  if (!composer) return undefined;

  const works = allWorks.filter((work) => work.composerId === composer.id);
  const starterWorks = composer.starterWorkIds.flatMap((id) => {
    const work = allWorks.find((work) => work.id === id);
    return work ? [work] : [];
  });
  const related = composer.relatedComposerIds.flatMap((id) => {
    const relatedComposer = allComposers.find((item) => item.id === id);
    return relatedComposer ? [relatedComposer] : [];
  });

  return {
    composer,
    works,
    starterWorks,
    performances: performances.filter((performance) => performance.program.some((item) => item.composerId === composer.id)),
    related,
    workCounts: getComposerWorkCounts(allComposers, allWorks),
  };
}

export async function getWorkDetailData(slug: string) {
  const [work, composers, works, performances] = await Promise.all([getWorkBySlug(slug), getComposers(), getWorks(), getPerformances()]);
  if (!work) return undefined;

  const composer = composers.find((composer) => composer.id === work.composerId);

  return {
    work,
    composer,
    performances: performances.filter((performance) => performance.program.some((item) => item.workId === work.id)),
    siblingWorks: works.filter((item) => item.composerId === work.composerId && item.id !== work.id).slice(0, 3),
  };
}

export async function getArticleDetailData(slug: string) {
  const [article, composers, works] = await Promise.all([getArticleBySlug(slug), getComposers(), getWorks()]);
  if (!article) return undefined;

  const relatedComposers = article.relatedComposerIds?.flatMap((id) => {
    const composer = composers.find((composer) => composer.id === id);
    return composer ? [composer] : [];
  }) ?? [];
  const relatedWorks = article.relatedWorkIds?.flatMap((id) => {
    const work = works.find((work) => work.id === id);
    return work ? [work] : [];
  }) ?? [];

  return {
    article,
    relatedComposers,
    relatedWorks,
    workComposers: Object.fromEntries(works.map((work) => [work.id, composers.find((composer) => composer.id === work.composerId)])),
    workCounts: getComposerWorkCounts(composers, works),
  };
}

export async function getSitemapData() {
  const [composers, works, articles] = await Promise.all([getComposers(), getWorks(), getArticles()]);
  return { composers, works, articles };
}
