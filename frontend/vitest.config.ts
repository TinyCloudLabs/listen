import { fileURLToPath } from "node:url";
import { defineConfig } from "vitest/config";
import react from "@vitejs/plugin-react";

const sdkCoreBrowserFacade = fileURLToPath(
  new URL("./src/lib/tinycloudSdkCoreBrowser.ts", import.meta.url),
);

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: [{ find: /^@tinycloud\/sdk-core$/, replacement: sdkCoreBrowserFacade }],
  },
  test: {
    environment: "jsdom",
    setupFiles: ["./src/test-setup.ts"],
    server: {
      deps: {
        inline: true,
      },
    },
  },
});
