import { Hono } from "hono";
import type { AppEnv } from "../env";
import { wechatAuth } from "../middleware/wechat-auth";
import {
  addCollection,
  ensureUser,
  findPerformanceById,
  findUser,
  listCollection,
  listCollectionPerformances,
  listCreditIds,
  removeCollection,
  removeCredit,
  upsertCredit,
  upsertUser,
} from "../repository";

// All `/me/*` routes require a verified openid from the cloud-hosting gateway.
export const meRoute = new Hono<AppEnv>()
  .use("*", wechatAuth)
  // Login: the gateway proves openid. WeChat no longer returns profile info
  // here, so we only ensure the user row exists and never touch nickname/avatar
  // (which the user sets later via /profile). Avoids wiping saved values.
  .post("/login", async (c) => {
    const openid = c.get("openid");
    const unionid = c.get("unionid") ?? null;
    await ensureUser(c.get("db"), c.get("dbType"), { openid, unionid });
    const user = await findUser(c.get("db"), c.get("dbType"), openid);
    return c.json({ openid, unionid, user });
  })

  .get("/profile", async (c) => {
    const openid = c.get("openid");
    const user = await findUser(c.get("db"), c.get("dbType"), openid);
    return c.json({ openid, user: user ?? null });
  })

  // Update profile: nickname always; avatar when a base64 data URL is sent
  // (chooseAvatar gives a temp file, the client reads + base64-encodes it).
  .patch("/profile", async (c) => {
    const openid = c.get("openid");
    const unionid = c.get("unionid") ?? null;
    const body = await c.req.json().catch(() => ({}) as Record<string, unknown>);
    const nickname = typeof body.nickname === "string" ? body.nickname.trim().slice(0, 32) : undefined;

    const existing = await findUser(c.get("db"), c.get("dbType"), openid);
    let avatarUrl: string | undefined;
    let avatarFileId: string | null | undefined;
    if (typeof body.avatarBase64 === "string" && body.avatarBase64) {
      const decoded = decodeDataUrl(body.avatarBase64);
      if (!decoded) return c.json({ error: "invalid avatar" }, 400);
      const ext = decoded.contentType === "image/png" ? "png" : "jpg";
      const result = await c.get("uploadAvatar")({
        bytes: decoded.bytes,
        contentType: decoded.contentType,
        key: `avatars/${openid}.${ext}`,
      });
      avatarUrl = result.url;
      avatarFileId = result.fileId ?? null;
    }

    await upsertUser(c.get("db"), c.get("dbType"), {
      openid,
      unionid,
      nickname: nickname ?? existing?.nickname ?? null,
      avatarUrl: avatarUrl ?? existing?.avatarUrl ?? null,
      avatarFileId: avatarFileId ?? existing?.avatarFileId ?? null,
    });
    const user = await findUser(c.get("db"), c.get("dbType"), openid);
    return c.json({ openid, user });
  })

  // Lightweight: returns just the performance ids so the client can render
  // toggle state without re-fetching every detail page.
  .get("/favorites/ids", async (c) => {
    const rows = await listCollection(c.get("db"), c.get("dbType"), c.get("openid"), "favorites");
    return c.json({ ids: rows.map((r) => r.performanceId) });
  })
  .get("/tickets/ids", async (c) => {
    const rows = await listCollection(c.get("db"), c.get("dbType"), c.get("openid"), "tickets");
    return c.json({ ids: rows.map((r) => r.performanceId) });
  })

  // Joined: returns the full performance rows for the profile lists.
  .get("/favorites", async (c) => {
    const rows = await listCollectionPerformances(c.get("db"), c.get("dbType"), c.get("openid"), "favorites");
    return c.json(rows);
  })
  .get("/tickets", async (c) => {
    const rows = await listCollectionPerformances(c.get("db"), c.get("dbType"), c.get("openid"), "tickets");
    return c.json(rows);
  })

  .post("/favorites/:performanceId", async (c) => {
    const performanceId = c.req.param("performanceId");
    const perf = await findPerformanceById(c.get("db"), c.get("dbType"), performanceId);
    if (!perf) return c.json({ error: "performance not found" }, 404);
    await upsertUser(c.get("db"), c.get("dbType"), { openid: c.get("openid"), unionid: c.get("unionid") ?? null });
    await addCollection(c.get("db"), c.get("dbType"), c.get("openid"), performanceId, "favorites");
    return c.json({ ok: true });
  })
  .delete("/favorites/:performanceId", async (c) => {
    await removeCollection(c.get("db"), c.get("dbType"), c.get("openid"), c.req.param("performanceId"), "favorites");
    return c.json({ ok: true });
  })

  .post("/tickets/:performanceId", async (c) => {
    const performanceId = c.req.param("performanceId");
    const perf = await findPerformanceById(c.get("db"), c.get("dbType"), performanceId);
    if (!perf) return c.json({ error: "performance not found" }, 404);
    await upsertUser(c.get("db"), c.get("dbType"), { openid: c.get("openid"), unionid: c.get("unionid") ?? null });
    await addCollection(c.get("db"), c.get("dbType"), c.get("openid"), performanceId, "tickets");
    return c.json({ ok: true });
  })
  .delete("/tickets/:performanceId", async (c) => {
    await removeCollection(c.get("db"), c.get("dbType"), c.get("openid"), c.req.param("performanceId"), "tickets");
    return c.json({ ok: true });
  })

  // Notification credits: one per user tap of "提醒我开票". The mini-program
  // client only ever sends `kind: "on_sale"` for v1; the schema leaves room
  // to add cancellation alerts later without a route change.
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
    const kind = typeof body.kind === "string" && body.kind ? body.kind : "on_sale";
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

// Parse a `data:image/...;base64,xxx` URL into raw bytes. Caps at ~2MB to
// reject oversized uploads before they reach object storage.
function decodeDataUrl(dataUrl: string): { bytes: Uint8Array; contentType: string } | null {
  const match = /^data:(image\/(?:png|jpeg|jpg|webp));base64,(.+)$/.exec(dataUrl);
  if (!match) return null;
  const contentType = match[1] === "image/jpg" ? "image/jpeg" : match[1];
  const binary = atob(match[2]);
  if (binary.length > 2 * 1024 * 1024) return null;
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
  return { bytes, contentType };
}
