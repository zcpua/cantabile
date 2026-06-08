import Link from "next/link";
import type { Composer, Work } from "@/data/types";
import { workPath } from "@/lib/routes";
import { Card } from "./card";

export function WorkCard({ work, composer }: { work: Work; composer?: Composer }) {
  return (
    <Link href={workPath(work.slug)} className="group block h-full focus:outline-none">
      <Card className="flex h-full flex-col group-focus-visible:ring-2 group-focus-visible:ring-burgundy">
        <div className="mb-4 flex flex-wrap gap-2 text-xs text-muted">
          <span className="rounded-full bg-burgundy/10 px-3 py-1 text-burgundy">{work.genre}</span>
          <span className="rounded-full border border-border px-3 py-1">{work.period}</span>
          {work.year ? <span className="rounded-full border border-border px-3 py-1">{work.year}</span> : null}
        </div>
        <h3 className="font-serif text-2xl font-semibold leading-tight text-ink transition-colors group-hover:text-burgundy">{work.titleCn}</h3>
        <p className="mt-1 text-sm italic text-muted">{work.title}</p>
        {composer ? <p className="mt-3 text-sm font-medium text-burgundy">{composer.nameCn}</p> : null}
        <p className="mt-4 line-clamp-4 leading-7 text-muted">{work.description}</p>
      </Card>
    </Link>
  );
}
