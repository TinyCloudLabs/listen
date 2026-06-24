import { afterAll, beforeAll, describe, expect, test } from "bun:test";
import { Database } from "bun:sqlite";
import { zipSync } from "fflate";
import { chmodSync, existsSync, mkdtempSync, readFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { OtterClient } from "../src/otter.ts";

const PROJECT = join(import.meta.dir, "..");
const FAKE_TC = join(import.meta.dir, "fake-tc.ts");

const OWNED = [
  { otid: "OAAA", title: "Owned Meeting", start_time: 1700000000, duration: 120, transcript_updated_at: 5, hasPhotos: 0 },
];
const SHARED = [
  { otid: "OAAA", title: "Owned Meeting", start_time: 1700000000, transcript_updated_at: 5 },
  { otid: "OBBB", title: "Shared Meeting", start_time: 1700000500, transcript_updated_at: 7 },
];
const TXT: Record<string, string> = {
  OAAA: "Andrew Miller  0:05\nHello everyone.\n\nSri  0:12\nThanks for joining.\n",
  OBBB: "Bo  0:01\nShared content here.\n",
};

let server: ReturnType<typeof Bun.serve>;
let base: string;

beforeAll(() => {
  chmodSync(FAKE_TC, 0o755);
  server = Bun.serve({
    port: 0,
    async fetch(req) {
      const url = new URL(req.url);
      if (url.pathname === "/user") return Response.json({ userid: "u1", email: "sam@tinycloud.xyz" });
      if (url.pathname === "/speeches") {
        const source = url.searchParams.get("source");
        return Response.json({ speeches: source === "owned" ? OWNED : SHARED });
      }
      if (url.pathname === "/bulk_export") {
        const otid = new URLSearchParams(await req.text()).get("speech_otid_list")!;
        const txt = TXT[otid]!;
        // exercise the unzip path for shared speeches
        if (otid === "OBBB") {
          return new Response(zipSync({ "transcript.txt": new TextEncoder().encode(txt) }));
        }
        return new Response(txt);
      }
      return new Response("not found", { status: 404 });
    },
  });
  base = `http://localhost:${server.port}/`;
});

afterAll(() => server.stop(true));

describe("OtterClient", () => {
  const client = () => new OtterClient(base, { sessionid: "s", csrftoken: "c" });

  test("user() returns the account and validates the cookie", async () => {
    expect((await client().user()).userid).toBe("u1");
  });

  test("listAllSpeeches dedupes owned + shared by otid", async () => {
    const speeches = await client().listAllSpeeches();
    expect(new Set(speeches.map((s) => s.otid))).toEqual(new Set(["OAAA", "OBBB"]));
  });

  test("exportTxt returns plain text", async () => {
    expect(await client().exportTxt("OAAA")).toContain("Hello everyone.");
  });

  test("exportTxt transparently unzips a zipped export", async () => {
    expect(await client().exportTxt("OBBB")).toContain("Shared content here.");
  });
});

describe("full pipeline (scan -> pull -> upload) via CLI + fake tc", () => {
  const home = mkdtempSync(join(tmpdir(), "otter-home-"));
  const tcState = mkdtempSync(join(tmpdir(), "otter-tc-"));
  const env = {
    ...process.env,
    OTTER_IMPORTER_HOME: home,
    OTTER_IMPORTER_TC_PATH: FAKE_TC,
    FAKE_TC_STATE: tcState,
    OTTER_API_BASE: "",
    OTTER_SESSIONID: "s",
    OTTER_CSRFTOKEN: "c",
  };

  async function cli(...args: string[]): Promise<{ code: number; out: string; err: string }> {
    const proc = Bun.spawn(["bun", "src/cli.ts", ...args], {
      cwd: PROJECT,
      env: { ...env, OTTER_API_BASE: base },
      stdout: "pipe",
      stderr: "pipe",
    });
    const [out, err] = await Promise.all([new Response(proc.stdout).text(), new Response(proc.stderr).text()]);
    return { code: await proc.exited, out, err };
  }

  function conversationDb(): Database {
    const path = join(tcState, "sql", "applications", "xyz.tinycloud.listen__conversations.sqlite");
    expect(existsSync(path)).toBe(true);
    return new Database(path, { readonly: true });
  }

  test("scan records speeches", async () => {
    const r = await cli("scan");
    expect(r.code).toBe(0);
    expect(r.out).toContain("2 new");
  });

  test("pull fetches and parses transcripts", async () => {
    const r = await cli("pull");
    expect(r.code).toBe(0);
    expect(r.out).toContain("Pulled 2");
  });

  test("upload publishes both conversations to TinyCloud", async () => {
    const r = await cli("upload");
    expect(r.code).toBe(0);
    expect(r.out).toContain("Published 2");
  });

  test("conversation rows match the Listen contract", () => {
    const db = conversationDb();
    const rows = db.query("SELECT * FROM conversation ORDER BY id").all() as any[];
    expect(rows.map((r) => r.id)).toEqual(["otter-OAAA", "otter-OBBB"]);
    const a = rows[0];
    expect(a.source).toBe("otter");
    expect(a.source_id).toBe("otter:OAAA");
    expect(a.source_url).toBe("https://otter.ai/u/OAAA");
    expect(a.started_at).toBe(new Date(1700000000 * 1000).toISOString());
    expect(a.ended_at).toBe(new Date((1700000000 + 120) * 1000).toISOString());
    // inline transcript columns are populated (current Listen shape)
    const sentences = JSON.parse(a.transcript_json);
    expect(sentences.map((s: any) => s.speaker_name)).toEqual(["Andrew Miller", "Sri"]);
    expect(a.transcript_text).toContain("[00:05] Andrew Miller: Hello everyone.");
    expect(JSON.parse(a.metadata).importer).toBe("otter-importer");
    db.close();
  });

  test("participant rows are one per distinct speaker", () => {
    const db = conversationDb();
    const names = (db.query("SELECT name FROM participant WHERE conversation_id = 'otter-OAAA' ORDER BY name").all() as any[]).map(
      (r) => r.name,
    );
    expect(names).toEqual(["Andrew Miller", "Sri"]);
    db.close();
  });

  test("transcript blob is mirrored to KV", () => {
    const kv = join(tcState, "kv", "applications", "xyz.tinycloud.listen__transcript__otter-OAAA");
    expect(existsSync(kv)).toBe(true);
    const sentences = JSON.parse(readFileSync(kv, "utf8"));
    expect(sentences).toHaveLength(2);
    expect(sentences[0].text).toBe("Hello everyone.");
  });

  test("status reflects published state", async () => {
    const r = await cli("status", "--json");
    expect(JSON.parse(r.out).published).toBe(2);
  });
});
