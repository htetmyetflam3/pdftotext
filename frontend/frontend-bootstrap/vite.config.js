import path from "node:path";
import { fileURLToPath } from "node:url";
import { defineConfig } from "vite";
const here = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(here, "..");
export default defineConfig({
  root: here,
  publicDir: path.resolve(here, "public"),
  css: {
    preprocessorOptions: {
      scss: {
        quietDeps: true,
        silenceDeprecations: ["import", "global-builtin", "color-functions"],
      },
    },
  },
  build: {
    outDir: path.resolve(root, "dist"),
    // NOT emptyOutDir. This outDir (frontend/dist) is the PARENT of the React
    // build's outDir (frontend/dist/react), so emptying it deleted the other
    // SPA — and the server used to start anyway, then answer /react/ with a
    // 500. Cleaning is the `clean` script's job, and `npm run build` runs it
    // once before both builds; a lone `npm run build:bootstrap` now leaves its
    // sibling alone (at the cost of stale hashed assets, which nothing links).
    emptyOutDir: false,
  },
  server: {
    host: "0.0.0.0",
    allowedHosts: true,
  },
  preview: {
    host: "0.0.0.0",
    allowedHosts: true,
  },
});