#!/usr/bin/env node
/**
 * Keeps .next/static/css/app/layout.css in sync with the compiled hashed CSS.
 * Next.js 15 dev sometimes serves HTML that references app/layout.css while the
 * file is missing — this causes the entire UI to render unstyled.
 */
import {
  copyFileSync,
  existsSync,
  mkdirSync,
  readdirSync,
  statSync,
  watch,
} from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const distDir = process.env.NEXT_DIST_DIR || ".next-dev";
const cssDir = path.join(root, distDir, "static/css");
const appCssDir = path.join(cssDir, "app");
const layoutCss = path.join(appCssDir, "layout.css");

function latestHashedCss() {
  if (!existsSync(cssDir)) return null;
  const files = readdirSync(cssDir)
    .filter((name) => name.endsWith(".css"))
    .map((name) => {
      const fullPath = path.join(cssDir, name);
      return { name, mtime: statSync(fullPath).mtimeMs };
    })
    .sort((a, b) => b.mtime - a.mtime);

  return files[0] ? path.join(cssDir, files[0].name) : null;
}

let lastSource = "";

function syncLayoutCss() {
  const source = latestHashedCss();
  if (!source || source === lastSource) return false;

  mkdirSync(appCssDir, { recursive: true });
  copyFileSync(source, layoutCss);
  lastSource = source;
  return true;
}

let debounce = null;
function scheduleSync() {
  if (debounce) clearTimeout(debounce);
  debounce = setTimeout(() => {
    debounce = null;
    if (syncLayoutCss()) {
      console.log("[css-sync] Linked layout.css to latest compiled stylesheet");
    }
  }, 150);
}

function startWatcher() {
  if (!existsSync(cssDir)) return false;
  syncLayoutCss();
  watch(cssDir, { recursive: true }, scheduleSync);
  console.log(`[css-sync] Watching ${distDir}/static/css for changes`);
  return true;
}

if (!startWatcher()) {
  const poll = setInterval(() => {
    if (startWatcher()) clearInterval(poll);
  }, 400);
}
