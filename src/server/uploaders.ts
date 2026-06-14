import type { R2Bucket } from "@cloudflare/workers-types";
import type { AvatarUploader } from "./env";

// Cloudflare runtime: write straight to the bound R2 bucket. The public URL is
// served from R2_PUBLIC_DOMAIN (a custom domain or r2.dev binding).
export function r2Uploader(bucket: R2Bucket, publicDomain: string): AvatarUploader {
  return async ({ bytes, contentType, key }) => {
    await bucket.put(key, bytes, { httpMetadata: { contentType } });
    return `https://${publicDomain}/${key}?v=${Date.now()}`;
  };
}

// Node/Vercel runtime: write via the S3-compatible API. Lazily constructs the
// client so the AWS SDK isn't pulled into the Cloudflare bundle.
export function s3Uploader(publicDomain: string): AvatarUploader {
  return async ({ bytes, contentType, key }) => {
    const { S3Client, PutObjectCommand } = await import("@aws-sdk/client-s3");
    const accountId = process.env.R2_ACCOUNT_ID || process.env.CLOUDFLARE_ACCOUNT_ID;
    const bucket = process.env.R2_BUCKET_NAME || "cantabile-images";
    const client = new S3Client({
      region: "auto",
      endpoint: `https://${accountId}.r2.cloudflarestorage.com`,
      credentials: {
        accessKeyId: process.env.R2_ACCESS_KEY_ID!,
        secretAccessKey: process.env.R2_SECRET_ACCESS_KEY!,
      },
    });
    await client.send(
      new PutObjectCommand({ Bucket: bucket, Key: key, Body: bytes, ContentType: contentType })
    );
    return `https://${publicDomain}/${key}?v=${Date.now()}`;
  };
}
