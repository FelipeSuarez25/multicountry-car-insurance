/**
 * A scripted stand-in for the Strapi content API behind the same-origin proxy (ADR-0002), built on
 * Angular's `HttpTestingController`. Tests change `countries` and `fields` to script success, an
 * HTTP error, or no answer at all.
 *
 * Why `drain()` exists: in a zoneless TestBed, `fixture.whenStable()` waits for in-flight HTTP
 * requests, so a test that awaits it before answering the request never finishes. `drain()`
 * answers requests as they appear until the application has been idle for a few macrotasks.
 *
 * It matches requests by URL only (`/api/countries`, `/api/form-fields` with
 * `filters[country][code][$eq]=<CODE>`), so the tests do not depend on how the API client is built.
 */
import { HttpTestingController, TestRequest } from '@angular/common/http/testing';
import { vi } from 'vitest';
import { seedCountryItems, seedStrapiItems, strapiListResponse, type StrapiItem } from './seed-fixtures';

export type Behaviour = StrapiItem[] | 'error' | 'hang';

export interface RecordedRequest {
  method: string;
  /** The URL with its query string, percent-decoded (brackets and `$` readable). */
  url: string;
  kind: 'countries' | 'form-fields' | 'other';
  /** For `form-fields`: the value of `filters[country][code][$eq]`. */
  countryCode?: string;
  /** True when the request carried an `Authorization` header. */
  hasAuthorization: boolean;
}

/** Let the event loop run one macrotask (works with real and with fake timers). */
export async function pump(): Promise<void> {
  if (vi.isFakeTimers()) {
    await vi.advanceTimersByTimeAsync(0);
  } else {
    await new Promise<void>((resolve) => setTimeout(resolve, 0));
  }
}

export class ContentServer {
  countries: Behaviour = seedCountryItems();
  fields: Record<string, Behaviour> = { CO: seedStrapiItems('CO'), CL: seedStrapiItems('CL') };
  readonly requests: RecordedRequest[] = [];

  constructor(private readonly http: HttpTestingController) {}

  requestsOf(kind: RecordedRequest['kind']): RecordedRequest[] {
    return this.requests.filter((r) => r.kind === kind);
  }

  /** Answer every request that appears, until nothing new arrives for three macrotasks. */
  async drain(): Promise<void> {
    let idle = 0;
    while (idle < 3) {
      await pump();
      const open = this.http.match(() => true);
      if (open.length === 0) {
        idle++;
        continue;
      }
      idle = 0;
      for (const req of open) this.answer(req);
    }
  }

  private answer(req: TestRequest): void {
    const url = decodeURIComponent(req.request.urlWithParams);
    const hasAuthorization = req.request.headers.has('Authorization');
    if (req.request.method === 'GET' && /^(https?:\/\/[^/]+)?\/api\/countries(\?|$)/.test(url)) {
      this.requests.push({ method: 'GET', url, kind: 'countries', hasAuthorization });
      this.respond(req, this.countries);
      return;
    }
    if (req.request.method === 'GET' && /^(https?:\/\/[^/]+)?\/api\/form-fields(\?|$)/.test(url)) {
      const code = /filters\[country\]\[code\]\[\$eq\]=([^&]+)/.exec(url)?.[1];
      this.requests.push({ method: 'GET', url, kind: 'form-fields', countryCode: code, hasAuthorization });
      this.respond(req, (code !== undefined ? this.fields[code] : undefined) ?? []);
      return;
    }
    this.requests.push({ method: req.request.method, url, kind: 'other', hasAuthorization });
    req.flush({ error: { status: 404, name: 'NotFoundError', message: 'Not Found' } }, { status: 404, statusText: 'Not Found' });
  }

  private respond(req: TestRequest, behaviour: Behaviour): void {
    if (behaviour === 'hang') return; // never answered: the client's own timeout must fire
    if (behaviour === 'error') {
      req.flush(
        { data: null, error: { status: 500, name: 'InternalServerError', message: 'Internal Server Error' } },
        { status: 500, statusText: 'Internal Server Error' },
      );
      return;
    }
    req.flush(strapiListResponse(behaviour));
  }
}
