/**
 * Generate a random Ethereum-compatible private key.
 *
 * Usage:
 *   bun run packages/server/scripts/generate-key.ts
 *
 * Output:
 *   A 32-byte hex string with 0x prefix, suitable for use as
 *   BACKEND_PRIVATE_KEY in your .env file.
 */

import { randomBytes } from "crypto";

const key = `0x${randomBytes(32).toString("hex")}`;

console.log("Generated Ethereum private key:\n");
console.log(`  ${key}\n`);
console.log("Add this to your .env file:");
console.log(`  BACKEND_PRIVATE_KEY=${key}\n`);
console.log("WARNING: Keep this key secret. Do not commit it to version control.");
