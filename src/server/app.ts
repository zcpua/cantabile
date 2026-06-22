import { Hono } from "hono";
import { cors } from "hono/cors";
import type { MiddlewareHandler } from "hono";
import type { AppEnv, AvatarUploader } from "./env";
import { pingDb } from "./repository";
import { composersRoute } from "./routes/composers";
import { worksRoute } from "./routes/works";
import { performancesRoute } from "./routes/performances";
import { articlesRoute } from "./routes/articles";
import { bannersRoute } from "./routes/banners";
import { meRoute } from "./routes/me";

// The db middleware must be applied BEFORE the routes are mounted — Hono only
// runs middleware against routes registered after it. Each runtime (Node/Vercel
// = postgres, Cloudflare = d1) builds its own app by passing the matching db
// middleware in, plus an avatar uploader backed by that runtime's object store.
export function createApp(dbMiddleware: MiddlewareHandler<AppEnv>, uploadAvatar: AvatarUploader) {
  const app = new Hono<AppEnv>().basePath("/api/v2");

  app.use("*", cors());
  app.use("*", dbMiddleware);
  app.use("*", async (c, next) => {
    c.set("uploadAvatar", uploadAvatar);
    await next();
  });

  app.get("/health", (c) => c.json({ ok: true, dbType: c.get("dbType") }));

  // Debug: probe the DB connection by running one trivial query.
  app.get("/count", async (c) => {
    try {
      const value = await pingDb(c.get("db"), c.get("dbType"));
      return c.json({ ok: true, dbType: c.get("dbType"), value });
    } catch (err) {
      return c.json({ ok: false, dbType: c.get("dbType"), error: String(err) }, 500);
    }
  });

  app.route("/composers", composersRoute);
  app.route("/works", worksRoute);
  app.route("/banners", bannersRoute);
  app.route("/performances", performancesRoute);
  app.route("/articles", articlesRoute);
  app.route("/me", meRoute);

  return app;
}

export type AppType = ReturnType<typeof createApp>;
