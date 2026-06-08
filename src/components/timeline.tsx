export function Timeline({ items }: { items: { year: number; event: string }[] }) {
  return (
    <ol className="space-y-4 border-l border-gold/50 pl-5">
      {items.map((item) => (
        <li key={`${item.year}-${item.event}`} className="relative">
          <span className="absolute -left-[29px] top-1 h-3 w-3 rounded-full border border-gold bg-ivory" />
          <p className="font-semibold text-burgundy">{item.year}</p>
          <p className="mt-1 leading-7 text-muted">{item.event}</p>
        </li>
      ))}
    </ol>
  );
}
