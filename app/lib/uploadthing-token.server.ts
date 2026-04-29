import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { UTApi } from 'uploadthing/server';

function getToken(): string | undefined {
  if (process.env.UPLOADTHING_TOKEN) return process.env.UPLOADTHING_TOKEN;
  for (const filename of ['.env.local', '.env', '.env.development']) {
    try {
      const content = readFileSync(resolve(process.cwd(), filename), 'utf-8');
      const match = content.match(/^UPLOADTHING_TOKEN=(.+)$/m);
      const token = match?.[1]?.trim();
      if (token) return token;
    } catch {
      // file not found, try next
    }
  }
  return undefined;
}

export const UPLOADTHING_TOKEN = getToken();
console.log(
  '[UT] token present at module init?',
  !!UPLOADTHING_TOKEN,
  'len:',
  UPLOADTHING_TOKEN?.length,
);

export const utapi = new UTApi({ token: UPLOADTHING_TOKEN });
