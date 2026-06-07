import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { VitePWA } from "vite-plugin-pwa";
import { readFileSync } from "node:fs";

// Read version from package.json — single source of truth. Build time is
// stamped at config-load (so every dev + prod build gets a fresh value).
const PKG = JSON.parse(readFileSync(new URL("./package.json", import.meta.url), "utf-8")) as { version: string };
const BUILT_AT = new Date().toISOString();

export default defineConfig({
  define: {
    // Strings injected at build time so the bundle picks them up without
    // a runtime fetch. Vite requires JSON.stringify wrapping.
    __APP_VERSION__: JSON.stringify(PKG.version),
    __BUILT_AT__: JSON.stringify(BUILT_AT),
  },
  esbuild: {
    keepNames: true,
    // ASCII-only output so emoji literals stay as \u escapes in the
    // bundle. Prevents iOS Safari mojibake when a JS asset is served
    // without explicit charset=utf-8 (sw cache, intermediary, etc).
    charset: "ascii",
  },
  plugins: [
    react(),
    VitePWA({
      registerType: "autoUpdate",
      includeAssets: ["favicon.svg"],
      manifest: {
        name: "Berry Kid's Arcade",
        short_name: "Berry Arcade",
        description: "Baseball, football, and Greek mythology RPG — three games under one roof.",
        theme_color: "#0a0d13",
        background_color: "#0a0d13",
        display: "standalone",
        orientation: "any",
        start_url: "/",
        scope: "/",
        icons: [
          { src: "/icon-192.png", sizes: "192x192", type: "image/png" },
          { src: "/icon-512.png", sizes: "512x512", type: "image/png" },
          { src: "/icon-512-maskable.png", sizes: "512x512", type: "image/png", purpose: "maskable" }
        ]
      },
      workbox: {
        maximumFileSizeToCacheInBytes: 6 * 1024 * 1024,
        // Force a new SW to immediately take control of open tabs so a
        // bad deploy doesn't strand devices on a broken cached build.
        skipWaiting: true,
        clientsClaim: true,
        // Don't serve stale index.html — always go to the network first.
        navigateFallback: "index.html",
        navigateFallbackDenylist: [/^\/api\//],
        cleanupOutdatedCaches: true,
      }
    })
  ],
  server: {
    host: true,
    port: 5173
  },
  build: {
    target: "es2020",
    sourcemap: true,
    chunkSizeWarningLimit: 1500,
    // Use terser so we can keep_fnames — readable error stacks for mobile
    // users without DevTools. esbuild's minifier ignores keepNames in
    // production builds; terser respects keep_fnames.
    minify: "terser",
    terserOptions: {
      keep_fnames: true,
      keep_classnames: true,
      // ASCII-only output so non-ASCII chars become \uXXXX escapes.
      // Belt+suspenders with esbuild.charset for the iOS mojibake fix.
      output: { ascii_only: true },
    },
  }
});
