export function EmptyState({ title = "没有找到结果", description = "试着减少筛选条件，或换一个关键词。" }) {
  return (
    <div className="rounded-3xl border border-dashed border-border bg-white/50 p-10 text-center">
      <p className="text-lg font-semibold text-ink">{title}</p>
      <p className="mt-2 text-sm text-muted">{description}</p>
    </div>
  );
}
