import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

// Dev only: the page calls its own address and Vite forwards these routes to the backend.
// Port 8001 because Splunk answers on 8000 on this machine.
const BACKEND = "http://127.0.0.1:8001";

export default defineConfig({
  plugins: [react()],
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
      "/players": BACKEND,
    },
  },
});