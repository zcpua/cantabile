import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import * as schema from "./schema.pg";

let client: postgres.Sql | undefined;

export function getPostgresDb() {
  const databaseUrl = process.env.DATABASE_URL;
  if (!databaseUrl) throw new Error("DATABASE_URL is required when DATABASE_RUNTIME=postgres.");

  client ??= postgres(databaseUrl, { prepare: false });
  return drizzle(client, { schema });
}
