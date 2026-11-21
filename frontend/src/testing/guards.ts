/**
 * Helpers to run router guards in an injection context, as the router would, without a browser.
 */
import { TestBed } from '@angular/core/testing';
import { isObservable, firstValueFrom } from 'rxjs';
import {
  convertToParamMap,
  RedirectCommand,
  Router,
  UrlSegment,
  type ActivatedRouteSnapshot,
  type CanMatchFn,
  type GuardResult,
  type MaybeAsync,
  type RouterStateSnapshot,
} from '@angular/router';

/** Wait for a guard result whatever its shape (value, promise, observable). */
export async function settleGuard(result: MaybeAsync<GuardResult>): Promise<GuardResult> {
  if (isObservable(result)) return firstValueFrom(result);
  return await result;
}

export function runInContext<T>(fn: () => T): T {
  return TestBed.runInInjectionContext(fn);
}

/**
 * The snapshot a `canActivate` guard of `/:country/planes` receives. The country is offered the
 * ways the router can expose it (own params, parent params), so the guard may read it any of them.
 */
export function stepSnapshot(country: string): ActivatedRouteSnapshot {
  const params = { country };
  const paramMap = convertToParamMap(params);
  const parent = { params, paramMap, parent: null, url: [new UrlSegment(country, {})] };
  return { params, paramMap, parent, url: [new UrlSegment('planes', {})] } as unknown as ActivatedRouteSnapshot;
}

export function stepState(url: string): RouterStateSnapshot {
  return { url } as unknown as RouterStateSnapshot;
}

export function segmentsOf(...paths: string[]): UrlSegment[] {
  return paths.map((p) => new UrlSegment(p, {}));
}

/** Where a guard redirects to, as the serialized address, plus its navigation behaviour. */
export function redirectOf(result: GuardResult): { url: string; replaceUrl: boolean | undefined } | null {
  if (!(result instanceof RedirectCommand)) return null;
  const router = TestBed.inject(Router);
  return { url: router.serializeUrl(result.redirectTo), replaceUrl: result.navigationBehaviorOptions?.replaceUrl };
}

/** The third `canMatch` argument (the partial snapshot); the guard under test must not need it. */
export function emptyMatchSnapshot(): Parameters<CanMatchFn>[2] {
  return {} as Parameters<CanMatchFn>[2];
}
