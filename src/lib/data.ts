import { articleCategories } from "@/data/site";
import type { Composer, Work } from "@/data/types";
import type { Locale } from "@/i18n/config";
import {
  findArticleBySlug,
  findComposerById,
  findComposerBySlug,
  findWorkById,
  findWorkBySlug,
  listArticles,
  listComposers,
  listPerformances,
  listWorks,
} from "@/db/repository";
import { uniqueCities, uniqueComposerPeriods, uniqueCountries, uniqueGenres, uniqueVenues, uniqueWorkPeriods } from "./filters";

export async function getComposers() {
  return listComposers();
}

export async function getWorks() {
  return listWorks();
}

export async function getPerformances() {
  return listPerformances();
}

export async function getArticles() {
  return listArticles();
}

export async function getComposerBySlug(slug: string) {
  return findComposerBySlug(slug);
}

export async function getComposerById(id: string) {
  return findComposerById(id);
}

export async function getWorkBySlug(slug: string) {
  return findWorkBySlug(slug);
}

export async function getWorkById(id: string) {
  return findWorkById(id);
}

export async function getArticleBySlug(slug: string) {
  return findArticleBySlug(slug);
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
