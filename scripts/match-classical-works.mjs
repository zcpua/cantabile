// Match Wikidata works against IMSLP works and write to classical_works.
// Match priority (matches the spec in issue #4 discussion):
//   1) wikidata.imslp_link present -> exact-link
//   2) composer surname + normalized catalog -> exact-catalog
//   3) composer surname + normalized title + key -> normalized-title-key
//   4) composer surname + normalized title + genre -> normalized-title-genre
// Anything below #4 is left without an imslp_id; manual review can fill it in.

import postgres from "postgres";
import { composerSeed } from "./lib/composer-seed.mjs";
import { loadEnvFiles, parseFlagArgs } from "./lib/sync-shared.mjs";

loadEnvFiles();

const args = parseFlagArgs(process.argv.slice(2), {
  defaults: {},
  flags: ["--help", "--dry-run", "--save", "--json", "--report-misses"],
  valued: ["--composer"],
  aliases: { "-h": "--help" },
});

if (args.help) {
  printHelp();
  process.exit(0);
}
if (!process.env.DATABASE_URL) throw new Error("DATABASE_URL is required.");

const sql = postgres(process.env.DATABASE_URL, { prepare: false });
const seedByQid = new Map(composerSeed.map((entry) => [entry.qid, entry]));

try {
  const composerFilter = args.composer
    ? composerSeed.filter((entry) => entry.id === args.composer || entry.qid === args.composer).map((entry) => entry.qid)
    : composerSeed.map((entry) => entry.qid);

  if (composerFilter.length === 0) throw new Error(`No matching composer in seed for ${args.composer}.`);

  const composers = await sql`select * from public.wikidata_composers where qid = any(${composerFilter})`;
  const works = await sql`select * from public.wikidata_works where composer_qid = any(${composerFilter})`;
  const composerByQid = new Map(composers.map((row) => [row.qid, row]));

  // Pre-bucket IMSLP rows by surname so each match runs against ~1k rows, not all ~70k.
  const imslpByLastName = new Map();
  for (const composer of composers) {
    const lastName = surnameFromName(composer.name);
    if (!lastName || imslpByLastName.has(lastName)) continue;
    const rows = await sql`
      select * from public.imslp_works_raw
      where lower(composer_name) like ${`%${lastName.toLowerCase()}%`}`;
    imslpByLastName.set(lastName, rows);
  }

  let matched = 0;
  let unmatched = 0;
  const results = [];

  for (const work of works) {
    const composer = composerByQid.get(work.composer_qid);
    if (!composer) continue;

    const candidates = imslpByLastName.get(surnameFromName(composer.name)) ?? [];
    const match = matchWork(work, candidates);

    if (match) matched += 1;
    else unmatched += 1;

    results.push(buildClassicalWork(seedByQid.get(work.composer_qid), composer, work, match));
  }

  if (args.json) console.log(JSON.stringify(results, null, 2));
  console.error(`matched=${matched} unmatched=${unmatched} total=${results.length}`);

  if (args.reportMisses) reportMisses(results);

  if (args.save) {
    for (const row of results) await upsertClassicalWork(sql, row);
    console.error(`saved ${results.length} rows to classical_works.`);
  }
} finally {
  await sql.end();
}

function buildClassicalWork(seed, composer, work, match) {
  return {
    id: classicalWorkId(seed, work),
    composer_qid: work.composer_qid,
    composer_name: composer.name,
    composer_name_zh: composer.name_zh ?? null,
    wikidata_qid: work.qid,
    imslp_id: match?.row?.imslp_id ?? null,
    imslp_url: match?.row?.permlink ?? wikidataImslpUrl(work) ?? null,
    title: work.title,
    catalog: work.catalog ?? null,
    music_key: work.music_key ?? null,
    genre: work.genre ?? null,
    composition_year: work.inception_year ?? null,
    match_confidence: match?.confidence ?? null,
    raw_wikidata: work.raw ?? {},
    raw_imslp: match?.row?.raw ?? null,
  };
}

function classicalWorkId(seed, work) {
  const prefix = seed?.id ?? work.composer_qid.toLowerCase();
  return `${prefix}-${work.qid.toLowerCase()}`;
}

function wikidataImslpUrl(work) {
  if (!work.imslp_link) return undefined;
  // IMSLP property values come in as "Category:..." or full work titles
  return `https://imslp.org/wiki/${encodeURIComponent(work.imslp_link.replace(/ /g, "_"))}`;
}

function matchWork(work, candidates) {
  if (candidates.length === 0) return undefined;

  // 1) exact link from Wikidata
  if (work.imslp_link) {
    const target = work.imslp_link.replace(/ /g, "_").toLowerCase();
    const row = candidates.find((c) => c.permlink && c.permlink.toLowerCase().includes(target));
    if (row) return { row, confidence: "exact-link" };
  }

  // 2) catalog match
  const wikiCatalog = normalizeCatalog(work.catalog);
  if (wikiCatalog) {
    const row = candidates.find((c) => normalizeCatalog(c.icatno) === wikiCatalog);
    if (row) return { row, confidence: "exact-catalog" };
  }

  const normTitle = normalizeTitle(work.title);
  if (!normTitle) return undefined;

  // 3) normalized title + key
  if (work.music_key) {
    const wikiKey = normalizeKey(work.music_key);
    const row = candidates.find((c) => titleHas(c.work_title, normTitle) && hasKey(c.work_title, wikiKey));
    if (row) return { row, confidence: "normalized-title-key" };
  }

  // 4) normalized title + genre
  if (work.genre) {
    const wikiGenre = work.genre.toLowerCase();
    const row = candidates.find((c) => titleHas(c.work_title, normTitle) && (c.work_title ?? "").toLowerCase().includes(wikiGenre));
    if (row) return { row, confidence: "normalized-title-genre" };
  }

  return undefined;
}

function normalizeCatalog(value) {
  if (!value) return undefined;
  return String(value)
    .toLowerCase()
    .replace(/&nbsp;/g, " ")
    .replace(/[.\s]/g, "")
    // Unify common catalog prefixes
    .replace(/^(opus|op)/, "op")
    .replace(/^(no|nr|n°|number)/, "no")
    .replace(/^(kv)/, "k")
    .replace(/^(hob)/, "hob")
    .replace(/^(bwv)/, "bwv")
    .replace(/^(d)/, "d")
    .replace(/^(rv)/, "rv");
}

function normalizeTitle(value) {
  if (!value) return undefined;
  return String(value)
    .toLowerCase()
    .replace(/\s*\([^)]*\)\s*/g, " ")
    .replace(/[.,;:!?'"`]/g, "")
    .replace(/\bno\.?\b/g, "no")
    .replace(/\bnr\.?\b/g, "no")
    .replace(/\bn°/g, "no")
    .replace(/\bnumber\b/g, "no")
    .replace(/\bop\.?\b/g, "op")
    .replace(/\bopus\b/g, "op")
    .replace(/\s+/g, " ")
    .trim();
}

function titleHas(imslpTitle, needle) {
  if (!imslpTitle) return false;
  return normalizeTitle(imslpTitle).includes(needle);
}

function normalizeKey(value) {
  return String(value).toLowerCase().replace(/\s+/g, " ").trim();
}

function hasKey(title, key) {
  if (!title || !key) return false;
  // crude: check the key noun (e.g. "c minor", "g major") appears in the title
  return title.toLowerCase().includes(key);
}

function surnameFromName(name) {
  if (!name) return undefined;
  // Wikidata returns "Ludwig van Beethoven"; IMSLP composer_name is "Beethoven, Ludwig van"
  const cleaned = name.replace(/\s+/g, " ").trim();
  const tokens = cleaned.split(" ");
  return tokens[tokens.length - 1];
}

function reportMisses(rows) {
  const misses = rows.filter((row) => !row.imslp_id);
  if (misses.length === 0) {
    console.error("All works matched.");
    return;
  }
  console.error(`\n${misses.length} unmatched work(s):`);
  for (const row of misses.slice(0, 50)) {
    console.error(`  - ${row.composer_name} | ${row.title}${row.catalog ? ` [${row.catalog}]` : ""}`);
  }
  if (misses.length > 50) console.error(`  ...and ${misses.length - 50} more`);
}

async function upsertClassicalWork(sql, row) {
  await sql`
    insert into public.classical_works ${sql(row,
      "id", "composer_qid", "composer_name", "composer_name_zh", "wikidata_qid", "imslp_id", "imslp_url",
      "title", "catalog", "music_key", "genre", "composition_year", "match_confidence",
      "raw_wikidata", "raw_imslp")}
    on conflict (id) do update set
      composer_qid = excluded.composer_qid,
      composer_name = excluded.composer_name,
      composer_name_zh = excluded.composer_name_zh,
      wikidata_qid = excluded.wikidata_qid,
      imslp_id = excluded.imslp_id,
      imslp_url = excluded.imslp_url,
      title = excluded.title,
      catalog = excluded.catalog,
      music_key = excluded.music_key,
      genre = excluded.genre,
      composition_year = excluded.composition_year,
      match_confidence = excluded.match_confidence,
      raw_wikidata = excluded.raw_wikidata,
      raw_imslp = excluded.raw_imslp
  `;
}

function printHelp() {
  console.log(`Usage: node scripts/match-classical-works.mjs [options]

Options:
  --composer <id|qid>   Restrict to one seed entry.
  --report-misses       Print unmatched works to stderr.
  --json                Print result rows as JSON to stdout.
  --save                Upsert into classical_works.
  --dry-run             Compute only, do not write.
  --help                Show this help.
`);
}
