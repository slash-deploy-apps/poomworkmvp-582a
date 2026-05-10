import { loadDotenv } from '~/lib/env.server';

loadDotenv();

import { drizzle as drizzleBetterSqlite3 } from 'drizzle-orm/better-sqlite3';
import { drizzle as drizzleLibsql } from 'drizzle-orm/libsql';
import { createClient } from '@libsql/client';
import Database from 'better-sqlite3';

import * as schema from '~/db/schema';

const databaseUrl = process.env.DATABASE_URL ?? 'sqlite.db';

function isLibsql(url: string): boolean {
  return (
    url.startsWith('libsql://') ||
    url.startsWith('https://') ||
    url.startsWith('http://')
  );
}

let db:
  | ReturnType<typeof drizzleBetterSqlite3>
  | ReturnType<typeof drizzleLibsql>;

if (isLibsql(databaseUrl)) {
  const client = createClient({
    url: databaseUrl,
    authToken: process.env.DATABASE_AUTH_TOKEN,
  });
  db = drizzleLibsql(client, { schema });
} else {
  const sqlite = new Database(databaseUrl);
  sqlite.pragma('journal_mode = WAL');
  sqlite.pragma('foreign_keys = ON');
  db = drizzleBetterSqlite3(sqlite, { schema });
}

export { db };
