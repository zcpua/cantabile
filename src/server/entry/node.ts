import { serve } from "@hono/node-server";
import { app } from "../app";
import { pgMiddleware } from "../middleware/pg";

const databaseUrl = process.env.DATABASE_URL;
if (!databaseUrl) throw new Error("DATABASE_URL is required");

app.use("*", pgMiddleware(databaseUrl));

const port = Number(process.env.PORT || 3001);

serve({ fetch: app.fetch, port }, () => {
  console.log(`API listening on http://localhost:${port}`);
});
