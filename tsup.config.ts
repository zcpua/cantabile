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
  // cos-nodejs-sdk-v5 is CommonJS and does require("fs") at load time. In an
  // ESM bundle esbuild's __require shim throws on those. Define a real require
  // via createRequire, and disable splitting so that shim and the banner-defined
  // require live in the same module scope (esbuild's __require falls through to
  // a real `require` when one is in scope).
  splitting: false,
  banner: {
    js: "import { createRequire as __cr } from 'module'; const require = __cr(import.meta.url);",
  },
});
