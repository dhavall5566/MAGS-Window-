#!/usr/bin/env node
/**
 * Reliable dev startup:
 * 1. Stop any existing Next dev servers on the target port (and legacy 3000/3001)
 * 2. Use a dedicated dev output dir (.next-dev) so `next build` never races with dev
 * 3. Optionally clear dev cache with --clean (never wipes production .next)
 * 4. Start CSS sync helper (fixes layout.css 404 in dev)
 * 5. Start one dev server (webpack by default)
 *
 * Port: PORT env, --port / -p flag, or default 5151
 */
import { execSync, spawn } from "node:child_process";
import { rmSync, writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import path from "node:path";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const lockPath = path.join(root, ".dev-server.lock");
const DEV_DIST_DIR = ".next-dev";

function parsePort() {
  const portFlagIndex = process.argv.findIndex((arg) => arg === "--port" || arg === "-p");
  if (portFlagIndex >= 0 && process.argv[portFlagIndex + 1]) {
    const parsed = Number(process.argv[portFlagIndex + 1]);
    if (Number.isFinite(parsed) && parsed > 0) return parsed;
  }
  if (process.env.PORT) {
    const parsed = Number(process.env.PORT);
    if (Number.isFinite(parsed) && parsed > 0) return parsed;
  }
  return 5151;
}

const port = parsePort();
const ports = [...new Set([port, 3000, 3001])];
const shouldClean = process.argv.includes("--clean");

const devEnv = {
  ...process.env,
  NEXT_DIST_DIR: DEV_DIST_DIR,
};

function sleep(ms) {
  execSync(`sleep ${ms / 1000}`);
}

function killPort(port) {
  try {
    const output = execSync(`lsof -ti:${port}`, { encoding: "utf8", cwd: root }).trim();
    if (!output) return;
    for (const pid of output.split("\n").filter(Boolean)) {
      try {
        process.kill(Number(pid), "SIGKILL");
      } catch {
        // already exited
      }
    }
  } catch {
    // port is free
  }
}

function killNextDevProcesses() {
  try {
    execSync('pkill -9 -f "next dev" 2>/dev/null || true', {
      cwd: root,
      stdio: "ignore",
      shell: true,
    });
  } catch {
    // none running
  }
}

function removeLock() {
  try {
    rmSync(lockPath, { force: true });
  } catch {
    // ignore
  }
}

console.log("Stopping any existing dev server...");
for (const port of ports) killPort(port);
killNextDevProcesses();
sleep(800);

if (shouldClean) {
  console.log(`Clearing dev cache (${DEV_DIST_DIR}, node_modules/.cache)...`);
  rmSync(path.join(root, DEV_DIST_DIR), { recursive: true, force: true });
  rmSync(path.join(root, "node_modules/.cache"), { recursive: true, force: true });
} else {
  console.log(`Using dev output dir: ${DEV_DIST_DIR} (production .next is untouched)`);
}

removeLock();
writeFileSync(lockPath, String(process.pid));

const useTurbopack = process.argv.includes("--turbopack");
const nextArgs = useTurbopack
  ? ["next", "dev", "--turbopack", "-p", String(port)]
  : ["next", "dev", "-p", String(port)];

console.log(
  `Starting MAGS dev server on http://localhost:${port} (${useTurbopack ? "Turbopack" : "Webpack"})...\n`
);

const cssSync = spawn("node", ["scripts/sync-dev-css.mjs"], {
  cwd: root,
  stdio: "inherit",
  shell: false,
  env: devEnv,
});

const child = spawn("npx", nextArgs, {
  cwd: root,
  stdio: "inherit",
  shell: true,
  env: devEnv,
});

function shutdown(signal) {
  removeLock();
  cssSync.kill(signal);
  child.kill(signal);
}

child.on("exit", (code) => {
  removeLock();
  cssSync.kill("SIGTERM");
  process.exit(code ?? 0);
});

cssSync.on("exit", () => {
  // css sync exited unexpectedly; dev can continue
});

process.on("SIGINT", () => shutdown("SIGINT"));
process.on("SIGTERM", () => shutdown("SIGTERM"));
process.on("exit", removeLock);
