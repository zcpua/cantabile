import type { NextConfig } from "next";

const isCloudflareExport = process.env.CLOUDFLARE_EXPORT === "1";

const nextConfig: NextConfig = {
  ...(isCloudflareExport
    ? {
        output: "export" as const,
      }
    : {}),
};

export default nextConfig;
