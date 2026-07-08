import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";
import postgres from "postgres";
import { uploadImageToR2 } from "./lib/r2-upload.mjs";
import { bjchSaleState } from "./lib/sale-state.mjs";
import { logSaleStateTransition, readCurrentSaleState } from "./lib/sale-state-upsert.mjs";

const root = resolve(new URL("..", import.meta.url).pathname);
loadEnvFiles([".env", ".env.local"]);

const sourceName = "BJCH";
const listEndpoint = "https://www.bjconcerthall.cn/yjzd-webapp/api/project/list";
const detailEndpoint = "https://www.bjconcerthall.cn/yjzd-webapp/api/project/detail";
const detailBaseUrl = "https://www.bjconcerthall.cn/bjyyt/ycgp/ycgpxq.shtml";
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
  const firstPage = await fetchProjectPage(1, options.pageSize);
  const totalPage = Number(firstPage.data?.totalPage || 1);
  const pageCount = Math.min(options.maxPages, Math.max(1, totalPage));
  const records = [...(firstPage.data?.dataList ?? [])];

  for (let pageNo = 2; pageNo <= pageCount; pageNo += 1) {
    const nextPage = await fetchProjectPage(pageNo, options.pageSize);
    records.push(...(nextPage.data?.dataList ?? []));
  }

  const limitedRecords = options.limit ? records.slice(0, options.limit) : records;
  const drafts = limitedRecords.flatMap(normalizeProject);
  const details = await fetchProjectDetails(drafts);
  return drafts.map((draft) => enrichDraftWithDetail(draft, details.get(draft.sourceMetadata?.projectId))).sort((a, b) => a.startsAt.localeCompare(b.startsAt));
}

async function fetchProjectPage(page, pageSize) {
  const url = new URL(listEndpoint);
  url.search = new URLSearchParams({
    page: String(page),
    pageSize: String(pageSize),
    firstClassId: "",
    secondClassId: "",
    yyyyMM: "",
    date: "",
    projectName: "",
  }).toString();

  const response = await fetchWithRetry(url, {
    headers: {
      "accept": "application/json, text/plain, */*",
      "referer": "https://www.bjconcerthall.cn/",
      "user-agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125 Safari/537.36",
    },
  });

  if (!response.ok) throw new Error(`BJCH request failed: ${response.status} ${response.statusText}`);
  const payload = await response.json();
  if (payload.code !== 200) throw new Error(`BJCH request failed: ${payload.msg ?? JSON.stringify(payload)}`);
  return payload;
}

async function fetchWithRetry(url, options, attempts = 3) {
  let lastResponse;
  for (let attempt = 1; attempt <= attempts; attempt += 1) {
    lastResponse = await fetch(url, options);
    if (lastResponse.ok || ![502, 503, 504].includes(lastResponse.status) || attempt === attempts) return lastResponse;
  }
  return lastResponse;
}

async function fetchProjectDetails(drafts) {
  const details = new Map();
  const seenProjectIds = new Set();

  for (const draft of drafts) {
    const projectId = draft.sourceMetadata?.projectId;
    const eventId = draft.sourceMetadata?.eventId;
    if (!projectId || !eventId || seenProjectIds.has(projectId)) continue;
    seenProjectIds.add(projectId);
    details.set(projectId, await fetchProjectDetail(projectId, eventId, draft.sourceUrl));
  }

  return details;
}

async function fetchProjectDetail(projectId, eventId, referer) {
  const url = new URL(detailEndpoint);
  url.search = new URLSearchParams({
    projectId,
    eventId,
  }).toString();

  const response = await fetchWithRetry(url, {
    headers: {
      "accept": "application/json, text/plain, */*",
      "referer": referer,
      "user-agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36",
    },
  });

  if (!response.ok) throw new Error(`BJCH detail request failed: ${response.status} ${response.statusText}`);
  const payload = await response.json();
  if (payload.code !== 200) throw new Error(`BJCH detail request failed: ${payload.msg ?? JSON.stringify(payload)}`);
  return payload.data ?? {};
}

function normalizeProject(record) {
  const projectId = text(record.projectId);
  const title = text(record.projectName ?? `BJCH ${projectId}`);
  const rounds = parseRounds(record.projectRound);

  return rounds.flatMap((round) => {
    const eventId = text(round.eventId);
    const startsAt = toIsoDate(round.eventStartTime);
    if (!projectId || !eventId || !startsAt) return [];

    const sourceUrl = `${detailBaseUrl}?type=pc&projectId=${encodeURIComponent(projectId)}&eventId=${encodeURIComponent(eventId)}`;
    const venue = normalizeVenue(round.venueName);

    return [{
      id: `bjch-${projectId}-${eventId}`,
      title,
      city: "北京",
      venue,
      startsAt,
      artists: [],
      program: [{ displayTitle: title }],
      ticketUrl: sourceUrl,
      sourceUrl,
      sourceName,
      imageUrl: optionalText(record.projectImgUrl),
      priceLabel: priceLabel(round.priceList),
      saleStatus: saleStatus(record, round),
      saleState: bjchSaleState(record, round),
      address: addressFromRound(round),
      intro: htmlToText(record.projectIntroduce),
      isClassical: true,
      sourceId: `bjch:${projectId}:${eventId}`,
      sourceMetadata: compactRecord({ projectId, eventId, list: record, round, fetchedAt: new Date().toISOString() }),
    }];
  });
}

function enrichDraftWithDetail(draft, detail) {
  if (!detail) return draft;
  const introHtml = detail.projectIntroduce ?? "";
  const introText = htmlToText(introHtml);
  const artists = extractArtistsFromIntro(introText);
  const program = extractProgramFromIntro(introText, draft.title);
  const introImages = htmlImageUrls(introHtml);

  return {
    ...draft,
    title: text(detail.projectName) || draft.title,
    imageUrl: optionalText(detail.projectImgUrl) ?? draft.imageUrl,
    intro: introText ?? draft.intro,
    artists: artists.length ? artists : draft.artists,
    program: program.length ? program : draft.program,
    sourceMetadata: compactRecord({
      ...draft.sourceMetadata,
      introImages,
      firstClassId: detail.firstClassId,
      firstClassName: detail.firstClassName,
      secondClassId: detail.secondClassId,
      secondClassName: detail.secondClassName,
      detailProjectId: detail.projectId,
      detailProjectSaleState: detail.projectSaleState,
      projectSeatType: detail.projectSeatType,
      projectWatchingNotice: htmlToText(detail.projectWatchingNotice),
      sponsorInfoList: detail.sponsorInfoList,
    }),
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

function parseRounds(value) {
  if (Array.isArray(value)) return value;
  if (!value) return [];
  try {
    const parsed = JSON.parse(value);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function priceLabel(priceList) {
  const standardPrices = (Array.isArray(priceList) ? priceList : [])
    .filter((price) => Number(price.priceType || 1) === 1)
    .map((price) => Number(price.priceMoneyFen))
    .filter((price) => Number.isFinite(price) && price > 0)
    .map((price) => price / 100);

  if (!standardPrices.length) return undefined;
  const min = Math.min(...standardPrices);
  const max = Math.max(...standardPrices);
  return min === max ? `¥${formatPrice(min)}` : `¥${formatPrice(min)}-${formatPrice(max)}`;
}

function formatPrice(value) {
  return Number.isInteger(value) ? String(value) : value.toFixed(2);
}

function saleStatus(record, round) {
  if (round.eventSaleState === 2 || record.projectSaleState === 2) return "售票中";
  if (round.eventSaleState === 1 || record.projectSaleState === 1) return "即将开售";
  if (round.eventSaleState === 3 || record.projectSaleState === 3) return "已售罄";
  return undefined;
}

function addressFromRound(round) {
  const places = Array.isArray(round.exchangePlaceList) ? round.exchangePlaceList : [];
  return optionalText(places.find((place) => place.address)?.address);
}

function normalizeVenue(value) {
  const venue = text(value);
  if (!venue) return "北京音乐厅";
  return venue.replace(/1\.0$/, "");
}

function extractArtistsFromIntro(intro) {
  const lines = introLines(intro);
  const artists = [];
  let inArtistBlock = false;
  const roleKeywords = new Set([
    "演出单位", "演出", "主演", "主唱", "演唱", "指挥", "钢琴", "小提琴", "中提琴", "大提琴", "低音提琴",
    "长笛", "短笛", "单簧管", "双簧管", "巴松", "圆号", "小号", "长号", "打击乐", "竖琴",
    "乐队首席", "主持人", "合唱", "合唱团", "乐团", "女高音", "女中音", "男高音", "男中音", "男低音",
  ]);

  for (const line of lines) {
    if (/^(【)?(曲目|曲目介绍|演出曲目)(】)?$/.test(line)) inArtistBlock = false;
    if (/^(演出阵容|成员|【阵容介绍】|阵容介绍)[:：]?$/.test(line)) {
      inArtistBlock = true;
      continue;
    }

    const keyed = line.match(/^([^：:]{1,12})[：:]\s*(.+)$/);
    if (keyed) {
      const role = keyed[1].trim();
      const value = keyed[2].trim();
      if (roleKeywords.has(role) && value && !looksLikeMetadataValue(value)) {
        pushRoleArtists(artists, role, value);
      }
      continue;
    }

    const dashed = line.match(/^(.{2,80}?)[—-]{2,}\s*(.+)$/);
    if (inArtistBlock && dashed && !/中场休息|Intermission/i.test(line)) {
      const name = dashed[1].trim();
      const role = dashed[2].trim();
      if (name && role && !looksLikeMetadataValue(name)) {
        artists.push(`${role}：${name}`);
      }
    }
  }

  return unique(artists).slice(0, 24);
}

function pushRoleArtists(artists, role, value) {
  const cleaned = value.replace(/（演员按.*?）/g, "").trim();
  const parts = cleaned
    .split(/[、，,；;]\s*|\s{2,}|(?<=[\u4e00-\u9fa5])\s+(?=[\u4e00-\u9fa5])/)
    .map((item) => item.trim())
    .filter(Boolean);
  const values = shouldSplitRole(role, parts) ? parts : [cleaned];

  for (const item of values) {
    if (!item || looksLikeMetadataValue(item)) continue;
    artists.push(`${role}：${item}`);
  }
}

function shouldSplitRole(role, parts) {
  if (parts.length <= 1) return false;
  return !["演出", "演出单位"].includes(role);
}

function looksLikeMetadataValue(value) {
  return /^(20\d{2}|票价|地点|演出时间|演出日期|演出地点|本场|请|如需|由于|进入剧场|观众)/.test(value) || /\d{1,2}:\d{2}/.test(value);
}

function extractProgramFromIntro(intro, fallbackTitle) {
  const lines = introLines(intro);
  const start = lines.findIndex((line) => /^(【)?(曲目|曲目介绍|演出曲目)(】)?$/.test(line));
  if (start < 0) return [];

  const programLines = [];
  for (const line of lines.slice(start + 1)) {
    if (/^(【)?(阵容介绍|演出阵容|艺术家介绍|成员|主演|演出信息)(】)?/.test(line)) break;
    if (/^\*?演出曲目.*(现场|当天|为准)/.test(line)) break;
    if (/^(本场|1\.2米|注[:：])/.test(line)) break;
    if (/^(—|-)+\s*(中场休息|Intermission)/i.test(line)) continue;
    if (line) programLines.push(line);
  }

  const entries = [];
  for (let index = 0; index < programLines.length; index += 1) {
    const line = programLines[index];
    const next = programLines[index + 1];
    if (looksLikeComposerLine(line) && next && !looksLikeComposerLine(next)) {
      const parts = [next];
      while (programLines[index + 2] && (looksLikeProgramContinuation(programLines[index + 2], parts[parts.length - 1]) || looksLikeProgramContinuationForComposer(line, programLines[index + 2]))) {
        parts.push(programLines[index + 2]);
        index += 1;
      }
      entries.push({ displayTitle: `${line}：${parts.join(" ")}` });
      index += 1;
    } else {
      entries.push({ displayTitle: line });
    }
  }

  return uniqueBy(entries, (item) => item.displayTitle).filter((item) => item.displayTitle !== fallbackTitle).slice(0, 40);
}

function looksLikeComposerLine(line) {
  if (/[《》:：]/.test(line)) return false;
  if (/^(中场休息|Intermission)$/i.test(line)) return false;
  if (/(交响曲|协奏曲|奏鸣曲|组曲|序曲|作品|小调|大调|major|minor)/i.test(line)) return false;
  return line.length <= 28;
}

function looksLikeProgramContinuation(line, previous) {
  return /^(第[一二三四五六七八九十\d]+|选自|作品|Op\.|Act\b)/i.test(line) || (/选段$/.test(line) && /作品|交响曲|协奏曲|组曲/.test(previous));
}

function looksLikeProgramContinuationForComposer(composer, line) {
  return composer.length <= 8 && /^(第[一二三四五六七八九十\d]+|[a-z]\s*小调|[A-G]\s*major|[A-G]\s*minor)/i.test(line);
}

function introLines(intro) {
  return String(intro ?? "")
    .split(/\r?\n/)
    .map((line) => decodeHtmlEntities(line).replace(/\s+/g, " ").trim())
    .filter(Boolean);
}

function htmlToText(value) {
  const html = String(value ?? "").trim();
  if (!html) return undefined;

  const normalized = html
    .replace(/<script[\s\S]*?<\/script>/gi, " ")
    .replace(/<style[\s\S]*?<\/style>/gi, " ")
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/<\/(p|div|section|article|li|tr|h[1-6])>/gi, "\n")
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/gi, " ")
    .replace(/&amp;/gi, "&")
    .replace(/&lt;/gi, "<")
    .replace(/&gt;/gi, ">")
    .replace(/&quot;/gi, "\"")
    .replace(/&#39;/g, "'")
    .replace(/[ \t\f\v]+/g, " ")
    .replace(/\s*\n\s*/g, "\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();

  return decodeHtmlEntities(normalized) || undefined;
}

function htmlImageUrls(value) {
  const html = String(value ?? "");
  return unique([...html.matchAll(/<img[^>]+src=["']?([^"'\s>]+)/gi)].map((match) => decodeHtmlEntities(match[1]).trim()).filter(Boolean));
}

function decodeHtmlEntities(value) {
  return String(value ?? "")
    .replace(/&nbsp;/gi, " ")
    .replace(/&amp;/gi, "&")
    .replace(/&lt;/gi, "<")
    .replace(/&gt;/gi, ">")
    .replace(/&quot;/gi, "\"")
    .replace(/&#39;|&apos;/gi, "'")
    .replace(/&mdash;/gi, "——")
    .replace(/&ndash;/gi, "–")
    .replace(/&middot;/gi, "·")
    .replace(/&ldquo;|&rdquo;/gi, "\"")
    .replace(/&lsquo;|&rsquo;/gi, "'")
    .replace(/&eacute;/gi, "é")
    .replace(/&egrave;/gi, "è")
    .replace(/&acirc;/gi, "â")
    .replace(/&iuml;/gi, "ï")
    .replace(/&aacute;/gi, "á")
    .replace(/&agrave;/gi, "à")
    .replace(/&uuml;/gi, "ü")
    .replace(/&szlig;/gi, "ß")
    .replace(/&#(\d+);/g, (_, code) => String.fromCodePoint(Number(code)))
    .replace(/&#x([0-9a-f]+);/gi, (_, code) => String.fromCodePoint(parseInt(code, 16)));
}

function unique(values) {
  return [...new Set(values)];
}

function uniqueBy(values, key) {
  const seen = new Set();
  return values.filter((value) => {
    const id = key(value);
    if (seen.has(id)) return false;
    seen.add(id);
    return true;
  });
}

function toIsoDate(value) {
  if (!value) return undefined;
  const date = new Date(`${String(value).replace(" ", "T")}:00+08:00`);
  return Number.isNaN(date.valueOf()) ? undefined : date.toISOString();
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
  console.log(`Fetched ${drafts.length} BJCH performance draft(s).`);
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
  console.log(`Usage: node scripts/sync-bjch-performances.mjs [options]

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
