export function cn(...classes: Array<string | false | null | undefined>) {
  return classes.filter(Boolean).join(" ");
}

export function byNameCn<T extends { nameCn?: string; titleCn?: string }>(a: T, b: T) {
  return (a.nameCn ?? a.titleCn ?? "").localeCompare(b.nameCn ?? b.titleCn ?? "", "zh-CN");
}
