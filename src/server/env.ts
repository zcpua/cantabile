import type { DrizzleD1Database } from "drizzle-orm/d1";
import type { PostgresJsDatabase } from "drizzle-orm/postgres-js";
import type * as pgSchema from "@/db/schema.pg";
import type * as sqliteSchema from "@/db/schema.sqlite";

export type PgDb = PostgresJsDatabase<typeof pgSchema>;
export type D1Db = DrizzleD1Database<typeof sqliteSchema>;
export type AnyDb = PgDb | D1Db;

export type AppEnv = {
  Variables: {
    db: AnyDb;
    dbType: "postgres" | "d1";
  };
};
