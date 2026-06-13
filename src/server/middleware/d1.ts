import { createMiddleware } from "hono/factory";
import type { D1Database } from "@cloudflare/workers-types";
import type { AppEnv } from "../env";

export const d1Middleware = (d1: D1Database) =>
  createMiddleware<AppEnv>(async (c, next) => {
    const { drizzle } = await import("drizzle-orm/d1");
    const schema = await import("@/db/schema.sqlite");
    c.set("db", drizzle(d1, { schema }));
    c.set("dbType", "d1");
    await next();
  });
