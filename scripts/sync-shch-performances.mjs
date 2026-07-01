import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";
import postgres from "postgres";
import { uploadImageToR2 } from "./lib/r2-upload.mjs";
import { shchSaleState } from "./lib/sale-state.mjs";
import { logSaleStateTransition, readCurrentSaleState } from "./lib/sale-state-upsert.mjs";

const root = resolve(new URL("..", import.meta.url).pathname);
loadEnvFiles([".env", ".env.local"]);

const sourceName = "SHCH";
const searchEndpoint = "https://www.shanghaiconcerthall.com.cn/api/project/search";
const detailBaseUrl = "https://www.shanghaiconcerthall.com.cn/#/showDetail";
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
  const firstPage = await fetchSearchPage(1, options.pageSize);
  const records = extractRecords(firstPage);

  const limitedRecords = options.limit ? records.slice(0, options.limit) : records;
  const drafts = [];

  for (const record of limitedRecords) {
    const detail = await fetchProjectDetail(record.id);
    drafts.push(...normalizeProject(record, detail));
  }

  return drafts.sort((a, b) => a.startsAt.localeCompare(b.startsAt));
}

async function fetchSearchPage(page, pageSize) {
  const url = new URL(searchEndpoint);
  url.search = new URLSearchParams({ pageNum: String(page), pageSize: String(pageSize), sort: "1" }).toString();

  const response = await fetchWithRetry(url, {
    headers: {
      "accept": "application/json, text/plain, */*",
      "referer": "https://www.shanghaiconcerthall.com.cn/",
      "user-agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125 Safari/537.36",
    },
  });

  if (!response.ok) throw new Error(`SHCH search request failed: ${response.status} ${response.statusText}`);
  const payload = await response.json();
  if (payload.code !== 20000) throw new Error(`SHCH search request failed: ${payload.msg ?? JSON.stringify(payload)}`);
  return payload;
}

async function fetchProjectDetail(projectId) {
  const response = await fetchWithRetry(`https://www.shanghaiconcerthall.com.cn/api/project/${encodeURIComponent(projectId)}/detail`, {
    headers: {
      "accept": "application/json, text/plain, */*",
      "referer": "https://www.shanghaiconcerthall.com.cn/",
      "user-agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125 Safari/537.36",
    },
  });

  if (!response.ok) throw new Error(`SHCH detail request failed: ${response.status} ${response.statusText}`);
  const payload = await response.json();
  if (payload.code !== 20000) throw new Error(`SHCH detail request failed: ${payload.msg ?? JSON.stringify(payload)}`);
  return payload.data ?? {};
}

async function fetchWithRetry(url, options, attempts = 3) {
  let lastResponse;
  for (let attempt = 1; attempt <= attempts; attempt += 1) {
    lastResponse = await fetch(url, options);
    if (lastResponse.ok || ![502, 503, 504].includes(lastResponse.status) || attempt === attempts) return lastResponse;
  }
  return lastResponse;
}

function extractRecords(payload) {
  const data = payload.data ?? {};
  if (Array.isArray(data.records)) return data.records;
  if (Array.isArray(data.list)) return data.list;
  if (Array.isArray(data.dataList)) return data.dataList;
  if (Array.isArray(data)) return data;
  return [];
}

function normalizeProject(record, detail) {
  const project = detail.project ?? record;
  const projectId = text(project.id ?? record.id);
  const title = text(project.projectName ?? record.projectName ?? `SHCH ${projectId}`);
  const events = Array.isArray(detail.eventDTOS) && detail.eventDTOS.length ? detail.eventDTOS : [{ eventId: projectId, startTime: project.startTime, endTime: project.endTime, eventSaleState: project.status, eventPrices: [] }];
  const sourceUrl = `${detailBaseUrl}?id=${encodeURIComponent(projectId)}`;

  return events.flatMap((event) => {
    const eventId = text(event.eventId ?? projectId);
    const startsAt = toIsoDate(event.startTime);
    if (!projectId || !eventId || !startsAt || isDateRangeEvent(event)) return [];

    return [{
      id: `shch-${projectId}-${eventId}`,
      title,
      city: "上海",
      venue: venueName(project.venueName),
      startsAt,
      artists: [],
      program: [{ displayTitle: title }],
      ticketUrl: sourceUrl,
      sourceUrl,
      sourceName,
      imageUrl: optionalText(project.projectImgUrl ?? record.projectImgUrl),
      priceLabel: priceLabel(event.eventPrices, project),
      saleStatus: saleStatus(event.eventSaleState ?? project.status),
      saleState: shchSaleState(event.eventSaleState, project.status),
      address: "上海市延安东路523号",
      intro: optionalText(stripHtml(project.detail ?? project.mainTitle ?? record.mainTitle)),
      isClassical: true,
      sourceId: `shch:${projectId}:${eventId}`,
      sourceMetadata: compactRecord({ projectId, eventId, list: record, detail, event, fetchedAt: new Date().toISOString() }),
    }];
  });
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

function isDateRangeEvent(event) {
  const name = text(event.name);
  const enName = text(event.enName);
  return Boolean(name && enName && name !== enName);
}

function priceLabel(eventPrices, project) {
  const prices = (Array.isArray(eventPrices) ? eventPrices : [])
    .map((price) => Number(price.price))
    .filter((price) => Number.isFinite(price) && price > 0);

  if (!prices.length) {
    const min = Number(project.projectMinPrice);
    const max = Number(project.projectMaxPrice);
    if (Number.isFinite(min) && Number.isFinite(max) && min > 0 && max > 0) return min === max ? `¥${formatPrice(min)}` : `¥${formatPrice(min)}-${formatPrice(max)}`;
    return undefined;
  }

  const min = Math.min(...prices);
  const max = Math.max(...prices);
  return min === max ? `¥${formatPrice(min)}` : `¥${formatPrice(min)}-${formatPrice(max)}`;
}

function formatPrice(value) {
  return Number.isInteger(value) ? String(value) : value.toFixed(2);
}

function saleStatus(value) {
  if (value === 2) return "售票中";
  if (value === 1) return "即将开售";
  if (value === 3) return "已售罄";
  return undefined;
}

function venueName(value) {
  const venue = text(value);
  return venue ? `凯迪拉克·上海音乐厅${venue === "主厅" || venue === "南厅" ? ` ${venue}` : ` - ${venue}`}` : "凯迪拉克·上海音乐厅";
}

function toIsoDate(value) {
  if (!value) return undefined;
  const date = typeof value === "number" ? new Date(value) : new Date(`${String(value).replace(" ", "T")}+08:00`);
  return Number.isNaN(date.valueOf()) ? undefined : date.toISOString();
}

function stripHtml(value) {
  return String(value ?? "").replace(/<[^>]*>/g, " ");
}

function parseArgs(argv) {
  const parsed = { maxPages: 5, pageSize: defaultPageSize, limit: 0 };

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
  console.log(`Fetched ${drafts.length} SHCH performance draft(s).`);
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
  console.log(`Usage: node scripts/sync-shch-performances.mjs [options]

Options:
  --json                         Print normalized draft JSON
  --dry-run                      Fetch and review without saving
  --save                         Upsert drafts into Supabase/Postgres
  --force                        Update core fields on conflict
  --max-pages <number>           Maximum list pages to fetch, default 5
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
