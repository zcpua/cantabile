import { Hono } from "hono";
import type { AppEnv } from "../env";
import { listArticles, findArticleBySlug } from "../repository";

export const articlesRoute = new Hono<AppEnv>()
  .get("/", async (c) => {
    const rows = await listArticles(c.get("db"), c.get("dbType"));
    return c.json(rows);
  })
  .get("/:slug", async (c) => {
    const row = await findArticleBySlug(c.get("db"), c.get("dbType"), c.req.param("slug"));
    if (!row) return c.json({ error: "Not found" }, 404);
    return c.json(row);
  });
