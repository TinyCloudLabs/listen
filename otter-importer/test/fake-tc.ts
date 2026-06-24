#!/usr/bin/env bun
// Stand-in for the TinyCloud `tc` CLI used in tests. It speaks the same command
// surface src/tc.ts emits and persists to a real SQLite db + KV files under
// FAKE_TC_STATE, so `upload` exercises the genuine SQL/KV writes end to end.
import { Database } from "bun:sqlite";
import { mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";

const STATE = process.env.FAKE_TC_STATE;
if (!STATE) throw new Error("FAKE_TC_STATE not set");

const argv = process.argv.slice(2);
const flags: Record<string, string> = {};
const pos: string[] = [];
for (let i = 0; i < argv.length; i += 1) {
  const a = argv[i]!;
  if (a.startsWith("--")) {
    flags[a.slice(2)] = argv[i + 1] ?? "";
    i += 1;
  } else {
    pos.push(a);
  }
}

const space = flags.space ?? "default";

if (pos[0] === "auth" && pos[1] === "status") {
  console.log(`fake-tc ok (profile=${flags.profile ?? "default"})`);
} else if (pos[0] === "delegation" && pos[1] === "create") {
  console.log("ucan:fake-delegation");
} else if (pos[0] === "kv" && pos[1] === "put") {
  const key = pos[2]!;
  const value = pos[3] ?? "";
  const dir = join(STATE, "kv", space);
  mkdirSync(dir, { recursive: true });
  writeFileSync(join(dir, key.replace(/[/]/g, "__")), value);
} else if (pos[0] === "sql" && pos[1] === "execute") {
  const sql = pos[2]!;
  const params = JSON.parse(flags.params ?? "[]") as unknown[];
  const dir = join(STATE, "sql", space);
  mkdirSync(dir, { recursive: true });
  const db = new Database(join(dir, `${flags.db!.replace(/[/]/g, "__")}.sqlite`));
  db.query(sql).run(...(params as never[]));
  db.close();
} else {
  console.error(`fake-tc: unhandled command: ${pos.join(" ")}`);
  process.exit(1);
}
