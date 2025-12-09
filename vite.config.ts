// import { defineConfig } from "vite";
// import path from "path";
// // import react plugin if using React
// // import react from '@vitejs/plugin-react';

// export default defineConfig({
//   root: path.resolve(__dirname, "src/frontend"),
//   server: {
//     port: 5173,
//     proxy: {
//       "/api": "https://localhost:9443",
//     },
//   },
//   build: {
//     outDir: path.resolve(__dirname, "dist/frontend"),
//     emptyOutDir: true,
//   },
//   resolve: {
//     alias: {
//       "@": path.resolve(__dirname, "src/frontend"),
//     },
//   },
// });

import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import path from "path";
import tailwindcss from "@tailwindcss/vite";

const sharedDir = path.resolve(__dirname, "src/shared");

export default defineConfig({
  root: path.resolve(__dirname, "src/frontend"),
  plugins: [
    react(),
    tailwindcss(),

    {
      name: "watch-shared-folder",
      handleHotUpdate({ file, server }) {
        if (file.startsWith(sharedDir)) {
          console.log("[watch] change in shared dir:", file);
          server.ws.send({ type: "full-reload" });
        }
      },
    },
  ],
  server: {
    port: 5173,
    proxy: {
      "/api": "https://localhost:9443",
      "/socket.io": {
        target: "https://localhost:9443",
        ws: true, // enable websocket proxy
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
