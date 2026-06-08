import { defaultLocale, type Locale } from "@/i18n/config";

export function formatYearRange(birthYear: number, deathYear?: number, presentLabel = "至今") {
  return `${birthYear}–${deathYear ?? presentLabel}`;
}

export function formatPerformanceDate(startsAt: string, locale: Locale = defaultLocale) {
  return new Intl.DateTimeFormat(locale, {
    month: "long",
    day: "numeric",
    weekday: "short",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(startsAt));
}

export function formatArticleDate(publishedAt: string, locale: Locale = defaultLocale) {
  return new Intl.DateTimeFormat(locale, {
    year: "numeric",
    month: "long",
    day: "numeric",
  }).format(new Date(publishedAt));
}
