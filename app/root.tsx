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
      <body className="bg-[#F4F1FA] text-foreground antialiased relative min-h-screen">
        {/* Clay Background Blobs */}
        <div className="pointer-events-none fixed inset-0 overflow-hidden -z-10" aria-hidden="true">
          <div className="absolute h-[60vh] w-[60vh] rounded-full bg-[#8B5CF6]/10 blur-3xl -top-[10%] -left-[10%] animate-clay-float" />
          <div className="absolute h-[50vh] w-[50vh] rounded-full bg-[#EC4899]/10 blur-3xl -right-[10%] top-[20%] animate-clay-float-delayed animation-delay-2000" />
          <div className="absolute h-[55vh] w-[55vh] rounded-full bg-[#0EA5E9]/10 blur-3xl bottom-[10%] left-[20%] animate-clay-float-slow animation-delay-4000" />
          <div className="absolute h-[40vh] w-[40vh] rounded-full bg-[#10B981]/10 blur-3xl bottom-[5%] right-[15%] animate-clay-float-delayed" />
        </div>
        {children}
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
