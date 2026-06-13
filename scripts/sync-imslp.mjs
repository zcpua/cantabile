// Mirror IMSLP people + works lists into Postgres raw tables.
// Endpoint: http://imslp.org/imslpscripts/API.ISCR.php
// Note the unusual `/`-separated query string. type=1 = people, type=2 = works.
// Pagination via `start` offset; the response is a JSON object whose numeric
// keys (0..N-1) are entries and `metadata.moreresultsavailable` indicates more.

import postgres from "postgres";
import { compactRecord, fetchJson, loadEnvFiles, parseFlagArgs, delay } from "./lib/sync-shared.mjs";

loadEnvFiles();

const apiBase = "http://imslp.org/imslpscripts/API.ISCR.php";
const sourceName = "IMSLP";

const args = parseFlagArgs(process.argv.slice(2), {
  defaults: { maxPages: 0, pageDelayMs: 500, kind: "both", start: 0 },
  flags: ["--help", "--dry-run", "--save", "--json", "--people-only", "--works-only"],
  valued: ["--max-pages", "--page-delay-ms", "--start"],
  numeric: ["--max-pages", "--page-delay-ms", "--start"],
  aliases: { "-h": "--help" },
});

if (args.help) {
  printHelp();
  process.exit(0);
}

if (args.peopleOnly && args.worksOnly) throw new Error("--people-only and --works-only are mutually exclusive.");
const fetchPeople = !args.worksOnly;
const fetchWorks = !args.peopleOnly;

const sql = args.save ? openSql() : undefined;
let peopleCount = 0;
let worksCount = 0;

try {
  if (fetchPeople) peopleCount = await mirrorList({ type: 1, label: "people", normalize: normalizePerson, save: args.save ? savePerson : undefined });
  if (fetchWorks) worksCount = await mirrorList({ type: 2, label: "works", normalize: normalizeWork, save: args.save ? saveWork : undefined });
  console.error(`done. people=${peopleCount} works=${worksCount}`);
} finally {
  if (sql) await sql.end();
}

function openSql() {
  if (!process.env.DATABASE_URL) throw new Error("DATABASE_URL is required when using --save.");
  return postgres(process.env.DATABASE_URL, { prepare: false });
}

async function mirrorList({ type, label, normalize, save }) {
  let start = args.start;
  let pages = 0;
  let count = 0;

  while (true) {
    const page = await fetchPage(type, start);
    const entries = extractEntries(page);
    if (entries.length === 0) break;

    for (const entry of entries) {
      const normalized = normalize(entry);
      if (!normalized) continue;
      count += 1;
      if (save) await save(sql, normalized);
      else if (args.json) process.stdout.write(`${JSON.stringify(normalized)}\n`);
    }

    pages += 1;
    console.error(`${label}: page ${pages} (start=${start}) -> ${entries.length} entries, total=${count}`);

    const more = page?.metadata?.moreresultsavailable;
    if (!more || (args.maxPages > 0 && pages >= args.maxPages)) break;

    start += entries.length;
    if (args.pageDelayMs > 0) await delay(args.pageDelayMs);
  }

  return count;
}

async function fetchPage(type, start) {
  // IMSLP separates query params with `/` instead of `&`. Build the URL manually.
  const path = [
    `account=worklist`,
    `disclaimer=accepted`,
    `sort=id`,
    `type=${type}`,
    `start=${start}`,
    `retformat=json`,
  ].join("/");

  return fetchJson(`${apiBase}?${path}`, {
    headers: { "Referer": "https://imslp.org/wiki/IMSLP:API" },
  });
}

function extractEntries(page) {
  if (!page || typeof page !== "object") return [];
  return Object.entries(page)
    .filter(([key]) => /^\d+$/.test(key))
    .map(([, value]) => value)
    .filter((value) => value && typeof value === "object");
}

function normalizePerson(entry) {
  const id = String(entry.id ?? "").trim();
  if (!id) return undefined;
  return compactRecord({
    imslpId: id,
    name: extractPersonName(id, entry),
    permlink: typeof entry.permlink === "string" ? entry.permlink : undefined,
    raw: entry,
    sourceName,
  });
}

function normalizeWork(entry) {
  const id = String(entry.id ?? "").trim();
  if (!id) return undefined;
  const intvals = entry.intvals ?? {};
  return compactRecord({
    imslpId: id,
    composerName: typeof intvals.composer === "string" ? intvals.composer : undefined,
    workTitle: typeof intvals.worktitle === "string" ? intvals.worktitle : undefined,
    icatno: typeof intvals.icatno === "string" && intvals.icatno.length > 0 ? intvals.icatno : undefined,
    pageId: typeof intvals.pageid === "string" && intvals.pageid.length > 0 ? intvals.pageid : undefined,
    permlink: typeof entry.permlink === "string" ? entry.permlink : undefined,
    raw: entry,
    sourceName,
  });
}

function extractPersonName(id, entry) {
  if (typeof entry.intvals?.name === "string") return entry.intvals.name;
  // person `id` is typically "Last, First" already
  return id;
}

async function savePerson(sql, person) {
  await sql`
    insert into public.imslp_people_raw ${sql({
      imslp_id: person.imslpId,
      name: person.name ?? null,
      permlink: person.permlink ?? null,
      raw: sql.json(person.raw ?? {}),
    }, "imslp_id", "name", "permlink", "raw")}
    on conflict (imslp_id) do update set
      name = excluded.name,
      permlink = excluded.permlink,
      raw = excluded.raw,
      fetched_at = now()
  `;
}

async function saveWork(sql, work) {
  await sql`
    insert into public.imslp_works_raw ${sql({
      imslp_id: work.imslpId,
      composer_name: work.composerName ?? null,
      work_title: work.workTitle ?? null,
      icatno: work.icatno ?? null,
      page_id: work.pageId ?? null,
      permlink: work.permlink ?? null,
      raw: sql.json(work.raw ?? {}),
    }, "imslp_id", "composer_name", "work_title", "icatno", "page_id", "permlink", "raw")}
    on conflict (imslp_id) do update set
      composer_name = excluded.composer_name,
      work_title = excluded.work_title,
      icatno = excluded.icatno,
      page_id = excluded.page_id,
      permlink = excluded.permlink,
      raw = excluded.raw,
      fetched_at = now()
  `;
}

function printHelp() {
  console.log(`Usage: node scripts/sync-imslp.mjs [options]

Options:
  --people-only         Fetch only the people (type=1) list.
  --works-only          Fetch only the works (type=2) list.
  --start <n>           Starting offset, default 0.
  --max-pages <n>       Stop after N pages, default unlimited.
  --page-delay-ms <n>   Delay between pages, default 500.
  --save                Upsert into imslp_people_raw / imslp_works_raw.
  --dry-run             Fetch only, do not write.
  --json                Stream normalized entries as NDJSON to stdout.
  --help                Show this help.
`);
}
