import fs from "fs";
import { fileURLToPath } from "node:url";
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

const sdkCoreBrowserFacade = fileURLToPath(
  new URL("./src/lib/tinycloudSdkCoreBrowser.ts", import.meta.url),
);

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: [{ find: /^@tinycloud\/sdk-core$/, replacement: sdkCoreBrowserFacade }],
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
