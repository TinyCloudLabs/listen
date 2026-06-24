#!/usr/bin/env bun
import { mkdirSync } from "node:fs";
import { getConfig, type AppConfig } from "./config.ts";
import { resolveCookie, storeCookie } from "./cookie.ts";
import { Store } from "./db.ts";
import { OtterClient } from "./otter.ts";
import { parseOtterTxt, transcriptText } from "./transcript.ts";
import { authStatus, createDelegation, type TcOptions } from "./tc.ts";
import { uploadPending } from "./upload.ts";

interface ParsedArgs {
  command: string;
  positionals: string[];
  flags: Record<string, string | boolean>;
}

async function main(): Promise<void> {
  const args = parseArgs(process.argv.slice(2));
  const config = getConfig();

  switch (args.command) {
    case "init": {
      mkdirSync(config.homeDir, { recursive: true });
      new Store(config.dbPath).close();
      console.log(`Initialized ${config.homeDir}`);
      break;
    }

    case "auth":
      console.log(authStatus(tcOptions(args)));
      break;

    case "permissions": {
      const to = stringFlag(args, "to");
      const expiry = stringFlag(args, "expiry") ?? "30d";
      if (!to) {
        console.log("Required TinyCloud capabilities:");
        console.log(`- KV get/put/list under ${config.listenKvPrefix}/`);
        console.log(`- SQL read/write on ${config.listenSqlDb} from your authenticated tc profile`);
        console.log("Pass --to <did> to mint the KV delegation with tc.");
        break;
      }
      console.log(
        createDelegation(to, `${config.listenKvPrefix}/`, ["kv/get", "kv/put", "kv/list"], expiry, tcOptions(args)),
      );
      break;
    }

    case "cookie": {
      mkdirSync(config.homeDir, { recursive: true });
      const sessionid = stringFlag(args, "sessionid");
      const csrftoken = stringFlag(args, "csrftoken");
      if (sessionid && csrftoken) storeCookie(config.cookiePath, { sessionid, csrftoken });
      const client = makeClient(config, args);
      const user = await client.user();
      console.log(`Otter cookie OK — userid=${user.userid} email=${user.email ?? "?"}`);
      if (sessionid && csrftoken) console.log(`Stored ${config.cookiePath}`);
      break;
    }

    case "scan": {
      const max = numberFlag(args, "max");
      const client = makeClient(config, args);
      const speeches = await client.listAllSpeeches();
      const slice = max ? speeches.slice(0, max) : speeches;
      const store = new Store(config.dbPath);
      let created = 0;
      let changed = 0;
      let unchanged = 0;
      for (const sp of slice) {
        const r = store.upsertSpeech(sp);
        if (r === "created") created += 1;
        else if (r === "changed") changed += 1;
        else unchanged += 1;
      }
      store.close();
      console.log(`Scanned ${slice.length} speech(es): ${created} new, ${changed} changed, ${unchanged} unchanged`);
      break;
    }

    case "pull": {
      const limit = numberFlag(args, "max") ?? 25;
      const client = makeClient(config, args);
      const store = new Store(config.dbPath);
      const rows = store.pendingPull(limit);
      let pulled = 0;
      let failed = 0;
      for (const row of rows) {
        try {
          const sentences = parseOtterTxt(await client.exportTxt(row.otid));
          store.savePull(row.otid, JSON.stringify(sentences), transcriptText(sentences), sentences.length);
          pulled += 1;
        } catch (err) {
          store.markPullFailed(row.otid, err instanceof Error ? err.message : String(err));
          failed += 1;
        }
      }
      store.close();
      console.log(`Pulled ${pulled}; failed ${failed}`);
      break;
    }

    case "status": {
      const store = new Store(config.dbPath);
      const counts = store.counts();
      store.close();
      console.log(args.flags.json ? JSON.stringify(counts, null, 2) : formatCounts(counts));
      break;
    }

    case "list": {
      const limit = numberFlag(args, "limit") ?? 50;
      const store = new Store(config.dbPath);
      const rows = store.list(limit);
      store.close();
      for (const row of rows) {
        console.log(`${row.status.padEnd(13)} ${(row.title ?? "").slice(0, 48).padEnd(48)} ${row.otid}`);
      }
      break;
    }

    case "upload": {
      const limit = numberFlag(args, "limit") ?? 25;
      const store = new Store(config.dbPath);
      const result = uploadPending(config, store, limit, { ...tcOptions(args), dryRun: Boolean(args.flags["dry-run"]) });
      store.close();
      console.log(`Published ${result.published}; failed ${result.failed}`);
      break;
    }

    case "doctor": {
      new Store(config.dbPath).close();
      console.log(`State:         ${config.homeDir}`);
      console.log(`Database:      ${config.dbPath}`);
      console.log(`Cookie:        ${config.cookiePath}`);
      console.log(`Otter API:     ${config.otterApiBase}`);
      console.log(`Listen SQL DB: ${config.listenSqlDb}`);
      console.log(`Listen KV:     ${config.listenKvPrefix}`);
      console.log(`Listen space:  ${config.listenAppSpace}`);
      try {
        console.log(authStatus(tcOptions(args)));
      } catch (err) {
        console.log(err instanceof Error ? err.message : String(err));
      }
      break;
    }

    case "help":
    default:
      printHelp();
      if (args.command !== "help") process.exitCode = 1;
  }
}

function makeClient(config: AppConfig, args: ParsedArgs): OtterClient {
  const cookie = resolveCookie(config.cookiePath, {
    sessionid: stringFlag(args, "sessionid"),
    csrftoken: stringFlag(args, "csrftoken"),
  });
  return new OtterClient(config.otterApiBase, cookie);
}

function parseArgs(argv: string[]): ParsedArgs {
  const [command = "help", ...rest] = argv;
  const flags: Record<string, string | boolean> = {};
  const positionals: string[] = [];
  for (let i = 0; i < rest.length; i += 1) {
    const arg = rest[i]!;
    if (!arg.startsWith("--")) {
      positionals.push(arg);
      continue;
    }
    const [rawKey, inlineValue] = arg.slice(2).split("=", 2);
    if (inlineValue !== undefined) {
      flags[rawKey!] = inlineValue;
      continue;
    }
    const next = rest[i + 1];
    if (next && !next.startsWith("--")) {
      flags[rawKey!] = next;
      i += 1;
    } else {
      flags[rawKey!] = true;
    }
  }
  return { command, positionals, flags };
}

function tcOptions(args: ParsedArgs): TcOptions {
  return { profile: stringFlag(args, "profile"), host: stringFlag(args, "host") };
}

function stringFlag(args: ParsedArgs, name: string): string | undefined {
  const value = args.flags[name];
  return typeof value === "string" && value.length > 0 ? value : undefined;
}

function numberFlag(args: ParsedArgs, name: string): number | undefined {
  const value = stringFlag(args, name);
  if (!value) return undefined;
  const parsed = Number(value);
  if (!Number.isFinite(parsed) || parsed < 1) throw new Error(`--${name} must be a positive number`);
  return Math.floor(parsed);
}

function formatCounts(counts: Record<string, number>): string {
  return Object.entries(counts)
    .map(([k, v]) => `${k}: ${v}`)
    .join("\n");
}

function printHelp(): void {
  console.log(`otter-importer — pull Otter.ai transcripts into TinyCloud for Listen

Usage:
  otter-importer init
  otter-importer cookie [--sessionid s --csrftoken c]   validate (and store) the Otter cookie
  otter-importer auth [--profile name] [--host url]      tc auth status
  otter-importer permissions [--to did] [--expiry 30d]
  otter-importer scan [--max n]                          list Otter speeches (owned+shared) into local db
  otter-importer pull [--max n]                          fetch + parse transcripts for new/changed speeches
  otter-importer status [--json]
  otter-importer list [--limit n]
  otter-importer upload [--limit n] [--dry-run] [--profile name] [--host url]
  otter-importer doctor

Cookie: from --sessionid/--csrftoken, OTTER_SESSIONID/OTTER_CSRFTOKEN, or ${"~/.otter-importer/cookie.json"}.
Get it with scripts/dump_cookie.py or the browser devtools (otter.ai > Application > Cookies).
`);
}

main().catch((err) => {
  console.error(err instanceof Error ? err.message : String(err));
  process.exit(1);
});
