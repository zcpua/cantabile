import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ComposerCard } from "@/components/composer-card";
import { PageShell } from "@/components/page-shell";
import { SectionHeading } from "@/components/section-heading";
import { WorkCard } from "@/components/work-card";
import { articles } from "@/data/articles";
import { getArticleBySlug, getComposerById, getComposerWorkCount, getWorkById } from "@/lib/data";
import { formatArticleDate } from "@/lib/format-date";

export function generateStaticParams() {
  return articles.map((article) => ({ slug: article.slug }));
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params;
  const article = getArticleBySlug(slug);

  if (!article) return { title: "专题未找到" };

  return {
    title: article.title,
    description: article.excerpt,
    openGraph: {
      title: article.title,
      description: article.excerpt,
      type: "article",
    },
  };
}

export default async function ArticleDetailPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const article = getArticleBySlug(slug);

  if (!article) notFound();

  const relatedComposers = article.relatedComposerIds?.map(getComposerById).filter((item) => item !== undefined) ?? [];
  const relatedWorks = article.relatedWorkIds?.map(getWorkById).filter((item) => item !== undefined) ?? [];

  return (
    <PageShell eyebrow={article.category} title={article.title} description={article.excerpt} narrow>
      <article className="cantabile-card prose-cantabile">
        <p className="text-sm text-muted">{formatArticleDate(article.publishedAt)}</p>
        {article.content.split("\n\n").map((paragraph) => <p key={paragraph}>{paragraph}</p>)}
        <Link className="mt-8 inline-block text-sm font-semibold text-burgundy underline-offset-4 hover:underline" href="/articles">返回专题列表</Link>
      </article>

      {relatedWorks.length ? (
        <section className="mt-12">
          <SectionHeading eyebrow="Related Works" title="文中提到的作品" />
          <div className="grid gap-5 md:grid-cols-2">
            {relatedWorks.map((work) => <WorkCard key={work.id} work={work} composer={getComposerById(work.composerId)} />)}
          </div>
        </section>
      ) : null}

      {relatedComposers.length ? (
        <section className="mt-12">
          <SectionHeading eyebrow="Related Composers" title="相关作曲家" />
          <div className="grid gap-5 md:grid-cols-2">
            {relatedComposers.map((composer) => <ComposerCard key={composer.id} composer={composer} workCount={getComposerWorkCount(composer.id)} />)}
          </div>
        </section>
      ) : null}
    </PageShell>
  );
}
