import { defineConfig, loadEnv } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, ".", "");

  return {
    base: "/",
    plugins: [react()],
    build: {
      rollupOptions: {
        output: {
          manualChunks: {
            react: ["react", "react-dom"],
            stellar: ["@stellar/freighter-api", "@stellar/stellar-sdk"]
          }
        }
      }
    }
  };
});
