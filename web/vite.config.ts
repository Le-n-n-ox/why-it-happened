import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    strictPort: true,
    proxy: {
      "/events": "http://127.0.0.1:8000",
      "/stream": "http://127.0.0.1:8000",
      "/health": "http://127.0.0.1:8000",
      "/insights": "http://127.0.0.1:8000",
      "/recap": "http://127.0.0.1:8000",
    },
  },
});