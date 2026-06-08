import Link from "next/link";
import { navItems, site } from "@/data/site";

export function SiteFooter() {
  return (
    <footer className="border-t border-border bg-ink text-ivory">
      <div className="mx-auto grid max-w-7xl gap-8 px-5 py-10 sm:px-8 lg:grid-cols-[1.5fr_1fr]">
        <div>
          <p className="font-serif text-2xl font-semibold">{site.name}</p>
          <p className="mt-3 max-w-xl leading-7 text-ivory/70">
            一个面向古典音乐初学者和爱好者的内容入口。第一版使用精选静态数据，后续可扩展数据库、后台管理和演出同步。
          </p>
        </div>
        <div className="flex flex-wrap gap-x-5 gap-y-3 text-sm text-ivory/75 lg:justify-end">
          {navItems.map((item) => (
            <Link key={item.href} href={item.href} className="hover:text-gold">
              {item.label}
            </Link>
          ))}
        </div>
      </div>
    </footer>
  );
}
