import Link from "next/link";
import { ArticleCard } from "@/components/article-card";
import { ComposerCard } from "@/components/composer-card";
import { GlobalSearchPanel } from "@/components/global-search-panel";
import { PerformanceCard } from "@/components/performance-card";
import { SectionHeading } from "@/components/section-heading";
import { WorkCard } from "@/components/work-card";
import { articles } from "@/data/articles";
import { composers } from "@/data/composers";
import { performances } from "@/data/performances";
import { works } from "@/data/works";
import { getComposerById, getComposerWorkCount, getFeaturedComposers, getFeaturedWorks, getUpcomingPerformances } from "@/lib/data";
import { routes } from "@/lib/routes";

export default function Home() {
  const featuredComposers = getFeaturedComposers(6);
  const featuredWorks = getFeaturedWorks(6);
  const upcoming = getUpcomingPerformances(3);
  const beginnerArticles = articles.slice(0, 3);

  return (
    <main className="flex-1">
      <section className="mx-auto grid max-w-7xl gap-10 px-5 py-14 sm:px-8 lg:grid-cols-[1.05fr_0.95fr] lg:py-20">
        <div className="flex flex-col justify-center">
          <p className="eyebrow">A classical music archive</p>
          <h1 className="mt-5 font-serif text-5xl font-semibold leading-tight tracking-tight text-ink sm:text-7xl">
            从一位作曲家，进入一座音乐厅。
          </h1>
          <p className="mt-6 max-w-2xl text-lg leading-8 text-muted">
            Cantabile 如歌汇集古典音乐作曲家、代表作品、近期演出和入门导读，让初学者和爱好者都能快速找到下一首想听的音乐。
          </p>
          <div className="mt-8 flex flex-wrap gap-3">
            <Link className="rounded-full bg-burgundy px-5 py-3 text-sm font-semibold text-white shadow-lg shadow-burgundy/20 transition hover:bg-ink" href={routes.composers}>
              浏览作曲家
            </Link>
            <Link className="rounded-full border border-border bg-white/60 px-5 py-3 text-sm font-semibold text-ink transition hover:border-gold" href={routes.performances}>
              查看近期演出
            </Link>
          </div>
        </div>
        <GlobalSearchPanel composers={composers} works={works} performances={performances} articles={articles} />
      </section>

      <section className="mx-auto max-w-7xl px-5 py-10 sm:px-8">
        <SectionHeading eyebrow="I. Composers" title="推荐作曲家" description="从几位最适合入门的作曲家开始，建立音乐时期和风格的地图。" href={routes.composers} linkLabel="全部作曲家" />
        <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
          {featuredComposers.map((composer) => (
            <ComposerCard key={composer.id} composer={composer} workCount={getComposerWorkCount(composer.id)} />
          ))}
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-5 py-10 sm:px-8">
        <SectionHeading eyebrow="II. Performances" title="近期演出" description="样例演出数据帮助你从曲目反向认识作曲家和作品。" href={routes.performances} linkLabel="全部演出" />
        <div className="grid gap-5 lg:grid-cols-3">
          {upcoming.map((performance) => (
            <PerformanceCard key={performance.id} performance={performance} />
          ))}
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-5 py-10 sm:px-8">
        <SectionHeading eyebrow="III. Works" title="热门代表作" description="从常见曲目进入不同体裁：交响曲、协奏曲、钢琴小品、芭蕾与室内乐。" href={routes.works} linkLabel="全部作品" />
        <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
          {featuredWorks.map((work) => (
            <WorkCard key={work.id} work={work} composer={getComposerById(work.composerId)} />
          ))}
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-5 py-10 pb-20 sm:px-8">
        <SectionHeading eyebrow="IV. Guides" title="入门专题" description="用较短的导读理解一位作曲家、一首作品或一次音乐会。" href={routes.articles} linkLabel="全部专题" />
        <div className="grid gap-5 md:grid-cols-3">
          {beginnerArticles.map((article) => (
            <ArticleCard key={article.id} article={article} />
          ))}
        </div>
      </section>
    </main>
  );
}
