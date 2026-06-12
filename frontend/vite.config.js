import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

const BACKEND = process.env.BACKEND_URL ?? "http://127.0.0.1:4317";

export default defineConfig({
  plugins: [react()],
  server: {
    port: 5317,
    proxy: {
      "/api": { target: BACKEND, changeOrigin: true },
      "/preview": { target: BACKEND, changeOrigin: true },
    },
  },
});
