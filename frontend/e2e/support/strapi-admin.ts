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

export async function loginAdmin(api: APIRequestContext, email: string, password: string): Promise<AdminSession> {
  const response = await api.post('/admin/login', { data: { email, password } });
  await expectOk(response, 'Strapi admin login');
  const body = (await response.json()) as { data?: { token?: string } };
  const jwt = body.data?.token;
  if (!jwt) throw new Error('Strapi admin login returned no token');
  return { jwt };
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
