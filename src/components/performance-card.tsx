import Image from "next/image";
import type { Performance } from "@/data/types";
import type { Locale } from "@/i18n/config";
import { defaultLocale } from "@/i18n/config";
import { getDictionary, type Dictionary } from "@/i18n/dictionaries";
import { formatPerformanceDate } from "@/lib/format-date";
import { Card } from "./card";

export function PerformanceCard({ performance, locale = defaultLocale, dictionary = getDictionary(locale) }: { performance: Performance; locale?: Locale; dictionary?: Dictionary }) {
  const artistSeparator = locale === "zh-CN" ? "、" : ", ";
  const labelSeparator = locale === "zh-CN" ? "：" : ": ";

  return (
    <Card className="h-full overflow-hidden">
      {performance.imageUrl ? (
        <div className="relative mb-5 aspect-[16/9] overflow-hidden rounded-2xl">
          <Image className="object-cover" src={performance.imageUrl} alt="" fill sizes="(min-width: 1024px) 33vw, (min-width: 640px) 50vw, 100vw" />
        </div>
      ) : null}
      <p className="eyebrow">{formatPerformanceDate(performance.startsAt, locale)}</p>
      <h3 className="mt-3 font-serif text-2xl font-semibold leading-tight text-ink">{performance.title}</h3>
      <div className="mt-4 space-y-2 text-sm text-muted">
        <p><span className="font-medium text-ink">{dictionary.labels.city}</span>{labelSeparator}{performance.city}</p>
        <p><span className="font-medium text-ink">{dictionary.labels.venue}</span>{labelSeparator}{performance.venue}</p>
        <p><span className="font-medium text-ink">{dictionary.labels.artists}</span>{labelSeparator}{performance.artists.join(artistSeparator)}</p>
        {performance.priceLabel ? <p><span className="font-medium text-ink">{locale === "zh-CN" ? "票价" : "Price"}</span>{labelSeparator}{performance.priceLabel}</p> : null}
        {performance.saleStatus ? <p><span className="font-medium text-ink">{locale === "zh-CN" ? "状态" : "Status"}</span>{labelSeparator}{performance.saleStatus}</p> : null}
      </div>
      <ul className="mt-5 space-y-2 border-l border-gold/50 pl-4 text-sm leading-6 text-muted">
        {performance.program.map((item) => (
          <li key={`${performance.id}-${item.displayTitle}`}>{item.displayTitle}</li>
        ))}
      </ul>
      <div className="mt-6 flex flex-wrap gap-4 text-sm font-semibold">
        {performance.ticketUrl ? (
          <a className="text-burgundy underline-offset-4 hover:underline" href={performance.ticketUrl} target="_blank" rel="noreferrer">
            {dictionary.labels.ticket}
          </a>
        ) : null}
        <a className="text-muted underline-offset-4 hover:text-burgundy hover:underline" href={performance.sourceUrl} target="_blank" rel="noreferrer">
          {performance.sourceName}
        </a>
      </div>
    </Card>
  );
}
