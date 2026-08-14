// ─── Development .env loader ──────────────────────────────────────────────
// The API server is a plain Node process: it only sees `process.env`. Unlike
// the Vite frontend (which loads `.env` files itself), nothing reads
// `.env` / `.env.local` for it, so secrets placed in those files (e.g. via
// the platform's `freebuff-env` tool) never reach the server. This module
// fills that gap: it scans the working directory and its parents for
// `.env.local` / `.env` and merges them into `process.env`.
//
// Values that are already set in the environment are never overwritten, so
// platform-injected variables (e.g. from API Keys) always win over files.
// Nearest file wins (cwd first) when the same key appears in several files.
//
// This file MUST be the first import of the server entry (src/index.ts) so
// the values are in place before any other module (e.g. lib/db) runs its own
// startup environment checks — same pattern as env-compat.ts.
//
// Parsing is intentionally minimal: `KEY=value`, optional `export ` prefix,
// `#` comments, and surrounding quotes. No interpolation/escaping, which is
// fine for the plain values the platform writes.
import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";

function loadEnvFile(file: string): void {
  if (!existsSync(file)) return;

  let text: string;
  try {
    text = readFileSync(file, "utf8");
  } catch {
    return;
  }

  for (const rawLine of text.split(/\r?\n/)) {
    const line = rawLine.trim();
    if (!line || line.startsWith("#")) continue;
    const match = line.match(
      /^(?:export\s+)?([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.*)$/,
    );
    if (!match) continue;

    const key = match[1];
    if (key in process.env) continue;

    let value = match[2].trim();
    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }
    process.env[key] = value;
  }
}

let dir = process.cwd();
for (let depth = 0; depth < 6 && dir !== resolve(dir, ".."); depth++) {
  loadEnvFile(resolve(dir, ".env.local"));
  loadEnvFile(resolve(dir, ".env"));
  dir = resolve(dir, "..");
}

export {};
