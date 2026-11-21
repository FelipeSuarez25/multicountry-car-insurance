import { InjectionToken } from '@angular/core';

/** The source of "today" for every validator (US-01-Q-06). Tests provide a fixed one. */
export const CLOCK = new InjectionToken<() => Date>('CLOCK', {
  providedIn: 'root',
  factory: () => () => new Date(),
});
