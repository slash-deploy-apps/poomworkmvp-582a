import { existsSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';

let loaded = false;

/**
 * Loads .env.vault first (S/ASH-managed secrets), then .env.local (user overrides).
 * Later file wins on conflicting keys. No-op after first call.
 */
export function loadDotenv(cwd: string = process.cwd()): void {
  if (loaded) return;
  loaded = true;

  for (const file of ['.env.production', '.env.vault', '.env.local']) {
    const path = resolve(cwd, file);
    if (!existsSync(path)) continue;

    const content = readFileSync(path, 'utf8');
    for (const line of content.split(/\r?\n/)) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith('#')) continue;

      const eq = trimmed.indexOf('=');
      if (eq < 0) continue;

      const key = trimmed.slice(0, eq).trim();
      let value = trimmed.slice(eq + 1).trim();

      if (
        value.length >= 2
        && ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'")))
      ) {
        value = value.slice(1, -1);
      }

      if (process.env[key] === undefined) process.env[key] = value;
    }
  }
}
