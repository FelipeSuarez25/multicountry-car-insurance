/**
 * Environment of the e2e run. Defaults follow the ADR-0002 topology; nothing here is a secret.
 *
 *   E2E_BASE_URL            origin of the nginx front end (same origin for the app and /api)
 *   E2E_STRAPI_URL          Strapi's own port: admin panel, direct anonymous reads, test setup
 *   STRAPI_ADMIN_EMAIL      development super admin created by the Strapi bootstrap (ADR-0002)
 *   STRAPI_ADMIN_PASSWORD   its password. Used only by the Node test process (US-01-AC-03)
 *
 * The admin credentials have no default on purpose. Put them in the git-ignored env file of the
 * repository root, or export them; they are never printed and never reach a browser context.
 */
try {
  // Node >= 20.12. A missing file is fine: values already in the environment win.
  process.loadEnvFile('../.env');
} catch {
  /* no env file: rely on the process environment */
}

export const BASE_URL = process.env['E2E_BASE_URL'] ?? 'http://localhost:8080';
export const STRAPI_URL = process.env['E2E_STRAPI_URL'] ?? 'http://localhost:1337';

export function adminCredentials(): { email: string; password: string } {
  const email = process.env['STRAPI_ADMIN_EMAIL'];
  const password = process.env['STRAPI_ADMIN_PASSWORD'];
  if (!email || !password) {
    // A hard failure, not a skip: US-01-AC-03 cannot be verified without the write flow of ADR-0002.
    throw new Error('STRAPI_ADMIN_EMAIL and STRAPI_ADMIN_PASSWORD must be set for the US-01-AC-03 test (see e2e/support/env.ts).');
  }
  return { email, password };
}
