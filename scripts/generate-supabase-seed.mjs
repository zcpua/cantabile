import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { Script } from "node:vm";
import ts from "typescript";

const root = resolve(new URL("..", import.meta.url).pathname);
const outputPath = resolve(root, "supabase/seed.sql");

function loadTsModule(relativePath, exportName, context = {}) {
  const filePath = resolve(root, relativePath);
  const source = readFileSync(filePath, "utf8");
  const compiled = ts.transpileModule(source, {
    compilerOptions: {
      module: ts.ModuleKind.CommonJS,
      target: ts.ScriptTarget.ES2022,
      esModuleInterop: true,
    },
    fileName: filePath,
  }).outputText;

  const cjsModule = { exports: {} };
  const sandbox = {
    exports: cjsModule.exports,
    module: cjsModule,
    require: (specifier) => {
      if (specifier === "./types") return {};
      throw new Error(`Unsupported import ${specifier} in ${relativePath}`);
    },
    encodeURIComponent,
    ...context,
  };

  new Script(compiled, { filename: filePath }).runInNewContext(sandbox);

  return cjsModule.exports[exportName];
}

function sqlValue(value, { jsonb = false } = {}) {
  if (value === undefined || value === null) return "null";
  if (jsonb) return `${quote(JSON.stringify(value))}::jsonb`;
  if (typeof value === "number") return Number.isFinite(value) ? String(value) : "null";
  if (typeof value === "boolean") return value ? "true" : "false";
  return quote(String(value));
}

function quote(value) {
  return `'${value.replaceAll("'", "''")}'`;
}

function insertStatement(table, columns, rows, mapRow) {
  const values = rows.map((row) => {
    const mapped = mapRow(row);
    return `  (${columns.map((column) => mapped[column]).join(", ")})`;
  });
  const updates = columns.filter((column) => column !== "id").map((column) => `  ${column} = excluded.${column}`);

  return [
    `insert into public.${table} (${columns.join(", ")}) values`,
    `${values.join(",\n")}`,
    "on conflict (id) do update set",
    `${updates.join(",\n")};`,
  ].join("\n");
}

const composers = loadTsModule("src/data/composers.ts", "composers");
const works = loadTsModule("src/data/works.ts", "works");
const performances = loadTsModule("src/data/performances.ts", "performances");
const articles = loadTsModule("src/data/articles.ts", "articles");

const composersSql = insertStatement(
  "composers",
  ["id", "slug", "name", "name_cn", "birth_year", "death_year", "country", "period", "portrait_url", "short_bio", "bio", "style_tags", "timeline", "starter_work_ids", "related_composer_ids", "featured"],
  composers,
  (composer) => ({
    id: sqlValue(composer.id),
    slug: sqlValue(composer.slug),
    name: sqlValue(composer.name),
    name_cn: sqlValue(composer.nameCn),
    birth_year: sqlValue(composer.birthYear),
    death_year: sqlValue(composer.deathYear),
    country: sqlValue(composer.country),
    period: sqlValue(composer.period),
    portrait_url: sqlValue(composer.portraitUrl),
    short_bio: sqlValue(composer.shortBio),
    bio: sqlValue(composer.bio),
    style_tags: sqlValue(composer.styleTags, { jsonb: true }),
    timeline: sqlValue(composer.timeline, { jsonb: true }),
    starter_work_ids: sqlValue(composer.starterWorkIds, { jsonb: true }),
    related_composer_ids: sqlValue(composer.relatedComposerIds, { jsonb: true }),
    featured: sqlValue(composer.featured ?? false),
  }),
);

const worksSql = insertStatement(
  "works",
  ["id", "slug", "composer_id", "title", "title_cn", "year", "genre", "period", "description", "movements", "listening_links", "featured"],
  works,
  (work) => ({
    id: sqlValue(work.id),
    slug: sqlValue(work.slug),
    composer_id: sqlValue(work.composerId),
    title: sqlValue(work.title),
    title_cn: sqlValue(work.titleCn),
    year: sqlValue(work.year),
    genre: sqlValue(work.genre),
    period: sqlValue(work.period),
    description: sqlValue(work.description),
    movements: sqlValue(work.movements ?? [], { jsonb: true }),
    listening_links: sqlValue(work.listeningLinks ?? [], { jsonb: true }),
    featured: sqlValue(work.featured ?? false),
  }),
);

const performancesSql = insertStatement(
  "performances",
  ["id", "title", "city", "venue", "starts_at", "artists", "program", "ticket_url", "source_url", "source_name"],
  performances,
  (performance) => ({
    id: sqlValue(performance.id),
    title: sqlValue(performance.title),
    city: sqlValue(performance.city),
    venue: sqlValue(performance.venue),
    starts_at: sqlValue(performance.startsAt),
    artists: sqlValue(performance.artists, { jsonb: true }),
    program: sqlValue(performance.program, { jsonb: true }),
    ticket_url: sqlValue(performance.ticketUrl),
    source_url: sqlValue(performance.sourceUrl),
    source_name: sqlValue(performance.sourceName),
  }),
);

const articlesSql = insertStatement(
  "articles",
  ["id", "slug", "title", "excerpt", "cover_url", "category", "published_at", "content", "related_composer_ids", "related_work_ids"],
  articles,
  (article) => ({
    id: sqlValue(article.id),
    slug: sqlValue(article.slug),
    title: sqlValue(article.title),
    excerpt: sqlValue(article.excerpt),
    cover_url: sqlValue(article.coverUrl),
    category: sqlValue(article.category),
    published_at: sqlValue(article.publishedAt),
    content: sqlValue(article.content),
    related_composer_ids: sqlValue(article.relatedComposerIds, { jsonb: true }),
    related_work_ids: sqlValue(article.relatedWorkIds, { jsonb: true }),
  }),
);

const sql = [
  "-- Generated from src/data/*.ts by scripts/generate-supabase-seed.mjs.",
  "-- Re-run npm run seed:supabase after changing static content.",
  `-- composers: ${composers.length}, works: ${works.length}, performances: ${performances.length}, articles: ${articles.length}`,
  "",
  composersSql,
  "",
  worksSql,
  "",
  performancesSql,
  "",
  articlesSql,
  "",
].join("\n");

mkdirSync(dirname(outputPath), { recursive: true });
writeFileSync(outputPath, sql);
console.log(`Wrote ${outputPath}`);
console.log(`composers=${composers.length} works=${works.length} performances=${performances.length} articles=${articles.length}`);
