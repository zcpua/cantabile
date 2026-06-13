import { Hono } from "hono";
import type { AppEnv } from "../env";
import { findPerformanceById, listPerformances } from "../repository";

export const performancesRoute = new Hono<AppEnv>()
  .get("/", async (c) => {
    const rows = await listPerformances(c.get("db"), c.get("dbType"));
    return c.json(rows);
  })
  .get("/:id", async (c) => {
    const row = await findPerformanceById(c.get("db"), c.get("dbType"), c.req.param("id"));
    if (!row) return c.json({ error: "Not found" }, 404);
    return c.json(row);
  });
