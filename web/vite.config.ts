import path from "node:path";
import tailwindcss from "@tailwindcss/vite";
import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";

// Dev only: the page calls its own address and Vite forwards these routes to the backend.
// The backend container is started with -p 8001:8000 because Splunk answers on 8000 on this machine.
const BACKEND = "http://127.0.0.1:8001";

export default defineConfig({
  base: "/", // Guarantees static assets are served from root (/assets/...) regardless of subpath
  plugins: [react(), tailwindcss()],
  resolve: { alias: { "@": path.resolve(__dirname, "./src") } },
  server: {
    port: 5173,
    strictPort: true,
    proxy: {
      "/health": BACKEND,
      "/match": BACKEND,
      "/events": BACKEND,
      "/stream": BACKEND,
      "/insights": BACKEND,
      "/recap": BACKEND,
      "/why": BACKEND,
      "/players": BACKEND,
      "/fouls": BACKEND,
      "/team": BACKEND,
      "/predict": BACKEND,
      "/validation": BACKEND,
    },
  },
});