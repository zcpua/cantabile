"use client";

import { useMemo, useState } from "react";
import type { Composer } from "@/data/types";
import { matchesQuery } from "@/lib/search";
import { ComposerCard } from "./composer-card";
import { EmptyState } from "./empty-state";
import { FilterSelect } from "./filter-select";
import { SearchBox } from "./search-box";

export function ComposerDirectory({
  composers,
  workCounts,
  periods,
  countries,
}: {
  composers: Composer[];
  workCounts: Record<string, number>;
  periods: string[];
  countries: string[];
}) {
  const [query, setQuery] = useState("");
  const [period, setPeriod] = useState("");
  const [country, setCountry] = useState("");

  const filtered = useMemo(
    () =>
      composers.filter(
        (composer) =>
          (!period || composer.period === period) &&
          (!country || composer.country === country) &&
          matchesQuery([composer.nameCn, composer.name, composer.country, composer.period, composer.shortBio, ...composer.styleTags], query),
      ),
    [composers, country, period, query],
  );

  return (
    <div className="space-y-7">
      <div className="grid gap-4 rounded-3xl border border-border bg-white/60 p-4 shadow-sm sm:grid-cols-3">
        <SearchBox value={query} onChange={setQuery} label="搜索作曲家" placeholder="贝多芬、德国、复调..." />
        <FilterSelect value={period} onChange={setPeriod} label="音乐时期" allLabel="全部时期" options={periods} />
        <FilterSelect value={country} onChange={setCountry} label="国家" allLabel="全部国家" options={countries} />
      </div>
      <p className="text-sm text-muted">找到 {filtered.length} 位作曲家</p>
      {filtered.length ? (
        <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
          {filtered.map((composer) => (
            <ComposerCard key={composer.id} composer={composer} workCount={workCounts[composer.id] ?? 0} />
          ))}
        </div>
      ) : (
        <EmptyState />
      )}
    </div>
  );
}
