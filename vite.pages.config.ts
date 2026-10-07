import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { fileURLToPath } from "node:url";
const base = process.env.PAGES_BASE || "/snack-pickup-demo/";
export default defineConfig({
  root: fileURLToPath(new URL("./static-demo", import.meta.url)),
  base,
  envDir: false,
  publicDir: fileURLToPath(new URL("./public", import.meta.url)),
  plugins: [react()],
  resolve: { alias: { "@": fileURLToPath(new URL(".", import.meta.url)) } },
  define: { "process.env.NEXT_PUBLIC_STATIC_DEMO": JSON.stringify("1"), "process.env.NEXT_PUBLIC_ASSET_BASE": JSON.stringify(base) },
  css: { postcss: fileURLToPath(new URL(".", import.meta.url)) },
  build: { outDir: fileURLToPath(new URL("./docs", import.meta.url)), emptyOutDir: true, sourcemap: false },
  server: { host: "127.0.0.1", port: 4173, strictPort: true, watch: { useFsEvents: false, usePolling: true } },
  preview: { host: "127.0.0.1", port: 4173, strictPort: true },
});
