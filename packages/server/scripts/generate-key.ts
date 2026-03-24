/**
 * Generate a random Ethereum-compatible private key.
 *
 * Usage:
 *   bun run packages/server/scripts/generate-key.ts
 *
 * If no .env file exists in the project root, creates one with the key.
 * If .env already exists, prints the key to the console.
 */

import { randomBytes } from "crypto";
import { existsSync, writeFileSync } from "fs";
import { resolve } from "path";

const key = `0x${randomBytes(32).toString("hex")}`;
const envPath = resolve(import.meta.dir, "../../../.env");

if (!existsSync(envPath)) {
  writeFileSync(envPath, `BACKEND_PRIVATE_KEY=${key}\n`);
  console.log(`Created .env file with BACKEND_PRIVATE_KEY at ${envPath}`);
} else {
  console.log("Generated Ethereum private key:\n");
  console.log(`  BACKEND_PRIVATE_KEY=${key}\n`);
  console.log("WARNING: Keep this key secret. Do not commit it to version control.");
}
