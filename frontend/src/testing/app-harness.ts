/**
 * Boots the real application routes (`appConfig` + `routes`) in the zoneless TestBed with the
 * content API replaced by a `ContentServer`. Component tests of the wizard go through the router,
 * as a person does, so they do not depend on component class names, selectors or input bindings.
 *
 * Usage:
 *   beforeEach(() => configureAppTest());
 *   it('...', async () => {
 *     const app = await createAppTest();
 *     await app.open('/co/datos');
 *     ... act on app.root, then `await app.settle()` ...
 *   });
 *
 * A test that scripts a request to never be answered (`'hang'`) must call `vi.useFakeTimers()`
 * BEFORE `createAppTest()` and restore real timers afterwards; it then advances time itself.
 */
import { Location } from '@angular/common';
import { provideLocationMocks } from '@angular/common/testing';
import { provideHttpClientTesting, HttpTestingController } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { Router } from '@angular/router';
import { RouterTestingHarness } from '@angular/router/testing';
import { vi } from 'vitest';
import { appConfig } from '../app/app.config';
import { CLOCK } from '../app/core/clock';
import { ContentServer } from './content-server';
import { SPEC_TODAY, fixedClock } from './clock';

export interface AppTestOptions {
  /** Local calendar date the clock answers. Defaults to the spec's 2026-11-20. */
  today?: Date;
}

export function configureAppTest(options: AppTestOptions = {}): void {
  sessionStorage.clear();
  TestBed.configureTestingModule({
    providers: [
      ...appConfig.providers,
      provideHttpClientTesting(),
      provideLocationMocks(),
      { provide: CLOCK, useValue: fixedClock(options.today ?? SPEC_TODAY) },
    ],
  });
}

export interface AppTest {
  harness: RouterTestingHarness;
  server: ContentServer;
  router: Router;
  location: Location;
  /** The host element of the application (everything the user sees). */
  readonly root: HTMLElement;
  /** Start a navigation without waiting for it (use with `'hang'` behaviours). */
  begin(url: string): Promise<unknown>;
  /** Navigate, answer the content requests, wait until the page has rendered. */
  open(url: string): Promise<void>;
  /** Answer pending content requests and wait for rendering after an action. */
  settle(): Promise<void>;
  /** Path of the current history entry, as the browser would show it. */
  path(): string;
}

export async function createAppTest(): Promise<AppTest> {
  const http = TestBed.inject(HttpTestingController);
  const server = new ContentServer(http);
  const router = TestBed.inject(Router);
  const location = TestBed.inject(Location);
  // The router only listens to browser back/forward after bootstrap; a TestBed has no bootstrap.
  router.setUpLocationChangeListener();
  const harness = await RouterTestingHarness.create();

  const settle = async (): Promise<void> => {
    await server.drain();
    if (vi.isFakeTimers()) {
      await vi.advanceTimersByTimeAsync(50);
      TestBed.tick();
    } else {
      await harness.fixture.whenStable();
    }
  };

  return {
    harness,
    server,
    router,
    location,
    get root(): HTMLElement {
      return harness.fixture.nativeElement as HTMLElement;
    },
    begin: (url) => harness.navigateByUrl(url),
    async open(url) {
      const navigation = harness.navigateByUrl(url);
      await settle();
      await navigation;
      await settle();
    },
    settle,
    path: () => location.path(),
  };
}
