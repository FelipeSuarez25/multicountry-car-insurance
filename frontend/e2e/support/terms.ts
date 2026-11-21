import type { APIRequestContext } from '@playwright/test';
import type { AdminSession, ScopedToken } from './strapi-admin';

/**
 * Write flow of the US-03-AC-14 end-to-end test (ADR-0005 general rule, spec US-03 7.4): Node
 * process only. The admin JWT and the API token live in local variables of the test process and
 * never reach a browser context (no `page.evaluate`, `page.route`, `addInitScript`, cookies or
 * storage). Created terms are published by the REST POST (Strapi publishes unless `status=draft`).
 */

const SEVEN_DAYS_MS = 7 * 24 * 60 * 60 * 1000;
/** Exactly these three permissions (spec US-03 7.4): create and delete of `term`, and `country.find` for the relation. */
export const TERMS_TOKEN_SCOPE = ['api::term.term.create', 'api::term.term.delete', 'api::country.country.find'];

async function expectOk(response: { ok(): boolean; status(): number }, what: string): Promise<void> {
  // Status and a fixed description only: response bodies may carry tokens.
  if (!response.ok()) throw new Error(`${what} failed with HTTP ${response.status()}`);
}

export async function createTermsToken(api: APIRequestContext, session: AdminSession, name: string): Promise<ScopedToken> {
  const response = await api.post('/admin/api-tokens', {
    headers: { Authorization: `Bearer ${session.jwt}` },
    data: {
      name,
      description: 'Temporary token of the US-03-AC-14 end-to-end test; deleted in teardown.',
      type: 'custom',
      lifespan: SEVEN_DAYS_MS,
      permissions: TERMS_TOKEN_SCOPE,
    },
  });
  await expectOk(response, 'Creating the scoped API token');
  const body = (await response.json()) as { data?: { id?: number; accessKey?: string } };
  if (body.data?.id === undefined || !body.data.accessKey) throw new Error('Strapi returned no API token');
  return { id: body.data.id, accessKey: body.data.accessKey };
}

/** The `blocks` body of one paragraph (the shape Strapi 5.63.0 validates and stores). */
export function paragraphBody(text: string): unknown[] {
  return [{ type: 'paragraph', children: [{ type: 'text', text }] }];
}

export async function createTerms(api: APIRequestContext, token: ScopedToken, countryDocumentId: string, title: string, text: string): Promise<string> {
  const response = await api.post('/api/terms', {
    headers: { Authorization: `Bearer ${token.accessKey}` },
    data: { data: { title, body: paragraphBody(text), country: { connect: [countryDocumentId] } } },
  });
  await expectOk(response, 'Creating the terms');
  const body = (await response.json()) as { data?: { documentId?: string } };
  if (!body.data?.documentId) throw new Error('Strapi returned no documentId for the new terms');
  return body.data.documentId;
}

export async function deleteTerms(api: APIRequestContext, token: ScopedToken, documentId: string): Promise<void> {
  const response = await api.delete(`/api/terms/${documentId}`, { headers: { Authorization: `Bearer ${token.accessKey}` } });
  await expectOk(response, 'Deleting the terms');
}

/** Pre-test cleanup: deletes published terms left with the test's title by a crashed run (read is public). */
export async function deleteStaleTerms(api: APIRequestContext, token: ScopedToken, title: string): Promise<void> {
  const response = await api.get('/api/terms', { params: { 'filters[title][$eq]': title, 'pagination[pageSize]': '100' } });
  await expectOk(response, 'Reading leftover terms');
  const body = (await response.json()) as { data?: { documentId?: string }[] };
  for (const stale of body.data ?? []) {
    if (stale.documentId) await deleteTerms(api, token, stale.documentId);
  }
}
