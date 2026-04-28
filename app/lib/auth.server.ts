import { betterAuth } from 'better-auth';
import { drizzleAdapter } from 'better-auth/adapters/drizzle';

import { db } from '~/lib/db.server';
import { getBetterAuthTrustedOrigins } from '~/lib/trusted-origins.server';

const publicAppUrl = process.env.PUBLIC_APP_URL;
const useSecureCrossSiteCookies =
  process.env.NODE_ENV === 'production' || publicAppUrl?.startsWith('https://') === true;

export const auth = betterAuth({
  baseURL: publicAppUrl,
  trustedOrigins: getBetterAuthTrustedOrigins(),
  database: drizzleAdapter(db, {
    provider: 'sqlite',
  }),
  emailAndPassword: {
    enabled: true,
  },
  user: {
    additionalFields: {
      role: {
        type: 'string',
        defaultValue: 'worker',
        input: true,
      },
      phone: {
        type: 'string',
        required: false,
        input: true,
      },
      bio: {
        type: 'string',
        required: false,
        input: true,
      },
      skills: {
        type: 'string',
        required: false,
        input: true,
      },
      location: {
        type: 'string',
        required: false,
        input: true,
      },
    },
  },
  ...(useSecureCrossSiteCookies
    ? {
        advanced: {
          defaultCookieAttributes: {
            sameSite: 'none',
            secure: true,
          },
        },
      }
    : {}),
  ...(process.env.BETTER_AUTH_GITHUB_CLIENT_ID &&
  process.env.BETTER_AUTH_GITHUB_CLIENT_SECRET
    ? {
        socialProviders: {
          github: {
            clientId: process.env.BETTER_AUTH_GITHUB_CLIENT_ID,
            clientSecret: process.env.BETTER_AUTH_GITHUB_CLIENT_SECRET,
          },
        },
      }
    : {}),
});

export type Session = typeof auth.$Infer.Session;
