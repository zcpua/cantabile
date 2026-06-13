import { defineConfig } from "tsup";

// Bundles the Hono API (Node entry) into a single self-contained file for
// WeChat Cloud Run, so the runtime image needs no node_modules.
export default defineConfig({
  entry: { node: "src/server/entry/node.ts" },
  format: "esm",
  platform: "node",
  target: "node22",
  outDir: "dist",
  noExternal: [/.*/],
  clean: true,
});
