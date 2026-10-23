import fs from 'node:fs';
import path from 'node:path';

/**
 * Loads the repository root `.env` into `process.env` without overwriting
 * variables that are already set (real process env always wins).
 *
 * Node 20.12+ exposes `process.loadEnvFile`, which we use when available.
 * The manual parser below is the fallback for older runtimes.
 */

function findRepoRoot(startDir: string): string | null {
  let current = path.resolve(startDir);
  for (let depth = 0; depth < 8; depth += 1) {
    if (fs.existsSync(path.join(current, 'pnpm-workspace.yaml'))) {
      return current;
    }
    const parent = path.dirname(current);
    if (parent === current) break;
    current = parent;
  }
  return null;
}

function parseEnv(contents: string): Record<string, string> {
  const result: Record<string, string> = {};

  for (const rawLine of contents.split(/\r?\n/)) {
    const line = rawLine.trim();
    if (line === '' || line.startsWith('#')) continue;

    const separator = line.indexOf('=');
    if (separator < 1) continue;

    const key = line.slice(0, separator).trim();
    if (!/^[A-Za-z_][A-Za-z0-9_]*$/.test(key)) continue;

    let value = line.slice(separator + 1).trim();
    if (value.length >= 2) {
      const first = value[0];
      const last = value[value.length - 1];
      if ((first === '"' && last === '"') || (first === "'" && last === "'")) {
        value = value.slice(1, -1);
      }
    }

    result[key] = value;
  }

  return result;
}

export function loadRootEnv(): void {
  const repoRoot = findRepoRoot(__dirname);
  if (!repoRoot) return;

  const envPath = path.join(repoRoot, '.env');
  if (!fs.existsSync(envPath)) return;

  const loader = (process as NodeJS.Process & { loadEnvFile?: (p: string) => void }).loadEnvFile;
  if (typeof loader === 'function') {
    loader(envPath);
    return;
  }

  const parsed = parseEnv(fs.readFileSync(envPath, 'utf8'));
  for (const [key, value] of Object.entries(parsed)) {
    if (process.env[key] === undefined) {
      process.env[key] = value;
    }
  }
}

loadRootEnv();
