import type { ActionFunctionArgs } from 'react-router';
import { UTFile } from 'uploadthing/server';
import { auth } from '~/lib/auth.server';
import { utapi } from '~/lib/uploadthing-token.server';

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

  const imageEndpoints = new Set([
    'profileImage',
    'coverImage',
    'portfolioImage',
    'jobThumbnail',
    'courseThumbnail',
    'lessonThumbnail',
  ]);
  const deliverableEndpoints = new Set(['deliverable']);

  const imageTypes = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];
  const deliverableTypes = [
    ...imageTypes,
    'application/pdf',
    'application/zip',
    'application/x-zip-compressed',
    'application/x-rar-compressed',
    'application/vnd.rar',
    'application/x-7z-compressed',
    'text/plain',
    'text/markdown',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'application/vnd.ms-excel',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    'application/vnd.ms-powerpoint',
    'application/vnd.openxmlformats-officedocument.presentationml.presentation',
    'video/mp4',
    'video/quicktime',
    'video/webm',
  ];

  let allowedTypes: string[];
  let maxSize: number;
  if (deliverableEndpoints.has(endpoint)) {
    allowedTypes = deliverableTypes;
    maxSize = 32 * 1024 * 1024; // 32MB for deliverables
  } else if (imageEndpoints.has(endpoint)) {
    allowedTypes = imageTypes;
    maxSize = 4 * 1024 * 1024;
  } else {
    allowedTypes = imageTypes;
    maxSize = 2 * 1024 * 1024;
  }

  if (!allowedTypes.includes(file.type)) {
    return Response.json({ error: `Invalid file type: ${file.type}` }, { status: 400 });
  }
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
