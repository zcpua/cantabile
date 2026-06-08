export function formatYearRange(birthYear: number, deathYear?: number) {
  return `${birthYear}–${deathYear ?? "至今"}`;
}

export function formatPerformanceDate(startsAt: string) {
  return new Intl.DateTimeFormat("zh-CN", {
    month: "long",
    day: "numeric",
    weekday: "short",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(startsAt));
}

export function formatArticleDate(publishedAt: string) {
  return new Intl.DateTimeFormat("zh-CN", {
    year: "numeric",
    month: "long",
    day: "numeric",
  }).format(new Date(publishedAt));
}
