import type { Composer, Performance, Work } from "@/data/types";

function unique(values: string[]) {
  return Array.from(new Set(values)).filter(Boolean).sort((a, b) => a.localeCompare(b, "zh-CN"));
}

export const uniqueComposerPeriods = (composers: Composer[]) => unique(composers.map((item) => item.period));
export const uniqueCountries = (composers: Composer[]) => unique(composers.map((item) => item.country));
export const uniqueGenres = (works: Work[]) => unique(works.map((item) => item.genre));
export const uniqueWorkPeriods = (works: Work[]) => unique(works.map((item) => item.period));
export const uniqueCities = (performances: Performance[]) => unique(performances.map((item) => item.city));
export const uniqueVenues = (performances: Performance[]) => unique(performances.map((item) => item.venue));
