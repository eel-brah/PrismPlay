import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import path from "path";
import tailwindcss from "@tailwindcss/vite";

export default defineConfig({
  root: path.resolve(__dirname, "src/frontend"),
  plugins: [tailwindcss(), react()],
  server: {
    port: 5173,
    proxy: {
      "/api/": {
        target: "https://localhost:9443",
        changeOrigin: true,
        secure: false,
      },
      "/uploads/": {
        target: "https://localhost:9443",
        changeOrigin: true,
        secure: false,
      },
      "/socket.io": {
        target: "https://localhost:9443",
        ws: true,
        changeOrigin: true,
        secure: false,
      },
    },
  },
  build: {
    outDir: path.resolve(__dirname, "dist/frontend"),
    emptyOutDir: true,
  },
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "src/frontend"),
    },
  },
});
