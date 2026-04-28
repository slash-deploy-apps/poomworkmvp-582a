import { auth } from '~/lib/auth.server';
import { applyOpenCorsToHeaders } from '~/lib/open-cors';

import type { Route } from './+types/api.auth.$';

export async function loader({ request }: Route.LoaderArgs) {
  if (request.method.toUpperCase() === 'OPTIONS') {
    const headers = new Headers();
    applyOpenCorsToHeaders(headers);
    return new Response(null, { status: 204, headers });
  }

  return auth.handler(request);
}

export async function action({ request }: Route.ActionArgs) {
  return auth.handler(request);
}
