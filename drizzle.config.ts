import { defineConfig } from 'drizzle-kit';
import { loadDotenv } from './app/lib/env.server';

loadDotenv();

const databaseUrl = process.env.DATABASE_URL ?? 'sqlite.db';

function isLibsql(url: string): boolean {
  return (
    url.startsWith('libsql://') ||
    url.startsWith('https://') ||
    url.startsWith('http://')
  );
}

export default defineConfig({
  schema: './app/db/schema.ts',
  out: './drizzle',
  dialect: 'sqlite',
  dbCredentials: isLibsql(databaseUrl)
    ? { url: databaseUrl, authToken: process.env.DATABASE_AUTH_TOKEN }
    : { url: databaseUrl },
});
