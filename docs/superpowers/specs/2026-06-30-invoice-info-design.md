# 开票信息与开票提醒 — 设计文档

- **Issue:** [#23 增加开票信息](https://github.com/zcpua/cantabile/issues/23)
- **Date:** 2026-06-30
- **Status:** Draft — awaiting implementation
- **Scope:** Postgres + D1 schema, 4 scrapers, `gin-container` notifier, `forenote-mini` UI

## 1. 背景与目标

抓取应区分「已开票 / 未开票」状态;当用户关注或收藏的演出从未开票切换到已开票时,通过微信订阅消息提醒用户。

当前问题:`performances.sale_status` 是各抓取脚本写入的自由文本(`售票中`/`即将开售`/`已售罄`/`演出取消`/CHNCPA 任意中文串…),没有归一化的机器可读字段,无法可靠触发提醒。

目标:

1. 给 `performances` 加一个归一化的 `sale_state` 枚举,4 个抓取脚本各自映射各自上游的售票状态。
2. 当一条演出从 `pre_sale`/`unknown` 切到 `on_sale` 时,向**已显式点击"提醒我开票"**的用户推送一条微信订阅消息。
3. 显式 opt-in:订阅消息每条都要用户提前点一下,不依附 收藏/关注。

非目标(v1 不做):

- 取消提醒(`→ cancelled`)。需要单独模板与单独 consent,后续单独立项。
- 站内徽标 / "新开票" 列表 digest。
- 公众号回退通道(没装小程序的用户)。
- 部署前已经是 `on_sale` 的存量演出的"补推"。

## 2. 整体架构

跨三个子系统的改动:

```
                  scrape (every ~hour)
       ┌─────────────────────────────────┐
       ▼                                 │
┌────────────────┐    upsert + diff      │
│  scripts/sync- │ ─────────────────────►│  Postgres
│  *-perf.mjs    │                       │  ┌──────────────────────────┐
└────────────────┘                       │  │ performances (+sale_state)│
                                         │  │ sale_state_transitions    │ append-only
                                         │  │ notification_credits      │ user opt-ins
                                         │  └──────────────────────────┘
                                         │            ▲
                                         │            │ POST /me/notification-credits
                                         │            │
┌────────────────┐     5-min tick        │  ┌──────────────────────────┐
│ gin-container  │ ◄─────────────────────┘  │ forenote-mini            │
│   notifier.go  │       scan + push        │   detail page            │
│   wechat_push  │ ─────────────────────►   │   "提醒我开票" button     │
└────────────────┘   subscribeMessage.send  └──────────────────────────┘
       │                                                ▲
       │                                                │ requestSubscribeMessage
       └─►  api.weixin.qq.com                           │
                                                        ▼
                                                   WeChat user
```

设计决策摘要(brainstorming 阶段确认):

| # | 决策 | 取值 |
|---|---|---|
| Q1 | 提醒通道 | **微信订阅消息** |
| Q2 | 归一化信号 | **新增 `sale_state` 枚举列**(保留 `sale_status` 显示文本) |
| Q3 | Opt-in UX | **详情页独立按钮 "提醒我开票"** |
| Q4 | 触发条件 | **严格:仅 `pre_sale`/`unknown` → `on_sale`** |
| Q5 | 推送时机 | **独立 notifier job**(`sale_state_transitions` log) |

## 3. 数据模型

### 3.1 Postgres schema(`src/db/schema.pg.ts` + `drizzle/pg/0005_*.sql`)

```sql
-- 现有 performances 表新增列
ALTER TABLE performances ADD COLUMN sale_state text NOT NULL DEFAULT 'unknown';
CREATE INDEX performances_sale_state_idx ON performances (sale_state);
-- 取值: 'unknown' | 'pre_sale' | 'on_sale' | 'sold_out' | 'cancelled' | 'ended'
-- 用文本而非 pg enum,方便 D1/SQLite 镜像

-- 售票状态变更日志:append-only,每观察到一次 state change 写一行
CREATE TABLE sale_state_transitions (
  id              bigserial PRIMARY KEY,
  performance_id  text NOT NULL REFERENCES performances(id) ON DELETE CASCADE,
  from_state      text NOT NULL,
  to_state        text NOT NULL,
  detected_at     timestamptz NOT NULL DEFAULT now(),
  notified_at     timestamptz,           -- NULL = 未发完;非 NULL = 已 drain
  UNIQUE (performance_id, from_state, to_state, detected_at)
);
CREATE INDEX sale_state_transitions_pending_idx
  ON sale_state_transitions (to_state, notified_at)
  WHERE notified_at IS NULL;

-- 用户开票提醒授权:每点一次"提醒我开票"得一行
CREATE TABLE notification_credits (
  openid          text NOT NULL REFERENCES users(openid) ON DELETE CASCADE,
  performance_id  text NOT NULL REFERENCES performances(id) ON DELETE CASCADE,
  kind            text NOT NULL,         -- 当前仅 'on_sale',留扩展空间
  granted_at      timestamptz NOT NULL DEFAULT now(),
  consumed_at     timestamptz,           -- NULL = 未消费
  attempts        integer NOT NULL DEFAULT 0,
  failed_at       timestamptz,           -- 重试上限后标记
  PRIMARY KEY (openid, performance_id, kind)
);
CREATE INDEX notification_credits_pending_idx
  ON notification_credits (performance_id, kind)
  WHERE consumed_at IS NULL;
```

### 3.2 D1/SQLite 镜像(`src/db/schema.sqlite.ts` + `drizzle/d1/*.sql`)

字段同上,类型映射:
- `bigserial` → `integer primary key autoincrement`
- `timestamptz` → `text`(ISO8601)或 `integer`(epoch ms),沿用现有约定
- `IS DISTINCT FROM` 在 SQLite 中无法使用,scraper 端改写成 `coalesce(prev,'') <> coalesce(next,'')`

### 3.3 Credit 重新激活

PK 是 `(openid, performance_id, kind)`,所以同一个用户重复点 "提醒我开票" 用 upsert:

```sql
INSERT INTO notification_credits (openid, performance_id, kind)
VALUES ($1, $2, 'on_sale')
ON CONFLICT (openid, performance_id, kind) DO UPDATE
SET granted_at = now(), consumed_at = NULL, attempts = 0, failed_at = NULL;
```

覆盖边界场景:用户曾被推送过 → 演出 saleState 因数据修正回退到 `pre_sale` → 用户再点一次按钮 → 凭据复活,等下次 transition 时再推一次。也满足微信"每个允许只能用一次"的规则。

## 4. 抓取脚本变更

### 4.1 共享映射器(`scripts/lib/sale-state.mjs`)

```js
export const SALE_STATES = ["unknown", "pre_sale", "on_sale", "sold_out", "cancelled", "ended"];
```

每个抓取脚本(`sync-bjch`/`sync-shso`/`sync-shch`/`sync-chncpa`)在文件内导出自己的 `saleState(...)` 映射函数。

### 4.2 各源映射

| Scraper | 上游字段                                   | → sale_state |
|---------|---------------------------------------------|--------------|
| bjch    | `eventSaleState=2` / `projectSaleState=2`   | `on_sale`    |
|         | `eventSaleState=1` / `projectSaleState=1`   | `pre_sale`   |
|         | `eventSaleState=3` / `projectSaleState=3`   | `sold_out`   |
|         | 其他                                        | `unknown`    |
| shso    | `saleType="售票中"`                         | `on_sale`    |
|         | `fullCnName` 含 `演出取消`                  | `cancelled`  |
|         | 其他 `saleType`                             | `unknown`    |
| shch    | `eventSaleState=2`                          | `on_sale`    |
|         | `eventSaleState=1`                          | `pre_sale`   |
|         | `eventSaleState=3`                          | `sold_out`   |
|         | 其他                                        | `unknown`    |
| chncpa  | `saleStatusName` 含 `售票`/`开票`           | `on_sale`    |
|         | 含 `预售`/`即将`                            | `pre_sale`   |
|         | 含 `售罄`/`无票`                            | `sold_out`   |
|         | 含 `取消`                                   | `cancelled`  |
|         | 含 `结束`                                   | `ended`      |
|         | 其他                                        | `unknown` + 写 stderr |

CHNCPA 的关键词集合是判别依据,有 stderr 日志触发持续维护。

### 4.3 upsert + transition 写入(关键)

各 scraper 现有的 `savePerformance(...)` 改为一个事务:

```sql
BEGIN;

-- 1) 读旧 state
WITH old AS (SELECT sale_state FROM performances WHERE id = $1)

-- 2) upsert(现有逻辑 + 新 sale_state 列)
INSERT INTO performances (id, ..., sale_status, sale_state) VALUES (...)
ON CONFLICT (id) DO UPDATE
SET ..., sale_state = excluded.sale_state
RETURNING (SELECT sale_state FROM old) AS prev_state, sale_state AS next_state;

-- 3) 仅当 state 真的变化、且不是首次见到这条演出时,写 transition
INSERT INTO sale_state_transitions (performance_id, from_state, to_state)
SELECT $1, $prev_state, $next_state
WHERE $prev_state IS DISTINCT FROM $next_state
  AND $prev_state IS NOT NULL
ON CONFLICT DO NOTHING;

COMMIT;
```

关键不变量:

- **首插抑制(`prev_state IS NOT NULL`)。** 演出第一次被抓到时不写 transition。否则每个新出现的 `on_sale` 演出都会触发一次"开票",但当时还没有任何用户点过按钮,毫无意义,也会污染审计日志。
- **抓取重试幂等。** unique index `(performance_id, from_state, to_state, detected_at)` + `ON CONFLICT DO NOTHING`,同一秒重复跑同一脚本不会重复写。

D1/SQLite 等价写法用两条 SQL 在事务里完成,`IS DISTINCT FROM` 换 `coalesce(prev,'') <> coalesce(next,'')`。

## 5. Notifier 服务(gin-container)

### 5.1 模块布局

```
gin-container/
  notifier.go        -- ticker loop, transition scan, fan-out
  wechat_push.go     -- access_token 缓存 + subscribeMessage.send
  notifier_test.go
  wechat_push_test.go
```

`main.go` 在启动时起一条 goroutine 跑 `notifier.run(ctx)`,5 分钟一次。

### 5.2 一次 tick 的伪代码

```go
func (n *notifier) tick(ctx context.Context) error {
    rows, err := n.db.Query(ctx, `
        SELECT t.id, t.performance_id
        FROM sale_state_transitions t
        WHERE t.to_state = 'on_sale' AND t.notified_at IS NULL
        ORDER BY t.detected_at
        LIMIT 100
    `)
    for _, t := range transitions {
        creds := n.findCredits(t.performanceID, "on_sale")  // consumed_at IS NULL
        perf := n.findPerformance(t.performanceID)
        for _, c := range creds {
            if err := n.push.send(ctx, c.openid, perf); err != nil {
                n.handleErr(err, c)   // 见 5.5 错误策略
                continue
            }
            n.markCredit(c, time.Now())
        }
        n.markTransition(t.id, time.Now())  // 即使 0 credit 也 drain
    }
}
```

### 5.3 Access token 缓存

```go
type tokenCache struct {
    mu        sync.Mutex
    token     string
    expiresAt time.Time
}

// POST https://api.weixin.qq.com/cgi-bin/token
//   ?grant_type=client_credential&appid=...&secret=...
// 响应:{ access_token, expires_in }  // 一般 7200s
// 我们提前 300 秒刷新
```

### 5.4 推送调用

```go
// POST https://api.weixin.qq.com/cgi-bin/message/subscribe/send?access_token=...
body := map[string]any{
    "touser":      openid,
    "template_id": cfg.OnSaleTmplID,
    "page":        fmt.Sprintf("pages/detail/index?id=%s", perf.ID),
    "data": map[string]any{
        "thing1": map[string]string{"value": truncate(perf.Title, 20)},   // 演出名称
        "time2":  map[string]string{"value": perf.StartsAt.Format("2006年01月02日 15:04")},
        "thing3": map[string]string{"value": truncate(perf.Venue, 20)},   // 场馆
    },
    "miniprogram_state": cfg.MiniprogramState,   // developer|trial|formal
}
```

模板字段 ID(`thing1` / `time2` / `thing3`)依模板在微信公众平台的实际审批结果而定,审批完成后落到 `gin-container/README.md`,代码用 config 读取。

### 5.5 错误策略

| errcode  | 含义                                | 动作 |
|----------|-------------------------------------|------|
| 0        | 成功                                | 标记 credit + transition 完成 |
| 40001/2  | access_token 无效                   | 失效缓存,重试一次 |
| 43101    | 用户拒收 / 未订阅                   | 标记 credit `consumed`(凭据已失效,不重试) |
| 47003    | 模板/数据格式错误                   | log + 标记 transition 完成 + 告警(不阻塞队列) |
| 45009/40 | API 速率限制                        | 退避,transition 不标记,下次 tick 重试 |
| 其他     | 未知                                | log,credit `attempts++`,达到 3 次后置 `failed_at` 并跳过 |

### 5.6 并发与限流

- 单实例 ticker,无需分布式锁(微信云托管单副本)。如未来扩多副本,改用 `SELECT … FOR UPDATE SKIP LOCKED`。
- 订阅消息每账号 50 万/天、~600 QPS。5 分钟一 tick、batch=100、push 之间 `sleep 50ms`,远低于上限。

### 5.7 配置(env)

```
WECHAT_APP_ID=
WECHAT_APP_SECRET=
WECHAT_ONSALE_TMPL_ID=
WECHAT_MINIPROGRAM_STATE=formal   # developer|trial|formal
NOTIFIER_TICK_SECONDS=300
NOTIFIER_BATCH_SIZE=100
NOTIFIER_ENABLED=true             # 紧急 kill switch
```

`NOTIFIER_ENABLED=false` 时 ticker 立即 return,代码在线但不发推送 — 用于灰度和应急停发。

## 6. 小程序(forenote-mini)UI

改动全在 `forenote-mini/src/pages/detail/`(以及 `services/api.ts`、`store/`)。

### 6.1 Performance 类型扩展

```ts
// forenote-mini/src/services/api.ts
export type SaleState =
  | "unknown" | "pre_sale" | "on_sale" | "sold_out" | "cancelled" | "ended";

export interface Performance {
  // ... existing fields ...
  saleStatus?: string | null    // 显示文本(不变)
  saleState?: SaleState | null  // 新增:typed
}
```

`gin-container/models.go` 的 `Performance` 同步加 `SaleState *string \`json:"saleState"\``。

### 6.2 详情页按钮

```tsx
{performance.saleState === "pre_sale" || performance.saleState === "unknown" ? (
  <Button
    className="remind-btn"
    onClick={handleRemindOnSale}
    disabled={alreadySubscribed}
  >
    {alreadySubscribed ? "已设置开票提醒" : "提醒我开票"}
  </Button>
) : null}
```

可见性:

| saleState               | 按钮 | 备注 |
|-------------------------|------|------|
| `pre_sale`              | 显示 | 主用例 |
| `unknown`               | 显示 | 部分抓源默认值 |
| `on_sale`               | 隐藏 | 走现有"购票"按钮 |
| `sold_out` / `cancelled` / `ended` | 隐藏 | |

"已设置" 状态来自新的 `GET /me/notification-credits/ids`,缓存策略与 `favorites`/`tickets` 的 id 列表一致。

### 6.3 Consent handler

```ts
async function handleRemindOnSale() {
  const tmplId = process.env.TARO_APP_ONSALE_TMPL_ID  // build-time injected
  const res = await Taro.requestSubscribeMessage({ tmplIds: [tmplId] })

  if (res[tmplId] !== "accept") {
    Taro.showToast({ title: "未开启提醒", icon: "none" })
    return
  }

  await api.post(`/me/notification-credits/${performance.id}`, { kind: "on_sale" })
  setAlreadySubscribed(true)
  Taro.showToast({ title: "已设置开票提醒", icon: "success" })
}
```

### 6.4 新 API 路由

`src/server/routes/me.ts`(Hono)和 `gin-container/handlers.go`(Gin)各加一份,沿用 `wechatAuth` 中间件:

```
GET    /me/notification-credits/ids           → { ids: [performanceId, ...] }
POST   /me/notification-credits/:performanceId
       body: { kind: "on_sale" }              → { ok: true }
DELETE /me/notification-credits/:performanceId?kind=on_sale → { ok: true }
```

形式上完全 mirror 现有 `/me/favorites` / `/me/tickets`。客户端的 `services/api.ts` 加对应 wrapper。

### 6.5 微信侧 UX 注意

`requestSubscribeMessage` 在用户先前选了"总是保持以上选择"时会自动返回 `accept`,我们与显式点击同等对待。若用户曾选"总是拒绝",`accept` 不会再回来,只能引导用户在系统设置里手动改回 — 文档化即可,无法编程恢复。

## 7. 测试

| 层 | 测试 | 断言 |
|---|---|---|
| `scripts/lib/sale-state.test.mjs` | 各 scraper 映射 | 每个 fixture 落到预期枚举;CHNCPA 未知串 → `unknown` + log |
| Postgres migration test | 首插抑制 | 新插入 `sale_state='on_sale'` 行 → 0 条 transition |
| Postgres migration test | 变更日志 | `pre_sale → on_sale` 写 1 条 transition;同事务重跑 → 0 条新增 |
| `gin-container/notifier_test.go` | happy path | 1 transition × 2 consenting users → 2 次 push,2 credit consumed,1 transition notified |
| `gin-container/notifier_test.go` | 重试 | mock 返 45009 → credit 不消费,transition 不标记 |
| `gin-container/notifier_test.go` | 拒收 | mock 返 43101 → credit 标记 consumed,transition 推进 |
| `gin-container/notifier_test.go` | 重试上限 | 同一 credit 连续 3 次未知错误 → 第 4 次置 `failed_at`,transition 完成 |
| `gin-container/wechat_push_test.go` | token 缓存 | 有效期内不二次拉取;过期重新拉取 |
| 小程序 | 手动 smoke | 真机跑通 accept / reject / 已订阅 三态 |

小程序不上自动化测试 — Taro 测试链路重,订阅消息这一段必须真机走。

## 8. 灰度与上线计划

5 步:

1. **迁移 schema**(Postgres + D1)。`sale_state` 默认 `unknown`,行为不变。验证未破坏现网。
2. **scrapers 发版,带映射。** 下次定时抓取回填 `sale_state`,`sale_state_transitions` 开始累积。无 notifier 消费。观察 24h,根据 `unknown`-rate 调 CHNCPA 关键词。
3. **部署 `gin-container`,`NOTIFIER_ENABLED=false`。** 新 `/me/notification-credits` 路由上线,但 ticker 不发推送。
4. **小程序发版。** 用户开始点 "提醒我开票",credit 入库,仍无推送。监控授权量级,确认无鉴权问题。
5. **翻 `NOTIFIER_ENABLED=true`。** 推送启动。先用一个测试演出端到端验证:测试账号点按钮 → 手工 `UPDATE performances SET sale_state='on_sale' WHERE id=...` → 看 transition log + push 抵达;然后再开全量。

紧急停发:置 `NOTIFIER_ENABLED=false` 即可,代码无需回滚,transition 队列继续累积,恢复后自动 drain。

## 9. 微信侧前置条件(phase 4 之前完成)

- 在微信公众平台 → 功能 → 订阅消息 中申请模板"演出开票提醒"。
- 字段:`演出名称`(thing)、`开票时间`(time)、`场馆`(thing)。
- 模板审批通过后,实际 tmplId 写入 `WECHAT_ONSALE_TMPL_ID`(`gin-container`)与 `TARO_APP_ONSALE_TMPL_ID`(小程序 build env)。
- 确认 `WECHAT_APP_SECRET` 已配置在 `gin-container` 部署环境。

## 10. 显式 out-of-scope

- 取消提醒(`→ cancelled`)单独立项。
- 站内 "新开票" 徽标 / digest 列表。
- 公众号回退通道。
- 部署前已 `on_sale` 的存量演出补推。
