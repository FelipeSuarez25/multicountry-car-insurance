import { InjectionToken } from '@angular/core';

const LIMIT = 4_294_000_000; // the largest multiple of 1 000 000 that fits in 32 bits
const MODULO = 1_000_000;

/** An integer in [0, 999 999], drawn without bias by rejection sampling. */
function secureDigits(): number {
  const buffer = new Uint32Array(1);
  do {
    crypto.getRandomValues(buffer);
  } while (buffer[0] >= LIMIT);
  return buffer[0] % MODULO;
}

/** The random source of the simulated quote number (ADR-0008). Tests provide a fixed one. */
export const RANDOM_DIGITS = new InjectionToken<() => number>('RANDOM_DIGITS', {
  providedIn: 'root',
  factory: () => secureDigits,
});
