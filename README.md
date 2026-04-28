# S/ASH Webapp Starter

First-party boilerplate used by S/ASH Cloud to scaffold new user projects.

## Dev

```bash
pnpm install
pnpm run dev         # start dev server on http://localhost:5173
```

Other useful commands:

| Command | Description |
|---|---|
| `pnpm run build` | Production build |
| `pnpm run start` | Start production server |
| `pnpm run db:push` | Push schema directly to SQLite |
| `pnpm run db:migrate` | Run Drizzle migrations |
| `pnpm run db:generate` | Generate Drizzle migrations |
| `pnpm run db:studio` | Open Drizzle Studio |
| `pnpm run test` | Run tests (Vitest) |
| `pnpm run typecheck` | TypeScript `tsc --noEmit` |
| `pnpm run lint` | ESLint |

## Environment Variables

Required at minimum:

- `DATABASE_URL` — SQLite database path (`sqlite.db` by default)
- `BETTER_AUTH_SECRET` — Secret for auth tokens
- `PUBLIC_APP_URL` — Public URL of the app (used by Better Auth for callbacks)

Development defaults are in `.env.development` and `.env.production`. Both are gitignored; copy from `.env.example` if you need a template.

## Database

This starter uses **SQLite + better-sqlite3** with Drizzle ORM.

```bash
pnpm run db:push     # push schema
pnpm run db:migrate  # run migrations
pnpm run db:studio   # open Drizzle Studio
```

The `drizzle/` folder contains generated migrations and must be committed and shipped to production.

## Production

Build with `pnpm run build`, then start with `pnpm run start`.
If you want startup migrations, run `node scripts/migrate-runtime.mjs` before start (or in your deploy pipeline).

Ensure the deployed working directory includes the committed `drizzle/` folder, not just `build/`.

## Deploy via S/ASH

Open the **Deploy** button in your S/ASH workspace. Pick a slug (e.g. `my-app`) and the platform builds, hosts, and gives you a live URL like `https://my-app.app.slash.ai.kr`.

For custom env vars in production, use the **Environment** tab in the deploy modal before you deploy.

## Stack

- [React Router v7](https://reactrouter.com)
- [shadcn/ui](https://ui.shadcn.com)
- [Better Auth](https://better-auth.com)
- [Drizzle ORM](https://orm.drizzle.team) + [better-sqlite3](https://github.com/WiseLibs/better-sqlite3)
- [Vitest](https://vitest.dev)
- [Vite](https://vite.dev)