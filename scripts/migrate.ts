/**
 * scripts/migrate.ts
 *
 * Turso(libSQL) 또는 로컬 SQLite에 Drizzle 마이그레이션을 적용합니다.
 * GitHub Actions 및 로컬 개발 환경 모두에서 사용합니다.
 *
 * 사용법:
 *   DATABASE_URL=libsql://... DATABASE_AUTH_TOKEN=... npx tsx scripts/migrate.ts
 */

import { loadDotenv } from '../app/lib/env.server.js';

loadDotenv();

const databaseUrl = process.env.DATABASE_URL ?? 'sqlite.db';

function isLibsql(url: string): boolean {
  return (
    url.startsWith('libsql://') ||
    url.startsWith('https://') ||
    url.startsWith('http://')
  );
}

if (isLibsql(databaseUrl)) {
  const { createClient } = await import('@libsql/client');
  const { drizzle } = await import('drizzle-orm/libsql');
  const { migrate } = await import('drizzle-orm/libsql/migrator');

  const client = createClient({
    url: databaseUrl,
    authToken: process.env.DATABASE_AUTH_TOKEN,
  });
  const db = drizzle(client);

  console.log(`🚀 Migrating Turso DB: ${databaseUrl}`);
  await migrate(db, { migrationsFolder: './drizzle' });
  console.log('✅ Migration complete');
  client.close();
} else {
  const Database = (await import('better-sqlite3')).default;
  const { drizzle } = await import('drizzle-orm/better-sqlite3');
  const { migrate } = await import('drizzle-orm/better-sqlite3/migrator');

  const sqlite = new Database(databaseUrl);
  sqlite.pragma('journal_mode = WAL');
  sqlite.pragma('foreign_keys = ON');
  const db = drizzle(sqlite);

  console.log(`🚀 Migrating local SQLite: ${databaseUrl}`);
  migrate(db, { migrationsFolder: './drizzle' });
  console.log('✅ Migration complete');
  sqlite.close();
}
