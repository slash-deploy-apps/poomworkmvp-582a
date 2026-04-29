import { UTApi, UTFile } from 'uploadthing/server';
import { readFileSync } from 'node:fs';

const env = readFileSync('.env.development', 'utf-8');
const token = env.match(/^UPLOADTHING_TOKEN=(.+)$/m)?.[1]?.trim();
console.log('token loaded?', !!token, 'len:', token?.length);

const utapi = new UTApi({ token });

const png = Buffer.from(
  'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNkYAAAAAYAAjCB0C8AAAAASUVORK5CYII=',
  'base64',
);

const file = new UTFile([png], 'test-pixel.png', { type: 'image/png' });

console.time('upload');
const res = await utapi.uploadFiles(file);
console.timeEnd('upload');

console.log(JSON.stringify(res, null, 2));
process.exit(res.error ? 1 : 0);
