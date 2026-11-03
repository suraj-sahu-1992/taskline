import { defineConfig, loadEnv } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
// Keep relative API requests aligned with the configured backend, including test overrides.
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), "VITE_");
  const apiUrl =
    process.env.VITE_API_BASE_URL ||
    env.VITE_API_BASE_URL ||
    "http://127.0.0.1:8000/api/v1";
  return {
    plugins: [react(), tailwindcss()],
    server: {
      port: 3000,
      strictPort: true,
      proxy: { "/api": new URL(apiUrl, "http://127.0.0.1:8000").origin },
    },
  };
});
