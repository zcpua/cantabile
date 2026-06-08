import { articles } from "@/data/articles";
import { composers } from "@/data/composers";
import { performances } from "@/data/performances";
import { works } from "@/data/works";

export function getComposerBySlug(slug: string) {
  return composers.find((composer) => composer.slug === slug);
}

export function getComposerById(id: string) {
  return composers.find((composer) => composer.id === id);
}

export function getWorkBySlug(slug: string) {
  return works.find((work) => work.slug === slug);
}

export function getWorkById(id: string) {
  return works.find((work) => work.id === id);
}

export function getArticleBySlug(slug: string) {
  return articles.find((article) => article.slug === slug);
}

export function getWorksByComposerId(composerId: string) {
  return works.filter((work) => work.composerId === composerId);
}

export function getPerformancesForComposer(composerId: string) {
  return performances.filter((performance) =>
    performance.program.some((item) => item.composerId === composerId),
  );
}

export function getPerformancesForWork(workId: string) {
  return performances.filter((performance) =>
    performance.program.some((item) => item.workId === workId),
  );
}

export function getRelatedComposers(composerId: string) {
  const composer = getComposerById(composerId);
  return composer ? composer.relatedComposerIds.map(getComposerById).filter((item) => item !== undefined) : [];
}

export function getFeaturedComposers(limit = 6) {
  return composers.filter((composer) => composer.featured).slice(0, limit);
}

export function getFeaturedWorks(limit = 6) {
  return works.filter((work) => work.featured).slice(0, limit);
}

export function getUpcomingPerformances(limit?: number) {
  const sorted = [...performances].sort(
    (a, b) => new Date(a.startsAt).getTime() - new Date(b.startsAt).getTime(),
  );

  return typeof limit === "number" ? sorted.slice(0, limit) : sorted;
}

export function getComposerWorkCount(composerId: string) {
  return works.filter((work) => work.composerId === composerId).length;
}
