# 开票信息与开票提醒 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Normalize 已开票/未开票 状态, log state transitions, and push a WeChat 订阅消息 to users who explicitly opted in via "提醒我开票" on the mini-program detail page.

**Architecture:** Three-tier change spanning the Next.js website (schema + Hono routes), `gin-container` Go API (notifier ticker + WeChat push), `forenote-mini` Taro 小程序 (consent UI). State machine drives everything: scrapers emit a `sale_state` enum on `performances`; row changes append to `sale_state_transitions`; a 5-min ticker in `gin-container` fans out pushes against `notification_credits` opt-ins.

**Tech Stack:** Drizzle ORM (Postgres + D1), Node `node:test`, Hono, Go 1.22 + GORM, Taro 4 / React 18, WeChat 订阅消息 API.

**Reference spec:** `docs/superpowers/specs/2026-06-30-invoice-info-design.md` — Q1-Q5 design decisions, schema, mapping tables, error policy, rollout phases all live there. This plan implements that spec.

## Global Constraints

- **Submodule split:** `forenote-mini/` and `gin-container/` are git submodules. Changes inside them require commits in the submodule first, then a pointer-bump commit in the supermodule (`cantabile`). Each task notes which repo gets the commit.
- **DB parity:** every schema change ships in BOTH `src/db/schema.pg.ts` + `drizzle/pg/` AND `src/db/schema.sqlite.ts` + `drizzle/d1/` — production runs Postgres (Supabase) and Cloudflare uses D1, both must stay in lockstep.
- **No introduction of `pg_enum`:** keep `sale_state` as `text` so D1/SQLite mirror cleanly. Enum values: `unknown | pre_sale | on_sale | sold_out | cancelled | ended`.
- **First-insert suppression:** transition log MUST NOT be written on a performance's very first scrape (when `prev_state IS NULL`). This is a correctness requirement, not a style preference — without it every freshly-scraped `on_sale` performance produces a phantom transition.
- **Kill switch present:** notifier MUST honor `NOTIFIER_ENABLED=false` env var by exiting the loop immediately. No code path may bypass it.
- **No retroactive pushes:** the deployment must not push notifications for transitions logged during phases 1-2 (schema + scraper rollout). This is safe by construction — no `notification_credits` rows exist until the mini-program ships (phase 4). As a belt-and-braces measure, Task 10 Step 4 marks all pre-flip transitions as `notified_at = now()` before enabling the notifier.
- **Test runner:** `scripts/lib/*.test.mjs` uses `node:test` + `node --test` (Node 20 built-in, zero deps). `gin-container/*_test.go` uses `go test` (stdlib).
- **WeChat template fields placeholder:** the actual `thing1` / `time2` / `thing3` field IDs depend on the approved 订阅消息 template. Code uses placeholder names matching the spec; real IDs land via env at deploy time and a follow-up patch if the template审批 differs.

---

## File Structure

**Created files:**

| Path | Responsibility |
|---|---|
| `drizzle/pg/0005_sale_state.sql` | Postgres migration: `sale_state` column + 2 new tables |
| `drizzle/d1/0001_sale_state.sql` (or next free index) | D1 mirror of the above |
| `scripts/lib/sale-state.mjs` | `SALE_STATES` enum + per-scraper mapping functions (one exported fn per source) |
| `scripts/lib/sale-state.test.mjs` | Mapping tests, one test fn per scraper |
| `scripts/lib/sale-state-upsert.mjs` | Shared `upsertPerformanceWithTransition(sql, draft)` helper used by all 4 scrapers |
| `scripts/lib/sale-state-upsert.test.mjs` | First-insert suppression + transition idempotency tests (uses postgres test DB) |
| `gin-container/notifier.go` | Ticker loop, transition scan, fan-out |
| `gin-container/notifier_test.go` | Notifier unit tests with mocked push |
| `gin-container/wechat_push.go` | `access_token` cache + `subscribeMessage.send` HTTP client |
| `gin-container/wechat_push_test.go` | Token-cache tests |
| `docs/superpowers/plans/2026-06-30-invoice-info.md` | This file |

**Modified files:**

| Path | Change |
|---|---|
| `src/db/schema.pg.ts` | Add `saleState` col on `performances`; add `saleStateTransitions` + `notificationCredits` tables |
| `src/db/schema.sqlite.ts` | Same for SQLite |
| `src/data/types.ts` | Add `SaleState` union + `saleState?` field on `Performance` |
| `src/db/repository.ts` | Map `sale_state` row → `Performance.saleState` |
| `src/components/performance-card.tsx` | (No-op for v1 — kept for awareness) |
| `src/server/routes/me.ts` | Add `/me/notification-credits` GET/POST/DELETE routes |
| `src/server/repository.ts` | Add `listCreditIds` / `upsertCredit` / `removeCredit` |
| `scripts/sync-bjch-performances.mjs` | Wire `saleState(...)` mapper + use new upsert helper |
| `scripts/sync-shso-performances.mjs` | Same |
| `scripts/sync-shch-performances.mjs` | Same |
| `scripts/sync-chncpa-performances.mjs` | Same (keyword-based mapper) |
| `scripts/sync-supabase-to-d1.mjs` | Add `sale_state` to selected/copied columns |
| `gin-container/models.go` | Add `SaleState` on `Performance`; add `SaleStateTransition`, `NotificationCredit` types |
| `gin-container/repository.go` | Add `listPendingTransitions`, `findCredits`, `markCredit`, `markTransition`, `upsertCredit`, `listCreditIDs`, `removeCredit` |
| `gin-container/handlers.go` | Add 3 `/me/notification-credits/*` handlers |
| `gin-container/main.go` | Wire notifier ticker on startup behind `NOTIFIER_ENABLED` |
| `forenote-mini/src/services/api.ts` | Add `SaleState` type, `saleState?` on `Performance`, `notificationCredits` client fns |
| `forenote-mini/src/pages/detail/index.tsx` | Add "提醒我开票" button + handler |
| `forenote-mini/src/pages/detail/index.scss` | Button styles |
| `forenote-mini/src/store/` | Add credit-ids store (mirror of favorites/tickets) |
| `forenote-mini/config/index.ts` | Inject `TARO_APP_ONSALE_TMPL_ID` from env |
| `forenote-mini/README.md` | Document the env var |
| `gin-container/README.md` | Document `WECHAT_*` + `NOTIFIER_*` env vars |

---

## Task Sequencing

Tasks 1-3 are schema + scraper plumbing — they ship together as one supermodule release (rollout phase 1+2). Tasks 4-6 are `gin-container` (`NOTIFIER_ENABLED=false`, rollout phase 3). Tasks 7-9 are the mini-program (rollout phase 4). Task 10 flips the kill switch and verifies end-to-end (rollout phase 5).

Each task ends with a green test suite and a commit (in the right repo). Submodule pointer bumps happen at the end of each submodule-internal task chain so reviewers can land a coherent supermodule diff.

---

### Task 1: Schema migration — `sale_state` column + 2 new tables

**Repo:** cantabile (supermodule)

**Files:**
- Modify: `src/db/schema.pg.ts`
- Modify: `src/db/schema.sqlite.ts`
- Create: `drizzle/pg/0005_sale_state.sql` (filename uses next free index; verify with `ls drizzle/pg/` first)
- Create: `drizzle/d1/<next-index>_sale_state.sql` (verify next-free index)
- Modify: `src/data/types.ts`
- Modify: `src/db/repository.ts`
- Modify: `scripts/sync-supabase-to-d1.mjs`

**Interfaces:**
- Produces:
  - `performances.sale_state` text column (default `'unknown'`)
  - `sale_state_transitions` table: `(id, performance_id, from_state, to_state, detected_at, notified_at)`
  - `notification_credits` table: `(openid, performance_id, kind, granted_at, consumed_at, attempts, failed_at)`
  - TS type `SaleState = "unknown" | "pre_sale" | "on_sale" | "sold_out" | "cancelled" | "ended"`
  - `Performance.saleState?: SaleState`

- [ ] **Step 1: Add the TypeScript type**

Edit `src/data/types.ts` — after the `MusicPeriod` type, before `Composer`:

```ts
export type SaleState =
  | "unknown"
  | "pre_sale"
  | "on_sale"
  | "sold_out"
  | "cancelled"
  | "ended";
```

Then in the `Performance` type, add `saleState?` next to `saleStatus`:

```ts
export type Performance = {
  // ... existing fields ...
  saleStatus?: string;
  saleState?: SaleState;
  // ... rest ...
};
```

- [ ] **Step 2: Add columns to the Postgres schema**

Edit `src/db/schema.pg.ts`. In the `performances` table definition, add after `saleStatus`:

```ts
saleState: text("sale_state").$type<"unknown" | "pre_sale" | "on_sale" | "sold_out" | "cancelled" | "ended">().notNull().default("unknown"),
```

Add an index in the same table's index list:

```ts
index("performances_sale_state_idx").on(table.saleState),
```

At the bottom of the file, after `tickets`, append two new tables:

```ts
export const saleStateTransitions = pgTable("sale_state_transitions", {
  id: integer("id").primaryKey().generatedAlwaysAsIdentity(),
  performanceId: text("performance_id").notNull().references(() => performances.id, { onDelete: "cascade" }),
  fromState: text("from_state").notNull(),
  toState: text("to_state").notNull(),
  detectedAt: timestamp("detected_at", { withTimezone: true }).notNull().defaultNow(),
  notifiedAt: timestamp("notified_at", { withTimezone: true }),
}, (table) => [
  uniqueIndex("sale_state_transitions_event_unique").on(table.performanceId, table.fromState, table.toState, table.detectedAt),
  index("sale_state_transitions_pending_idx").on(table.toState, table.notifiedAt),
]);

export const notificationCredits = pgTable("notification_credits", {
  openid: text("openid").notNull().references(() => users.openid, { onDelete: "cascade" }),
  performanceId: text("performance_id").notNull().references(() => performances.id, { onDelete: "cascade" }),
  kind: text("kind").notNull(),
  grantedAt: timestamp("granted_at", { withTimezone: true }).notNull().defaultNow(),
  consumedAt: timestamp("consumed_at", { withTimezone: true }),
  attempts: integer("attempts").notNull().default(0),
  failedAt: timestamp("failed_at", { withTimezone: true }),
}, (table) => [
  primaryKey({ columns: [table.openid, table.performanceId, table.kind] }),
  index("notification_credits_pending_idx").on(table.performanceId, table.kind),
]);
```

- [ ] **Step 3: Mirror in SQLite schema**

Edit `src/db/schema.sqlite.ts`. Add `saleState` column to `performances` (use `text` type, default `'unknown'`, notNull). Add index `performances_sale_state_idx`. Append `saleStateTransitions` and `notificationCredits` tables using the file's SQLite drizzle conventions:

```ts
export const saleStateTransitions = sqliteTable("sale_state_transitions", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  performanceId: text("performance_id").notNull().references(() => performances.id, { onDelete: "cascade" }),
  fromState: text("from_state").notNull(),
  toState: text("to_state").notNull(),
  detectedAt: text("detected_at").notNull().default(sql`(CURRENT_TIMESTAMP)`),
  notifiedAt: text("notified_at"),
}, (table) => [
  uniqueIndex("sale_state_transitions_event_unique").on(table.performanceId, table.fromState, table.toState, table.detectedAt),
  index("sale_state_transitions_pending_idx").on(table.toState, table.notifiedAt),
]);

export const notificationCredits = sqliteTable("notification_credits", {
  openid: text("openid").notNull().references(() => users.openid, { onDelete: "cascade" }),
  performanceId: text("performance_id").notNull().references(() => performances.id, { onDelete: "cascade" }),
  kind: text("kind").notNull(),
  grantedAt: text("granted_at").notNull().default(sql`(CURRENT_TIMESTAMP)`),
  consumedAt: text("consumed_at"),
  attempts: integer("attempts").notNull().default(0),
  failedAt: text("failed_at"),
}, (table) => [
  primaryKey({ columns: [table.openid, table.performanceId, table.kind] }),
  index("notification_credits_pending_idx").on(table.performanceId, table.kind),
]);
```

Match the existing import set at the top — add `sql` from `drizzle-orm` if missing.

- [ ] **Step 4: Generate Postgres migration**

Verify next free migration index:

Run: `ls drizzle/pg/`
Expected: shows `0000_..` through `0003_..`; pick `0005` if `0004_` already exists, else `0004_`. The plan below assumes `0005_`.

Run: `npm run db:generate:pg`
Expected: drizzle-kit emits `drizzle/pg/0005_sale_state.sql` (or similar slug).

Open the generated file. Verify it contains:
- `ALTER TABLE "performances" ADD COLUMN "sale_state" text DEFAULT 'unknown' NOT NULL;`
- `CREATE INDEX "performances_sale_state_idx" ON "performances" USING btree ("sale_state");`
- `CREATE TABLE "sale_state_transitions" (...)`
- `CREATE TABLE "notification_credits" (...)`
- Foreign-key constraints on both new tables

If the generated SQL is missing the `default 'unknown'` on the `ALTER`, hand-edit to add it (drizzle-kit historically sometimes omits defaults). This must be set so existing rows survive the `NOT NULL` constraint.

- [ ] **Step 5: Generate D1 migration**

Run: `npm run db:generate:d1`
Expected: a new `drizzle/d1/<NNNN>_*.sql` file with the same schema in SQLite syntax. Verify and rename if needed.

- [ ] **Step 6: Add `sale_state` to the Performance row reader**

Edit `src/db/repository.ts` around line 200 (the `performances` row → `Performance` mapper). Add:

```ts
saleState: row.saleState ?? undefined,
```

next to the existing `saleStatus` line.

- [ ] **Step 7: Add `sale_state` to the supabase-to-d1 column list**

Edit `scripts/sync-supabase-to-d1.mjs`. Both column lists (the SELECT around line 21 and the INSERT around line 63) need `sale_state` added. Also wire the value through the row mapper around line 76:

```js
sale_state: sqliteValue(performance.sale_state),
```

- [ ] **Step 8: Apply migration locally and verify**

If the user has a local Postgres dev DB:

Run: `npm run db:migrate:pg`
Expected: completes without error; running it twice is a no-op.

If no local DB, skip — the migration will run in CI/staging during phase 1 deploy.

Verify the schema artifacts compile:

Run: `npm run lint`
Expected: zero errors.

Run: `npx tsc --noEmit` (or however the repo type-checks; if not configured, `npm run build` against the static export)
Expected: zero errors.

- [ ] **Step 9: Commit**

```bash
git add src/db/schema.pg.ts src/db/schema.sqlite.ts \
        drizzle/pg/0005_*.sql drizzle/d1/*.sql \
        src/data/types.ts src/db/repository.ts \
        scripts/sync-supabase-to-d1.mjs
git commit -m "feat(db): add sale_state column + transitions/credits tables (#23)

Schema-only change for the 开票提醒 feature. sale_state defaults to
'unknown' on every row; transitions and credits tables start empty.
No behavior change — scrapers and notifier wire up in follow-up
commits."
```

---

### Task 2: Sale-state mappers + tests

**Repo:** cantabile

**Files:**
- Create: `scripts/lib/sale-state.mjs`
- Create: `scripts/lib/sale-state.test.mjs`

**Interfaces:**
- Consumes: nothing
- Produces:
  - `SALE_STATES: readonly string[]` — the 6 enum values
  - `chncpaSaleState(text: string | null | undefined): SaleState`
  - `bjchSaleState(record: object, round: object): SaleState`
  - `shsoSaleState(record: object): SaleState`
  - `shchSaleState(eventSaleState: number | undefined, projectStatus: number | undefined): SaleState`

- [ ] **Step 1: Write the failing test file**

Create `scripts/lib/sale-state.test.mjs`:

```js
import { test } from "node:test";
import assert from "node:assert/strict";
import {
  SALE_STATES,
  bjchSaleState,
  chncpaSaleState,
  shchSaleState,
  shsoSaleState,
} from "./sale-state.mjs";

test("SALE_STATES enum contents", () => {
  assert.deepEqual(
    [...SALE_STATES].sort(),
    ["cancelled", "ended", "on_sale", "pre_sale", "sold_out", "unknown"],
  );
});

test("bjch maps eventSaleState 1/2/3", () => {
  assert.equal(bjchSaleState({}, { eventSaleState: 2 }), "on_sale");
  assert.equal(bjchSaleState({}, { eventSaleState: 1 }), "pre_sale");
  assert.equal(bjchSaleState({}, { eventSaleState: 3 }), "sold_out");
  assert.equal(bjchSaleState({ projectSaleState: 2 }, {}), "on_sale");
  assert.equal(bjchSaleState({}, {}), "unknown");
});

test("shso maps saleType and 演出取消", () => {
  assert.equal(shsoSaleState({ saleType: "售票中" }), "on_sale");
  assert.equal(shsoSaleState({ fullCnName: "周末专场:演出取消" }), "cancelled");
  assert.equal(shsoSaleState({}), "unknown");
  assert.equal(shsoSaleState({ saleType: "未知值" }), "unknown");
});

test("shch maps event then project status", () => {
  assert.equal(shchSaleState(2, undefined), "on_sale");
  assert.equal(shchSaleState(1, undefined), "pre_sale");
  assert.equal(shchSaleState(3, undefined), "sold_out");
  assert.equal(shchSaleState(undefined, 2), "on_sale");
  assert.equal(shchSaleState(undefined, undefined), "unknown");
});

test("chncpa keyword mapping", () => {
  assert.equal(chncpaSaleState("售票中"), "on_sale");
  assert.equal(chncpaSaleState("已开票"), "on_sale");
  assert.equal(chncpaSaleState("预售中"), "pre_sale");
  assert.equal(chncpaSaleState("即将开售"), "pre_sale");
  assert.equal(chncpaSaleState("已售罄"), "sold_out");
  assert.equal(chncpaSaleState("无票"), "sold_out");
  assert.equal(chncpaSaleState("演出取消"), "cancelled");
  assert.equal(chncpaSaleState("演出结束"), "ended");
  assert.equal(chncpaSaleState("某种新状态"), "unknown");
  assert.equal(chncpaSaleState(null), "unknown");
  assert.equal(chncpaSaleState(undefined), "unknown");
  assert.equal(chncpaSaleState(""), "unknown");
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `node --test scripts/lib/sale-state.test.mjs`
Expected: FAIL with `Cannot find module './sale-state.mjs'`.

- [ ] **Step 3: Implement the mapper module**

Create `scripts/lib/sale-state.mjs`:

```js
// Normalized sale-state enum. Keep in sync with src/data/types.ts SaleState.
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
export function shsoSaleState(record) {
  const fullName = String(record?.fullCnName ?? "");
  if (fullName.includes("演出取消")) return "cancelled";
  const saleType = String(record?.saleType ?? "").trim();
  if (saleType === "售票中") return "on_sale";
  return "unknown";
}

// SHCH: same numeric scheme as BJCH but split across two fields.
export function shchSaleState(eventSaleState, projectStatus) {
  const v = eventSaleState ?? projectStatus;
  if (v === 2) return "on_sale";
  if (v === 1) return "pre_sale";
  if (v === 3) return "sold_out";
  return "unknown";
}

// CHNCPA: upstream is free-text Chinese. Keyword match in fall-through order —
// most-specific words first. Unknown strings return "unknown"; caller should
// log to stderr so we can extend the keyword set.
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
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `node --test scripts/lib/sale-state.test.mjs`
Expected: PASS — 5 tests pass.

- [ ] **Step 5: Commit**

```bash
git add scripts/lib/sale-state.mjs scripts/lib/sale-state.test.mjs
git commit -m "feat(scrapers): add sale-state mappers + tests (#23)

Pure functions, one per source (CHNCPA/SHSO/BJCH/SHCH). Wired into
the scrapers in the next commit."
```

---

### Task 3: Shared upsert helper + per-scraper wiring

**Repo:** cantabile

**Files:**
- Create: `scripts/lib/sale-state-upsert.mjs`
- Create: `scripts/lib/sale-state-upsert.test.mjs`
- Modify: `scripts/sync-bjch-performances.mjs`
- Modify: `scripts/sync-shso-performances.mjs`
- Modify: `scripts/sync-shch-performances.mjs`
- Modify: `scripts/sync-chncpa-performances.mjs`

**Interfaces:**
- Consumes: `bjchSaleState`, `shsoSaleState`, `shchSaleState`, `chncpaSaleState` from Task 2
- Produces:
  - `async function upsertPerformanceAndLogTransition(sql, { row }, opts): Promise<{prevState: string|null, nextState: string}>` — runs the insert + transition log atomically; returns the prev/next pair for the caller's log line.

- [ ] **Step 1: Implement the shared upsert helper**

Create `scripts/lib/sale-state-upsert.mjs`:

```js
// Single-transaction upsert: write the performance row, capture the previous
// sale_state, and append a transition row iff the state changed AND the row
// already existed before this call.
//
// First-insert suppression (prev_state IS NULL) is non-negotiable: without it
// every brand-new on_sale row would emit a phantom transition that the
// notifier interprets as "tickets just opened", but no user could have
// consented yet — and CHNCPA in particular spawns dozens of new rows per
// scrape.
//
// `row` is the field/value object for the insert. The set of columns is the
// caller's responsibility; this helper only requires `id` and `sale_state` to
// be present. `updateCore: true` updates display columns on conflict
// (interactive runs); `false` (default) only refreshes price/status/state.
export async function upsertPerformanceAndLogTransition(sql, { row }, options = {}) {
  const { updateCore = false } = options;
  const id = row.id;
  const nextState = row.sale_state ?? "unknown";

  const coreAssign = updateCore ? sql`
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
    address = excluded.address,
    intro = excluded.intro,
    is_classical = excluded.is_classical,
    source_metadata = excluded.source_metadata,
  ` : sql``;

  return sql.begin(async (tx) => {
    const [{ prev_state }] = await tx`
      WITH old AS (
        SELECT sale_state FROM performances WHERE id = ${id}
      )
      INSERT INTO performances ${tx(row)}
      ON CONFLICT (id) DO UPDATE SET
        ${coreAssign}
        price_label = excluded.price_label,
        sale_status = excluded.sale_status,
        sale_state = excluded.sale_state,
        updated_at = now()
      RETURNING (SELECT sale_state FROM old) AS prev_state
    `;

    if (prev_state !== null && prev_state !== nextState) {
      await tx`
        INSERT INTO sale_state_transitions (performance_id, from_state, to_state)
        VALUES (${id}, ${prev_state}, ${nextState})
        ON CONFLICT DO NOTHING
      `;
    }
    return { prevState: prev_state, nextState };
  });
}
```

- [ ] **Step 2: Write integration test for the helper**

Create `scripts/lib/sale-state-upsert.test.mjs`:

```js
import { test, before, after, beforeEach } from "node:test";
import assert from "node:assert/strict";
import postgres from "postgres";
import { upsertPerformanceAndLogTransition } from "./sale-state-upsert.mjs";

const url = process.env.DATABASE_URL_TEST;
const maybeTest = url ? test : test.skip;

let sql;

before(async () => {
  if (!url) return;
  sql = postgres(url, { prepare: false });
});

after(async () => {
  if (sql) await sql.end();
});

beforeEach(async () => {
  if (!sql) return;
  await sql`DELETE FROM sale_state_transitions WHERE performance_id LIKE 'plan-test-%'`;
  await sql`DELETE FROM performances WHERE id LIKE 'plan-test-%'`;
});

function draft(state) {
  return {
    row: {
      id: "plan-test-1",
      title: "T", city: "C", venue: "V",
      starts_at: new Date("2026-12-01T00:00:00Z").toISOString(),
      artists: sql.json([]),
      program: sql.json([]),
      ticket_url: null,
      source_url: "http://x",
      source_name: "TEST",
      image_url: null,
      price_label: null,
      sale_status: null,
      sale_state: state,
      address: null,
      intro: null,
      is_classical: null,
      source_id: "plan-test:1",
      source_metadata: sql.json({}),
    },
  };
}

maybeTest("first insert does NOT log a transition", async () => {
  const r = await upsertPerformanceAndLogTransition(sql, draft("on_sale"));
  assert.equal(r.prevState, null);
  const rows = await sql`SELECT * FROM sale_state_transitions WHERE performance_id = 'plan-test-1'`;
  assert.equal(rows.length, 0);
});

maybeTest("state change logs exactly one transition", async () => {
  await upsertPerformanceAndLogTransition(sql, draft("pre_sale"));
  await upsertPerformanceAndLogTransition(sql, draft("on_sale"));
  const rows = await sql`SELECT from_state, to_state FROM sale_state_transitions WHERE performance_id = 'plan-test-1' ORDER BY detected_at`;
  assert.equal(rows.length, 1);
  assert.equal(rows[0].from_state, "pre_sale");
  assert.equal(rows[0].to_state, "on_sale");
});

maybeTest("no-change update logs zero transitions", async () => {
  await upsertPerformanceAndLogTransition(sql, draft("on_sale"));
  await upsertPerformanceAndLogTransition(sql, draft("on_sale"));
  const rows = await sql`SELECT * FROM sale_state_transitions WHERE performance_id = 'plan-test-1'`;
  assert.equal(rows.length, 0);  // both prev_states match → no log
});
```

- [ ] **Step 3: Run the helper test**

Run: `DATABASE_URL_TEST=postgresql://localhost/cantabile_test node --test scripts/lib/sale-state-upsert.test.mjs`
Expected (with a test DB): 3 tests PASS.
Expected (without `DATABASE_URL_TEST`): 3 tests SKIPPED.

If no local Postgres is available, defer real-DB verification to Task 10 (staging smoke). Do not block on this.

- [ ] **Step 4: Wire BJCH scraper**

Edit `scripts/sync-bjch-performances.mjs`:

1. Add imports near the top:
   ```js
   import { bjchSaleState } from "./lib/sale-state.mjs";
   import { upsertPerformanceAndLogTransition } from "./lib/sale-state-upsert.mjs";
   ```

2. In the draft assembly (around line 119), add `saleState: bjchSaleState(record, round)`:
   ```js
   saleStatus: saleStatus(record, round),
   saleState: bjchSaleState(record, round),
   ```

3. Replace `savePerformance` (line 134-end of that function) with:
   ```js
   async function savePerformance(sql, draft, { updateCore = false } = {}) {
     const row = mapDraftToRow(draft);
     return upsertPerformanceAndLogTransition(sql, { row }, { updateCore });
   }

   function mapDraftToRow(draft) {
     return {
       id: draft.id,
       title: draft.title,
       city: draft.city,
       venue: draft.venue,
       starts_at: draft.startsAt,
       artists: sql.json(draft.artists ?? []),
       program: sql.json(draft.program ?? []),
       ticket_url: nullish(draft.ticketUrl),
       source_url: draft.sourceUrl,
       source_name: draft.sourceName,
       image_url: nullish(draft.imageUrl),
       price_label: nullish(draft.priceLabel),
       sale_status: nullish(draft.saleStatus),
       sale_state: draft.saleState ?? "unknown",
       address: nullish(draft.address),
       intro: nullish(draft.intro),
       is_classical: draft.isClassical ?? null,
       source_id: nullish(draft.sourceId),
       source_metadata: draft.sourceMetadata ? sql.json(draft.sourceMetadata) : null,
     };
   }
   ```
   (`sql.json` / `nullish` already exist in the file — keep using them.)

- [ ] **Step 5: Wire SHSO scraper**

Edit `scripts/sync-shso-performances.mjs`:

1. Add imports:
   ```js
   import { shsoSaleState } from "./lib/sale-state.mjs";
   import { upsertPerformanceAndLogTransition } from "./lib/sale-state-upsert.mjs";
   ```

2. In `normalizeRecord` (around line 102), add `saleState: shsoSaleState(record)` next to `saleStatus`.

3. Replace `savePerformance` (around 116-170) with the same `mapDraftToRow` + helper pattern from Step 4.

- [ ] **Step 6: Wire SHCH scraper**

Edit `scripts/sync-shch-performances.mjs`:

1. Add imports as above (with `shchSaleState`).

2. Rename the existing `saleStatus` helper (around line 239) to `saleStatusText` to free the field name. Update its call site (around line 134) accordingly:
   ```js
   saleStatus: saleStatusText(event.eventSaleState ?? project.status),
   saleState: shchSaleState(event.eventSaleState, project.status),
   ```

3. Replace `savePerformance` (around 149-203) with the same pattern.

- [ ] **Step 7: Wire CHNCPA scraper**

Edit `scripts/sync-chncpa-performances.mjs`:

1. Add imports as above (with `chncpaSaleState`).

2. In `normalizeProduct` (around line 143), after the `saleStatus` line, add:
   ```js
   const saleState = chncpaSaleState(saleStatus);
   if (saleState === "unknown" && saleStatus) {
     process.stderr.write(`[chncpa] unknown saleStatus mapping: ${JSON.stringify(saleStatus)}\n`);
   }
   ```

3. Add `saleState,` to the returned object (around line 165).

4. Replace `savePerformance` (around 291-345) with the same pattern.

- [ ] **Step 8: Run a dry-run smoke test**

Run: `npm run sync:shso:dry-run`
Expected: prints drafts; each `price/status:` line has a sensible value; no errors.

Optionally repeat for `sync:bjch:dry-run`, `sync:chncpa:dry-run`, `sync:shch:dry-run`.

- [ ] **Step 9: Lint + mapper tests**

Run: `npm run lint`
Expected: zero errors.

Run: `node --test scripts/lib/sale-state.test.mjs`
Expected: 5 PASS.

- [ ] **Step 10: Commit**

```bash
git add scripts/lib/sale-state-upsert.mjs scripts/lib/sale-state-upsert.test.mjs \
        scripts/sync-bjch-performances.mjs scripts/sync-shso-performances.mjs \
        scripts/sync-shch-performances.mjs scripts/sync-chncpa-performances.mjs
git commit -m "feat(scrapers): wire sale_state + transition logging (#23)

Each of the 4 scrapers now writes a normalized sale_state alongside
the existing free-text sale_status, and the shared upsert helper
appends to sale_state_transitions on every observed state change
(with first-insert suppression). Notifier consumes the log in the
gin-container submodule."
```

---




### Task 4: WeChat push client + token cache (gin-container)

**Repo:** `gin-container` submodule

**Files:**
- Create: `gin-container/wechat_push.go`
- Create: `gin-container/wechat_push_test.go`

**Interfaces:**
- Consumes: nothing
- Produces:
  - `type wechatPushConfig struct { AppID, AppSecret, OnSaleTmplID, MiniprogramState string }`
  - `type wechatPusher interface { send(ctx context.Context, openid string, perf *Performance) error }`
  - `func newWechatPusher(cfg wechatPushConfig, http httpDoer, now func() time.Time) wechatPusher`
  - Sentinel errors: `errPushRefused` (user refused), `errPushRateLimited` (back off), `errPushFatal` (template/data bad — mark transition done without retrying), `errPushTokenInvalid` (refresh + retry once).

- [ ] **Step 1: Write the failing test file**

Create `gin-container/wechat_push_test.go`. The test uses a fake `httpDoer` so no network is touched:

```go
package main

import (
	"context"
	"errors"
	"io"
	"net/http"
	"strings"
	"testing"
	"time"
)

type fakeDoer struct {
	responses []fakeResp
	calls     []*http.Request
}

type fakeResp struct {
	body   string
	status int
}

func (f *fakeDoer) Do(r *http.Request) (*http.Response, error) {
	f.calls = append(f.calls, r)
	if len(f.responses) == 0 {
		return nil, errors.New("fakeDoer: no responses queued")
	}
	resp := f.responses[0]
	f.responses = f.responses[1:]
	status := resp.status
	if status == 0 {
		status = 200
	}
	return &http.Response{
		StatusCode: status,
		Body:       io.NopCloser(strings.NewReader(resp.body)),
		Header:     make(http.Header),
	}, nil
}

func fixedClock(t time.Time) func() time.Time { return func() time.Time { return t } }

func TestTokenCacheReusesWithinExpiry(t *testing.T) {
	now := time.Date(2026, 6, 30, 12, 0, 0, 0, time.UTC)
	d := &fakeDoer{responses: []fakeResp{
		{body: `{"access_token":"tok1","expires_in":7200}`},
		{body: `{"errcode":0}`}, // send call
		{body: `{"errcode":0}`}, // second send call — must NOT re-fetch token
	}}
	p := newWechatPusher(wechatPushConfig{AppID: "a", AppSecret: "s", OnSaleTmplID: "tpl"}, d, fixedClock(now))
	perf := &Performance{ID: "p1", Title: "T", Venue: "V", StartsAt: now}
	if err := p.send(context.Background(), "user1", perf); err != nil {
		t.Fatalf("first send: %v", err)
	}
	if err := p.send(context.Background(), "user2", perf); err != nil {
		t.Fatalf("second send: %v", err)
	}
	// 1 token fetch + 2 send calls = 3 total
	if got := len(d.calls); got != 3 {
		t.Fatalf("expected 3 http calls, got %d", got)
	}
}

func TestTokenCacheRefreshesAfterExpiry(t *testing.T) {
	now := time.Date(2026, 6, 30, 12, 0, 0, 0, time.UTC)
	d := &fakeDoer{responses: []fakeResp{
		{body: `{"access_token":"tok1","expires_in":7200}`},
		{body: `{"errcode":0}`},
		{body: `{"access_token":"tok2","expires_in":7200}`},
		{body: `{"errcode":0}`},
	}}
	clock := now
	p := newWechatPusher(wechatPushConfig{AppID: "a", AppSecret: "s", OnSaleTmplID: "tpl"}, d, func() time.Time { return clock })
	perf := &Performance{ID: "p1", StartsAt: now}
	if err := p.send(context.Background(), "u", perf); err != nil {
		t.Fatal(err)
	}
	// 3 hours later — token expired
	clock = clock.Add(3 * time.Hour)
	if err := p.send(context.Background(), "u", perf); err != nil {
		t.Fatal(err)
	}
	if got := len(d.calls); got != 4 {
		t.Fatalf("expected 4 calls (2 token + 2 send), got %d", got)
	}
}

func TestSendMapsErrcodes(t *testing.T) {
	cases := []struct {
		body     string
		expected error
	}{
		{`{"errcode":43101}`, errPushRefused},
		{`{"errcode":45009}`, errPushRateLimited},
		{`{"errcode":47003}`, errPushFatal},
	}
	for _, c := range cases {
		now := time.Date(2026, 6, 30, 12, 0, 0, 0, time.UTC)
		d := &fakeDoer{responses: []fakeResp{
			{body: `{"access_token":"t","expires_in":7200}`},
			{body: c.body},
		}}
		p := newWechatPusher(wechatPushConfig{AppID: "a", AppSecret: "s", OnSaleTmplID: "tpl"}, d, fixedClock(now))
		err := p.send(context.Background(), "u", &Performance{ID: "p", StartsAt: now})
		if !errors.Is(err, c.expected) {
			t.Errorf("body=%s expected %v got %v", c.body, c.expected, err)
		}
	}
}
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd gin-container && go test ./...`
Expected: FAIL with `undefined: wechatPushConfig` (and similar).

- [ ] **Step 3: Implement the push client**

Create `gin-container/wechat_push.go`:

```go
package main

import (
	"bytes"
	"context"
	"encoding/json"
	"errors"
	"fmt"
	"io"
	"net/http"
	"sync"
	"time"
)

var (
	errPushRefused      = errors.New("wechat: user refused or not subscribed")
	errPushRateLimited  = errors.New("wechat: rate limited")
	errPushFatal        = errors.New("wechat: fatal (template/data)")
	errPushTokenInvalid = errors.New("wechat: token invalid")
)

type httpDoer interface {
	Do(*http.Request) (*http.Response, error)
}

type wechatPushConfig struct {
	AppID            string
	AppSecret        string
	OnSaleTmplID     string
	MiniprogramState string // "developer" | "trial" | "formal"
}

type wechatPusher interface {
	send(ctx context.Context, openid string, perf *Performance) error
}

type pusher struct {
	cfg   wechatPushConfig
	http  httpDoer
	now   func() time.Time
	mu    sync.Mutex
	token string
	exp   time.Time
}

func newWechatPusher(cfg wechatPushConfig, h httpDoer, now func() time.Time) wechatPusher {
	if now == nil {
		now = time.Now
	}
	if h == nil {
		h = &http.Client{Timeout: 10 * time.Second}
	}
	return &pusher{cfg: cfg, http: h, now: now}
}

// Refreshes 5 minutes before expiry to stay clear of the WeChat token grace window.
func (p *pusher) accessToken(ctx context.Context) (string, error) {
	p.mu.Lock()
	defer p.mu.Unlock()
	if p.exp.Sub(p.now()) > time.Minute {
		return p.token, nil
	}
	u := fmt.Sprintf("https://api.weixin.qq.com/cgi-bin/token?grant_type=client_credential&appid=%s&secret=%s", p.cfg.AppID, p.cfg.AppSecret)
	req, _ := http.NewRequestWithContext(ctx, "GET", u, nil)
	resp, err := p.http.Do(req)
	if err != nil {
		return "", err
	}
	defer resp.Body.Close()
	var body struct {
		AccessToken string `json:"access_token"`
		ExpiresIn   int    `json:"expires_in"`
		Errcode     int    `json:"errcode"`
		Errmsg      string `json:"errmsg"`
	}
	if err := json.NewDecoder(resp.Body).Decode(&body); err != nil {
		return "", err
	}
	if body.AccessToken == "" {
		return "", fmt.Errorf("token fetch failed: errcode=%d errmsg=%s", body.Errcode, body.Errmsg)
	}
	p.token = body.AccessToken
	// refresh 5 minutes before WeChats expiry
	p.exp = p.now().Add(time.Duration(body.ExpiresIn-300) * time.Second)
	return p.token, nil
}

func (p *pusher) send(ctx context.Context, openid string, perf *Performance) error {
	token, err := p.accessToken(ctx)
	if err != nil {
		return err
	}
	body := map[string]any{
		"touser":      openid,
		"template_id": p.cfg.OnSaleTmplID,
		"page":        fmt.Sprintf("pages/detail/index?id=%s", perf.ID),
		"data": map[string]any{
			"thing1": map[string]string{"value": truncRunes(perf.Title, 20)},
			"time2":  map[string]string{"value": perf.StartsAt.In(time.FixedZone("CST", 8*3600)).Format("2006年01月02日 15:04")},
			"thing3": map[string]string{"value": truncRunes(perf.Venue, 20)},
		},
	}
	if p.cfg.MiniprogramState != "" {
		body["miniprogram_state"] = p.cfg.MiniprogramState
	}
	buf, _ := json.Marshal(body)
	u := "https://api.weixin.qq.com/cgi-bin/message/subscribe/send?access_token=" + token
	req, _ := http.NewRequestWithContext(ctx, "POST", u, bytes.NewReader(buf))
	req.Header.Set("Content-Type", "application/json")
	resp, err := p.http.Do(req)
	if err != nil {
		return err
	}
	defer resp.Body.Close()
	raw, _ := io.ReadAll(resp.Body)
	var r struct {
		Errcode int    `json:"errcode"`
		Errmsg  string `json:"errmsg"`
	}
	if err := json.Unmarshal(raw, &r); err != nil {
		return fmt.Errorf("decode push response: %w; body=%s", err, string(raw))
	}
	switch r.Errcode {
	case 0:
		return nil
	case 40001, 40014, 42001:
		// invalidate cached token; caller retries once.
		p.mu.Lock()
		p.exp = time.Time{}
		p.mu.Unlock()
		return errPushTokenInvalid
	case 43101:
		return errPushRefused
	case 45009, 45040:
		return errPushRateLimited
	case 47003:
		return errPushFatal
	default:
		return fmt.Errorf("wechat: errcode=%d errmsg=%s", r.Errcode, r.Errmsg)
	}
}

func truncRunes(s string, max int) string {
	r := []rune(s)
	if len(r) > max {
		r = r[:max]
	}
	return string(r)
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `cd gin-container && go test -run TestToken ./...`
Expected: PASS — both token-cache tests.

Run: `cd gin-container && go test -run TestSendMapsErrcodes ./...`
Expected: PASS — 3 errcode cases.

- [ ] **Step 5: Commit (in the submodule)**

```bash
cd gin-container
git checkout -b feat/issue-23-wechat-push
git add wechat_push.go wechat_push_test.go
git commit -m "feat: WeChat 订阅消息 push client with token cache (#23)

Pure HTTP client + sync.Mutex-guarded access_token cache. Maps the
relevant WeChat errcodes onto typed errors the notifier can act on
(refused / rate-limited / fatal / token-invalid). No DB access yet —
notifier wires it in next."
```

Stay on this branch; Task 5 piles more commits onto it.

---

### Task 5: Notifier ticker + repository functions (gin-container)

**Repo:** `gin-container` submodule, same branch as Task 4

**Files:**
- Modify: `gin-container/models.go`
- Modify: `gin-container/repository.go`
- Create: `gin-container/notifier.go`
- Create: `gin-container/notifier_test.go`

**Interfaces:**
- Consumes: `wechatPusher` from Task 4
- Produces:
  - Types: `SaleStateTransition`, `NotificationCredit`
  - Repo fns: `listPendingOnSaleTransitions(db, limit)`, `findActiveCredits(db, performanceID, kind)`, `markCreditConsumed(db, openid, performanceID, kind)`, `bumpCreditAttempts(db, openid, performanceID, kind)`, `markCreditFailed(db, openid, performanceID, kind)`, `markTransitionNotified(db, id)`
  - `type notifier struct { db, push, log, batchSize, attemptCap, enabled }` with `run(ctx, tick time.Duration)` and `tick(ctx)`.

- [ ] **Step 1: Add types**

Edit `gin-container/models.go`. Add `SaleState` to `Performance`:

```go
SaleState *string `gorm:"column:sale_state" json:"saleState"`
```

Append two new types at the bottom of the file:

```go
type SaleStateTransition struct {
	ID            int64      `gorm:"primaryKey" json:"id"`
	PerformanceID string     `gorm:"column:performance_id" json:"performanceId"`
	FromState     string     `gorm:"column:from_state" json:"fromState"`
	ToState       string     `gorm:"column:to_state" json:"toState"`
	DetectedAt    time.Time  `gorm:"column:detected_at" json:"detectedAt"`
	NotifiedAt    *time.Time `gorm:"column:notified_at" json:"notifiedAt"`
}

func (SaleStateTransition) TableName() string { return "sale_state_transitions" }

type NotificationCredit struct {
	Openid        string     `gorm:"primaryKey" json:"openid"`
	PerformanceID string     `gorm:"primaryKey;column:performance_id" json:"performanceId"`
	Kind          string     `gorm:"primaryKey" json:"kind"`
	GrantedAt     time.Time  `gorm:"column:granted_at" json:"grantedAt"`
	ConsumedAt    *time.Time `gorm:"column:consumed_at" json:"consumedAt"`
	Attempts      int        `json:"attempts"`
	FailedAt      *time.Time `gorm:"column:failed_at" json:"failedAt"`
}

func (NotificationCredit) TableName() string { return "notification_credits" }
```

- [ ] **Step 2: Add repository functions**

Append to `gin-container/repository.go`:

```go
func listPendingOnSaleTransitions(db *gorm.DB, limit int) ([]SaleStateTransition, error) {
	var rows []SaleStateTransition
	err := db.Where("to_state = ? AND notified_at IS NULL", "on_sale").
		Order("detected_at asc").
		Limit(limit).
		Find(&rows).Error
	return rows, err
}

func findActiveCredits(db *gorm.DB, performanceID, kind string) ([]NotificationCredit, error) {
	var rows []NotificationCredit
	err := db.Where("performance_id = ? AND kind = ? AND consumed_at IS NULL AND failed_at IS NULL",
		performanceID, kind).
		Find(&rows).Error
	return rows, err
}

func markCreditConsumed(db *gorm.DB, openid, performanceID, kind string) error {
	return db.Model(&NotificationCredit{}).
		Where("openid = ? AND performance_id = ? AND kind = ?", openid, performanceID, kind).
		Updates(map[string]any{"consumed_at": time.Now()}).Error
}

func bumpCreditAttempts(db *gorm.DB, openid, performanceID, kind string) error {
	return db.Exec(`UPDATE notification_credits SET attempts = attempts + 1
		WHERE openid = ? AND performance_id = ? AND kind = ?`,
		openid, performanceID, kind).Error
}

func markCreditFailed(db *gorm.DB, openid, performanceID, kind string) error {
	return db.Model(&NotificationCredit{}).
		Where("openid = ? AND performance_id = ? AND kind = ?", openid, performanceID, kind).
		Updates(map[string]any{"failed_at": time.Now()}).Error
}

func markTransitionNotified(db *gorm.DB, id int64) error {
	return db.Model(&SaleStateTransition{}).Where("id = ?", id).
		Updates(map[string]any{"notified_at": time.Now()}).Error
}
```

- [ ] **Step 3: Write the notifier test (failing)**

Create `gin-container/notifier_test.go`:

```go
package main

import (
	"context"
	"errors"
	"sync"
	"testing"
	"time"
)

// mockPusher records calls and replays a queued response per call.
type mockPusher struct {
	mu       sync.Mutex
	calls    []string // openids
	results  []error  // one per call, in order
	defaultE error
}

func (m *mockPusher) send(_ context.Context, openid string, _ *Performance) error {
	m.mu.Lock()
	defer m.mu.Unlock()
	m.calls = append(m.calls, openid)
	if len(m.results) > 0 {
		r := m.results[0]
		m.results = m.results[1:]
		return r
	}
	return m.defaultE
}

// stub repo via a tiny in-memory shim — see helper below.
type fakeRepo struct {
	pending  []SaleStateTransition
	creds    map[string][]NotificationCredit
	consumed []string
	failed   []string
	notified []int64
	attempts map[string]int
}

func newFakeRepo() *fakeRepo {
	return &fakeRepo{creds: map[string][]NotificationCredit{}, attempts: map[string]int{}}
}

func key(c NotificationCredit) string { return c.Openid + "|" + c.PerformanceID + "|" + c.Kind }

func TestNotifierHappyPath(t *testing.T) {
	repo := newFakeRepo()
	repo.pending = []SaleStateTransition{{ID: 1, PerformanceID: "p1", FromState: "pre_sale", ToState: "on_sale"}}
	repo.creds["p1"] = []NotificationCredit{
		{Openid: "userA", PerformanceID: "p1", Kind: "on_sale"},
		{Openid: "userB", PerformanceID: "p1", Kind: "on_sale"},
	}
	push := &mockPusher{}
	n := &notifier{push: push, repo: repo, perfLookup: stubPerf, attemptCap: 3, batchSize: 10}

	if err := n.tickOnce(context.Background()); err != nil {
		t.Fatal(err)
	}
	if len(push.calls) != 2 {
		t.Fatalf("want 2 pushes, got %d", len(push.calls))
	}
	if len(repo.consumed) != 2 {
		t.Fatalf("want 2 credits consumed, got %d", len(repo.consumed))
	}
	if len(repo.notified) != 1 || repo.notified[0] != 1 {
		t.Fatalf("want transition 1 marked notified, got %+v", repo.notified)
	}
}

func TestNotifierRateLimitedLeavesPending(t *testing.T) {
	repo := newFakeRepo()
	repo.pending = []SaleStateTransition{{ID: 1, PerformanceID: "p1", FromState: "pre_sale", ToState: "on_sale"}}
	repo.creds["p1"] = []NotificationCredit{{Openid: "u", PerformanceID: "p1", Kind: "on_sale"}}
	push := &mockPusher{defaultE: errPushRateLimited}
	n := &notifier{push: push, repo: repo, perfLookup: stubPerf, attemptCap: 3, batchSize: 10}

	if err := n.tickOnce(context.Background()); err != nil {
		t.Fatal(err)
	}
	if len(repo.consumed) != 0 {
		t.Fatalf("rate-limited credit should not be consumed")
	}
	if len(repo.notified) != 0 {
		t.Fatalf("rate-limited transition should not be marked notified")
	}
	if repo.attempts["u|p1|on_sale"] != 1 {
		t.Fatalf("expected attempts=1, got %d", repo.attempts["u|p1|on_sale"])
	}
}

func TestNotifierRefusedConsumesCredit(t *testing.T) {
	repo := newFakeRepo()
	repo.pending = []SaleStateTransition{{ID: 1, PerformanceID: "p1", FromState: "pre_sale", ToState: "on_sale"}}
	repo.creds["p1"] = []NotificationCredit{{Openid: "u", PerformanceID: "p1", Kind: "on_sale"}}
	push := &mockPusher{defaultE: errPushRefused}
	n := &notifier{push: push, repo: repo, perfLookup: stubPerf, attemptCap: 3, batchSize: 10}

	if err := n.tickOnce(context.Background()); err != nil {
		t.Fatal(err)
	}
	if len(repo.consumed) != 1 {
		t.Fatalf("refused credit should be consumed (no retry)")
	}
	if len(repo.notified) != 1 {
		t.Fatalf("transition should advance even though user refused")
	}
}

func TestNotifierAttemptCap(t *testing.T) {
	repo := newFakeRepo()
	repo.creds["p1"] = []NotificationCredit{{Openid: "u", PerformanceID: "p1", Kind: "on_sale", Attempts: 2}}
	// On the 3rd attempt, push returns a generic error; notifier should mark failed.
	repo.pending = []SaleStateTransition{{ID: 1, PerformanceID: "p1", FromState: "pre_sale", ToState: "on_sale"}}
	push := &mockPusher{defaultE: errors.New("network fail")}
	n := &notifier{push: push, repo: repo, perfLookup: stubPerf, attemptCap: 3, batchSize: 10}

	if err := n.tickOnce(context.Background()); err != nil {
		t.Fatal(err)
	}
	if len(repo.failed) != 1 {
		t.Fatalf("expected 1 credit failed, got %d", len(repo.failed))
	}
}

func stubPerf(_ string) (*Performance, error) {
	now := time.Now()
	return &Performance{ID: "p1", Title: "T", Venue: "V", StartsAt: now}, nil
}
```

- [ ] **Step 4: Run test to verify it fails**

Run: `cd gin-container && go test ./...`
Expected: FAIL with `undefined: notifier` etc.

- [ ] **Step 5: Implement the notifier**

Create `gin-container/notifier.go`:

```go
package main

import (
	"context"
	"errors"
	"log"
	"time"

	"gorm.io/gorm"
)

// notifierRepo abstracts the DB layer so the notifier can be unit-tested
// without a real Postgres. Production wires this to a struct that calls the
// repository.go helpers; tests substitute a fake.
type notifierRepo interface {
	listPending(limit int) ([]SaleStateTransition, error)
	findCredits(performanceID, kind string) ([]NotificationCredit, error)
	markCreditConsumed(openid, performanceID, kind string) error
	bumpCreditAttempts(openid, performanceID, kind string) error
	markCreditFailed(openid, performanceID, kind string) error
	markTransitionNotified(id int64) error
}

type notifier struct {
	repo       notifierRepo
	push       wechatPusher
	perfLookup func(id string) (*Performance, error)
	batchSize  int
	attemptCap int
	enabled    bool
}

func (n *notifier) run(ctx context.Context, every time.Duration) {
	if !n.enabled {
		log.Printf("notifier disabled by NOTIFIER_ENABLED=false")
		return
	}
	t := time.NewTicker(every)
	defer t.Stop()
	if err := n.tickOnce(ctx); err != nil {
		log.Printf("notifier first tick: %v", err)
	}
	for {
		select {
		case <-ctx.Done():
			return
		case <-t.C:
			if err := n.tickOnce(ctx); err != nil {
				log.Printf("notifier tick: %v", err)
			}
		}
	}
}

func (n *notifier) tickOnce(ctx context.Context) error {
	trs, err := n.repo.listPending(n.batchSize)
	if err != nil {
		return err
	}
	for _, tr := range trs {
		perf, err := n.perfLookup(tr.PerformanceID)
		if err != nil || perf == nil {
			log.Printf("notifier: perf %s lookup err=%v perf=%v; skipping", tr.PerformanceID, err, perf)
			continue
		}
		creds, err := n.repo.findCredits(tr.PerformanceID, "on_sale")
		if err != nil {
			log.Printf("notifier: findCredits err=%v", err)
			continue
		}
		anyRetry := false
		for _, c := range creds {
			err := n.push.send(ctx, c.Openid, perf)
			switch {
			case err == nil:
				_ = n.repo.markCreditConsumed(c.Openid, c.PerformanceID, c.Kind)
			case errors.Is(err, errPushRefused), errors.Is(err, errPushFatal):
				_ = n.repo.markCreditConsumed(c.Openid, c.PerformanceID, c.Kind)
			case errors.Is(err, errPushRateLimited):
				_ = n.repo.bumpCreditAttempts(c.Openid, c.PerformanceID, c.Kind)
				anyRetry = true
			default:
				// generic / token-invalid: bump attempts, fail past the cap
				_ = n.repo.bumpCreditAttempts(c.Openid, c.PerformanceID, c.Kind)
				if c.Attempts+1 >= n.attemptCap {
					_ = n.repo.markCreditFailed(c.Openid, c.PerformanceID, c.Kind)
				} else {
					anyRetry = true
				}
			}
			time.Sleep(50 * time.Millisecond) // conservative QPS throttle
		}
		// Drain the transition unless something asked for retry.
		if !anyRetry {
			_ = n.repo.markTransitionNotified(tr.ID)
		}
	}
	return nil
}

// gormRepo is the production notifierRepo backed by GORM.
type gormRepo struct{ db *gorm.DB }

func (r *gormRepo) listPending(limit int) ([]SaleStateTransition, error) {
	return listPendingOnSaleTransitions(r.db, limit)
}
func (r *gormRepo) findCredits(performanceID, kind string) ([]NotificationCredit, error) {
	return findActiveCredits(r.db, performanceID, kind)
}
func (r *gormRepo) markCreditConsumed(openid, performanceID, kind string) error {
	return markCreditConsumed(r.db, openid, performanceID, kind)
}
func (r *gormRepo) bumpCreditAttempts(openid, performanceID, kind string) error {
	return bumpCreditAttempts(r.db, openid, performanceID, kind)
}
func (r *gormRepo) markCreditFailed(openid, performanceID, kind string) error {
	return markCreditFailed(r.db, openid, performanceID, kind)
}
func (r *gormRepo) markTransitionNotified(id int64) error {
	return markTransitionNotified(r.db, id)
}
```

Add the fake repo helper to `notifier_test.go` (append at the bottom):

```go
func (f *fakeRepo) listPending(int) ([]SaleStateTransition, error) { return f.pending, nil }
func (f *fakeRepo) findCredits(perfID, kind string) ([]NotificationCredit, error) {
	return f.creds[perfID], nil
}
func (f *fakeRepo) markCreditConsumed(openid, perfID, kind string) error {
	f.consumed = append(f.consumed, openid)
	return nil
}
func (f *fakeRepo) bumpCreditAttempts(openid, perfID, kind string) error {
	f.attempts[openid+"|"+perfID+"|"+kind]++
	return nil
}
func (f *fakeRepo) markCreditFailed(openid, perfID, kind string) error {
	f.failed = append(f.failed, openid)
	return nil
}
func (f *fakeRepo) markTransitionNotified(id int64) error {
	f.notified = append(f.notified, id)
	return nil
}
```

- [ ] **Step 6: Run tests**

Run: `cd gin-container && go test ./...`
Expected: PASS — all 4 notifier tests plus the 3 push-client tests.

- [ ] **Step 7: Commit (in the submodule)**

```bash
cd gin-container
git add models.go repository.go notifier.go notifier_test.go
git commit -m "feat: notifier ticker with transition + credit handling (#23)

Tickerless tickOnce() for testability; run() wraps it with a
context.NewTicker. notifierRepo interface allows in-memory fakes
in tests while production goes through gormRepo backed by the
existing repository.go helpers."
```

---

### Task 6: `/me/notification-credits` routes + main.go wiring

**Repo:** `gin-container` submodule (same branch); plus `cantabile` (Hono routes for the Next.js API)

**Files:**
- Modify: `gin-container/handlers.go`
- Modify: `gin-container/main.go`
- Modify: `gin-container/README.md`
- Modify: `src/server/routes/me.ts`
- Modify: `src/server/repository.ts`

**Interfaces:**
- Consumes: notifier types + repo from Task 5
- Produces (HTTP):
  - `GET /api/v2/me/notification-credits/ids` → `{ ids: [performanceId, ...] }`
  - `POST /api/v2/me/notification-credits/:performanceId` body `{ kind: "on_sale" }` → `{ ok: true }`
  - `DELETE /api/v2/me/notification-credits/:performanceId?kind=on_sale` → `{ ok: true }`

- [ ] **Step 1: Add repo functions in gin-container**

Append to `gin-container/repository.go`:

```go
func listNotificationCreditIDs(db *gorm.DB, openid, kind string) ([]string, error) {
	var ids []string
	err := db.Table("notification_credits").
		Where("openid = ? AND kind = ? AND consumed_at IS NULL AND failed_at IS NULL", openid, kind).
		Pluck("performance_id", &ids).Error
	return ids, err
}

// Upserts a credit so a second tap by the same user re-arms it after a
// previous push consumed the prior row.
func upsertNotificationCredit(db *gorm.DB, openid, performanceID, kind string) error {
	return db.Exec(`
		INSERT INTO notification_credits (openid, performance_id, kind)
		VALUES (?, ?, ?)
		ON CONFLICT (openid, performance_id, kind) DO UPDATE
		SET granted_at = now(), consumed_at = NULL, attempts = 0, failed_at = NULL
	`, openid, performanceID, kind).Error
}

func removeNotificationCredit(db *gorm.DB, openid, performanceID, kind string) error {
	return db.Where("openid = ? AND performance_id = ? AND kind = ?", openid, performanceID, kind).
		Delete(&NotificationCredit{}).Error
}
```

- [ ] **Step 2: Add handlers**

Append to `gin-container/handlers.go`:

```go
func (h *handlers) notificationCreditIDs(c *gin.Context) {
	openid := ctxOpenid(c)
	kind := c.DefaultQuery("kind", "on_sale")
	ids, err := listNotificationCreditIDs(h.db, openid, kind)
	if abortOnErr(c, err) {
		return
	}
	if ids == nil {
		ids = []string{}
	}
	c.JSON(http.StatusOK, gin.H{"ids": ids})
}

type creditBody struct {
	Kind string `json:"kind"`
}

func (h *handlers) addNotificationCredit(c *gin.Context) {
	openid := ctxOpenid(c)
	performanceID := c.Param("performanceId")
	perf, err := findPerformanceByID(h.db, performanceID)
	if abortOnErr(c, err) {
		return
	}
	if perf == nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "performance not found"})
		return
	}
	var body creditBody
	_ = c.ShouldBindJSON(&body)
	kind := body.Kind
	if kind == "" {
		kind = "on_sale"
	}
	if kind != "on_sale" {
		c.JSON(http.StatusBadRequest, gin.H{"error": "unsupported kind"})
		return
	}
	if err := ensureUser(h.db, openid, ctxUnionid(c)); abortOnErr(c, err) {
		return
	}
	if err := upsertNotificationCredit(h.db, openid, performanceID, kind); abortOnErr(c, err) {
		return
	}
	c.JSON(http.StatusOK, gin.H{"ok": true})
}

func (h *handlers) removeNotificationCredit(c *gin.Context) {
	openid := ctxOpenid(c)
	performanceID := c.Param("performanceId")
	kind := c.DefaultQuery("kind", "on_sale")
	if err := removeNotificationCredit(h.db, openid, performanceID, kind); abortOnErr(c, err) {
		return
	}
	c.JSON(http.StatusOK, gin.H{"ok": true})
}
```

- [ ] **Step 3: Wire routes + notifier in main.go**

Edit `gin-container/main.go`. After the existing `me.DELETE("/tickets/...")` line inside the route group, add:

```go
me.GET("/notification-credits/ids", h.notificationCreditIDs)
me.POST("/notification-credits/:performanceId", h.addNotificationCredit)
me.DELETE("/notification-credits/:performanceId", h.removeNotificationCredit)
```

Below the route registration (before `r.Run(...)`), add notifier startup:

```go
if envOr("NOTIFIER_ENABLED", "false") == "true" {
	push := newWechatPusher(wechatPushConfig{
		AppID:            os.Getenv("WECHAT_APP_ID"),
		AppSecret:        os.Getenv("WECHAT_APP_SECRET"),
		OnSaleTmplID:     os.Getenv("WECHAT_ONSALE_TMPL_ID"),
		MiniprogramState: envOr("WECHAT_MINIPROGRAM_STATE", "formal"),
	}, nil, time.Now)
	n := &notifier{
		repo:       &gormRepo{db: db},
		push:       push,
		perfLookup: func(id string) (*Performance, error) { return findPerformanceByID(db, id) },
		batchSize:  envInt("NOTIFIER_BATCH_SIZE", 100),
		attemptCap: envInt("NOTIFIER_ATTEMPT_CAP", 3),
		enabled:    true,
	}
	tickSec := envInt("NOTIFIER_TICK_SECONDS", 300)
	go n.run(context.Background(), time.Duration(tickSec)*time.Second)
}
```

Add a small `envInt` helper at the bottom of `main.go`:

```go
func envInt(key string, fallback int) int {
	if v := os.Getenv(key); v != "" {
		if n, err := strconv.Atoi(v); err == nil {
			return n
		}
	}
	return fallback
}
```

Add imports `"context"` and `"strconv"` at the top.

- [ ] **Step 4: Document env vars in gin-container README**

Append a "Notifier env vars" section to `gin-container/README.md` listing:

```
NOTIFIER_ENABLED=false             # kill switch
NOTIFIER_TICK_SECONDS=300
NOTIFIER_BATCH_SIZE=100
NOTIFIER_ATTEMPT_CAP=3
WECHAT_APP_ID=
WECHAT_APP_SECRET=
WECHAT_ONSALE_TMPL_ID=
WECHAT_MINIPROGRAM_STATE=formal    # developer|trial|formal
```

Note in the README: the template field IDs (`thing1` / `time2` / `thing3`) are placeholders; replace if the approved 模板 uses different IDs.

- [ ] **Step 5: Add Hono routes (cantabile main repo)**

Edit `src/server/repository.ts`. Add at the bottom of the file:

```ts
export async function listCreditIds(db: DB, dbType: DBType, openid: string, kind = "on_sale"): Promise<string[]> {
  if (dbType === "pg") {
    const rows = await db
      .select({ id: pg.notificationCredits.performanceId })
      .from(pg.notificationCredits)
      .where(and(
        eq(pg.notificationCredits.openid, openid),
        eq(pg.notificationCredits.kind, kind),
        isNull(pg.notificationCredits.consumedAt),
        isNull(pg.notificationCredits.failedAt),
      ));
    return rows.map((r) => r.id);
  }
  // d1
  const rows = await db
    .select({ id: d1.notificationCredits.performanceId })
    .from(d1.notificationCredits)
    .where(and(
      eq(d1.notificationCredits.openid, openid),
      eq(d1.notificationCredits.kind, kind),
      isNull(d1.notificationCredits.consumedAt),
      isNull(d1.notificationCredits.failedAt),
    ));
  return rows.map((r) => r.id);
}

export async function upsertCredit(db: DB, dbType: DBType, openid: string, performanceId: string, kind = "on_sale") {
  if (dbType === "pg") {
    await db.insert(pg.notificationCredits)
      .values({ openid, performanceId, kind })
      .onConflictDoUpdate({
        target: [pg.notificationCredits.openid, pg.notificationCredits.performanceId, pg.notificationCredits.kind],
        set: { grantedAt: sql`now()`, consumedAt: null, attempts: 0, failedAt: null },
      });
    return;
  }
  await db.insert(d1.notificationCredits)
    .values({ openid, performanceId, kind })
    .onConflictDoUpdate({
      target: [d1.notificationCredits.openid, d1.notificationCredits.performanceId, d1.notificationCredits.kind],
      set: { grantedAt: sql`(CURRENT_TIMESTAMP)`, consumedAt: null, attempts: 0, failedAt: null },
    });
}

export async function removeCredit(db: DB, dbType: DBType, openid: string, performanceId: string, kind = "on_sale") {
  const table = dbType === "pg" ? pg.notificationCredits : d1.notificationCredits;
  await db.delete(table).where(and(
    eq(table.openid, openid),
    eq(table.performanceId, performanceId),
    eq(table.kind, kind),
  ));
}
```

Add `isNull`, `and`, `eq`, `sql` to the existing drizzle imports as needed.

- [ ] **Step 6: Add Hono route handlers**

Edit `src/server/routes/me.ts`. After the existing `.delete("/tickets/:performanceId", ...)` chain, append:

```ts
  .get("/notification-credits/ids", async (c) => {
    const kind = c.req.query("kind") ?? "on_sale";
    const ids = await listCreditIds(c.get("db"), c.get("dbType"), c.get("openid"), kind);
    return c.json({ ids });
  })
  .post("/notification-credits/:performanceId", async (c) => {
    const performanceId = c.req.param("performanceId");
    const perf = await findPerformanceById(c.get("db"), c.get("dbType"), performanceId);
    if (!perf) return c.json({ error: "performance not found" }, 404);
    const body = await c.req.json().catch(() => ({}) as Record<string, unknown>);
    const kind = typeof body.kind === "string" ? body.kind : "on_sale";
    if (kind !== "on_sale") return c.json({ error: "unsupported kind" }, 400);
    await upsertUser(c.get("db"), c.get("dbType"), { openid: c.get("openid"), unionid: c.get("unionid") ?? null });
    await upsertCredit(c.get("db"), c.get("dbType"), c.get("openid"), performanceId, kind);
    return c.json({ ok: true });
  })
  .delete("/notification-credits/:performanceId", async (c) => {
    const kind = c.req.query("kind") ?? "on_sale";
    await removeCredit(c.get("db"), c.get("dbType"), c.get("openid"), c.req.param("performanceId"), kind);
    return c.json({ ok: true });
  });
```

Update the import list at the top to include `listCreditIds`, `upsertCredit`, `removeCredit`.

- [ ] **Step 7: Verify everything builds**

Run: `cd gin-container && go build ./... && go test ./...`
Expected: build PASSES, all tests PASS.

Run (from cantabile root): `npm run lint && npm run build:api`
Expected: zero lint errors; `build:api` compiles the Hono/Node entry without TypeScript errors.

- [ ] **Step 8: Commit (submodule)**

```bash
cd gin-container
git add handlers.go main.go repository.go README.md
git commit -m "feat: /me/notification-credits routes + notifier wiring (#23)

Adds GET ids / POST upsert / DELETE for opt-in credits. Notifier
starts only when NOTIFIER_ENABLED=true so this commit is safe to
ship while we still need to register the WeChat template."
git push -u origin feat/issue-23-wechat-push
```

- [ ] **Step 9: Commit (main repo: Hono routes + submodule pointer bump)**

Back in the cantabile root:

```bash
cd /home/work/zcpua/cantabile
git add src/server/routes/me.ts src/server/repository.ts gin-container
git commit -m "feat(api): mirror /me/notification-credits in Hono + bump gin-container (#23)

Bumps the gin-container submodule to include the WeChat push client,
notifier, and credit routes. Adds equivalent Hono routes so the
Next.js Workers deployment exposes the same surface."
```

---


### Task 7: Mini-program API client + credit store

**Repo:** `forenote-mini` submodule

**Files:**
- Modify: `forenote-mini/src/services/api.ts`
- Modify: `forenote-mini/src/store/index.ts`

**Interfaces:**
- Consumes: nothing (defines new fetch helpers + cache)
- Produces:
  - `SaleState` TypeScript union
  - `ApiPerformance.saleState?: SaleState | null`
  - `apiNotificationCreditIds(): Promise<{ ids: string[] }>`
  - `apiAddNotificationCredit(id: string): Promise<{ ok: true }>`
  - `apiRemoveNotificationCredit(id: string): Promise<{ ok: true }>`
  - `isNotificationCreditActive(id: string): boolean`
  - `hydrateNotificationCredits(): Promise<void>`
  - `setNotificationCredit(id: string, active: boolean): void` (optimistic local update)

- [ ] **Step 1: Extend the Performance API type**

Edit `forenote-mini/src/services/api.ts`. After the `BASE` constant, add:

```ts
export type SaleState =
  | "unknown"
  | "pre_sale"
  | "on_sale"
  | "sold_out"
  | "cancelled"
  | "ended"
```

Add `saleState?: SaleState | null` to the `ApiPerformance` type, right next to `saleStatus`.

- [ ] **Step 2: Add credit API functions**

At the bottom of `forenote-mini/src/services/api.ts`, after the favorites helpers, append:

```ts
// ---- Notification credits ----
export const apiNotificationCreditIds = () =>
  api.get<{ ids: string[] }>(`${BASE}/me/notification-credits/ids`)

export const apiAddNotificationCredit = (id: string, kind = "on_sale") =>
  api.post<{ ok: true }>(`${BASE}/me/notification-credits/${encodeURIComponent(id)}`, { kind })

export const apiRemoveNotificationCredit = (id: string, kind = "on_sale") =>
  api.del<{ ok: true }>(`${BASE}/me/notification-credits/${encodeURIComponent(id)}?kind=${encodeURIComponent(kind)}`)
```

- [ ] **Step 3: Mirror the cache in store/index.ts**

Edit `forenote-mini/src/store/index.ts`. Below the favorites block, add a parallel block:

```ts
// ---- Notification credits (开票提醒) ----
// Same shape as favorites: cache the id set, hydrate on login, optimistic
// updates. The credit is "active" while consumed_at and failed_at are NULL
// on the server — once the push fires, the server marks it consumed and the
// next hydrate drops it from the cache (button label resets to default).
let creditCache = new Set<string>()

export function isNotificationCreditActive(id: string): boolean {
  return creditCache.has(id)
}

export async function hydrateNotificationCredits(): Promise<void> {
  try {
    const { ids } = await apiNotificationCreditIds()
    creditCache = new Set(ids)
    emit()
  } catch {
    // 未登录:保持空
  }
}

/**
 * 乐观地把一条演出标记为"已开启开票提醒"。失败回滚并 toast。返回切换后的状态。
 * 这里的写入仅在 requestSubscribeMessage 取得 accept 后才会被调用,所以"active=true"是常态用法。
 */
export function setNotificationCredit(id: string, active: boolean): boolean {
  const prev = creditCache.has(id)
  if (active) creditCache.add(id)
  else creditCache.delete(id)
  emit()

  const req = active ? apiAddNotificationCredit(id) : apiRemoveNotificationCredit(id)
  req.catch(() => {
    if (active) creditCache.delete(id)
    else if (prev) creditCache.add(id)
    emit()
    Taro.showToast({ title: "操作失败,请稍后再试", icon: "none" })
  })
  return active
}
```

Add to the imports at the top of the file:

```ts
import { apiAddNotificationCredit, apiNotificationCreditIds, apiRemoveNotificationCredit } from "../services/api"
```

In the existing `logout()` function, clear the new cache too:

```ts
export function logout() {
  Taro.removeStorageSync(USER_KEY)
  favCache = new Set()
  creditCache = new Set()
  emit()
}
```

- [ ] **Step 4: Hydrate on app start / login**

Find where `hydrateFavorites()` is called (likely `forenote-mini/src/app.tsx` or `services/auth.ts`). Add a parallel call to `hydrateNotificationCredits()` immediately after.

Search:

Run: `grep -rn "hydrateFavorites" forenote-mini/src/`
Expected: 1-2 call sites. Add `hydrateNotificationCredits()` right after each `hydrateFavorites()` call. Wrap both in `Promise.allSettled` if convenient — neither call should block the other on failure.

- [ ] **Step 5: TypeScript check**

Run: `cd forenote-mini && npx tsc --noEmit`
Expected: zero errors.

If the mini-program project does not have `tsc --noEmit` wired, run its build:

Run: `cd forenote-mini && npm run build:weapp` (or the equivalent in `package.json`)
Expected: build succeeds.

- [ ] **Step 6: Commit (in the submodule)**

```bash
cd forenote-mini
git checkout -b feat/issue-23-remind-button
git add src/services/api.ts src/store/index.ts src/app.tsx  # (or wherever hydrate is wired)
git commit -m "feat: notification-credit API client + store (#23)

Mirrors the favorites cache pattern. Detail-page UI lands in the
next commit."
```

---

### Task 8: Detail-page "提醒我开票" button

**Repo:** `forenote-mini` submodule, same branch

**Files:**
- Modify: `forenote-mini/src/pages/detail/index.tsx`
- Modify: `forenote-mini/src/pages/detail/index.scss`
- Modify: `forenote-mini/src/store/performances.ts` (only if Performance type needs `saleState` flowed through)
- Modify: `forenote-mini/src/types/index.ts` (to add `saleState` on the local `Performance` interface)
- Modify: `forenote-mini/src/services/auth.ts` or `forenote-mini/config/index.ts` (template-id env var)

**Interfaces:**
- Consumes: types + helpers from Task 7
- Produces: detail-page UI button

- [ ] **Step 1: Add `saleState` to the local Performance interface**

Edit `forenote-mini/src/types/index.ts`. Add to `Performance`:

```ts
export interface Performance {
  // ... existing ...
  saleState?: "unknown" | "pre_sale" | "on_sale" | "sold_out" | "cancelled" | "ended"
}
```

If the local type is built from `ApiPerformance` via a mapper (likely in `src/store/performances.ts`), ensure the mapper carries `saleState` through:

Run: `grep -n "saleStatus\|saleState\|priceFrom" forenote-mini/src/store/performances.ts`
Expected: shows the existing mapper. Add `saleState: api.saleState ?? "unknown"` in the same spot you see other field copies.

- [ ] **Step 2: Wire the template id env var**

Edit `forenote-mini/config/index.ts` (or the dev/prod variants under `config/`). Inject the env into Taro defines, matching how `WX_CLOUD_ENV` is exposed:

```ts
defineConstants: {
  __APP_WX_CLOUD_ENV__: JSON.stringify(process.env.TARO_APP_WX_CLOUD_ENV || ""),
  __APP_WX_CLOUD_SERVICE__: JSON.stringify(process.env.TARO_APP_WX_CLOUD_SERVICE || ""),
  __APP_ONSALE_TMPL_ID__: JSON.stringify(process.env.TARO_APP_ONSALE_TMPL_ID || ""),
},
```

In `src/services/api.ts`, export the constant:

```ts
export const ONSALE_TMPL_ID = __APP_ONSALE_TMPL_ID__
```

Document the env var in `forenote-mini/README.md` under the existing env section.

- [ ] **Step 3: Add the button + handler in detail/index.tsx**

Edit `forenote-mini/src/pages/detail/index.tsx`.

Imports at the top:

```ts
import { isNotificationCreditActive, setNotificationCredit, subscribe } from "../../store"
import { ONSALE_TMPL_ID } from "../../services/api"
```

Add a state hook near the other `useState` calls:

```ts
const [remindActive, setRemindActive] = useState(isNotificationCreditActive(id))
useEffect(() => {
  const unsub = subscribe(() => setRemindActive(isNotificationCreditActive(id)))
  return () => { unsub() }
}, [id])
```

Add the handler near `onFav`:

```ts
const onRemind = async () => {
  if (!getOpenid()) {
    Taro.navigateTo({ url: "/pages/login/index" })
    return
  }
  if (!ONSALE_TMPL_ID) {
    Taro.showToast({ title: "提醒功能未配置", icon: "none" })
    return
  }
  if (remindActive) {
    // Already armed; treat tap as a confirm. No-op or could open a help modal.
    Taro.showToast({ title: "已设置开票提醒", icon: "none" })
    return
  }
  try {
    const res = await Taro.requestSubscribeMessage({ tmplIds: [ONSALE_TMPL_ID] })
    if (res[ONSALE_TMPL_ID] !== "accept") {
      Taro.showToast({ title: "未开启提醒", icon: "none" })
      return
    }
    setNotificationCredit(perf.id, true)
    Taro.showToast({ title: "已设置开票提醒", icon: "success" })
  } catch (err) {
    console.warn("[remind] requestSubscribeMessage", err)
    Taro.showToast({ title: "授权失败,请重试", icon: "none" })
  }
}
```

Render the button conditionally. Inside the bottom action bar (look for the existing `onFav` button area), add:

```tsx
{(perf.saleState === "pre_sale" || perf.saleState === "unknown") && (
  <Button
    className={`detail__remind ${remindActive ? "detail__remind--on" : ""}`}
    onClick={onRemind}
    disabled={remindActive}
  >
    <Icon name="bell" />
    <Text>{remindActive ? "已设置开票提醒" : "提醒我开票"}</Text>
  </Button>
)}
```

(If `Icon` does not have a `bell` variant in `forenote-mini/src/components/Icon`, drop the icon and keep the `Text` only — do not block on the icon library here.)

- [ ] **Step 4: Style the button**

Edit `forenote-mini/src/pages/detail/index.scss`. Append:

```scss
.detail__remind {
  display: inline-flex;
  align-items: center;
  gap: 8rpx;
  padding: 0 24rpx;
  height: 72rpx;
  border-radius: 36rpx;
  background: var(--accent-soft, #fef3c7);
  color: var(--accent, #b45309);
  font-size: 28rpx;
  font-weight: 500;
}

.detail__remind--on {
  background: var(--surface-subtle, #e5e7eb);
  color: var(--muted, #6b7280);
}
```

(Use the files existing CSS-variable names if these dont match.)

- [ ] **Step 5: Build the mini-program**

Run: `cd forenote-mini && npm run build:weapp`
Expected: build succeeds with zero errors.

Smoke check the produced bundle for the button label:

Run: `grep -r "提醒我开票" forenote-mini/dist/ 2>/dev/null | head -2`
Expected: at least one match (the label made it into the output).

- [ ] **Step 6: Commit (in the submodule)**

```bash
cd forenote-mini
git add src/pages/detail/index.tsx src/pages/detail/index.scss \
        src/types/index.ts src/store/performances.ts \
        src/services/api.ts config/index.ts README.md
git commit -m "feat(detail): 提醒我开票 button with 订阅消息 consent (#23)

Shows when saleState is pre_sale or unknown. Tap fires
Taro.requestSubscribeMessage; on accept, registers a credit
server-side. Subsequent taps no-op until the credit is consumed."
git push -u origin feat/issue-23-remind-button
```

- [ ] **Step 7: Bump submodule pointer in cantabile**

```bash
cd /home/work/zcpua/cantabile
git add forenote-mini
git commit -m "chore: bump forenote-mini for 开票提醒 UI (#23)"
```

---

### Task 9: Migration apply + scrapers deployed (rollout phase 1+2)

**Repo:** cantabile (deploy-time task, no new code)

**Files:**
- None — this task is the deploy + observation step.

**Interfaces:** none

- [ ] **Step 1: Push the supermodule branch**

From the cantabile root, push the branch that contains commits from Tasks 1-3 + 6 + 8:

```bash
cd /home/work/zcpua/cantabile
git push -u origin <current-feature-branch>
```

Open a PR titled `feat: invoice info + remind on sale (#23)`. PR body should list: Task 1 schema, Task 2 mappers, Task 3 scraper wiring, Task 6 Hono routes + gin-container bump, Task 8 mini-program bump.

- [ ] **Step 2: After PR merge, run the migration in Supabase production**

Run from the merged main branch:

```bash
DATABASE_URL=<prod-supabase-pooler-url> npm run db:migrate:pg
```

Expected output: drizzle-kit reports applying `0005_sale_state.sql`. Verify in Supabase Studio:
- `performances` has a `sale_state` column with default `unknown` on all rows
- `sale_state_transitions` and `notification_credits` tables exist
- the migration is recorded in `__drizzle_migrations` (or wherever drizzle stores its history table)

- [ ] **Step 3: Run the supabase-to-D1 sync**

Run: `npm run sync:supabase-to-d1`
Expected: D1 mirror picks up the new `sale_state` column and rebuilds the local sqlite. Verify with `npx wrangler d1 execute cantabile --remote --command "SELECT count(*) FROM performances WHERE sale_state IS NOT NULL;"` — should equal total performance count.

- [ ] **Step 4: Run all four scrapers once**

```bash
npm run sync:performances
```

Expected: completes without errors. For each scraper, the first run after deploy should backfill `sale_state` on existing rows (no transitions written because all rows are stepping from `unknown`-by-default to the scrapers mapped value — but the first-insert suppression in Task 3 means existing rows had `prev_state = unknown` already so transitions ARE written for them, e.g. `unknown → on_sale`). Plan acknowledges this: those transitions go into the queue with `notified_at = NULL`, but the notifier is still disabled, so no pushes go out. After Task 10s flip, the queue is drained explicitly via SQL (Step 4 of Task 10) so they do not become a phantom backlog.

- [ ] **Step 5: Inspect transition + unknown rates**

After at least one full scrape:

```sql
-- distribution of sale_state in performances
SELECT sale_state, count(*) FROM performances GROUP BY sale_state;

-- recent transitions
SELECT from_state, to_state, count(*)
FROM sale_state_transitions
WHERE detected_at > now() - interval 1 day
GROUP BY from_state, to_state;

-- CHNCPA unknown rate (sanity)
SELECT count(*) FROM performances
WHERE source_name = CHNCPA AND sale_state = unknown;
```

If the CHNCPA `unknown` count is high (say >30% of rows), inspect the stderr logs from the scraper for "unknown saleStatus mapping" lines and extend `chncpaSaleState` keyword list with a follow-up commit before proceeding.

- [ ] **Step 6: Tag the rollout checkpoint**

```bash
git tag rollout/issue-23/phase-2 -m "schema + scrapers live; notifier still gated off"
git push origin rollout/issue-23/phase-2
```

---

### Task 10: Enable notifier + end-to-end verification (rollout phase 3-5)

**Repo:** deploy-time, no code

**Files:** none

**Interfaces:** none

- [ ] **Step 1: Verify the WeChat template is registered**

In 微信公众平台 → 功能 → 订阅消息, confirm the "演出开票提醒" template is approved. Note its tmplId and field names (`thing1` / `time2` / `thing3` — if different, follow up with a 1-line patch to `wechat_push.go` mapping the right field names).

- [ ] **Step 2: Configure env vars in WeChat cloud-hosting (gin-container)**

In the WeChat Cloud Run console for the gin-container service, set:

```
WECHAT_APP_ID=<from 公众平台 → 开发 → 基本配置>
WECHAT_APP_SECRET=<same place>
WECHAT_ONSALE_TMPL_ID=<the tmplId from Step 1>
WECHAT_MINIPROGRAM_STATE=formal
NOTIFIER_ENABLED=false          # still gated off
NOTIFIER_TICK_SECONDS=300
NOTIFIER_BATCH_SIZE=100
NOTIFIER_ATTEMPT_CAP=3
```

Redeploy. Verify the service comes up healthy:

Run (from your laptop with the service URL): `curl -s https://<service-host>/api/v2/health`
Expected: `{"ok":true,"dbType":"postgres"}`

The new `/me/notification-credits/*` routes will return 401 without `X-WX-OPENID`; smoke-test from a WeChat dev tool client to confirm they return `{ids:[]}` for a fresh user.

- [ ] **Step 3: Ship the mini-program update**

Build with `TARO_APP_ONSALE_TMPL_ID=<tmplId>` set:

```bash
cd forenote-mini
TARO_APP_ONSALE_TMPL_ID=<tmplId> npm run build:weapp
```

Upload through 微信开发者工具, submit for review, release as a new version.

After release, ask a tester to:
1. Open the app
2. Open any performance whose `saleState` is `pre_sale` or `unknown`
3. Tap "提醒我开票"
4. See the system dialog; tap 允许
5. Verify the button now reads "已设置开票提醒"
6. Confirm `notification_credits` has the row (SQL check):
   ```sql
   SELECT * FROM notification_credits WHERE openid = <tester openid> ORDER BY granted_at DESC LIMIT 1;
   ```

- [ ] **Step 4: Drain pre-rollout transitions**

Before flipping the kill switch, drain any transitions that accumulated during phases 1-2 — those represent state changes the notifier was not yet meant to act on:

```sql
UPDATE sale_state_transitions
SET notified_at = now()
WHERE notified_at IS NULL
  AND detected_at < now();
```

This is one-shot and irreversible. Its safe because:
- No credits could have existed for transitions before the mini-program release (no opt-in path)
- The single-statement update inside Supabase is atomic; the next notifier tick will see an empty queue

- [ ] **Step 5: Flip the kill switch**

In WeChat Cloud Run, set `NOTIFIER_ENABLED=true` and redeploy (or hot-restart). Verify the boot log shows the notifier ticker starting (look for the absence of "notifier disabled" and presence of the tickers first-tick log line).

- [ ] **Step 6: End-to-end smoke test**

Pick a real or test performance currently in `pre_sale`:

```sql
-- find a candidate
SELECT id, title, sale_state FROM performances
WHERE sale_state = pre_sale LIMIT 5;
```

From the mini-program, tap "提醒我开票" on that performance with a test WeChat account.

Manually transition it:

```sql
UPDATE performances SET sale_state = on_sale WHERE id = <chosen-id>;
-- the upsert helper is what normally writes transitions; do it manually here:
INSERT INTO sale_state_transitions (performance_id, from_state, to_state)
VALUES (<chosen-id>, pre_sale, on_sale);
```

Within 5 minutes (one tick), the tester should receive a WeChat 订阅消息. Verify:

```sql
SELECT * FROM notification_credits WHERE performance_id = <chosen-id> AND consumed_at IS NOT NULL;
SELECT notified_at FROM sale_state_transitions
WHERE performance_id = <chosen-id> AND to_state = on_sale
ORDER BY detected_at DESC LIMIT 1;
```

Both should be non-null.

Roll back the manual transition so the data stays clean:

```sql
UPDATE performances SET sale_state = pre_sale WHERE id = <chosen-id>;
```

(The transitions log keeps the audit trail; thats intentional.)

- [ ] **Step 7: Tag the launch**

```bash
git tag rollout/issue-23/launched -m "notifier live, end-to-end verified"
git push origin rollout/issue-23/launched
```

Comment on issue #23 with the launch summary and close it.

---

## Self-Review

Spec coverage:

- [x] §3.1 Postgres schema → Task 1 Steps 2, 4
- [x] §3.2 SQLite mirror → Task 1 Steps 3, 5
- [x] §3.3 Credit reactivation upsert → Task 6 Step 1 (`upsertNotificationCredit`)
- [x] §4 Per-scraper mapping → Task 2 (pure functions) + Task 3 (wiring)
- [x] §4.3 First-insert suppression → Task 3 Step 1 + Task 3 Step 2 test
- [x] §5.1-5.2 Notifier module layout + tick loop → Task 5
- [x] §5.3 Access token cache → Task 4 Steps 3 + tests
- [x] §5.4 Push payload shape → Task 4 Step 3 (`send` method)
- [x] §5.5 Error policy → Task 4 (errcode mapping) + Task 5 (handling)
- [x] §5.6 Concurrency / QPS throttle → Task 5 (`time.Sleep(50ms)`)
- [x] §5.7 Env vars → Task 6 README + Task 10 deploy
- [x] §6.1 Performance type extension → Task 7
- [x] §6.2 Detail-page button → Task 8
- [x] §6.3 Consent handler → Task 8
- [x] §6.4 New API routes → Task 6
- [x] §6.5 UX gotcha (requestSubscribeMessage auto-accept) → Task 8 README note + Step 3 comment
- [x] §7 Tests → Task 2 mapping tests, Task 3 transition tests, Task 4 push-client tests, Task 5 notifier tests
- [x] §8 5-phase rollout → Tasks 9 + 10
- [x] §9 WeChat prerequisites → Task 10 Step 1-2

Placeholder scan: searched for "TBD", "TODO", "FIXME", "fill in" — none present.

Type consistency: `SaleState` union used identically across Task 1 (TS), Task 2 (mapper return), Task 5 (Go column tag), Task 7 (mini-program type), Task 8 (UI guards).

---

## Execution Handoff

Plan complete and saved to `docs/superpowers/plans/2026-06-30-invoice-info.md`. Two execution options:

**1. Subagent-Driven (recommended)** — I dispatch a fresh subagent per task, review between tasks, fast iteration.

**2. Inline Execution** — Execute tasks in this session using executing-plans, batch execution with checkpoints.

Which approach?

