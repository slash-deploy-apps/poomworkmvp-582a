/**
 * Better Auth `trustedOrigins`: allow any browser origin (CORS + origin checks on `/api/auth/*`).
 */
export function getBetterAuthTrustedOrigins(): string[] {
  return ['*'];
}
