import Link from "next/link";
import type { Article } from "@/data/types";
import { formatArticleDate } from "@/lib/format-date";
import { articlePath } from "@/lib/routes";
import { Card } from "./card";

export function ArticleCard({ article }: { article: Article }) {
  return (
    <Link href={articlePath(article.slug)} className="group block h-full focus:outline-none">
      <Card className="flex h-full flex-col group-focus-visible:ring-2 group-focus-visible:ring-burgundy">
        <p className="eyebrow">{article.category}</p>
        <h3 className="mt-3 font-serif text-2xl font-semibold leading-tight text-ink transition-colors group-hover:text-burgundy">{article.title}</h3>
        <p className="mt-4 line-clamp-3 leading-7 text-muted">{article.excerpt}</p>
        <p className="mt-auto pt-6 text-sm text-muted">{formatArticleDate(article.publishedAt)}</p>
      </Card>
    </Link>
  );
}
