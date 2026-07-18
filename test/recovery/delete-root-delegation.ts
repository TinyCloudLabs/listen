import { Database } from "bun:sqlite";
import { resolve } from "node:path";
import { CID } from "multiformats/cid";

const [dataDir, delegationCid] = process.argv.slice(2);
if (!dataDir || !delegationCid) {
  throw new Error("Usage: bun delete-root-delegation.ts <data-dir> <delegation-cid>");
}

const db = new Database(resolve(dataDir, "caps.db"));
const delegationId = Buffer.from(CID.parse(delegationCid).multihash.bytes);

try {
  // Intentionally leave child and ability rows in place. The production
  // incident lost the registered root while stored chains and app data
  // survived; deleting related rows would simulate a different failure.
  db.exec("PRAGMA foreign_keys = OFF");
  const before = db
    .query("SELECT COUNT(*) AS count FROM delegation WHERE id = ?")
    .get(delegationId) as { count: number };
  if (before.count !== 1) {
    throw new Error(`Expected one root delegation row for ${delegationCid}, found ${before.count}`);
  }

  db.query("DELETE FROM delegation WHERE id = ?").run(delegationId);
  const after = db
    .query("SELECT COUNT(*) AS count FROM delegation WHERE id = ?")
    .get(delegationId) as { count: number };
  if (after.count !== 0) throw new Error("Root delegation fault injection did not persist");
} finally {
  db.close();
}
