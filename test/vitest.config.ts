import { fileURLToPath, URL } from "node:url";

export default {
  resolve: {
    alias: [
      {
        find: /^@listen\/client$/,
        replacement: fileURLToPath(new URL("./listen-client-shim.ts", import.meta.url)),
      },
      {
        find: /^@tinycloud\/sdk-core$/,
        replacement: fileURLToPath(
          new URL("../frontend/node_modules/@tinycloud/sdk-core-m1/dist/index.js", import.meta.url),
        ),
      },
      {
        find: /^@tinycloud\/sdk-core\/policy$/,
        replacement: fileURLToPath(
          new URL(
            "../frontend/node_modules/@tinycloud/sdk-core-m1/dist/policy/index.js",
            import.meta.url,
          ),
        ),
      },
      {
        find: /^@tinycloud\/sdk-core\/bootstrap$/,
        replacement: fileURLToPath(
          new URL(
            "../frontend/node_modules/@tinycloud/sdk-core-m1/dist/bootstrap/index.js",
            import.meta.url,
          ),
        ),
      },
      {
        find: /^@tinycloud\/bootstrap$/,
        replacement: fileURLToPath(
          new URL(
            "../frontend/node_modules/@tinycloud/bootstrap-m1/dist/index.js",
            import.meta.url,
          ),
        ),
      },
      {
        find: /^@tinycloud\/sdk-services$/,
        replacement: fileURLToPath(
          new URL(
            "../frontend/node_modules/@tinycloud/sdk-services-m1/dist/index.js",
            import.meta.url,
          ),
        ),
      },
    ],
  },
  test: {
    environment: "node",
    server: {
      deps: {
        inline: true,
      },
    },
  },
};
