import { InjectionToken } from '@angular/core';

export type Clock = () => Date;
export const CLOCK = new InjectionToken<Clock>('CLOCK', { factory: () => () => new Date() });
