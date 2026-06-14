import { createMiddleware } from "hono/factory";
import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import * as pgSchema from "@/db/schema.pg";
import type { AppEnv } from "../env";

let pgClient: postgres.Sql | undefined;

export const pgMiddleware = (databaseUrl: string) =>
  createMiddleware<AppEnv>(async (c, next) => {
    pgClient ??= postgres(databaseUrl, {
      prepare: false,
      idle_timeout: 20,
      max_lifetime: 60 * 30,
      connect_timeout: 10,
    });
    c.set("db", drizzle(pgClient, { schema: pgSchema }));
    c.set("dbType", "postgres");
    await next();
  });
