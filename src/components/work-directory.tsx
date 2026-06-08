"use client";

import { useMemo, useState } from "react";
import type { Composer, Work } from "@/data/types";
import { matchesQuery } from "@/lib/search";
import { EmptyState } from "./empty-state";
import { FilterSelect } from "./filter-select";
import { SearchBox } from "./search-box";
import { WorkCard } from "./work-card";

export function WorkDirectory({
  works,
  composers,
  genres,
  periods,
}: {
  works: Work[];
  composers: Composer[];
  genres: string[];
  periods: string[];
}) {
  const [query, setQuery] = useState("");
  const [composerId, setComposerId] = useState("");
  const [genre, setGenre] = useState("");
  const [period, setPeriod] = useState("");

  const composerMap = useMemo(() => new Map(composers.map((composer) => [composer.id, composer])), [composers]);
  const composerOptions = composers.map((composer) => ({ label: composer.nameCn, value: composer.id }));

  const filtered = useMemo(
    () =>
      works.filter((work) => {
        const composer = composerMap.get(work.composerId);
        return (
          (!composerId || work.composerId === composerId) &&
          (!genre || work.genre === genre) &&
          (!period || work.period === period) &&
          matchesQuery([work.titleCn, work.title, work.genre, work.period, work.description, composer?.nameCn, composer?.name], query)
        );
      }),
    [composerId, composerMap, genre, period, query, works],
  );

  return (
    <div className="space-y-7">
      <div className="grid gap-4 rounded-3xl border border-border bg-white/60 p-4 shadow-sm md:grid-cols-4">
        <SearchBox value={query} onChange={setQuery} label="搜索作品" placeholder="月光、协奏曲、德彪西..." />
        <FilterSelect value={composerId} onChange={setComposerId} label="作曲家" allLabel="全部作曲家" options={composerOptions} />
        <FilterSelect value={genre} onChange={setGenre} label="体裁" allLabel="全部体裁" options={genres} />
        <FilterSelect value={period} onChange={setPeriod} label="时期" allLabel="全部时期" options={periods} />
      </div>
      <p className="text-sm text-muted">找到 {filtered.length} 首作品</p>
      {filtered.length ? (
        <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
          {filtered.map((work) => (
            <WorkCard key={work.id} work={work} composer={composerMap.get(work.composerId)} />
          ))}
        </div>
      ) : (
        <EmptyState />
      )}
    </div>
  );
}
