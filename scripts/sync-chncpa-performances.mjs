import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";
import { createInterface } from "node:readline/promises";
import { stdin as input, stdout as output } from "node:process";
import postgres from "postgres";
import { uploadImageToR2 } from "./lib/r2-upload.mjs";

const root = resolve(new URL("..", import.meta.url).pathname);
loadEnvFiles([".env", ".env.local"]);
const listEndpoint = "https://openapi.chncpa.org/product/list";
const detailEndpoint = "https://openapi.chncpa.org/product/detail";
const mobileProductBaseUrl = "https://m.chncpa.org/product.html";
const sourceName = "CHNCPA";
const classicalKeywords = [
  "交响", "管弦", "室内乐", "钢琴", "小提琴", "中提琴", "大提琴", "低音提琴", "长笛", "单簧管", "双簧管", "小号", "圆号", "歌剧", "芭蕾", "古典", "协奏曲", "奏鸣曲", "四重奏", "三重奏", "合唱", "音乐会", "贝多芬", "莫扎特", "巴赫", "柴科夫斯基", "肖邦", "勃拉姆斯", "马勒", "德彪西", "拉赫玛尼诺夫",
];
const nonClassicalKeywords = ["话剧", "戏剧", "相声", "脱口秀", "儿童剧", "公开排练"];

const args = parseArgs(process.argv.slice(2));
const knownClassicalTerms = loadKnownClassicalTerms();

if (args.help) {
  printHelp();
  process.exit(0);
}

const drafts = await loadDrafts(args);
const selectedDrafts = args.includeUncertain ? drafts : drafts.filter((draft) => draft.isClassical);

if (args.json) {
  console.log(JSON.stringify(selectedDrafts, null, 2));
} else {
  printSummary(drafts, selectedDrafts);
}

let approvedDrafts = selectedDrafts;
if (args.interactive) {
  approvedDrafts = await reviewDrafts(selectedDrafts);
}

if (args.save) {
  if (!process.env.DATABASE_URL) throw new Error("DATABASE_URL is required when using --save.");
  const sql = postgres(process.env.DATABASE_URL, { prepare: false });
  try {
    for (const draft of approvedDrafts) {
      draft.imageUrl = await uploadImageToR2(draft.imageUrl);
      await savePerformance(sql, draft, { updateCore: Boolean(args.force || args.interactive) });
      console.log(`saved ${draft.sourceId}`);
    }
  } finally {
    await sql.end();
  }
}

async function loadDrafts(options) {
  if (options.url || options.productId) {
    const productId = options.productId ?? productIdFromUrl(options.url);
    if (!productId) throw new Error("Could not extract CHNCPA product id from --url.");
    const record = await findProductRecord(productId, options.maxPages);
    const detail = await fetchProductDetail(productId);
    return normalizeProduct(record ?? { productId, productName: `CHNCPA ${productId}` }, detail);
  }

  const records = await fetchProductRecords(options.maxPages);
  const limitedRecords = options.limit ? records.slice(0, options.limit) : records;
  const allDrafts = [];

  for (const record of limitedRecords) {
    const detail = options.withDetails ? await fetchProductDetail(record.productId) : undefined;
    allDrafts.push(...normalizeProduct(record, detail));
  }

  return allDrafts.sort((a, b) => priority(a) - priority(b) || a.startsAt.localeCompare(b.startsAt));
}

async function fetchProductRecords(maxPages) {
  const firstPage = await fetchProductListPage(1);
  const pages = Math.min(maxPages, Number(firstPage.pages || 1));
  const records = [...(firstPage.records ?? [])];

  for (let pageNo = 2; pageNo <= pages; pageNo += 1) {
    const page = await fetchProductListPage(pageNo);
    records.push(...(page.records ?? []));
  }

  return records;
}

async function fetchProductListPage(pageNo) {
  const url = new URL(listEndpoint);
  url.search = new URLSearchParams({ pageNo: String(pageNo), productName: "", code: "", sort: "", venue: "" }).toString();
  const payload = await fetchJson(url);
  if (!payload?.success && payload?.code !== "0") throw new Error(`CHNCPA list request failed on page ${pageNo}: ${JSON.stringify(payload)}`);
  return payload.data ?? { records: [] };
}

async function findProductRecord(productId, maxPages) {
  const records = await fetchProductRecords(maxPages);
  return records.find((record) => String(record.productId) === String(productId));
}

async function fetchProductDetail(productId) {
  const candidates = [
    new URL(`${detailEndpoint}?productId=${encodeURIComponent(productId)}`),
    new URL(`${detailEndpoint}?id=${encodeURIComponent(productId)}`),
    new URL(`${detailEndpoint}?product_id=${encodeURIComponent(productId)}`),
  ];

  for (const url of candidates) {
    try {
      const payload = await fetchJson(url);
      if (payload?.data && (payload.success || payload.code === "0" || payload.code === 0)) return payload.data;
    } catch {
    }
  }

  return undefined;
}

async function fetchJson(url) {
  const response = await fetch(url, {
    headers: {
      "User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125 Safari/537.36",
      "Referer": "https://m.chncpa.org/search/type.html",
      "Origin": "https://m.chncpa.org",
    },
  });

  if (!response.ok) throw new Error(`CHNCPA request failed: ${response.status} ${response.statusText}`);
  return response.json();
}

function normalizeProduct(record, detail) {
  const productId = String(record.productId ?? record.id ?? detail?.productId ?? detail?.id ?? "").trim();
  if (!productId) return [];

  const sourceUrl = `${mobileProductBaseUrl}?id=${encodeURIComponent(productId)}`;
  const title = text(record.productName ?? detail?.productName ?? detail?.name ?? detail?.title ?? `CHNCPA ${productId}`);
  const venue = text(record.venueName ?? detail?.venueName ?? detail?.venue ?? "国家大剧院");
  const city = cityFromVenue(venue);
  const imageUrl = optionalText(record.productImageMax ?? detail?.productImageMax ?? detail?.productImage ?? detail?.imageUrl);
  const priceLabel = priceFromRecord(record, detail);
  const saleStatus = optionalText(record.saleStatusName ?? record.saleStatus ?? record.productStatus ?? detail?.saleStatusName ?? detail?.saleStatus ?? detail?.saleMessage);
  const address = optionalText(detail?.venueAddress ?? detail?.address);
  const intro = optionalText(detail?.productIntroduce ?? detail?.introduction ?? detail?.content ?? detail?.description);
  const artists = stringList(detail?.artists ?? detail?.artist ?? detail?.performers ?? detail?.cast);
  const program = programList(detail?.program ?? detail?.repertoire ?? detail?.trackList ?? detail?.works, title);
  const classicalText = [title, intro, artists.join(" "), program.map((item) => item.displayTitle).join(" ")].filter(Boolean).join(" ");
  const isClassical = isClassicalPerformance(classicalText);
  const sessions = sessionDateTimes(record, detail);

  return sessions.map(({ startsAt, localKey }) => ({
    id: `chncpa-${productId}-${localKey}`,
    title,
    city,
    venue,
    startsAt,
    artists,
    program,
    ticketUrl: sourceUrl,
    sourceUrl,
    sourceName,
    imageUrl,
    priceLabel,
    saleStatus,
    address,
    intro,
    isClassical,
    sourceId: `chncpa:${productId}:${localKey}`,
    sourceMetadata: compactRecord({ productId, list: record, detail, fetchedAt: new Date().toISOString() }),
  }));
}

function sessionDateTimes(record, detail) {
  const dateText = text(record.productStartDate ?? detail?.productStartDate ?? detail?.startDate ?? detail?.date ?? "");
  const dates = extractDates(dateText);
  const times = extractTimes(text(record.sessionStartTimes ?? detail?.sessionStartTimes ?? detail?.startTime ?? ""));
  const sessionDates = dates.length ? dates : extractDates(text(record.productEndDate ?? detail?.productEndDate ?? ""));
  const sessionTimes = times.length ? times : ["19:30"];

  return sessionDates.flatMap((date) => sessionTimes.map((time) => {
    const localKey = `${date.replaceAll("-", "")}${time.replace(":", "")}`;
    return { localKey, startsAt: new Date(`${date}T${time}:00+08:00`).toISOString() };
  }));
}

function extractDates(value) {
  const matches = [...value.matchAll(/(20\d{2})[.\-/年](\d{1,2})[.\-/月](\d{1,2})/g)];
  return matches.map(([, year, month, day]) => `${year}-${month.padStart(2, "0")}-${day.padStart(2, "0")}`);
}

function extractTimes(value) {
  return [...value.matchAll(/\b(\d{1,2}:\d{2})\b/g)].map((match) => match[1]);
}

function priceFromRecord(record, detail) {
  const price = optionalText(record.priceStart ?? detail?.priceStart ?? detail?.minPrice);
  if (!price) return optionalText(detail?.priceLabel ?? detail?.priceRange);
  return price.startsWith("¥") ? `${price}起` : `¥${price}起`;
}

function cityFromVenue(venue) {
  if (venue.includes("上海")) return "上海";
  return "北京";
}

function programList(value, fallbackTitle) {
  const values = stringList(value);
  return (values.length ? values : [fallbackTitle]).map((displayTitle) => ({ displayTitle }));
}

function stringList(value) {
  if (!value) return [];
  if (Array.isArray(value)) return value.flatMap((item) => stringList(item));
  if (typeof value === "object") {
    const candidate = value.name ?? value.title ?? value.displayTitle ?? value.productName;
    return candidate ? [text(candidate)] : [];
  }
  return text(value).split(/[\n,，;；、]/).map((item) => item.trim()).filter(Boolean);
}

function isClassicalPerformance(value) {
  const textValue = value.toLowerCase();
  if (nonClassicalKeywords.some((keyword) => textValue.includes(keyword.toLowerCase()))) return false;
  return [...classicalKeywords, ...knownClassicalTerms].some((keyword) => keyword && textValue.includes(keyword.toLowerCase()));
}

function loadKnownClassicalTerms() {
  const files = ["src/data/composers.ts", "src/data/works.ts"];
  const terms = new Set();

  for (const file of files) {
    try {
      const content = readFileSync(resolve(root, file), "utf8");
      for (const match of content.matchAll(/(?:name|nameCn|title|titleCn):\s*"([^"]+)"/g)) {
        if (match[1].length >= 2) terms.add(match[1]);
      }
    } catch {
    }
  }

  return [...terms];
}

async function reviewDrafts(drafts) {
  const rl = createInterface({ input, output });
  const approved = [];

  try {
    for (const draft of drafts) {
      printDraft(draft);
      const action = (await rl.question("Action [accept/edit/skip] (accept): ")).trim().toLowerCase() || "accept";
      if (action === "skip" || action === "s") continue;
      const nextDraft = action === "edit" || action === "e" ? await editDraft(rl, draft) : draft;
      approved.push(nextDraft);
    }
  } finally {
    rl.close();
  }

  return approved;
}

async function editDraft(rl, draft) {
  const next = { ...draft };
  next.title = await promptValue(rl, "title", next.title);
  next.city = await promptValue(rl, "city", next.city);
  next.venue = await promptValue(rl, "venue", next.venue);
  next.startsAt = await promptValue(rl, "startsAt", next.startsAt);
  next.artists = splitInput(await promptValue(rl, "artists", next.artists.join("，")));
  next.program = splitInput(await promptValue(rl, "program", next.program.map((item) => item.displayTitle).join("，"))).map((displayTitle) => ({ displayTitle }));
  next.imageUrl = emptyToUndefined(await promptValue(rl, "imageUrl", next.imageUrl ?? ""));
  next.priceLabel = emptyToUndefined(await promptValue(rl, "priceLabel", next.priceLabel ?? ""));
  next.saleStatus = emptyToUndefined(await promptValue(rl, "saleStatus", next.saleStatus ?? ""));
  next.address = emptyToUndefined(await promptValue(rl, "address", next.address ?? ""));
  next.intro = emptyToUndefined(await promptValue(rl, "intro", next.intro ?? ""));
  next.isClassical = parseBoolean(await promptValue(rl, "isClassical", String(Boolean(next.isClassical))));
  return next;
}

async function promptValue(rl, label, current) {
  const answer = await rl.question(`${label} (${current}): `);
  return answer.trim() ? answer.trim() : current;
}

async function savePerformance(sql, draft, { updateCore }) {
  const values = performanceValues(sql, draft);

  if (updateCore) {
    await sql`
      insert into public.performances ${sql(values, "id", "title", "city", "venue", "starts_at", "artists", "program", "ticket_url", "source_url", "source_name", "image_url", "price_label", "sale_status", "address", "intro", "is_classical", "source_id", "source_metadata")}
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
        address = excluded.address,
        intro = excluded.intro,
        is_classical = excluded.is_classical,
        source_metadata = excluded.source_metadata,
        updated_at = now()
    `;
    return;
  }

  await sql`
    insert into public.performances ${sql(values, "id", "title", "city", "venue", "starts_at", "artists", "program", "ticket_url", "source_url", "source_name", "image_url", "price_label", "sale_status", "address", "intro", "is_classical", "source_id", "source_metadata")}
    on conflict (source_id) do update set
      ticket_url = excluded.ticket_url,
      source_url = excluded.source_url,
      source_name = excluded.source_name,
      image_url = excluded.image_url,
      price_label = excluded.price_label,
      sale_status = excluded.sale_status,
      address = excluded.address,
      intro = excluded.intro,
      is_classical = excluded.is_classical,
      source_metadata = excluded.source_metadata,
      updated_at = now()
  `;
}

function performanceValues(sql, draft) {
  return {
    id: draft.id,
    title: draft.title,
    city: draft.city,
    venue: draft.venue,
    starts_at: draft.startsAt,
    artists: sqlJson(sql, draft.artists),
    program: sqlJson(sql, draft.program),
    ticket_url: nullish(draft.ticketUrl),
    source_url: draft.sourceUrl,
    source_name: draft.sourceName,
    image_url: nullish(draft.imageUrl),
    price_label: nullish(draft.priceLabel),
    sale_status: nullish(draft.saleStatus),
    address: nullish(draft.address),
    intro: nullish(draft.intro),
    is_classical: draft.isClassical,
    source_id: draft.sourceId,
    source_metadata: sqlJson(sql, draft.sourceMetadata ?? {}),
  };
}

function sqlJson(sql, value) {
  return sql.json(value);
}

function nullish(value) {
  return value ?? null;
}

function parseArgs(argv) {
  const parsed = { maxPages: 3, limit: 0 };

  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];
    if (arg === "--help" || arg === "-h") parsed.help = true;
    else if (arg === "--dry-run") parsed.dryRun = true;
    else if (arg === "--json") parsed.json = true;
    else if (arg === "--interactive") parsed.interactive = true;
    else if (arg === "--save") parsed.save = true;
    else if (arg === "--force") parsed.force = true;
    else if (arg === "--include-uncertain") parsed.includeUncertain = true;
    else if (arg === "--with-details") parsed.withDetails = true;
    else if (arg === "--url") parsed.url = argv[++index];
    else if (arg === "--product-id") parsed.productId = argv[++index];
    else if (arg === "--max-pages") parsed.maxPages = Number(argv[++index]);
    else if (arg === "--limit") parsed.limit = Number(argv[++index]);
    else throw new Error(`Unknown argument: ${arg}`);
  }

  if (parsed.json && parsed.interactive) throw new Error("--json cannot be used with --interactive.");
  if (parsed.save && parsed.dryRun) throw new Error("--save cannot be used with --dry-run.");
  return parsed;
}

function productIdFromUrl(value) {
  try {
    return new URL(value).searchParams.get("id") ?? undefined;
  } catch {
    return undefined;
  }
}

function splitInput(value) {
  return value.split(/[\n,，;；、]/).map((item) => item.trim()).filter(Boolean);
}

function parseBoolean(value) {
  return ["1", "true", "yes", "y", "是"].includes(value.trim().toLowerCase());
}

function priority(draft) {
  if (draft.city === "北京") return 0;
  if (draft.city === "上海") return 1;
  return 2;
}

function printSummary(drafts, selectedDrafts) {
  console.log(`Fetched ${drafts.length} CHNCPA performance draft(s).`);
  console.log(`Selected ${selectedDrafts.length} classical draft(s). Use --include-uncertain to include all.`);
  for (const draft of selectedDrafts) printDraft(draft);
}

function printDraft(draft) {
  console.log("\n---");
  console.log(`${draft.title}`);
  console.log(`${draft.startsAt} · ${draft.city} · ${draft.venue}`);
  console.log(`artists: ${draft.artists.join("，") || "-"}`);
  console.log(`program: ${draft.program.map((item) => item.displayTitle).join("，") || "-"}`);
  console.log(`price/status: ${draft.priceLabel ?? "-"} / ${draft.saleStatus ?? "-"}`);
  console.log(`classical: ${draft.isClassical ? "yes" : "no"}`);
  console.log(`source: ${draft.sourceUrl}`);
}

function printHelp() {
  console.log(`Usage: node scripts/sync-chncpa-performances.mjs [options]

Options:
  --json                         Print normalized draft JSON
  --dry-run                      Fetch and review without saving
  --save                         Upsert approved drafts into Supabase/Postgres
  --interactive                  Review and edit each draft before saving
  --force                        Update core fields on conflict in non-interactive saves
  --include-uncertain            Include records not classified as classical
  --with-details                 Try detail endpoint for each bulk record
  --url <url>                    Import one CHNCPA mobile product URL
  --product-id <id>              Import one CHNCPA product id
  --max-pages <number>           Maximum list pages to fetch, default 3
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

function emptyToUndefined(value) {
  return value.trim() ? value.trim() : undefined;
}

function compactRecord(record) {
  return Object.fromEntries(Object.entries(record).filter(([, value]) => value !== undefined && value !== null));
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
