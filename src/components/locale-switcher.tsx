"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { localeLabels, locales, type Locale } from "@/i18n/config";
import { switchLocalePath } from "@/i18n/routes";

export function LocaleSwitcher({ locale, label }: { locale: Locale; label: string }) {
  const pathname = usePathname();

  return (
    <div className="flex items-center gap-2" aria-label={label}>
      {locales.map((item) => (
        <Link
          key={item}
          href={switchLocalePath(pathname, item)}
          className={item === locale ? "font-semibold text-burgundy" : "text-muted transition-colors hover:text-burgundy"}
          aria-current={item === locale ? "page" : undefined}
        >
          {localeLabels[item]}
        </Link>
      ))}
    </div>
  );
}
