import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";
import postgres from "postgres";
import { uploadImageToR2 } from "./lib/r2-upload.mjs";
import { shsoSaleState } from "./lib/sale-state.mjs";
import { logSaleStateTransition, readCurrentSaleState } from "./lib/sale-state-upsert.mjs";

const root = resolve(new URL("..", import.meta.url).pathname);
loadEnvFiles([".env", ".env.local"]);

const sourceName = "SHSO";
const apiEndpoint = "https://www.shsymphony.cn/thvendor/symphony/program/homeProgramList.xhtml";
const detailBaseUrl = "https://www.shsymphony.cn/symphonypc/index.html#/zh-CN/pc/musicale-detail";
const defaultPageSize = 20;

const args = parseArgs(process.argv.slice(2));

if (args.help) {
  printHelp();
  process.exit(0);
}

const drafts = await loadDrafts(args);

if (args.json) {
  console.log(JSON.stringify(drafts, null, 2));
} else {
  printSummary(drafts);
}

if (args.save) {
  if (!process.env.DATABASE_URL) throw new Error("DATABASE_URL is required when using --save.");
  const sql = postgres(process.env.DATABASE_URL, { prepare: false });
  try {
    for (const draft of drafts) {
      draft.imageUrl = await uploadImageToR2(draft.imageUrl);
      await savePerformance(sql, draft, { updateCore: Boolean(args.force) });
      console.log(`saved ${draft.sourceId}`);
    }
  } finally {
    await sql.end();
  }
}

async function loadDrafts(options) {
  const firstPage = await fetchProgramPage(1, options.pageSize);
  const page = firstPage.data?.page ?? { rowTotal: firstPage.data?.resultList?.length ?? 0, pageSize: options.pageSize };
  const pageCount = Math.min(options.maxPages, Math.max(1, Math.ceil(Number(page.rowTotal || 0) / Number(page.pageSize || options.pageSize))));
  const records = [...(firstPage.data?.resultList ?? [])];

  for (let pageNo = 2; pageNo <= pageCount; pageNo += 1) {
    const nextPage = await fetchProgramPage(pageNo, options.pageSize);
    records.push(...(nextPage.data?.resultList ?? []));
  }

  const limitedRecords = options.limit ? records.slice(0, options.limit) : records;
  return limitedRecords.map(normalizeProgram).filter(Boolean).sort((a, b) => a.startsAt.localeCompare(b.startsAt));
}

async function fetchProgramPage(pageNo, pageSize) {
  const response = await fetch(apiEndpoint, {
    method: "POST",
    headers: {
      "content-type": "application/x-www-form-urlencoded; charset=UTF-8",
      "cmpappkey": "shsymphonyPC",
      "lang": "zh-CN",
      "sourcepage": "/symphonypc/index.html#/zh-CN/pc/musicale",
      "referer": "https://www.shsymphony.cn/symphonypc/index.html",
      "origin": "https://www.shsymphony.cn",
      "user-agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125 Safari/537.36",
    },
    body: new URLSearchParams({ showSite: "pcList", pageNo: String(pageNo), pageSize: String(pageSize) }),
  });

  if (!response.ok) throw new Error(`SHSO request failed: ${response.status} ${response.statusText}`);
  const payload = await response.json();
  if (!payload.success) throw new Error(`SHSO request failed: ${payload.msg ?? JSON.stringify(payload)}`);
  return payload;
}

function normalizeProgram(record) {
  const sourceIdValue = text(record.id ?? record.programCode);
  if (!sourceIdValue || !record.startTime) return undefined;

  const startsAt = toIsoDate(record.startTime);
  const sourceId = `shso:${sourceIdValue}`;
  const title = text(record.fullCnName ?? record.cnName ?? record.briefName ?? `SHSO ${sourceIdValue}`);
  const venueParts = [record.stadiumName, record.venueName].map(optionalText).filter(Boolean);
  const sourceUrl = `${detailBaseUrl}?id=${encodeURIComponent(sourceIdValue)}`;

  return {
    id: `shso-${sourceIdValue}`,
    title,
    city: "上海",
    venue: venueParts.join(" - ") || "捷豹上海交响音乐厅",
    startsAt,
    artists: [],
    program: [{ displayTitle: title }],
    ticketUrl: sourceUrl,
    sourceUrl,
    sourceName,
    imageUrl: optionalText(record.horizontalPoster ?? record.verticalPoster),
    priceLabel: priceLabel(record),
    saleStatus: saleStatus(record),
    saleState: shsoSaleState(record),
    address: optionalText(record.stadiumAddress),
    intro: optionalText(record.briefName ?? record.cnName),
    isClassical: true,
    sourceId,
    sourceMetadata: compactRecord({ programId: sourceIdValue, programCode: record.programCode, list: record, fetchedAt: new Date().toISOString() }),
  };
}

async function savePerformance(sql, draft, { updateCore }) {
  const nextState = draft.saleState ?? "unknown";
  await sql.begin(async (tx) => {
    const prevState = await readCurrentSaleState(tx, draft.sourceId);
    const values = performanceValues(tx, draft);

    let rows;
    if (updateCore) {
      rows = await tx`
        insert into public.performances ${tx(values, "id", "title", "city", "venue", "starts_at", "artists", "program", "ticket_url", "source_url", "source_name", "image_url", "price_label", "sale_status", "sale_state", "address", "intro", "is_classical", "source_id", "source_metadata")}
        on conflict (source_id) do update set
          title = excluded.title,
          city = excluded.city,
          venue = excluded.venue,
          starts_at = excluded.starts_at,
          artists = excluded.artists,
          program = excluded.program,
          ticket_url = excluded.ticket_url,
          source_url = excluded.source_url,
          source_name = excluded.source_name,
          image_url = excluded.image_url,
          price_label = excluded.price_label,
          sale_status = excluded.sale_status,
          sale_state = excluded.sale_state,
          address = excluded.address,
          intro = excluded.intro,
          is_classical = excluded.is_classical,
          source_metadata = excluded.source_metadata,
          updated_at = now()
        returning id
      `;
    } else {
      rows = await tx`
        insert into public.performances ${tx(values, "id", "title", "city", "venue", "starts_at", "artists", "program", "ticket_url", "source_url", "source_name", "image_url", "price_label", "sale_status", "sale_state", "address", "intro", "is_classical", "source_id", "source_metadata")}
        on conflict (source_id) do update set
          ticket_url = excluded.ticket_url,
          source_url = excluded.source_url,
          source_name = excluded.source_name,
          image_url = excluded.image_url,
          price_label = excluded.price_label,
          sale_status = excluded.sale_status,
          sale_state = excluded.sale_state,
          address = excluded.address,
          intro = excluded.intro,
          is_classical = excluded.is_classical,
          source_metadata = excluded.source_metadata,
          updated_at = now()
        returning id
      `;
    }

    const id = rows[0]?.id;
    if (id) await logSaleStateTransition(tx, id, prevState, nextState);
  });
}

function performanceValues(sql, draft) {
  return {
    id: draft.id,
    title: draft.title,
    city: draft.city,
    venue: draft.venue,
    starts_at: draft.startsAt,
    artists: sql.json(draft.artists),
    program: sql.json(draft.program),
    ticket_url: nullish(draft.ticketUrl),
    source_url: draft.sourceUrl,
    source_name: draft.sourceName,
    image_url: nullish(draft.imageUrl),
    price_label: nullish(draft.priceLabel),
    sale_status: nullish(draft.saleStatus),
    sale_state: draft.saleState ?? "unknown",
    address: nullish(draft.address),
    intro: nullish(draft.intro),
    is_classical: draft.isClassical,
    source_id: draft.sourceId,
    source_metadata: sql.json(draft.sourceMetadata ?? {}),
  };
}

function priceLabel(record) {
  if (record.minPrice && record.maxPrice && record.minPrice !== record.maxPrice) return `¥${record.minPrice}-${record.maxPrice}`;
  if (record.minPrice) return `¥${record.minPrice}起`;
  if (record.maxPrice) return `¥${record.maxPrice}`;
  return undefined;
}

function saleStatus(record) {
  if (text(record.fullCnName).includes("演出取消")) return "演出取消";
  if (record.saleType) return text(record.saleType);
  return undefined;
}

function toIsoDate(value) {
  return new Date(`${String(value).replace(" ", "T")}+08:00`).toISOString();
}

function parseArgs(argv) {
  const parsed = { maxPages: 10, pageSize: defaultPageSize, limit: 0 };

  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];
    if (arg === "--help" || arg === "-h") parsed.help = true;
    else if (arg === "--dry-run") parsed.dryRun = true;
    else if (arg === "--json") parsed.json = true;
    else if (arg === "--save") parsed.save = true;
    else if (arg === "--force") parsed.force = true;
    else if (arg === "--max-pages") parsed.maxPages = Number(argv[++index]);
    else if (arg === "--page-size") parsed.pageSize = Number(argv[++index]);
    else if (arg === "--limit") parsed.limit = Number(argv[++index]);
    else throw new Error(`Unknown argument: ${arg}`);
  }

  if (parsed.save && parsed.dryRun) throw new Error("--save cannot be used with --dry-run.");
  return parsed;
}

function printSummary(drafts) {
  console.log(`Fetched ${drafts.length} SHSO performance draft(s).`);
  for (const draft of drafts) printDraft(draft);
}

function printDraft(draft) {
  console.log("\n---");
  console.log(draft.title);
  console.log(`${draft.startsAt} · ${draft.city} · ${draft.venue}`);
  console.log(`price/status: ${draft.priceLabel ?? "-"} / ${draft.saleStatus ?? "-"}`);
  console.log(`source: ${draft.sourceUrl}`);
}

function printHelp() {
  console.log(`Usage: node scripts/sync-shso-performances.mjs [options]

Options:
  --json                         Print normalized draft JSON
  --dry-run                      Fetch and review without saving
  --save                         Upsert drafts into Supabase/Postgres
  --force                        Update core fields on conflict
  --max-pages <number>           Maximum list pages to fetch, default 10
  --page-size <number>           List page size, default 20
  --limit <number>               Limit records before normalization
  --help                         Show this help
`);
}

function text(value) {
  return String(value ?? "").replace(/<[^>]*>/g, "").replace(/\s+/g, " ").trim();
}

function optionalText(value) {
  const next = text(value);
  return next || undefined;
}

function compactRecord(record) {
  return Object.fromEntries(Object.entries(record).filter(([, value]) => value !== undefined && value !== null));
}

function nullish(value) {
  return value ?? null;
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
