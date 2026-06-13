import { Hono } from "hono";
import type { AppEnv } from "../env";
import { listWorks, findWorkBySlug } from "../repository";

export const worksRoute = new Hono<AppEnv>()
  .get("/", async (c) => {
    const rows = await listWorks(c.get("db"), c.get("dbType"));
    return c.json(rows);
  })
  .get("/:slug", async (c) => {
    const row = await findWorkBySlug(c.get("db"), c.get("dbType"), c.req.param("slug"));
    if (!row) return c.json({ error: "Not found" }, 404);
    return c.json(row);
  });
