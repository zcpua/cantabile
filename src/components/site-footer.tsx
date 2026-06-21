"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { defaultLocale, isLocale, type Locale } from "@/i18n/config";
import { getDictionary, type Dictionary } from "@/i18n/dictionaries";
import { aboutPath, articlesPath, composersPath, performancesPath, worksPath } from "@/i18n/routes";

function localeFromPathname(pathname: string): Locale {
  const firstSegment = pathname.split("/").filter(Boolean)[0];
  return firstSegment && isLocale(firstSegment) ? firstSegment : defaultLocale;
}

export function SiteFooter({ locale, dictionary }: { locale?: Locale; dictionary?: Dictionary }) {
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
    <footer className="border-t border-border bg-ink text-ivory">
      <div className="mx-auto grid max-w-7xl gap-8 px-5 py-10 sm:px-8 lg:grid-cols-[1.5fr_1fr]">
        <div>
          <p className="font-serif text-2xl font-semibold">{t.site.name}</p>
          <p className="mt-3 max-w-xl leading-7 text-ivory/70">{t.site.footer}</p>
        </div>
        <div className="space-y-5 lg:text-right">
          <div className="flex flex-wrap gap-x-5 gap-y-3 text-sm text-ivory/75 lg:justify-end">
            {navItems.map((item) => (
              <Link key={item.href} href={item.href} className="hover:text-gold">
                {item.label}
              </Link>
            ))}
          </div>
          <a
            href="https://www.upyun.com/league"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex max-w-full opacity-85 transition-opacity hover:opacity-100 lg:justify-end"
            aria-label="又拍云联盟"
          >
            <Image
              src="/upyun-logo.png"
              alt="又拍云联盟"
              width={574}
              height={36}
              className="h-auto w-[min(287px,100%)]"
            />
          </a>
        </div>
      </div>
    </footer>
  );
}
