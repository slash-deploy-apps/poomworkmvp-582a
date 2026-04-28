import {
  Links,
  Meta,
  Outlet,
  Scripts,
  ScrollRestoration,
  isRouteErrorResponse,
  useLoaderData,
} from 'react-router';
import type { LoaderFunctionArgs, MiddlewareFunction } from 'react-router';

import { auth } from '~/lib/auth.server';
import { Header } from '~/components/layout/header';
import { Footer } from '~/components/layout/footer';
import { applyOpenCorsToHeaders } from '~/lib/open-cors';

import './styles/globals.css';

const openCorsMiddleware: MiddlewareFunction = async ({ request }, next) => {
  if (request.method === 'OPTIONS') {
    const headers = new Headers();
    applyOpenCorsToHeaders(headers);
    return new Response(null, { status: 204, headers });
  }

  const response = (await next()) as Response;
  const headers = new Headers(response.headers);
  applyOpenCorsToHeaders(headers);
  return new Response(response.body, {
    status: response.status,
    statusText: response.statusText,
    headers,
  });
};

export const middleware = [openCorsMiddleware];

export async function loader({ request }: LoaderFunctionArgs) {
  const session = await auth.api.getSession({ headers: request.headers });
  return { user: session?.user ?? null };
}
export function Layout({ children }: { children: React.ReactNode }) {
  return (
<html lang="ko" className="light">
      <head>
        <meta charSet="utf-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <Meta />
        <Links />
      </head>
      <body className="bg-background text-foreground antialiased">
        {children}
        <ScrollRestoration />
        <Scripts />
      </body>
    </html>
  );
}

export default function App() {
  const { user } = useLoaderData<typeof loader>();
  return (
    <>
      <Header user={user} />
      <main className="flex-1">
        <Outlet />
      </main>
      <Footer />
    </>
  );
}

export function ErrorBoundary({ error }: { error: unknown }) {
  let message = '오류!';
  let details = '예상치 못한 오류가 발생했습니다.';
  let stack: string | undefined;

  if (isRouteErrorResponse(error)) {
    message = error.status === 404 ? '404' : '오류';
    details =
      error.status === 404
        ? '요청하신 페이지를 찾을 수 없습니다.'
        : error.statusText || details;
  } else if (import.meta.env.DEV && error instanceof Error) {
    details = error.message;
    stack = error.stack;
  }

  return (
    <main className="flex min-h-screen items-center justify-center p-4">
      <div className="space-y-4 text-center">
        <h1 className="text-4xl font-bold">{message}</h1>
        <p className="text-muted-foreground">{details}</p>
        {stack && (
          <pre className="mt-4 w-full overflow-x-auto rounded-md bg-muted p-4 text-left text-sm">
            <code>{stack}</code>
          </pre>
        )}
      </div>
    </main>
  );
}
