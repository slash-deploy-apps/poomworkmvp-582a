import { createUploadthing } from 'uploadthing/remix';
import { UploadThingError } from 'uploadthing/server';
import type { FileRouter } from 'uploadthing/types';
import { auth } from '~/lib/auth.server';

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
