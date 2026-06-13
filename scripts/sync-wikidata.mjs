// Sync Wikidata composers + their works into Supabase.
// Strategy:
//   1) For the curated `composerSeed`, fetch composer-level data via SPARQL.
//   2) For each composer, page through their works (P86 = composer link).
//   3) Upsert into wikidata_composers / wikidata_works keyed on QID.
// Works expand to per-composer to keep individual SPARQL queries small and
// avoid the 60s public endpoint timeout.

import postgres from "postgres";
import { composerSeed } from "./lib/composer-seed.mjs";
import { compactRecord, fetchJson, loadEnvFiles, parseFlagArgs } from "./lib/sync-shared.mjs";

loadEnvFiles();

const sparqlEndpoint = "https://query.wikidata.org/sparql";
const sourceName = "Wikidata";

const args = parseFlagArgs(process.argv.slice(2), {
  defaults: { workLimit: 500 },
  flags: ["--help", "--dry-run", "--save", "--json", "--list-composers"],
  valued: ["--composer", "--work-limit"],
  numeric: ["--work-limit"],
  aliases: { "-h": "--help" },
});

if (args.help) {
  printHelp();
  process.exit(0);
}

const targets = args.composer
  ? composerSeed.filter((entry) => entry.id === args.composer || entry.qid === args.composer)
  : composerSeed;

if (targets.length === 0) throw new Error(`No matching composer in seed for ${args.composer}.`);

if (args.listComposers) {
  for (const entry of composerSeed) console.log(`${entry.id}\t${entry.qid}\t${entry.name}`);
  process.exit(0);
}

const composers = await fetchComposers(targets.map((entry) => entry.qid));
const works = [];
for (const composer of composers) {
  const composerWorks = await fetchWorksForComposer(composer.qid, args.workLimit);
  works.push(...composerWorks);
  console.error(`fetched ${composerWorks.length} works for ${composer.name} (${composer.qid})`);
}

if (args.json) {
  console.log(JSON.stringify({ composers, works }, null, 2));
} else {
  console.error(`Composers: ${composers.length}, works: ${works.length}.`);
}

if (args.save) {
  if (!process.env.DATABASE_URL) throw new Error("DATABASE_URL is required when using --save.");
  const sql = postgres(process.env.DATABASE_URL, { prepare: false });
  try {
    for (const composer of composers) await upsertComposer(sql, composer);
    for (const work of works) await upsertWork(sql, work);
    console.error(`saved composers=${composers.length} works=${works.length}`);
  } finally {
    await sql.end();
  }
}

async function fetchComposers(qids) {
  const values = qids.map((qid) => `wd:${qid}`).join(" ");
  const query = `
    SELECT ?composer ?composerLabel ?composerLabelZh ?birth ?death ?countryLabel ?imslpCategory WHERE {
      VALUES ?composer { ${values} }
      OPTIONAL { ?composer wdt:P569 ?birth. }
      OPTIONAL { ?composer wdt:P570 ?death. }
      OPTIONAL { ?composer wdt:P27 ?country. ?country rdfs:label ?countryLabel FILTER(LANG(?countryLabel) = "en"). }
      OPTIONAL { ?composer wdt:P839 ?imslpCategory. }
      OPTIONAL { ?composer rdfs:label ?composerLabel FILTER(LANG(?composerLabel) = "en"). }
      OPTIONAL { ?composer rdfs:label ?composerLabelZh FILTER(LANG(?composerLabelZh) = "zh"). }
    }`;

  const rows = await runSparql(query);
  // SPARQL OPTIONALs (English + Chinese label, country label) can produce
  // multiple rows per composer; collapse to one row per QID, preferring rows
  // with more populated fields.
  const byQid = new Map();
  for (const row of rows) {
    const qid = extractQid(row.composer?.value);
    if (!qid) continue;
    const existing = byQid.get(qid);
    if (!existing || rowScore(row) > rowScore(existing)) byQid.set(qid, row);
  }

  return [...byQid.values()].map((row) => compactRecord({
    qid: extractQid(row.composer?.value),
    name: row.composerLabel?.value,
    nameZh: row.composerLabelZh?.value,
    birthDate: row.birth?.value?.slice(0, 10),
    deathDate: row.death?.value?.slice(0, 10),
    country: row.countryLabel?.value,
    imslpCategory: row.imslpCategory?.value,
    raw: row,
    sourceName,
  }));
}

function rowScore(row) {
  return (row.composerLabel ? 1 : 0)
    + (row.composerLabelZh ? 1 : 0)
    + (row.birth ? 1 : 0)
    + (row.death ? 1 : 0)
    + (row.countryLabel ? 1 : 0)
    + (row.imslpCategory ? 1 : 0);
}

async function fetchWorksForComposer(qid, limit) {
  const query = `
    SELECT ?work ?workLabel ?workLabelZh ?catalog ?genreLabel ?inception ?keyLabel ?imslp WHERE {
      ?work wdt:P86 wd:${qid}.
      OPTIONAL { ?work wdt:P528 ?catalog. }
      OPTIONAL { ?work wdt:P136 ?genre. ?genre rdfs:label ?genreLabel FILTER(LANG(?genreLabel) = "en"). }
      OPTIONAL { ?work wdt:P571 ?inception. }
      OPTIONAL { ?work wdt:P826 ?key. ?key rdfs:label ?keyLabel FILTER(LANG(?keyLabel) = "en"). }
      OPTIONAL { ?work wdt:P839 ?imslp. }
      OPTIONAL { ?work rdfs:label ?workLabel FILTER(LANG(?workLabel) = "en"). }
      OPTIONAL { ?work rdfs:label ?workLabelZh FILTER(LANG(?workLabelZh) = "zh"). }
    }
    LIMIT ${Number(limit)}`;

  const rows = await runSparql(query);
  // collapse multi-genre / multi-catalog rows by QID, keeping the first occurrence
  const seen = new Map();
  for (const row of rows) {
    const workQid = extractQid(row.work?.value);
    if (!workQid || seen.has(workQid)) continue;
    seen.set(workQid, row);
  }

  return [...seen.values()].map((row) => compactRecord({
    qid: extractQid(row.work?.value),
    composerQid: qid,
    title: row.workLabel?.value,
    titleZh: row.workLabelZh?.value,
    catalog: row.catalog?.value,
    musicKey: row.keyLabel?.value,
    genre: row.genreLabel?.value,
    inceptionYear: row.inception?.value ? Number(row.inception.value.slice(0, 4)) || undefined : undefined,
    imslpLink: row.imslp?.value,
    raw: row,
  }));
}

async function runSparql(query) {
  const url = new URL(sparqlEndpoint);
  url.searchParams.set("query", query);
  url.searchParams.set("format", "json");
  const payload = await fetchJson(url, { headers: { "Accept": "application/sparql-results+json" } });
  return payload?.results?.bindings ?? [];
}

function extractQid(uri) {
  if (typeof uri !== "string") return undefined;
  const match = uri.match(/Q\d+$/);
  return match ? match[0] : undefined;
}

async function upsertComposer(sql, composer) {
  if (!composer.qid || !composer.name) return;

  await sql`
    insert into public.wikidata_composers ${sql({
      qid: composer.qid,
      name: composer.name,
      name_zh: composer.nameZh ?? null,
      birth_date: composer.birthDate ?? null,
      death_date: composer.deathDate ?? null,
      country: composer.country ?? null,
      imslp_category: composer.imslpCategory ?? null,
      raw: sql.json(composer.raw ?? {}),
    }, "qid", "name", "name_zh", "birth_date", "death_date", "country", "imslp_category", "raw")}
    on conflict (qid) do update set
      name = excluded.name,
      name_zh = excluded.name_zh,
      birth_date = excluded.birth_date,
      death_date = excluded.death_date,
      country = excluded.country,
      imslp_category = excluded.imslp_category,
      raw = excluded.raw,
      fetched_at = now()
  `;
}

async function upsertWork(sql, work) {
  if (!work.qid || !work.title || !work.composerQid) return;

  await sql`
    insert into public.wikidata_works ${sql({
      qid: work.qid,
      composer_qid: work.composerQid,
      title: work.title,
      title_zh: work.titleZh ?? null,
      catalog: work.catalog ?? null,
      music_key: work.musicKey ?? null,
      genre: work.genre ?? null,
      inception_year: work.inceptionYear ?? null,
      imslp_link: work.imslpLink ?? null,
      raw: sql.json(work.raw ?? {}),
    }, "qid", "composer_qid", "title", "title_zh", "catalog", "music_key", "genre", "inception_year", "imslp_link", "raw")}
    on conflict (qid) do update set
      composer_qid = excluded.composer_qid,
      title = excluded.title,
      title_zh = excluded.title_zh,
      catalog = excluded.catalog,
      music_key = excluded.music_key,
      genre = excluded.genre,
      inception_year = excluded.inception_year,
      imslp_link = excluded.imslp_link,
      raw = excluded.raw,
      fetched_at = now()
  `;
}

function printHelp() {
  console.log(`Usage: node scripts/sync-wikidata.mjs [options]

Options:
  --composer <id|qid>   Restrict to one seed entry (id from composer-seed.mjs or QID).
  --work-limit <n>      Max works per composer per query, default 500.
  --json                Print fetched composers + works as JSON to stdout.
  --save                Upsert into wikidata_composers / wikidata_works.
  --dry-run             Fetch only, do not write.
  --list-composers      Print the seed list and exit.
  --help                Show this help.
`);
}
