// Custom Cloudflare Worker entry that adds Hono API on /api/v2/*
// and delegates everything else to the OpenNext handler.
//@ts-expect-error: Will be resolved by wrangler build
import { handleCdnCgiImageRequest, handleImageRequest } from "./.open-next/cloudflare/images.js";
//@ts-expect-error: Will be resolved by wrangler build
import { runWithCloudflareRequestContext } from "./.open-next/cloudflare/init.js";
//@ts-expect-error: Will be resolved by wrangler build
import { maybeGetSkewProtectionResponse } from "./.open-next/cloudflare/skew-protection.js";
// @ts-expect-error: Will be resolved by wrangler build
import { handler as middlewareHandler } from "./.open-next/middleware/handler.mjs";
//@ts-expect-error: Will be resolved by wrangler build
export { DOQueueHandler } from "./.open-next/.build/durable-objects/queue.js";
//@ts-expect-error: Will be resolved by wrangler build
export { DOShardedTagCache } from "./.open-next/.build/durable-objects/sharded-tag-cache.js";
//@ts-expect-error: Will be resolved by wrangler build
export { BucketCachePurge } from "./.open-next/.build/durable-objects/bucket-cache-purge.js";

import { app } from "./src/server/app.js";
import { d1Middleware } from "./src/server/middleware/d1.js";

export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);

    if (url.pathname.startsWith("/api/v2")) {
      app.use("*", d1Middleware(env.DB));
      return app.fetch(request, env, ctx);
    }

    return runWithCloudflareRequestContext(request, env, ctx, async () => {
      const response = maybeGetSkewProtectionResponse(request);
      if (response) return response;

      if (url.pathname.startsWith("/cdn-cgi/image/")) {
        return handleCdnCgiImageRequest(url, env);
      }

      if (url.pathname === `${globalThis.__NEXT_BASE_PATH__}/_next/image${globalThis.__TRAILING_SLASH__ ? "/" : ""}`) {
        return await handleImageRequest(url, request.headers, env);
      }

      const reqOrResp = await middlewareHandler(request, env, ctx);
      if (reqOrResp instanceof Response) return reqOrResp;

      // @ts-expect-error: resolved by wrangler build
      const { handler } = await import("./.open-next/server-functions/default/handler.mjs");
      return handler(reqOrResp, env, ctx, request.signal);
    });
  },
};
