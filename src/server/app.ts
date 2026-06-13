import { Hono } from "hono";
import { cors } from "hono/cors";
import type { AppEnv } from "./env";
import { composersRoute } from "./routes/composers";
import { worksRoute } from "./routes/works";
import { performancesRoute } from "./routes/performances";
import { articlesRoute } from "./routes/articles";
import { meRoute } from "./routes/me";

export const app = new Hono<AppEnv>().basePath("/api/v2");

app.use("*", cors());

app.get("/health", (c) => c.json({ ok: true, dbType: c.get("dbType") }));

app.route("/composers", composersRoute);
app.route("/works", worksRoute);
app.route("/performances", performancesRoute);
app.route("/articles", articlesRoute);
app.route("/me", meRoute);

export type AppType = typeof app;
