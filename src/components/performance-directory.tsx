"use client";

import { useMemo, useState } from "react";
import type { Composer, Performance } from "@/data/types";
import { matchesQuery } from "@/lib/search";
import { EmptyState } from "./empty-state";
import { FilterSelect } from "./filter-select";
import { PerformanceCard } from "./performance-card";
import { SearchBox } from "./search-box";

function inDateRange(startsAt: string, range: string) {
  if (!range) return true;
  const start = new Date(startsAt).getTime();
  const now = Date.now();
  const day = 24 * 60 * 60 * 1000;
  if (range === "7") return start <= now + 7 * day;
  if (range === "30") return start <= now + 30 * day;
  if (range === "90") return start <= now + 90 * day;
  return true;
}

export function PerformanceDirectory({
  performances,
  composers,
  cities,
  venues,
}: {
  performances: Performance[];
  composers: Composer[];
  cities: string[];
  venues: string[];
}) {
  const [query, setQuery] = useState("");
  const [city, setCity] = useState("");
  const [dateRange, setDateRange] = useState("");
  const [composerId, setComposerId] = useState("");
  const [venue, setVenue] = useState("");

  const composerMap = useMemo(() => new Map(composers.map((composer) => [composer.id, composer])), [composers]);
  const composerOptions = composers.map((composer) => ({ label: composer.nameCn, value: composer.id }));

  const filtered = useMemo(
    () =>
      performances.filter((performance) => {
        const programComposers = performance.program.map((item) => item.composerId ? composerMap.get(item.composerId) : undefined);
        return (
          (!city || performance.city === city) &&
          (!venue || performance.venue === venue) &&
          (!composerId || performance.program.some((item) => item.composerId === composerId)) &&
          inDateRange(performance.startsAt, dateRange) &&
          matchesQuery([
            performance.title,
            performance.city,
            performance.venue,
            ...performance.artists,
            ...performance.program.map((item) => item.displayTitle),
            ...programComposers.flatMap((composer) => [composer?.nameCn, composer?.name]),
          ], query)
        );
      }),
    [city, composerId, composerMap, dateRange, performances, query, venue],
  );

  return (
    <div className="space-y-7">
      <div className="grid gap-4 rounded-3xl border border-border bg-white/60 p-4 shadow-sm md:grid-cols-5">
        <SearchBox value={query} onChange={setQuery} label="搜索演出" placeholder="城市、场馆、曲目..." />
        <FilterSelect value={city} onChange={setCity} label="城市" allLabel="全部城市" options={cities} />
        <FilterSelect value={dateRange} onChange={setDateRange} label="日期" allLabel="全部日期" options={[{ value: "7", label: "未来 7 天" }, { value: "30", label: "未来 30 天" }, { value: "90", label: "未来 90 天" }]} />
        <FilterSelect value={composerId} onChange={setComposerId} label="作曲家" allLabel="全部作曲家" options={composerOptions} />
        <FilterSelect value={venue} onChange={setVenue} label="场馆" allLabel="全部场馆" options={venues} />
      </div>
      <p className="text-sm text-muted">找到 {filtered.length} 场演出</p>
      {filtered.length ? (
        <div className="grid gap-5 lg:grid-cols-2">
          {filtered.map((performance) => (
            <PerformanceCard key={performance.id} performance={performance} />
          ))}
        </div>
      ) : (
        <EmptyState />
      )}
    </div>
  );
}
