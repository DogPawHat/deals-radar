/// <reference types="vitest/config" />
import { defineConfig } from "vite";
import { tanstackStart } from "@tanstack/react-start/plugin/vite";
import viteReact from "@vitejs/plugin-react";
import viteTsConfigPaths from "vite-tsconfig-paths";
import tailwindcss from "@tailwindcss/vite";

const config = defineConfig({
  resolve: {
    alias: {
      // use-sync-external-store is CJS-only and breaks Vite's ESM imports.
      // On React 19 the shim just re-exports React.useSyncExternalStore anyway.
      // SWR (via Clerk) and Base UI pull this in transitively.
      "use-sync-external-store/shim/index.js": "react",
    },
  },
  plugins: [
    // this is the plugin that enables path aliases
    viteTsConfigPaths({
      projects: ["./tsconfig.json"],
    }),
    tailwindcss(),
    tanstackStart(),
    viteReact(),
  ],
  test: {
    projects: ["convex/vitest.config.ts"],
  },
});

export default config;
