import Link from "next/link";
import { navItems, site } from "@/data/site";

export function SiteHeader() {
  return (
    <header className="sticky top-0 z-40 border-b border-border/80 bg-ivory/90 backdrop-blur-xl">
      <nav className="mx-auto flex max-w-7xl flex-col gap-4 px-5 py-4 sm:px-8 lg:flex-row lg:items-center lg:justify-between" aria-label="主导航">
        <Link href="/" className="group inline-flex items-baseline gap-3">
          <span className="font-serif text-2xl font-semibold tracking-tight text-ink">{site.name}</span>
          <span className="hidden text-xs uppercase tracking-[0.35em] text-gold sm:inline">Archive</span>
        </Link>
        <div className="flex flex-wrap gap-x-5 gap-y-2 text-sm font-medium text-muted">
          {navItems.map((item) => (
            <Link key={item.href} href={item.href} className="transition-colors hover:text-burgundy">
              {item.label}
            </Link>
          ))}
        </div>
      </nav>
    </header>
  );
}
