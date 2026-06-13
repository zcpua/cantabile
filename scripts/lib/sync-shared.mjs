import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";

const repoRoot = resolve(new URL("../..", import.meta.url).pathname);

export function loadEnvFiles(files = [".env", ".env.local"]) {
  for (const file of files) {
    const path = resolve(repoRoot, file);
    if (!existsSync(path)) continue;

    for (const line of readFileSync(path, "utf8").split(/\r?\n/)) {
      const match = line.match(/^\s*([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.*)?\s*$/);
      if (!match || process.env[match[1]] !== undefined) continue;
      process.env[match[1]] = unquoteEnvValue(match[2] ?? "");
    }
  }
}

function unquoteEnvValue(value) {
  const trimmed = value.trim();
  if ((trimmed.startsWith('"') && trimmed.endsWith('"')) || (trimmed.startsWith("'") && trimmed.endsWith("'"))) {
    return trimmed.slice(1, -1);
  }
  return trimmed;
}

export function parseFlagArgs(argv, spec) {
  const parsed = { ...spec.defaults };
  const aliases = spec.aliases ?? {};
  const flags = new Set(spec.flags ?? []);
  const valued = new Set(spec.valued ?? []);

  for (let index = 0; index < argv.length; index += 1) {
    const raw = argv[index];
    const name = aliases[raw] ?? raw;

    if (flags.has(name)) {
      parsed[name.replace(/^--/, "").replace(/-([a-z])/g, (_, c) => c.toUpperCase())] = true;
      continue;
    }

    if (valued.has(name)) {
      const value = argv[++index];
      if (value === undefined) throw new Error(`Missing value for argument: ${raw}`);
      const key = name.replace(/^--/, "").replace(/-([a-z])/g, (_, c) => c.toUpperCase());
      parsed[key] = spec.numeric?.includes(name) ? Number(value) : value;
      continue;
    }

    throw new Error(`Unknown argument: ${raw}`);
  }

  return parsed;
}

export function compactRecord(record) {
  return Object.fromEntries(Object.entries(record).filter(([, value]) => value !== undefined && value !== null));
}

export function nullish(value) {
  return value ?? null;
}

export async function fetchJson(url, init = {}) {
  const headers = {
    "User-Agent": "cantabile-sync/0.1 (+https://github.com/zcpua/cantabile; bot@cantabile.local)",
    "Accept": "application/json",
    ...init.headers,
  };

  const response = await fetch(url, { ...init, headers });
  if (!response.ok) {
    const body = await response.text().catch(() => "");
    throw new Error(`Fetch failed ${response.status} ${response.statusText} for ${url}: ${body.slice(0, 200)}`);
  }
  return response.json();
}

export async function delay(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
