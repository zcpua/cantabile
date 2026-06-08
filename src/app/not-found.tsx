import Link from "next/link";

export default function NotFound() {
  return (
    <main className="flex flex-1 items-center justify-center px-5 py-24">
      <div className="max-w-xl rounded-[2rem] border border-border bg-white/70 p-10 text-center shadow-xl shadow-burgundy/5">
        <p className="eyebrow">404</p>
        <h1 className="mt-4 font-serif text-4xl font-semibold text-ink">乐章未找到</h1>
        <p className="mt-4 leading-7 text-muted">这个页面可能还没有被收录进档案。你可以回到首页，或继续浏览作曲家与作品。</p>
        <div className="mt-8 flex flex-wrap justify-center gap-3">
          <Link className="rounded-full bg-burgundy px-5 py-3 text-sm font-semibold text-white" href="/">回到首页</Link>
          <Link className="rounded-full border border-border px-5 py-3 text-sm font-semibold text-ink" href="/composers">浏览作曲家</Link>
          <Link className="rounded-full border border-border px-5 py-3 text-sm font-semibold text-ink" href="/works">浏览作品</Link>
        </div>
      </div>
    </main>
  );
}
