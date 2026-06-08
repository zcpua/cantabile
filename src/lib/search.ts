export function normalizeSearchText(value: string) {
  return value.toLowerCase().replace(/\s+/g, " ").trim();
}

export function matchesQuery(fields: Array<string | number | undefined>, query: string) {
  const normalizedQuery = normalizeSearchText(query);

  if (!normalizedQuery) {
    return true;
  }

  return fields
    .filter((field): field is string | number => field !== undefined)
    .some((field) => normalizeSearchText(String(field)).includes(normalizedQuery));
}
