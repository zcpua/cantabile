import { serve } from "@hono/node-server";
import { createApp } from "../app";
import { pgMiddleware } from "../middleware/pg";
import { s3Uploader } from "../uploaders";

const databaseUrl = process.env.DATABASE_URL;
if (!databaseUrl) throw new Error("DATABASE_URL is required");

const app = createApp(pgMiddleware(databaseUrl), s3Uploader(process.env.R2_PUBLIC_DOMAIN ?? ""));

const port = Number(process.env.PORT || 3001);

serve({ fetch: app.fetch, port }, () => {
  console.log(`API listening on http://localhost:${port}`);
});
