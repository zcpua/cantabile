import { S3Client, PutObjectCommand, HeadObjectCommand } from "@aws-sdk/client-s3";
import { createHash } from "node:crypto";
import { extname } from "node:path";

const accountId = process.env.R2_ACCOUNT_ID || process.env.CLOUDFLARE_ACCOUNT_ID;
const bucket = process.env.R2_BUCKET_NAME || "cantabile-images";
const publicDomain = process.env.R2_PUBLIC_DOMAIN;

let client;
function getClient() {
  if (client) return client;
  if (!accountId || !process.env.R2_ACCESS_KEY_ID || !process.env.R2_SECRET_ACCESS_KEY) {
    return null;
  }
  client = new S3Client({
    region: "auto",
    endpoint: `https://${accountId}.r2.cloudflarestorage.com`,
    credentials: {
      accessKeyId: process.env.R2_ACCESS_KEY_ID,
      secretAccessKey: process.env.R2_SECRET_ACCESS_KEY,
    },
  });
  return client;
}

export async function uploadImageToR2(imageUrl, prefix = "performances") {
  if (!imageUrl || !publicDomain) return imageUrl;
  const s3 = getClient();
  if (!s3) return imageUrl;

  try {
    const hash = createHash("sha256").update(imageUrl).digest("hex").slice(0, 16);
    const ext = guessExt(imageUrl);
    const key = `${prefix}/${hash}${ext}`;

    const exists = await objectExists(s3, key);
    if (exists) return `https://${publicDomain}/${key}`;

    const res = await fetch(imageUrl, {
      headers: { "User-Agent": "Mozilla/5.0 (compatible; cantabile-sync/1.0)" },
    });
    if (!res.ok) return imageUrl;

    const contentType = res.headers.get("content-type") || "image/jpeg";
    const body = Buffer.from(await res.arrayBuffer());

    await s3.send(new PutObjectCommand({
      Bucket: bucket,
      Key: key,
      Body: body,
      ContentType: contentType,
    }));

    return `https://${publicDomain}/${key}`;
  } catch (err) {
    console.warn(`[r2-upload] failed for ${imageUrl}: ${err.message}`);
    return imageUrl;
  }
}

async function objectExists(s3, key) {
  try {
    await s3.send(new HeadObjectCommand({ Bucket: bucket, Key: key }));
    return true;
  } catch {
    return false;
  }
}

function guessExt(url) {
  try {
    const pathname = new URL(url).pathname;
    const ext = extname(pathname).split("?")[0].toLowerCase();
    if ([".jpg", ".jpeg", ".png", ".webp", ".gif", ".avif"].includes(ext)) return ext;
  } catch {}
  return ".jpg";
}
