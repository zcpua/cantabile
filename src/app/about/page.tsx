import type { Metadata } from "next";
import { PageShell } from "@/components/page-shell";

export const metadata: Metadata = {
  title: "关于",
  description: "了解 Cantabile 如歌：面向古典音乐爱好者和初学者的作曲家、作品与演出内容网站。",
};

export default function AboutPage() {
  return (
    <PageShell eyebrow="About Cantabile" title="关于 Cantabile 如歌" description="这里不是百科全书，而是一间可以开始聆听的音乐档案室。" narrow>
      <div className="prose-cantabile rounded-[2rem] border border-border bg-white/65 p-6 shadow-sm sm:p-10">
        <p>第一版 Cantabile 如歌面向古典音乐初学者、爱好者和演出观众，帮助用户从作曲家、代表作品和近期演出三个方向进入古典音乐。</p>
        <p>当前内容为精选静态数据，重点验证浏览、筛选、搜索、详情页和 SEO 结构。后续版本可以接入 Supabase、内容管理后台、真实演出数据源和更完整的聆听路线。</p>
        <p>我们希望它既像音乐厅节目册，也像一间安静的档案馆：清晰、克制，但足够有温度。</p>
      </div>
    </PageShell>
  );
}
