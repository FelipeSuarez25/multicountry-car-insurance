import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { bootStrapi, type TestStrapi } from './helpers/strapi';

/**
 * US-01-R2-F03: a regression guard for the published-only rule (ADR-0002).
 *
 * The rule runs only on the routers that pass `publishedOnlyConfig()`, and each router must get its
 * own config objects (Strapi mutates `auth.scope` in place, see commit 345a016). Nothing but a code
 * comment protected this, so a future content type (US-02 `plan`, US-03 `terms`) could ship with
 * readable drafts. This test walks every `api::*` content type that exists, so a new one is
 * covered without editing the test.
 */

interface Route {
  method: string;
  path: string;
  handler: string;
  config?: { middlewares?: unknown[]; auth?: false | { scope?: string[] } };
}
type ApiRegistry = Record<string, { routes: Record<string, { routes?: Route[] }> }>;

const PUBLISHED_ONLY = 'global::published-only';

/** `api::form-field.form-field` -> `form-field` */
const apiName = (uid: string): string => uid.split('::')[1].split('.')[0];

describe('US-01-AC-28 / US-01-BR-06 every content API read route is published-only and scoped to its own handler', () => {
  let strapi: TestStrapi & { apis: ApiRegistry };
  let dispose: () => Promise<void>;

  beforeAll(async () => {
    const booted = await bootStrapi();
    strapi = booted.strapi as TestStrapi & { apis: ApiRegistry };
    dispose = booted.dispose;
  });

  afterAll(async () => {
    await dispose?.();
  });

  const contentTypeUids = (): string[] => Object.keys(strapi.contentTypes).filter((uid) => uid.startsWith('api::'));

  function routesOf(uid: string): Route[] {
    const api = strapi.apis[apiName(uid)];
    return Object.values(api?.routes ?? {}).flatMap((router) => router.routes ?? []);
  }

  it('US-01-AC-28 the guard sees the content types it must protect (form-field and country at least)', () => {
    expect(contentTypeUids()).toEqual(expect.arrayContaining(['api::country.country', 'api::form-field.form-field']));
  });

  it('US-01-AC-28 / US-01-BR-06 for every api:: content type, `find` and `findOne` carry global::published-only', () => {
    const problems: string[] = [];
    for (const uid of contentTypeUids()) {
      for (const action of ['find', 'findOne']) {
        const handler = `${uid}.${action}`;
        const route = routesOf(uid).find((r) => r.handler === handler);
        if (!route) {
          problems.push(`${handler}: no route found`);
        } else if (!(route.config?.middlewares ?? []).includes(PUBLISHED_ONLY)) {
          problems.push(`${handler}: the route does not carry ${PUBLISHED_ONLY} (did its router forget publishedOnlyConfig()?)`);
        }
      }
    }
    expect(problems).toEqual([]);
  });

  it('US-01-AC-28 / US-01-BR-06 each find/findOne route has an auth scope that names its own handler only (no cross-router leak)', () => {
    const problems: string[] = [];
    for (const uid of contentTypeUids()) {
      for (const action of ['find', 'findOne']) {
        const handler = `${uid}.${action}`;
        const route = routesOf(uid).find((r) => r.handler === handler);
        const auth = route?.config?.auth;
        const scope = auth === false || auth === undefined ? undefined : auth.scope;
        if (JSON.stringify(scope) !== JSON.stringify([handler])) {
          problems.push(`${handler}: auth.scope is ${JSON.stringify(scope)}, expected ${JSON.stringify([handler])}`);
        }
      }
    }
    expect(problems).toEqual([]);
  });
});
