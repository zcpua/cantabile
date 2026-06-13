import { handle } from "hono/vercel";
import { createApp } from "@/server/app";
import { pgMiddleware } from "@/server/middleware/pg";

const databaseUrl = process.env.DATABASE_URL;
if (!databaseUrl) throw new Error("DATABASE_URL is required");

const app = createApp(pgMiddleware(databaseUrl));

export const GET = handle(app);
export const POST = handle(app);
export const PUT = handle(app);
export const PATCH = handle(app);
export const DELETE = handle(app);
export const OPTIONS = handle(app);
