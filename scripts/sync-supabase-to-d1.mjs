import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { spawnSync } from "node:child_process";
import postgres from "postgres";

const root = resolve(new URL("..", import.meta.url).pathname);
loadEnvFiles([".env", ".env.local"]);

const outputPath = resolve(root, ".tmp/supabase-to-d1.sql");
const databaseUrl = process.env.DATABASE_URL;
const d1Database = process.env.CLOUDFLARE_D1_DATABASE_NAME ?? "cantabile";

if (!databaseUrl) throw new Error("DATABASE_URL is required to sync Supabase Postgres to D1.");

const sql = postgres(databaseUrl, { prepare: false });

try {
  const [composers, works, performances, articles] = await Promise.all([
    sql`select id, slug, name, name_cn, birth_year, death_year, country, period, portrait_url, short_bio, bio, style_tags, timeline, starter_work_ids, related_composer_ids, featured from public.composers order by birth_year asc`,
    sql`select id, slug, composer_id, title, title_cn, year, genre, period, description, movements, listening_links, featured from public.works order by year is null, year asc`,
    sql`select id, title, city, venue, starts_at, artists, program, ticket_url, source_url, source_name, image_url, price_label, sale_status, address, intro, is_classical, source_id, source_metadata from public.performances order by starts_at asc`,
    sql`select id, slug, title, excerpt, cover_url, category, published_at, content, related_composer_ids, related_work_ids from public.articles order by published_at desc`,
  ]);

  const statements = [
    "PRAGMA foreign_keys=OFF;",
    "DELETE FROM articles;",
    "DELETE FROM performances;",
    "DELETE FROM works;",
    "DELETE FROM composers;",
    insertStatement("composers", ["id", "slug", "name", "name_cn", "birth_year", "death_year", "country", "period", "portrait_url", "short_bio", "bio", "style_tags", "timeline", "starter_work_ids", "related_composer_ids", "featured"], composers, (composer) => ({
      id: sqliteValue(composer.id),
      slug: sqliteValue(composer.slug),
      name: sqliteValue(composer.name),
      name_cn: sqliteValue(composer.name_cn),
      birth_year: sqliteValue(composer.birth_year),
      death_year: sqliteValue(composer.death_year),
      country: sqliteValue(composer.country),
      period: sqliteValue(composer.period),
      portrait_url: sqliteValue(composer.portrait_url),
      short_bio: sqliteValue(composer.short_bio),
      bio: sqliteValue(composer.bio),
      style_tags: sqliteJsonValue(composer.style_tags),
      timeline: sqliteJsonValue(composer.timeline),
      starter_work_ids: sqliteJsonValue(composer.starter_work_ids),
      related_composer_ids: sqliteJsonValue(composer.related_composer_ids),
      featured: sqliteValue(Boolean(composer.featured)),
    })),
    insertStatement("works", ["id", "slug", "composer_id", "title", "title_cn", "year", "genre", "period", "description", "movements", "listening_links", "featured"], works, (work) => ({
      id: sqliteValue(work.id),
      slug: sqliteValue(work.slug),
      composer_id: sqliteValue(work.composer_id),
      title: sqliteValue(work.title),
      title_cn: sqliteValue(work.title_cn),
      year: sqliteValue(work.year),
      genre: sqliteValue(work.genre),
      period: sqliteValue(work.period),
      description: sqliteValue(work.description),
      movements: sqliteJsonValue(work.movements),
      listening_links: sqliteJsonValue(work.listening_links),
      featured: sqliteValue(Boolean(work.featured)),
    })),
    insertStatement("performances", ["id", "title", "city", "venue", "starts_at", "artists", "program", "ticket_url", "source_url", "source_name", "image_url", "price_label", "sale_status", "address", "intro", "is_classical", "source_id", "source_metadata"], performances, (performance) => ({
      id: sqliteValue(performance.id),
      title: sqliteValue(performance.title),
      city: sqliteValue(performance.city),
      venue: sqliteValue(performance.venue),
      starts_at: sqliteValue(toIsoString(performance.starts_at)),
      artists: sqliteJsonValue(performance.artists),
      program: sqliteJsonValue(performance.program),
      ticket_url: sqliteValue(performance.ticket_url),
      source_url: sqliteValue(performance.source_url),
      source_name: sqliteValue(performance.source_name),
      image_url: sqliteValue(performance.image_url),
      price_label: sqliteValue(performance.price_label),
      sale_status: sqliteValue(performance.sale_status),
      address: sqliteValue(performance.address),
      intro: sqliteValue(performance.intro),
      is_classical: sqliteValue(performance.is_classical),
      source_id: sqliteValue(performance.source_id),
      source_metadata: sqliteJsonValue(performance.source_metadata),
    })),
    insertStatement("articles", ["id", "slug", "title", "excerpt", "cover_url", "category", "published_at", "content", "related_composer_ids", "related_work_ids"], articles, (article) => ({
      id: sqliteValue(article.id),
      slug: sqliteValue(article.slug),
      title: sqliteValue(article.title),
      excerpt: sqliteValue(article.excerpt),
      cover_url: sqliteValue(article.cover_url),
      category: sqliteValue(article.category),
      published_at: sqliteValue(toIsoString(article.published_at)),
      content: sqliteValue(article.content),
      related_composer_ids: sqliteJsonValue(article.related_composer_ids),
      related_work_ids: sqliteJsonValue(article.related_work_ids),
    })),
    "PRAGMA foreign_keys=ON;",
  ].filter(Boolean);

  mkdirSync(dirname(outputPath), { recursive: true });
  writeFileSync(outputPath, `${statements.join("\n\n")}\n`);

  const result = spawnSync("npx", ["wrangler", "d1", "execute", d1Database, "--remote", "--file", outputPath], {
    cwd: root,
    stdio: "inherit",
    env: process.env,
  });

  if (result.status !== 0) throw new Error(`wrangler d1 execute failed with exit code ${result.status}`);

  console.log(`Synced composers=${composers.length} works=${works.length} performances=${performances.length} articles=${articles.length} to D1 database ${d1Database}.`);
} finally {
  await sql.end();
}

function insertStatement(table, columns, rows, mapRow) {
  if (rows.length === 0) return "";

  const values = rows.map((row) => {
    const mapped = mapRow(row);
    return `  (${columns.map((column) => mapped[column]).join(", ")})`;
  });

  return [`INSERT INTO ${table} (${columns.join(", ")}) VALUES`, values.join(",\n"), ";"].join("\n");
}

function sqliteValue(value) {
  if (value === undefined || value === null) return "NULL";
  if (typeof value === "number") return Number.isFinite(value) ? String(value) : "NULL";
  if (typeof value === "boolean") return value ? "1" : "0";
  return quote(String(value));
}

function sqliteJsonValue(value) {
  return quote(JSON.stringify(value ?? []));
}

function quote(value) {
  return `'${value.replaceAll("'", "''")}'`;
}

function toIsoString(value) {
  return value instanceof Date ? value.toISOString() : String(value);
}

function loadEnvFiles(files) {
  for (const file of files) {
    const path = resolve(root, file);
    if (!existsSync(path)) continue;

    for (const line of readFileSync(path, "utf8").split(/\r?\n/)) {
      const match = line.match(/^\s*([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.*)?\s*$/);
      if (!match || process.env[match[1]] !== undefined) continue;
      process.env[match[1]] = unquoteEnvValue(match[2] ?? "");
    }
  }
}

function unquoteEnvValue(value) {
  const trimmed = value.trim();
  if ((trimmed.startsWith('"') && trimmed.endsWith('"')) || (trimmed.startsWith("'") && trimmed.endsWith("'"))) {
    return trimmed.slice(1, -1);
  }
  return trimmed;
}
