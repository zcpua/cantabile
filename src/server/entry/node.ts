import { createApp } from "../app";
import { pgMiddleware } from "../middleware/pg";
import { s3Uploader, wxCosUploader } from "../uploaders";

declare const Bun: {
  serve: (options: { port: number; fetch: typeof app.fetch }) => unknown;
};

const databaseUrl = process.env.DATABASE_URL;
if (!databaseUrl) throw new Error("DATABASE_URL is required");

// Inside WeChat Cloud Run we upload to tencent COS with public-read ACL and
// return the COS public URL directly; elsewhere (local/Vercel-node) fall back
// to the S3-compatible R2 client.
const cosBucket = process.env.COS_BUCKET;
const uploadAvatar = cosBucket
  ? wxCosUploader({
      bucket: cosBucket,
      region: process.env.COS_REGION ?? "ap-shanghai",
      cloudEnv: process.env.COS_CLOUD_ENV,
      publicDomain: process.env.COS_PUBLIC_DOMAIN,
    })
  : s3Uploader(process.env.R2_PUBLIC_DOMAIN ?? "");

const app = createApp(pgMiddleware(databaseUrl), uploadAvatar);

const port = Number(process.env.PORT || 3001);

Bun.serve({ fetch: app.fetch, port });

console.log(`API listening on http://localhost:${port}`);
