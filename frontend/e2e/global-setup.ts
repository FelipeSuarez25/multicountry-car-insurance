import { request } from '@playwright/test';
import { STRAPI_URL, adminCredentials } from './support/env';
import { openSharedAdminSession } from './support/strapi-admin';

/**
 * One Strapi admin login per test run. Strapi rate-limits the admin login (5 per 5 minutes per
 * email and IP), so the tests that write content (US-01-AC-03, US-01-AC-28) reuse this session
 * instead of logging in themselves. The JWT stays in the Node environment of the runner and its
 * workers: it is never logged and never reaches a browser context.
 */
export default async function globalSetup(): Promise<void> {
  const { email, password } = adminCredentials();
  const api = await request.newContext({ baseURL: STRAPI_URL });
  try {
    await openSharedAdminSession(api, email, password);
  } finally {
    await api.dispose();
  }
}
