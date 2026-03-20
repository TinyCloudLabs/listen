/**
 * Postinstall script to fix @tinycloud/node-sdk-wasm CJS/ESM mismatch.
 *
 * The @tinycloud/node-sdk-wasm package ships with a CJS wrapper that uses
 * `require()`, which breaks in ESM projects. This script patches the
 * wrapper to use dynamic `import()` instead.
 *
 * Run automatically via "postinstall" in package.json, or manually:
 *   node packages/server/scripts/fix-wasm-esm.mjs
 */

import { readFileSync, writeFileSync, existsSync } from "fs";
import { resolve, dirname } from "path";
import { fileURLToPath } from "url";
import { createRequire } from "module";

const __dirname = dirname(fileURLToPath(import.meta.url));
const require = createRequire(import.meta.url);

// Try to find the package from the project root node_modules
const candidates = [
  resolve(__dirname, "../../../node_modules/@tinycloud/node-sdk-wasm/node-sdk-wasm.js"),
  resolve(__dirname, "../node_modules/@tinycloud/node-sdk-wasm/node-sdk-wasm.js"),
];

let targetPath = null;
for (const candidate of candidates) {
  if (existsSync(candidate)) {
    targetPath = candidate;
    break;
  }
}

if (!targetPath) {
  console.log("[fix-wasm-esm] @tinycloud/node-sdk-wasm not found — skipping patch.");
  process.exit(0);
}

let content = readFileSync(targetPath, "utf-8");

// Already patched — skip
if (content.includes("// [fix-wasm-esm] patched")) {
  console.log("[fix-wasm-esm] Already patched — skipping.");
  process.exit(0);
}

// Replace synchronous require of the .wasm file with an ESM-compatible pattern.
// The typical CJS pattern is:
//   const path = require('path');
//   const bytes = require('fs').readFileSync(path.join(__dirname, 'file.wasm'));
//
// We wrap the module in an async init function if needed.
const cjsRequirePattern = /require\s*\(\s*['"]fs['"]\s*\)\.readFileSync/g;
if (cjsRequirePattern.test(content)) {
  content = content.replace(cjsRequirePattern, "(await import('fs')).readFileSync");
  content = `// [fix-wasm-esm] patched\n${content}`;
  writeFileSync(targetPath, content, "utf-8");
  console.log(`[fix-wasm-esm] Patched: ${targetPath}`);
} else {
  // Even if we don't find the exact pattern, mark as checked
  console.log("[fix-wasm-esm] No CJS require pattern found — no changes needed.");
}
