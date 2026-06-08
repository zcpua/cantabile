export type DatabaseRuntime = "postgres" | "d1" | "static";

export function getDatabaseRuntime(): DatabaseRuntime {
  const runtime = process.env.DATABASE_RUNTIME;

  if (!runtime) return process.env.NODE_ENV === "production" ? "postgres" : "static";
  if (runtime === "postgres" || runtime === "d1" || runtime === "static") return runtime;

  throw new Error("DATABASE_RUNTIME must be one of: postgres, d1, static.");
}

export async function getDb() {
  const runtime = getDatabaseRuntime();

  if (runtime === "postgres") {
    const { getPostgresDb } = await import("./postgres");
    return getPostgresDb();
  }

  if (runtime === "d1") {
    const { getD1Db } = await import("./d1");
    return getD1Db();
  }

  return undefined;
}
