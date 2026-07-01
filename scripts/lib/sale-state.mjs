// Normalized sale-state enum. Keep in sync with src/data/types.ts SaleState.
//
// Each source's normalizer lives beside this file so the mapping is one
// import away from every scraper — plus tests that lock the mapping in
// place before the notifier ever reads it.

export const SALE_STATES = Object.freeze([
  "unknown",
  "pre_sale",
  "on_sale",
  "sold_out",
  "cancelled",
  "ended",
]);

// BJCH: API returns numeric event/project sale-state codes. Event state wins;
// project state is the fallback for performances without per-round info.
export function bjchSaleState(record, round) {
  const e = round?.eventSaleState;
  const p = record?.projectSaleState;
  if (e === 2 || p === 2) return "on_sale";
  if (e === 1 || p === 1) return "pre_sale";
  if (e === 3 || p === 3) return "sold_out";
  return "unknown";
}

// SHSO: free-text saleType plus a 演出取消 marker buried in fullCnName.
// The upstream saleType strings are opaque outside of "售票中"; everything
// else falls through to "unknown" until we learn what the other values mean.
export function shsoSaleState(record) {
  const fullName = String(record?.fullCnName ?? "");
  if (fullName.includes("演出取消")) return "cancelled";
  const saleType = String(record?.saleType ?? "").trim();
  if (saleType === "售票中") return "on_sale";
  return "unknown";
}

// SHCH: same numeric scheme as BJCH but split across event and project rows.
// Event state wins when present because a project can have multiple rounds.
export function shchSaleState(eventSaleState, projectStatus) {
  const v = eventSaleState ?? projectStatus;
  if (v === 2) return "on_sale";
  if (v === 1) return "pre_sale";
  if (v === 3) return "sold_out";
  return "unknown";
}

// CHNCPA: upstream is free-text Chinese. Keyword match in fall-through order —
// most-specific words first ("取消" before "开票" because a canceled show can
// still carry a residual "开票时间" string). Unknown strings return "unknown"
// so the caller can log them and we can extend the keyword set over time.
export function chncpaSaleState(text) {
  const s = String(text ?? "").trim();
  if (!s) return "unknown";
  if (s.includes("取消")) return "cancelled";
  if (s.includes("结束")) return "ended";
  if (s.includes("售罄") || s.includes("无票")) return "sold_out";
  if (s.includes("预售") || s.includes("即将")) return "pre_sale";
  if (s.includes("售票") || s.includes("开票")) return "on_sale";
  return "unknown";
}
