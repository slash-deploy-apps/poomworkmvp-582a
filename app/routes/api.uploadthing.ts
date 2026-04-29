import { createRouteHandler, createUploadthing } from 'uploadthing/remix';
import { UploadThingError } from 'uploadthing/server';
import type { FileRouter } from 'uploadthing/types';
import { auth } from '~/lib/auth.server';
import { readFileSync } from 'fs';
import { resolve } from 'path';

function getUploadThingToken(): string | undefined {
  if (process.env.UPLOADTHING_TOKEN) return process.env.UPLOADTHING_TOKEN;
  try {
    const envPath = resolve(process.cwd(), '.env.development');
    const content = readFileSync(envPath, 'utf-8');
    const match = content.match(/^UPLOADTHING_TOKEN=(.+)$/m);
    return match?.[1]?.trim();
  } catch {
    return undefined;
  }
}

const f = createUploadthing();

const authenticate = async ({ event }: { event: { request: Request } }) => {
  const session = await auth.api.getSession({ headers: event.request.headers });
  if (!session?.user) return null;
  return { id: session.user.id };
};

export const uploadRouter = {
  profileImage: f({
    image: { maxFileSize: '4MB', maxFileCount: 1 },
  })
    .middleware(async (opts) => {
      const user = await authenticate(opts);
      if (!user) throw new UploadThingError('Unauthorized');
      return { userId: user.id };
    })
    .onUploadComplete(async ({ file }) => {
      return { url: file.ufsUrl };
    }),

  coverImage: f({
    image: { maxFileSize: '4MB', maxFileCount: 1 },
  })
    .middleware(async (opts) => {
      const user = await authenticate(opts);
      if (!user) throw new UploadThingError('Unauthorized');
      return { userId: user.id };
    })
    .onUploadComplete(async ({ file }) => {
      return { url: file.ufsUrl };
    }),

  courseThumbnail: f({
    image: { maxFileSize: '2MB', maxFileCount: 1 },
  })
    .middleware(async (opts) => {
      const user = await authenticate(opts);
      if (!user) throw new UploadThingError('Unauthorized');
      return { userId: user.id };
    })
    .onUploadComplete(async ({ file }) => {
      return { url: file.ufsUrl };
    }),

  jobThumbnail: f({
    image: { maxFileSize: '2MB', maxFileCount: 1 },
  })
    .middleware(async (opts) => {
      const user = await authenticate(opts);
      if (!user) throw new UploadThingError('Unauthorized');
      return { userId: user.id };
    })
    .onUploadComplete(async ({ file }) => {
      return { url: file.ufsUrl };
    }),

  portfolioImage: f({
    image: { maxFileSize: '4MB', maxFileCount: 1 },
  })
    .middleware(async (opts) => {
      const user = await authenticate(opts);
      if (!user) throw new UploadThingError('Unauthorized');
      return { userId: user.id };
    })
    .onUploadComplete(async ({ file }) => {
      return { url: file.ufsUrl };
    }),
} satisfies FileRouter;

export type UploadRouter = typeof uploadRouter;

const uploadThingToken = getUploadThingToken();

const handler = createRouteHandler({
  router: uploadRouter,
  config: {
    token: uploadThingToken,
  },
});

export const loader = handler.loader;

export const action = async (args: any) => {
  console.log('[UT] action called, method:', args.request.method);
  const res = await handler.action(args);
  const body = await res.clone().text();
  console.log('[UT] action response status:', res.status, 'body:', body.slice(0, 500));
  return res;
};