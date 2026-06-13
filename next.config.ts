import type { NextConfig } from "next";

if (process.env.NODE_ENV === "development") {
  void import("@opennextjs/cloudflare").then(({ initOpenNextCloudflareForDev }) => initOpenNextCloudflareForDev());
}

const nextConfig: NextConfig = {
  images: {
    remotePatterns: [
      { protocol: "https", hostname: "**.chncpa.org" },
      { protocol: "https", hostname: "**.shsymphony.cn" },
      { protocol: "https", hostname: "**.aliyuncs.com" },
      { protocol: "https", hostname: "img.cantabile.app" },
    ],
  },
};

export default nextConfig;
