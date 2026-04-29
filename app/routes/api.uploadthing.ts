import { createRouteHandler } from 'uploadthing/remix';
import { uploadRouter } from '~/lib/uploadthing-router.server';
import { UPLOADTHING_TOKEN } from '~/lib/uploadthing-token.server';

export type { UploadRouter } from '~/lib/uploadthing-router.server';

const uploadThingToken = UPLOADTHING_TOKEN;

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