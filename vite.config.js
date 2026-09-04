import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

const backend = "http://localhost:3001";

export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    proxy: Object.fromEntries(
      ["/api", "/oauth", "/mcp", "/.well-known", "/privacy", "/terms", "/support", "/account-deletion", "/forgot-password", "/reset-password", "/verify-email", "/resend-verification", "/health"]
        .map((route) => [route, backend])
    )
  }
});
