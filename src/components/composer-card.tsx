import Link from "next/link";
import type { Composer } from "@/data/types";
import type { Locale } from "@/i18n/config";
import { defaultLocale } from "@/i18n/config";
import { getDictionary, type Dictionary } from "@/i18n/dictionaries";
import { composerPath as localizedComposerPath } from "@/i18n/routes";
import { formatYearRange } from "@/lib/format-date";
import { composerPath } from "@/lib/routes";
import { Card } from "./card";

export function ComposerCard({ composer, workCount, locale, dictionary }: { composer: Composer; workCount: number; locale?: Locale; dictionary?: Dictionary }) {
  const t = dictionary ?? getDictionary(locale ?? defaultLocale);
  const href = locale ? localizedComposerPath(locale, composer.slug) : composerPath(composer.slug);

  return (
    <Link href={href} className="group block h-full focus:outline-none">
      <Card className="flex h-full flex-col gap-5 group-focus-visible:ring-2 group-focus-visible:ring-burgundy">
        <div className="flex items-start justify-between gap-4">
          <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-2xl border border-gold/50 bg-gold/10 font-serif text-2xl text-burgundy">
            {composer.nameCn.slice(0, 1)}
          </div>
          <span className="rounded-full border border-border px-3 py-1 text-xs text-muted">{composer.period}</span>
        </div>
        <div>
          <h3 className="font-serif text-2xl font-semibold text-ink transition-colors group-hover:text-burgundy">{composer.nameCn}</h3>
          <p className="mt-1 text-sm italic text-muted">{composer.name}</p>
        </div>
        <p className="line-clamp-3 leading-7 text-muted">{composer.shortBio}</p>
        <div className="mt-auto flex flex-wrap gap-2 text-xs text-muted">
          <span>{formatYearRange(composer.birthYear, composer.deathYear, t.labels.present)}</span>
          <span>·</span>
          <span>{composer.country}</span>
          <span>·</span>
          <span>{t.counts.representativeWorks(workCount)}</span>
        </div>
      </Card>
    </Link>
  );
}
