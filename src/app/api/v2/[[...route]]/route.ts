import { handle } from "hono/vercel";
import { createApp } from "@/server/app";
import { pgMiddleware } from "@/server/middleware/pg";
import { s3Uploader } from "@/server/uploaders";

const databaseUrl = process.env.DATABASE_URL;
if (!databaseUrl) throw new Error("DATABASE_URL is required");

const app = createApp(pgMiddleware(databaseUrl), s3Uploader(process.env.R2_PUBLIC_DOMAIN ?? ""));

export const GET = handle(app);
export const POST = handle(app);
export const PUT = handle(app);
export const PATCH = handle(app);
export const DELETE = handle(app);
export const OPTIONS = handle(app);
