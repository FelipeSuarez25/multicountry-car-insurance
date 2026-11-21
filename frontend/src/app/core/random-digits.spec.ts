import { TestBed } from '@angular/core/testing';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { RANDOM_DIGITS } from './random-digits';

/**
 * ADR-0008 (US-03-Q-07): `RANDOM_DIGITS` is an `InjectionToken<() => number>` that returns an
 * integer in [0, 999 999]. The default uses `crypto.getRandomValues` on a `Uint32Array(1)` with
 * rejection sampling: a draw of 4 294 000 000 or more is discarded and drawn again, then the
 * value is taken modulo 1 000 000, so every result is equally likely.
 *
 * Expected API (`frontend/src/app/core/random-digits.ts`):
 *   RANDOM_DIGITS: InjectionToken<() => number>   with a root-provided default factory (as CLOCK)
 */
describe('US-03-AC-10 the default random source of the quote number', () => {
  let draw: ReturnType<typeof vi.spyOn>;

  /** Scripts the successive 32-bit values `crypto.getRandomValues` hands out. */
  function script(...values: number[]): void {
    const queue = [...values];
    draw.mockImplementation(((array: Uint32Array) => {
      array[0] = queue.length > 0 ? (queue.shift() as number) : 0;
      return array;
    }) as never);
  }
  const next = (): number => (TestBed.inject(RANDOM_DIGITS) as () => number)();

  beforeEach(() => {
    draw = vi.spyOn(globalThis.crypto, 'getRandomValues');
  });
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('US-03-AC-10 a draw of 0 gives 0', () => {
    script(0);
    expect(next()).toBe(0);
  });

  it('US-03-AC-10 the value is the draw modulo 1 000 000 (123 456 789 -> 456 789)', () => {
    script(123_456_789);
    expect(next()).toBe(456_789);
  });

  it('US-03-AC-10 the largest accepted draw, 4 293 999 999, gives 999 999 (boundary, accepted)', () => {
    script(4_293_999_999);
    expect(next()).toBe(999_999);
  });

  it('US-03-AC-10 a draw of exactly 4 294 000 000 is discarded and drawn again (boundary, rejected)', () => {
    script(4_294_000_000, 123_456_789);
    expect(next()).toBe(456_789);
    expect(draw).toHaveBeenCalledTimes(2);
  });

  it('US-03-AC-10 every draw from 4 294 000 000 up to 4 294 967 295 is discarded, however many in a row', () => {
    script(4_294_967_295, 4_294_000_001, 4_294_500_000, 7);
    expect(next()).toBe(7);
    expect(draw).toHaveBeenCalledTimes(4);
  });

  it('US-03-AC-10 the source asks the platform for exactly one 32-bit value per draw (a Uint32Array of length 1)', () => {
    script(5);
    next();
    const array = (draw.mock.calls as unknown as Uint32Array[][])[0][0];
    expect(array).toBeInstanceOf(Uint32Array);
    expect(array.length).toBe(1);
  });

  it('US-03-AC-10 with the real platform source, 500 draws are all integers in [0, 999 999]', () => {
    draw.mockRestore();
    const random = TestBed.inject(RANDOM_DIGITS) as () => number;
    for (let i = 0; i < 500; i++) {
      const value = random();
      expect(Number.isInteger(value)).toBe(true);
      expect(value).toBeGreaterThanOrEqual(0);
      expect(value).toBeLessThanOrEqual(999_999);
    }
  });

  it('US-03-AC-10 a test can provide its own fixed source', () => {
    TestBed.configureTestingModule({ providers: [{ provide: RANDOM_DIGITS, useValue: () => 482_913 }] });
    expect(next()).toBe(482_913);
  });
});
