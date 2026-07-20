import { defineConfig, loadEnv } from "vite";
import { devtools } from "@tanstack/devtools-vite";

import { tanstackRouter } from "@tanstack/router-plugin/vite";

import viteReact from "@vitejs/plugin-react";

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), "");

  if (mode === "production" && !env.VITE_API_URL.trim()) {
    throw new Error("VITE_API_URL must be configured for production builds");
  }

  return {
    resolve: { tsconfigPaths: true },
    server: {
      proxy: {
        "/api": {
          target: env.VITE_DEV_API_PROXY || "http://localhost:3000",
          changeOrigin: true,
        },
      },
    },
    plugins: [
      devtools(),
      tanstackRouter({ target: "react", autoCodeSplitting: true }),
      viteReact(),
    ],
  };
});
