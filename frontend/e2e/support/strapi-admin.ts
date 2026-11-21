import type { APIRequestContext } from '@playwright/test';

/**
 * The write flow of ADR-0002 ("End-to-end writes for AC-03"). Used from the Playwright Node
 * process only. The admin JWT and the API token live in local variables of the test process: they
 * are never logged, never passed to `page.evaluate`, `page.route`, `addInitScript`, cookies or the
 * storage of a browser context.
 *
 * Steps: log in to the admin API on Strapi's own port, create a custom API token scoped to
 * `form-field` create and delete plus `country` find (ADR-0005, needed for the relation check), with
 * the shortest lifespan Strapi 5.63 accepts (7 days: API_TOKEN_LIFESPANS in @strapi/admin is
 * unlimited, 7, 30 or 90 days), create the field, and in teardown delete the field and then the
 * token, also when the test fails. Leftovers of a crashed run are removed before the next run.
 */

const SEVEN_DAYS_MS = 7 * 24 * 60 * 60 * 1000;
const SCOPE = [
  'api::form-field.form-field.create',
  'api::form-field.form-field.delete',
  'api::country.country.find',
];

export interface AdminSession {
  jwt: string;
}

export interface ScopedToken {
  /** Id of the token entry in the admin (needed to delete it). */
  id: number;
  accessKey: string;
}

async function expectOk(response: { ok(): boolean; status(): number; url(): string }, what: string): Promise<void> {
  if (!response.ok()) {
    // Status and a fixed description only: response bodies may carry tokens.
    throw new Error(`${what} failed with HTTP ${response.status()}`);
  }
}

/**
 * Strapi 5.63 rate-limits the admin login and registration routes (the `admin::rateLimit`
 * middleware, koa2-ratelimit): 5 requests per 5 minutes, keyed on `email:path:ip`. This is a
 * security control and stays on. The window is documented in
 * `@strapi/admin/dist/server/server/src/middlewares/rateLimit.js`. Its handler throws a
 * RateLimitError (HTTP 429) and sets no Retry-After header, so the wait below honours a
 * Retry-After if one is ever sent and otherwise the documented window.
 */
export const LOGIN_RATE_LIMIT_WINDOW_MS = 5 * 60 * 1000;
const MAX_LOGIN_WAIT_MS = LOGIN_RATE_LIMIT_WINDOW_MS + 15_000;

/** Env var that carries the session JWT from the Playwright runner (globalSetup) to the workers. */
const SESSION_ENV = 'E2E_ADMIN_SESSION_JWT';

function retryAfterMs(headers: Record<string, string>): number {
  const seconds = Number(headers['retry-after']);
  return Number.isFinite(seconds) && seconds > 0 ? seconds * 1000 : LOGIN_RATE_LIMIT_WINDOW_MS;
}

/** Logs in once. On HTTP 429 it waits once, for a bounded time, then fails with a clear message. */
export async function loginAdmin(api: APIRequestContext, email: string, password: string): Promise<AdminSession> {
  let response = await api.post('/admin/login', { data: { email, password } });
  if (response.status() === 429) {
    const wait = retryAfterMs(response.headers());
    if (wait > MAX_LOGIN_WAIT_MS) {
      throw new Error(`Strapi admin login is rate limited (HTTP 429) for ${Math.round(wait / 1000)} s, more than the ${MAX_LOGIN_WAIT_MS / 1000} s this suite will wait`);
    }
    console.warn(`Strapi admin login rate limited (HTTP 429): waiting ${Math.round(wait / 1000)} s for the window to pass, once.`);
    // Reason for the sleep: the rate limit window is time based and there is nothing to poll.
    await new Promise((resolve) => setTimeout(resolve, wait));
    response = await api.post('/admin/login', { data: { email, password } });
    if (response.status() === 429) {
      throw new Error('Strapi admin login still rate limited (HTTP 429) after waiting one full window; stop other clients that log in to this Strapi, or reset the stack');
    }
  }
  await expectOk(response, 'Strapi admin login');
  const body = (await response.json()) as { data?: { token?: string } };
  const jwt = body.data?.token;
  if (!jwt) throw new Error('Strapi admin login returned no token');
  return { jwt };
}

/** Called once per run by the Playwright globalSetup: the JWT is shared with the tests through the Node environment only. */
export async function openSharedAdminSession(api: APIRequestContext, email: string, password: string): Promise<void> {
  process.env[SESSION_ENV] = (await loginAdmin(api, email, password)).jwt;
}

/** The session of this run (one admin login per run). Falls back to a login only if globalSetup did not run. */
export async function getAdminSession(api: APIRequestContext, email: string, password: string): Promise<AdminSession> {
  const jwt = process.env[SESSION_ENV];
  return jwt ? { jwt } : loginAdmin(api, email, password);
}

export async function createScopedToken(api: APIRequestContext, session: AdminSession, name: string): Promise<ScopedToken> {
  const response = await api.post('/admin/api-tokens', {
    headers: { Authorization: `Bearer ${session.jwt}` },
    data: {
      name,
      description: 'Temporary token of the US-01-AC-03 end-to-end test; deleted in teardown.',
      type: 'custom',
      lifespan: SEVEN_DAYS_MS,
      permissions: SCOPE,
    },
  });
  await expectOk(response, 'Creating the scoped API token');
  const body = (await response.json()) as { data?: { id?: number; accessKey?: string } };
  if (body.data?.id === undefined || !body.data.accessKey) throw new Error('Strapi returned no API token');
  return { id: body.data.id, accessKey: body.data.accessKey };
}

/** The public role may read `country` (ADR-0002), so the relation target is found anonymously. */
export async function findCountryDocumentId(api: APIRequestContext, code: string): Promise<string> {
  const response = await api.get('/api/countries', { params: { 'filters[code][$eq]': code } });
  await expectOk(response, `Reading the country ${code}`);
  const body = (await response.json()) as { data?: { documentId?: string }[] };
  const documentId = body.data?.[0]?.documentId;
  if (!documentId) throw new Error(`Country ${code} is not published in Strapi`);
  return documentId;
}

export interface NewField {
  key: string;
  label: string;
  type: 'text';
  isRequired: boolean;
  sortOrder: number;
  errorMessage: string;
}

/** A REST POST publishes immediately unless `status=draft` is passed (ADR-0002, Strapi REST docs). */
export async function createField(api: APIRequestContext, token: ScopedToken, countryDocumentId: string, field: NewField): Promise<string> {
  const response = await api.post('/api/form-fields', {
    headers: { Authorization: `Bearer ${token.accessKey}` },
    data: { data: { ...field, rules: [], country: { connect: [countryDocumentId] } } },
  });
  await expectOk(response, 'Creating the field');
  const body = (await response.json()) as { data?: { documentId?: string } };
  if (!body.data?.documentId) throw new Error('Strapi returned no documentId for the new field');
  return body.data.documentId;
}

export async function deleteField(api: APIRequestContext, token: ScopedToken, documentId: string): Promise<void> {
  const response = await api.delete(`/api/form-fields/${documentId}`, { headers: { Authorization: `Bearer ${token.accessKey}` } });
  await expectOk(response, 'Deleting the field');
}

export async function deleteToken(api: APIRequestContext, session: AdminSession, tokenId: number): Promise<void> {
  const response = await api.delete(`/admin/api-tokens/${tokenId}`, { headers: { Authorization: `Bearer ${session.jwt}` } });
  await expectOk(response, 'Deleting the scoped API token');
}

/** Pre-test cleanup: deletes API tokens left by a crashed run (same name as the test token). */
export async function deleteStaleTokens(api: APIRequestContext, session: AdminSession, name: string): Promise<void> {
  const response = await api.get('/admin/api-tokens', { headers: { Authorization: `Bearer ${session.jwt}` } });
  await expectOk(response, 'Listing API tokens');
  const body = (await response.json()) as { data?: { id: number; name: string }[] };
  for (const stale of (body.data ?? []).filter((t) => t.name === name)) {
    await deleteToken(api, session, stale.id);
  }
}

/** Pre-test cleanup: deletes published fields left with the test's key (read is public, ADR-0002). */
export async function deleteStaleFields(api: APIRequestContext, token: ScopedToken, key: string): Promise<void> {
  const response = await api.get('/api/form-fields', { params: { 'filters[key][$eq]': key, 'pagination[pageSize]': '100' } });
  await expectOk(response, 'Reading leftover fields');
  const body = (await response.json()) as { data?: { documentId?: string }[] };
  for (const stale of body.data ?? []) {
    if (stale.documentId) await deleteField(api, token, stale.documentId);
  }
}
