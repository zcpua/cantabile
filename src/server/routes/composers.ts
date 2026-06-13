import { Hono } from "hono";
import type { AppEnv } from "../env";
import { listComposers, findComposerBySlug } from "../repository";

export const composersRoute = new Hono<AppEnv>()
  .get("/", async (c) => {
    const rows = await listComposers(c.get("db"), c.get("dbType"));
    return c.json(rows);
  })
  .get("/:slug", async (c) => {
    const row = await findComposerBySlug(c.get("db"), c.get("dbType"), c.req.param("slug"));
    if (!row) return c.json({ error: "Not found" }, 404);
    return c.json(row);
  });
