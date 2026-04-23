import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  base: "/dapp-2/",
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
});
