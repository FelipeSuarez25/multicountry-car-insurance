import { HttpClient } from '@angular/common/http';
import { Observable, timeout } from 'rxjs';

/** Limit for every content request: after 10 s the load is treated as failed (US-01-Q-17). */
export const CONTENT_TIMEOUT_MS = 10_000;

/**
 * GET on the same-origin content API (relative `/api`, ADR-0002). Read-only: no body, no
 * Authorization header, and nothing from the wizard state ever goes into the request.
 */
export function contentGet(http: HttpClient, path: string, params: Record<string, string>): Observable<unknown> {
  return http.get<unknown>(`/api/${path}`, { params }).pipe(timeout(CONTENT_TIMEOUT_MS));
}
