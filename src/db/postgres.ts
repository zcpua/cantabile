import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import * as schema from "./schema.pg";

let client: postgres.Sql | undefined;

export function getPostgresDb() {
  const databaseUrl = getDatabaseUrl();

  client ??= postgres(databaseUrl, { prepare: false });
  return drizzle(client, { schema });
}

function getDatabaseUrl() {
  const databaseUrl = process.env.DATABASE_URL
    ?? process.env.POSTGRES_URL
    ?? process.env.POSTGRES_PRISMA_URL
    ?? process.env.POSTGRES_URL_NON_POOLING;

  if (!databaseUrl) {
    throw new Error("DATABASE_RUNTIME=postgres requires DATABASE_URL, POSTGRES_URL, POSTGRES_PRISMA_URL, or POSTGRES_URL_NON_POOLING in the current deployment environment.");
  }

  return databaseUrl;
}
