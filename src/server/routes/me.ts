import { Hono } from "hono";
import type { AppEnv } from "../env";
import { wechatAuth } from "../middleware/wechat-auth";
import {
  addCollection,
  findPerformanceById,
  findUser,
  listCollection,
  listCollectionPerformances,
  removeCollection,
  upsertUser,
} from "../repository";

// All `/me/*` routes require a verified openid from the cloud-hosting gateway.
export const meRoute = new Hono<AppEnv>()
  .use("*", wechatAuth)

  // Login: gateway already proves openid; client may pass nickname/avatar
  // captured via wx.getUserProfile so we keep them on the user record.
  .post("/login", async (c) => {
    const openid = c.get("openid");
    const unionid = c.get("unionid") ?? null;
    const body = await c.req.json().catch(() => ({}) as Record<string, unknown>);
    const nickname = typeof body.nickname === "string" ? body.nickname : null;
    const avatarUrl = typeof body.avatarUrl === "string" ? body.avatarUrl : null;
    await upsertUser(c.get("db"), c.get("dbType"), { openid, unionid, nickname, avatarUrl });
    const user = await findUser(c.get("db"), c.get("dbType"), openid);
    return c.json({ openid, unionid, user });
  })

  .get("/profile", async (c) => {
    const openid = c.get("openid");
    const user = await findUser(c.get("db"), c.get("dbType"), openid);
    return c.json({ openid, user: user ?? null });
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
  });
