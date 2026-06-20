import { getCloudflareContext } from "@opennextjs/cloudflare";
import { createApp } from "@/server/app";
import type { AppType } from "@/server/app";
import { d1Middleware } from "@/server/middleware/d1";
import { pgMiddleware } from "@/server/middleware/pg";
import { r2Uploader, s3Uploader } from "@/server/uploaders";

export const dynamic = "force-dynamic";

let appPromise: Promise<AppType> | undefined;

async function getApp() {
  appPromise ??= createRuntimeApp();
  return appPromise;
}

async function createRuntimeApp() {
  if (process.env.DATABASE_RUNTIME === "d1" || !process.env.DATABASE_URL) {
    const { env } = await getCloudflareContext({ async: true });
    if (env.DB) {
      if (!env.IMAGES) throw new Error("Cloudflare R2 binding IMAGES is required.");
      const publicDomain = env.R2_PUBLIC_DOMAIN ?? process.env.R2_PUBLIC_DOMAIN ?? "";
      if (!publicDomain) throw new Error("R2_PUBLIC_DOMAIN is required.");
      return createApp(d1Middleware(env.DB), r2Uploader(env.IMAGES, publicDomain));
    }
  }

  const databaseUrl = process.env.DATABASE_URL;
  if (!databaseUrl) throw new Error("DATABASE_URL is required.");

  return createApp(pgMiddleware(databaseUrl), s3Uploader(process.env.R2_PUBLIC_DOMAIN ?? ""));
}

async function handler(request: Request) {
  const app = await getApp();
  return app.fetch(request);
}

export const GET = handler;
export const POST = handler;
export const PUT = handler;
export const PATCH = handler;
export const DELETE = handler;
export const OPTIONS = handler;
