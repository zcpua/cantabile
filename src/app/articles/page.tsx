import type { Metadata } from "next";
import { ArticleDirectory } from "@/components/article-directory";
import { PageShell } from "@/components/page-shell";
import { articles } from "@/data/articles";
import { articleCategories } from "@/data/site";

export const metadata: Metadata = {
  title: "专题",
  description: "阅读古典音乐入门、作曲家指南、作品导听和演出观前指南。",
};

export default function ArticlesPage() {
  return (
    <PageShell eyebrow="Listening Guides" title="专题" description="用一篇短文进入一位作曲家、一首作品或一场音乐会。">
      <ArticleDirectory articles={articles} categories={[...articleCategories]} />
    </PageShell>
  );
}
