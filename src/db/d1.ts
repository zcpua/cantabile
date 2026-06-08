import { getCloudflareContext } from "@opennextjs/cloudflare";
import { drizzle } from "drizzle-orm/d1";
import * as schema from "./schema.sqlite";

export async function getD1Db() {
  const { env } = await getCloudflareContext({ async: true });
  const db = env.DB;
  if (!db) throw new Error("Cloudflare D1 binding DB is required when DATABASE_RUNTIME=d1.");

  return drizzle(db, { schema });
}
