import { redirect } from 'react-router';
import type { ActionFunctionArgs } from 'react-router';
import { auth } from '~/lib/auth.server';

export async function action({ request }: ActionFunctionArgs) {
  await auth.api.signOut({ headers: request.headers });
  return redirect('/');
}

export async function loader() {
  return redirect('/');
}