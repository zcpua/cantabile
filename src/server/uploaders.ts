import type { R2Bucket } from "@cloudflare/workers-types";
import type { AvatarUploader } from "./env";

// WeChat Cloud Run runtime: upload to tencent COS with object-level
// public-read ACL, returning the COS public https URL directly. Temp creds
// come from the platform's auth-free endpoint (no AK/SK in the container).
// NOTE: this only works if the managed COS bucket allows per-object ACL
// override and public access — verify by opening the returned URL. If it 403s,
// fall back to the worker→R2 transfer flow.
// Also returns a wx cloud fileId (when COS_CLOUD_ENV is set) so the
// mini-program can render the avatar via the wx cloud file.
export function wxCosUploader(opts: {
  bucket: string;
  region: string;
  cloudEnv?: string;
  publicDomain?: string;
}): AvatarUploader {
  const host = opts.publicDomain || `${opts.bucket}.cos.${opts.region}.myqcloud.com`;
  return async ({ bytes, contentType, key }) => {
    const { default: COS } = await import("cos-nodejs-sdk-v5");
    const cos = new COS({
      getAuthorization: (_options, callback) => {
        fetch("http://api.weixin.qq.com/_/cos/getauth")
          .then((r) => r.json() as Promise<{ TmpSecretId: string; TmpSecretKey: string; Token: string; ExpiredTime: number }>)
          .then((info) =>
            callback({
              TmpSecretId: info.TmpSecretId,
              TmpSecretKey: info.TmpSecretKey,
              SecurityToken: info.Token,
              StartTime: Math.floor(Date.now() / 1000),
              ExpiredTime: info.ExpiredTime,
            })
          );
      },
    });

    await cos.putObject({
      Bucket: opts.bucket,
      Region: opts.region,
      Key: key,
      Body: Buffer.from(bytes),
      ContentLength: bytes.byteLength,
      ContentType: contentType,
      ACL: "public-read",
    });

    return {
      url: `https://${host}/${key}?v=${Date.now()}`,
      fileId: opts.cloudEnv ? `cloud://${opts.cloudEnv}.${opts.bucket}/${key}` : null,
    };
  };
}

// Cloudflare runtime: write straight to the bound R2 bucket. The public URL is
// served from R2_PUBLIC_DOMAIN (a custom domain or r2.dev binding).
export function r2Uploader(bucket: R2Bucket, publicDomain: string): AvatarUploader {
  return async ({ bytes, contentType, key }) => {
    await bucket.put(key, bytes, { httpMetadata: { contentType } });
    return { url: `https://${publicDomain}/${key}?v=${Date.now()}` };
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
    return { url: `https://${publicDomain}/${key}?v=${Date.now()}` };
  };
}
