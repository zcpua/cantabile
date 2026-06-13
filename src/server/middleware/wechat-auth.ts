import { createMiddleware } from "hono/factory";
import type { AppEnv } from "../env";

declare module "hono" {
  interface ContextVariableMap {
    openid: string;
    unionid?: string;
  }
}

/**
 * Reads the WeChat cloud-hosting gateway headers and exposes the resolved
 * openid via `c.get('openid')`. The gateway injects:
 *   - X-WX-OPENID         (signed)
 *   - X-WX-UNIONID        (when bound to an open platform)
 *   - X-WX-FROM-OPENID    (legacy / fallback)
 *
 * Set `WECHAT_DEV_OPENID` in the environment to bypass the check during
 * local development. In production the request is rejected when the header
 * is absent so non-mini-program callers cannot impersonate users.
 *
 * Reference: https://developers.weixin.qq.com/miniprogram/dev/wxcloud/guide/container/auth.html
 */
export const wechatAuth = createMiddleware<AppEnv>(async (c, next) => {
  const openid =
    c.req.header("X-WX-OPENID") ||
    c.req.header("x-wx-openid") ||
    c.req.header("X-WX-FROM-OPENID") ||
    c.req.header("x-wx-from-openid") ||
    process.env.WECHAT_DEV_OPENID;
  if (!openid) {
    return c.json({ error: "unauthorized", message: "missing wechat identity" }, 401);
  }
  const unionid = c.req.header("X-WX-UNIONID") || c.req.header("x-wx-unionid") || undefined;
  c.set("openid", openid);
  if (unionid) c.set("unionid", unionid);
  await next();
});
