import { existsSync, readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

interface StartedProcess {
  name: string;
  pid: number;
}

const __dirname = dirname(fileURLToPath(import.meta.url));
const TEST_DIR = resolve(__dirname, "..");
const PID_PATH = resolve(TEST_DIR, ".tmp", "hooks-real-e2e", "pids.json");

function killProcessGroup(pid: number): void {
  try {
    process.kill(-pid, "SIGTERM");
  } catch {
    try {
      process.kill(pid, "SIGTERM");
    } catch {
      return;
    }
  }
}

export default async function globalTeardown(): Promise<void> {
  if (!existsSync(PID_PATH)) return;

  const pids = JSON.parse(readFileSync(PID_PATH, "utf-8")) as StartedProcess[];
  for (const proc of pids.reverse()) {
    killProcessGroup(proc.pid);
  }

  await new Promise((resolveDelay) => setTimeout(resolveDelay, 1000));

  for (const proc of pids) {
    try {
      process.kill(-proc.pid, "SIGKILL");
    } catch {
      try {
        process.kill(proc.pid, "SIGKILL");
      } catch {
        // Already exited.
      }
    }
  }
}
