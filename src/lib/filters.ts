import type { Composer, Performance, Work } from "@/data/types";
import { defaultLocale, type Locale } from "@/i18n/config";

function unique(values: string[], locale: Locale = defaultLocale) {
  return Array.from(new Set(values)).filter(Boolean).sort((a, b) => a.localeCompare(b, locale));
}

export const uniqueComposerPeriods = (composers: Composer[], locale?: Locale) => unique(composers.map((item) => item.period), locale);
export const uniqueCountries = (composers: Composer[], locale?: Locale) => unique(composers.map((item) => item.country), locale);
export const uniqueGenres = (works: Work[], locale?: Locale) => unique(works.map((item) => item.genre), locale);
export const uniqueWorkPeriods = (works: Work[], locale?: Locale) => unique(works.map((item) => item.period), locale);
export const uniqueCities = (performances: Performance[], locale?: Locale) => unique(performances.map((item) => item.city), locale);
export const uniqueVenues = (performances: Performance[], locale?: Locale) => unique(performances.map((item) => item.venue), locale);
