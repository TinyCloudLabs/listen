import fs from "fs";
import { fileURLToPath, URL } from "node:url";
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: [
      {
        find: /^@tinycloud\/sdk-core$/,
        replacement: fileURLToPath(
          new URL("./node_modules/@tinycloud/sdk-core-m1/dist/index.js", import.meta.url),
        ),
      },
      {
        find: /^@tinycloud\/sdk-core\/policy$/,
        replacement: fileURLToPath(
          new URL("./node_modules/@tinycloud/sdk-core-m1/dist/policy/index.js", import.meta.url),
        ),
      },
      {
        find: /^@tinycloud\/sdk-core\/bootstrap$/,
        replacement: fileURLToPath(
          new URL("./node_modules/@tinycloud/sdk-core-m1/dist/bootstrap/index.js", import.meta.url),
        ),
      },
      {
        find: /^@tinycloud\/bootstrap$/,
        replacement: fileURLToPath(
          new URL("./node_modules/@tinycloud/bootstrap-m1/dist/index.js", import.meta.url),
        ),
      },
      {
        find: /^@tinycloud\/sdk-services$/,
        replacement: fileURLToPath(
          new URL("./node_modules/@tinycloud/sdk-services-m1/dist/index.js", import.meta.url),
        ),
      },
    ],
  },
  optimizeDeps: {
    exclude: ["@tinycloud/web-sdk"],
  },
  server: {
    port: 5173,
    allowedHosts: true,
    ...(fs.existsSync("./localhost.pem") && {
      https: {
        key: fs.readFileSync("./localhost-key.pem"),
        cert: fs.readFileSync("./localhost.pem"),
      },
    }),
  },
});
