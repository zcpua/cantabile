"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { defaultLocale, isLocale, type Locale } from "@/i18n/config";
import { getDictionary, type Dictionary } from "@/i18n/dictionaries";
import { aboutPath, articlesPath, composersPath, homePath, performancesPath, worksPath } from "@/i18n/routes";
import { LocaleSwitcher } from "./locale-switcher";

function localeFromPathname(pathname: string): Locale {
  const firstSegment = pathname.split("/").filter(Boolean)[0];
  return firstSegment && isLocale(firstSegment) ? firstSegment : defaultLocale;
}

export function SiteHeader({ locale, dictionary, rootHref }: { locale?: Locale; dictionary?: Dictionary; rootHref?: string }) {
  const pathname = usePathname();
  const activeLocale = locale ?? localeFromPathname(pathname);
  const t = dictionary ?? getDictionary(activeLocale);
  const navItems = [
    { href: composersPath(activeLocale), label: t.nav.composers },
    { href: worksPath(activeLocale), label: t.nav.works },
    { href: performancesPath(activeLocale), label: t.nav.performances },
    { href: articlesPath(activeLocale), label: t.nav.articles },
    { href: aboutPath(activeLocale), label: t.nav.about },
  ];

  return (
    <header className="sticky top-0 z-40 border-b border-border/80 bg-ivory/90 backdrop-blur-xl">
      <nav className="mx-auto flex max-w-7xl flex-col gap-4 px-5 py-4 sm:px-8 lg:flex-row lg:items-center lg:justify-between" aria-label={t.nav.aria}>
        <Link href={rootHref ?? homePath(activeLocale)} className="group inline-flex items-baseline gap-3">
          <span className="font-serif text-2xl font-semibold tracking-tight text-ink">{t.site.name}</span>
          <span className="hidden text-xs uppercase tracking-[0.35em] text-gold sm:inline">{t.site.archiveLabel}</span>
        </Link>
        <div className="flex flex-wrap items-center gap-x-5 gap-y-2 text-sm font-medium text-muted">
          {navItems.map((item) => (
            <Link key={item.href} href={item.href} className="transition-colors hover:text-burgundy">
              {item.label}
            </Link>
          ))}
          <LocaleSwitcher locale={activeLocale} label={t.locale.switchLabel} />
        </div>
      </nav>
    </header>
  );
}
