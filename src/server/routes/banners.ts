import { Hono } from "hono";
import type { AppEnv } from "../env";
import { listBannerPerformances } from "../repository";

const BANNER_OPENID = "od6ryxbFSuApeg3K3fS5FSyasUf8";

export const bannersRoute = new Hono<AppEnv>()
  .get("/", async (c) => {
    const rows = await listBannerPerformances(c.get("db"), c.get("dbType"), BANNER_OPENID);
    return c.json(rows);
  });
