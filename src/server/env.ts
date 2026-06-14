import type { DrizzleD1Database } from "drizzle-orm/d1";
import type { PostgresJsDatabase } from "drizzle-orm/postgres-js";
import type * as pgSchema from "@/db/schema.pg";
import type * as sqliteSchema from "@/db/schema.sqlite";

export type PgDb = PostgresJsDatabase<typeof pgSchema>;
export type D1Db = DrizzleD1Database<typeof sqliteSchema>;
export type AnyDb = PgDb | D1Db;

// Uploads avatar bytes to object storage and returns the stored references.
// Each runtime supplies its own implementation:
//   - Cloudflare worker: writes straight to the R2 binding
//   - Node/Vercel: writes via the S3-compatible client
//   - WeChat Cloud Run: writes to COS, then hands a signed URL to the
//     Cloudflare worker which copies it into R2 (the container can't reach
//     R2's S3 endpoint from China). `fileId` is the wx cloud file id the
//     mini-program can render directly; `url` is the public R2 https link.
export type AvatarUploadResult = {
  url: string;
  fileId?: string | null;
};

export type AvatarUploader = (input: {
  bytes: Uint8Array;
  contentType: string;
  key: string;
}) => Promise<AvatarUploadResult>;

export type AppEnv = {
  Variables: {
    db: AnyDb;
    dbType: "postgres" | "d1";
    uploadAvatar: AvatarUploader;
  };
};
