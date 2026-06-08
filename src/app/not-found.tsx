import Link from "next/link";
import { defaultLocale } from "@/i18n/config";
import { getDictionary } from "@/i18n/dictionaries";
import { composersPath, homePath, worksPath } from "@/i18n/routes";

export default function NotFound() {
  const dictionary = getDictionary(defaultLocale);

  return (
    <main className="flex flex-1 items-center justify-center px-5 py-24">
      <div className="max-w-xl rounded-[2rem] border border-border bg-white/70 p-10 text-center shadow-xl shadow-burgundy/5">
        <p className="eyebrow">{dictionary.notFound.eyebrow}</p>
        <h1 className="mt-4 font-serif text-4xl font-semibold text-ink">{dictionary.notFound.title}</h1>
        <p className="mt-4 leading-7 text-muted">{dictionary.notFound.description}</p>
        <div className="mt-8 flex flex-wrap justify-center gap-3">
          <Link className="rounded-full bg-burgundy px-5 py-3 text-sm font-semibold text-white" href={homePath(defaultLocale)}>{dictionary.notFound.home}</Link>
          <Link className="rounded-full border border-border px-5 py-3 text-sm font-semibold text-ink" href={composersPath(defaultLocale)}>{dictionary.notFound.composers}</Link>
          <Link className="rounded-full border border-border px-5 py-3 text-sm font-semibold text-ink" href={worksPath(defaultLocale)}>{dictionary.notFound.works}</Link>
        </div>
      </div>
    </main>
  );
}
