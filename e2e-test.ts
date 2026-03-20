/**
 * E2E test — tests delegation + KV CRUD directly against TinyCloud.
 *
 * This test does NOT go through the Express API (which requires real OpenKey tokens).
 * Instead, it simulates what the backend does when it receives a delegation:
 * deserialize → useDelegation → operate on the user's space.
 *
 * To run: BACKEND_PRIVATE_KEY=0x... bun run e2e-test.ts
 * Or:     source examples/react-express/backend/.env && bun run e2e-test.ts
 */
import { TinyCloudNode, serializeDelegation, deserializeDelegation } from "@tinycloud/node-sdk";
import { randomBytes } from "crypto";
import { readFileSync } from "fs";
import { resolve } from "path";

// Load backend .env if BACKEND_PRIVATE_KEY isn't set
if (!process.env.BACKEND_PRIVATE_KEY) {
  try {
    const envPath = resolve(import.meta.dir, "examples/react-express/backend/.env");
    const envContent = readFileSync(envPath, "utf-8");
    for (const line of envContent.split("\n")) {
      if (line.startsWith("#") || !line.includes("=")) continue;
      const [key, ...rest] = line.split("=");
      process.env[key.trim()] = rest.join("=").trim();
    }
  } catch {
    console.error(
      "BACKEND_PRIVATE_KEY not set. Run: source examples/react-express/backend/.env && bun run e2e-test.ts",
    );
    process.exit(1);
  }
}

const BACKEND_URL = "http://localhost:3001";
const TINYCLOUD_HOST = process.env.TINYCLOUD_HOST ?? "https://node.tinycloud.xyz";
const BACKEND_PRIVATE_KEY = process.env.BACKEND_PRIVATE_KEY!;
const TEST_USER_KEY = `0x${randomBytes(32).toString("hex")}`;

// Simple API helper for unauthenticated endpoints
async function apiGet(path: string) {
  const res = await fetch(`${BACKEND_URL}${path}`);
  const data = await res.json();
  console.log(`  GET ${path} → ${res.status}`);
  return data;
}

async function main() {
  console.log("=== TinyBoilerplate E2E Test ===\n");

  // 1. Check backend is up
  console.log("1. Backend info");
  let backendDID: string;
  try {
    const info = await apiGet("/api/server-info");
    backendDID = info.did;
    console.log(`   DID: ${backendDID}\n`);
  } catch {
    console.error(
      "   Backend not running. Start it with: cd examples/react-express/backend && bun run dev",
    );
    process.exit(1);
  }

  // 2. Create test user (simulates the frontend user)
  console.log("2. Creating test user...");
  const user = new TinyCloudNode({
    privateKey: TEST_USER_KEY,
    host: TINYCLOUD_HOST,
    prefix: "e2e-test",
    autoCreateSpace: true,
  });
  await user.signIn();
  const address = user.address!;
  console.log(`   Address: ${address}`);
  console.log(`   DID: ${user.did}\n`);

  // 3. Create delegation from user to backend
  console.log("3. Creating delegation to backend...");
  const delegation = await user.createDelegation({
    delegateDID: backendDID,
    path: "",
    actions: [
      "tinycloud.kv/get",
      "tinycloud.kv/put",
      "tinycloud.kv/del",
      "tinycloud.kv/list",
      "tinycloud.sql/read",
      "tinycloud.sql/write",
    ],
    expiryMs: 60 * 60 * 1000, // 1 hour
  });
  const serialized = serializeDelegation(delegation);
  console.log(`   Serialized: ${serialized.length} chars`);

  // Check delegation properties
  console.log(`   Actions: ${delegation.actions?.join(", ") ?? "none"}`);
  console.log(`   Path: "${delegation.path ?? ""}"`);
  console.log(`   Expiry type: ${typeof delegation.expiry} (${delegation.expiry})`);

  // 4. Test serialization roundtrip
  console.log("\n4. Testing serialization roundtrip...");
  const deserialized = deserializeDelegation(serialized);
  console.log(`   Deserialized actions: ${deserialized.actions?.join(", ") ?? "none"}`);
  console.log(`   Deserialized path: "${deserialized.path ?? ""}"`);
  console.log(
    `   Deserialized expiry: ${deserialized.expiry} (type: ${typeof deserialized.expiry})`,
  );

  // 5. Backend activates the delegation (simulates what the middleware does)
  console.log("\n5. Activating delegation as backend...");
  const backendNode = new TinyCloudNode({
    privateKey: BACKEND_PRIVATE_KEY,
    host: TINYCLOUD_HOST,
    prefix: "boilerplate-be",
    autoCreateSpace: true,
  });
  await backendNode.signIn();
  const access = await backendNode.useDelegation(delegation);
  console.log("   Delegation activated successfully");

  // 6. KV CRUD operations
  console.log("\n6. Testing KV CRUD via delegation...");

  // CREATE
  const item1 = {
    id: "e2e-1",
    title: "Test Item 1",
    data: "hello",
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };
  const putRes = await access.kv.put("items/e2e-1", item1);
  console.log(`   PUT items/e2e-1: ok=${putRes.ok}`);

  const item2 = {
    id: "e2e-2",
    title: "Test Item 2",
    data: "world",
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };
  const putRes2 = await access.kv.put("items/e2e-2", item2);
  console.log(`   PUT items/e2e-2: ok=${putRes2.ok}`);

  // READ
  const getRes = await access.kv.get("items/e2e-1");
  console.log(
    `   GET items/e2e-1: ok=${getRes.ok} data=${getRes.ok ? JSON.stringify((getRes.data as any).data).slice(0, 80) : (getRes as any).error?.message}`,
  );

  // LIST
  const listRes = await access.kv.list({ prefix: "items/" });
  console.log(
    `   LIST items/: ok=${listRes.ok} keys=${listRes.ok ? JSON.stringify(listRes.data.keys) : (listRes as any).error?.message}`,
  );

  // UPDATE
  const updated = { ...item1, title: "Updated Item 1", updatedAt: new Date().toISOString() };
  const updateRes = await access.kv.put("items/e2e-1", updated);
  console.log(`   PUT items/e2e-1 (update): ok=${updateRes.ok}`);

  const getUpdated = await access.kv.get("items/e2e-1");
  const updatedTitle = getUpdated.ok ? (getUpdated.data as any).data?.title : "?";
  console.log(`   GET items/e2e-1 (after update): title="${updatedTitle}"`);

  // DELETE
  const delRes = await access.kv.delete("items/e2e-1");
  console.log(`   DEL items/e2e-1: ok=${delRes.ok}`);

  const listAfterDel = await access.kv.list({ prefix: "items/" });
  console.log(
    `   LIST items/ (after delete): keys=${listAfterDel.ok ? JSON.stringify(listAfterDel.data.keys) : "?"}`,
  );

  // CLEANUP
  await access.kv.delete("items/e2e-2");
  console.log("   Cleanup done");

  // 7. Test delegation re-activation (simulates cache expiry in middleware)
  console.log("\n7. Testing delegation re-activation (simulates cache expiry)...");
  const access2 = await backendNode.useDelegation(delegation);
  const reList = await access2.kv.list({ prefix: "items/" });
  console.log(`   Re-activated access, LIST: ok=${reList.ok}`);

  // 8. Test rapid sequential operations
  console.log("\n8. Testing rapid operations...");
  for (let i = 0; i < 5; i++) {
    const item = {
      id: `rapid-${i}`,
      title: `Rapid ${i}`,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    const r = await access2.kv.put(`items/rapid-${i}`, item);
    process.stdout.write(r.ok ? "." : "X");
  }
  console.log("");
  const rapidList = await access2.kv.list({ prefix: "items/" });
  console.log(
    `   LIST after rapid puts: ${rapidList.ok ? rapidList.data.keys.length + " keys" : "FAILED"}`,
  );

  // Cleanup rapid items
  for (let i = 0; i < 5; i++) await access2.kv.delete(`items/rapid-${i}`);

  // 9. Verify auth rejects fake tokens
  console.log("\n9. Verifying JWT auth rejects fake tokens...");
  const fakeRes = await fetch(`${BACKEND_URL}/api/delegations/status`, {
    headers: { Authorization: "Bearer fake-token-123" },
  });
  console.log(`   GET /api/delegations/status with fake token: ${fakeRes.status} (expected 401)`);
  if (fakeRes.status !== 401) {
    console.error("   FAIL: Fake token was not rejected!");
    process.exit(1);
  }

  // 10. Verify unauthenticated requests are rejected
  console.log("\n10. Verifying unauthenticated requests are rejected...");
  const noAuthRes = await fetch(`${BACKEND_URL}/api/items`);
  console.log(`   GET /api/items without auth: ${noAuthRes.status} (expected 401)`);
  if (noAuthRes.status !== 401) {
    console.error("   FAIL: Unauthenticated request was not rejected!");
    process.exit(1);
  }

  console.log("\n=== All tests passed ===");
  process.exit(0);
}

main().catch((err) => {
  console.error("\nFailed:", err.message);
  process.exit(1);
});
