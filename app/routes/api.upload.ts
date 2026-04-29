import type { ActionFunctionArgs } from 'react-router';
import { UTApi, UTFile } from 'uploadthing/server';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { auth } from '~/lib/auth.server';

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

const TOKEN = getToken();
console.log('[UT] token present at module init?', !!TOKEN, 'len:', TOKEN?.length);

const utapi = new UTApi({ token: TOKEN });

export async function action({ request }: ActionFunctionArgs) {
  const session = await auth.api.getSession({ headers: request.headers });
  if (!session?.user) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const url = new URL(request.url);
  const endpoint = url.searchParams.get('endpoint');
  if (!endpoint) {
    return Response.json({ error: 'Missing endpoint' }, { status: 400 });
  }

  const formData = await request.formData();
  const file = formData.get('file') as File | null;
  if (!file) {
    return Response.json({ error: 'No file provided' }, { status: 400 });
  }

  const allowedTypes = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];
  if (!allowedTypes.includes(file.type)) {
    return Response.json({ error: 'Invalid file type' }, { status: 400 });
  }

  const maxSize =
    endpoint === 'profileImage' ||
    endpoint === 'coverImage' ||
    endpoint === 'portfolioImage'
      ? 4 * 1024 * 1024
      : 2 * 1024 * 1024;
  if (file.size > maxSize) {
    return Response.json({ error: 'File too large' }, { status: 400 });
  }

  try {
    console.log('[upload] received', file.name, file.size, file.type);
    const arrayBuffer = await file.arrayBuffer();
    const utFile = new UTFile([arrayBuffer], file.name, { type: file.type });
    console.time('[upload] utapi');
    const res = await utapi.uploadFiles(utFile);
    console.timeEnd('[upload] utapi');
    console.log('[upload] result', res.error ? `error: ${res.error.message}` : `ok: ${res.data?.ufsUrl}`);

    if (res.error) {
      return Response.json({ error: res.error.message }, { status: 500 });
    }

    return Response.json({ url: res.data.ufsUrl });
  } catch (err: any) {
    console.error('[UT Server Upload]', err);
    return Response.json(
      { error: err.message || 'Upload failed' },
      { status: 500 },
    );
  }
}
