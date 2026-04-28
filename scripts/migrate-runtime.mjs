#!/usr/bin/env node
import path from 'node:path';
import { existsSync } from 'node:fs';
import Database from 'better-sqlite3';
import { drizzle } from 'drizzle-orm/better-sqlite3';
import { migrate } from 'drizzle-orm/better-sqlite3/migrator';

if (process.env.SKIP_DB_MIGRATE_ON_START === '1') {
  process.exit(0);
}

const databasePath = process.env.DATABASE_URL ?? 'sqlite.db';
const migrationsFolder = path.join(process.cwd(), 'drizzle');

if (!existsSync(migrationsFolder)) {
  console.error(
    `[migrate-runtime] Missing migrations folder: ${migrationsFolder}`,
  );
  process.exit(1);
}

const sqlite = new Database(databasePath);
sqlite.pragma('journal_mode = WAL');
sqlite.pragma('foreign_keys = ON');

try {
  const db = drizzle(sqlite);
  migrate(db, { migrationsFolder });
  console.log('[migrate-runtime] Migrations applied (or already up to date).');
} finally {
  sqlite.close();
}
