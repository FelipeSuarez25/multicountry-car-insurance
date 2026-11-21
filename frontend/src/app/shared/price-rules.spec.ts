import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { DRIVER_AGE_FACTORS, VEHICLE_AGE_FACTORS, calculateFinalPrice } from './price-rules';
import type { OutputValue, Step1Output } from './field-config.model';
import { day } from '../../testing/clock';

/**
 * ADR-0007 (option A) and spec section 7.6: `calculateFinalPrice(basePrice, step1Output, today)` is a
 * pure function with integer arithmetic (factors are whole percentages), round half up, a neutral
 * factor plus a warning that names the key and never the value, and "today" as a parameter.
 * Every date below is a local calendar date built by `day()`; the clock is never the real one.
 */

const TODAY = day(2026, 11, 21);

function step1(values: Record<string, OutputValue>, country = 'CO'): Step1Output {
  return { country, values };
}

/** A typed step 1 output with only the two inputs the rule reads. */
function output(birthDate: string | null, vehicleYear: number | null): Step1Output {
  return step1({ birthDate, vehicleYear });
}

describe('US-02-AC-07 / US-02-BR-04 simulated price rule', () => {
  let warn: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    warn = vi.spyOn(console, 'warn').mockImplementation(() => undefined);
  });
  afterEach(() => {
    vi.useRealTimers();
    vi.restoreAllMocks();
  });

  const warned = (): string => warn.mock.calls.map((args: unknown[]) => args.map(String).join(' ')).join('\n');

  describe('US-02-AC-07 the factor tables equal the rows of spec 7.6 / ADR-0007 exactly', () => {
    it('US-02-AC-07 DRIVER_AGE_FACTORS: 18-25 -> 120, 26-60 -> 100, 61 and older -> 110 (whole percentages)', () => {
      expect(DRIVER_AGE_FACTORS).toEqual([
        { fromYears: 18, toYears: 25, factorPercent: 120 },
        { fromYears: 26, toYears: 60, factorPercent: 100 },
        { fromYears: 61, toYears: null, factorPercent: 110 },
      ]);
    });

    it('US-02-AC-07 VEHICLE_AGE_FACTORS: 0-5 -> 110, 6-10 -> 100, 11 and older -> 90 (whole percentages)', () => {
      expect(VEHICLE_AGE_FACTORS).toEqual([
        { fromYears: 0, toYears: 5, factorPercent: 110 },
        { fromYears: 6, toYears: 10, factorPercent: 100 },
        { fromYears: 11, toYears: null, factorPercent: 90 },
      ]);
    });
  });

  describe('US-02-AC-07 Scenario Outline "Price rule boundaries" (today is 2026-11-21)', () => {
    const rows: { base: number; birthDate: string | null; vehicleYear: number | null; final: number; why: string }[] = [
      { base: 1000000, birthDate: '1990-05-15', vehicleYear: 2022, final: 1100000, why: 'age 36 (1.00), vehicle 4 (1.10)' },
      { base: 1000000, birthDate: '2001-11-21', vehicleYear: 2022, final: 1320000, why: 'age 25 today (1.20), vehicle 4 (1.10)' },
      { base: 1000000, birthDate: '2000-11-21', vehicleYear: 2022, final: 1100000, why: 'age 26 today (1.00)' },
      { base: 1000000, birthDate: '1965-11-21', vehicleYear: 2020, final: 1100000, why: 'age 61 today (1.10), vehicle 6 (1.00)' },
      { base: 1000000, birthDate: '1965-11-22', vehicleYear: 2020, final: 1000000, why: 'age 60 (1.00), vehicle 6 (1.00)' },
      { base: 1000000, birthDate: '1990-05-15', vehicleYear: 2027, final: 1100000, why: 'next-year model counts as 0 (1.10)' },
      { base: 1000000, birthDate: '1990-05-15', vehicleYear: 2021, final: 1100000, why: 'vehicle 5 (1.10)' },
      { base: 1000000, birthDate: '1990-05-15', vehicleYear: 2016, final: 1000000, why: 'vehicle 10 (1.00)' },
      { base: 1000000, birthDate: '1990-05-15', vehicleYear: 2015, final: 900000, why: 'vehicle 11 (0.90)' },
      { base: 1000000, birthDate: '2001-11-21', vehicleYear: 2015, final: 1080000, why: '1.20 x 0.90' },
      { base: 45, birthDate: '1990-05-15', vehicleYear: 2022, final: 50, why: '49.5 rounds half up' },
      { base: 45, birthDate: '2001-11-21', vehicleYear: 2022, final: 59, why: '59.4 rounds down' },
      { base: 1000000, birthDate: null, vehicleYear: 2015, final: 900000, why: 'birthDate null: age factor 1.00, warning' },
      { base: 1000000, birthDate: '1990-05-15', vehicleYear: null, final: 1000000, why: 'vehicleYear null: vehicle factor 1.00, warning' },
    ];

    for (const row of rows) {
      it(`US-02-AC-07 base ${row.base}, birthDate ${row.birthDate}, vehicleYear ${row.vehicleYear} -> ${row.final} (${row.why})`, () => {
        expect(calculateFinalPrice(row.base, output(row.birthDate, row.vehicleYear), TODAY)).toBe(row.final);
      });
    }

    it('US-02-AC-07 a valid input never warns', () => {
      calculateFinalPrice(1000000, output('1990-05-15', 2022), TODAY);
      expect(warn).not.toHaveBeenCalled();
    });
  });

  describe('US-02-AC-07 the seed plans of both countries (same step 1: age 36, vehicle 4)', () => {
    const rows: [string, number, number][] = [
      ['CO Plan Básico', 850000, 935000],
      ['CO Plan Clásico', 1400000, 1540000],
      ['CO Plan Total', 2100000, 2310000],
      ['CL Plan Esencial', 290000, 319000],
      ['CL Plan Protegido', 480000, 528000],
      ['CL Plan Premium', 720000, 792000],
    ];
    for (const [name, base, final] of rows) {
      it(`US-02-AC-07 ${name}: ${base} -> ${final}`, () => {
        expect(calculateFinalPrice(base, output('1990-05-15', 2022), TODAY)).toBe(final);
      });
    }

    it('US-02-AC-13 a vehicle year of 2015 turns "Plan Clásico" into 1260000 (age 36 = 1.00, vehicle 11 = 0.90)', () => {
      expect(calculateFinalPrice(1400000, output('1990-05-15', 2015), TODAY)).toBe(1260000);
    });
  });

  describe('US-02-AC-07 driver age boundaries, both sides of every band (completed years on today)', () => {
    // vehicleYear 2016 is 10 years old on 2026: vehicle factor 1.00, so the result shows the age factor alone.
    const base = 1000000;
    const rows: [string, string, number][] = [
      ['age 18 today (the lowest allowed) is in 18-25', '2008-11-21', 1200000],
      ['age 25 (turns 26 tomorrow) is in 18-25', '2000-11-22', 1200000],
      ['age 26 today is in 26-60', '2000-11-21', 1000000],
      ['age 60 (turns 61 tomorrow) is in 26-60', '1965-11-22', 1000000],
      ['age 61 today is in 61 and older', '1965-11-21', 1100000],
      ['age 90 is in 61 and older', '1936-01-01', 1100000],
    ];
    for (const [why, birthDate, final] of rows) {
      it(`US-02-AC-07 ${why}: ${birthDate} -> ${final}`, () => {
        expect(calculateFinalPrice(base, output(birthDate, 2016), TODAY)).toBe(final);
      });
    }

    it('US-02-AC-07 a driver under 18 matches no band: neutral age factor and a warning that has no age or date', () => {
      // 2008-11-22 is 17 on 2026-11-21. Such a driver cannot reach step 2 (US-01-BR-04); this is defensive (ADR-0007).
      expect(calculateFinalPrice(base, output('2008-11-22', 2016), TODAY)).toBe(1000000);
      expect(warn).toHaveBeenCalled();
      expect(warned()).not.toContain('2008');
      expect(warned()).not.toMatch(/\b17\b/);
    });

    it('US-02-AC-07 the time of day of today does not matter: 00:01 and 23:59 give the same age', () => {
      const early = day(2026, 11, 21, 0, 1);
      const late = day(2026, 11, 21, 23, 59);
      expect(calculateFinalPrice(base, output('2000-11-21', 2016), early)).toBe(1000000);
      expect(calculateFinalPrice(base, output('2000-11-21', 2016), late)).toBe(1000000);
      expect(calculateFinalPrice(base, output('2000-11-22', 2016), late)).toBe(1200000);
    });

    it('US-02-AC-07 a 29 February birthday turns a year older on 1 March in a non-leap year (as US-01-BR-04)', () => {
      // Born 2000-02-29: on 2026-02-28 the driver is 25 (1.20); on 2026-03-01 the driver is 26 (1.00).
      expect(calculateFinalPrice(base, output('2000-02-29', 2016), day(2026, 2, 28))).toBe(1200000);
      expect(calculateFinalPrice(base, output('2000-02-29', 2016), day(2026, 3, 1))).toBe(1000000);
    });
  });

  describe('US-02-AC-07 vehicle age boundaries, both sides of every band (year(today) - vehicleYear, minimum 0)', () => {
    // Age 36 (factor 1.00): the result shows the vehicle factor alone.
    const base = 1000000;
    const rows: [string, number, number][] = [
      ['model of the year after next counts as 0', 2028, 1100000],
      ['next-year model counts as 0', 2027, 1100000],
      ['this year, age 0', 2026, 1100000],
      ['age 5, last year of 0-5', 2021, 1100000],
      ['age 6, first year of 6-10', 2020, 1000000],
      ['age 10, last year of 6-10', 2016, 1000000],
      ['age 11, first year of 11 and older', 2015, 900000],
      ['age 20, the oldest the form allows', 2006, 900000],
    ];
    for (const [why, vehicleYear, final] of rows) {
      it(`US-02-AC-07 ${why}: ${vehicleYear} -> ${final}`, () => {
        expect(calculateFinalPrice(base, output('1990-05-15', vehicleYear), TODAY)).toBe(final);
      });
    }
  });

  describe('US-02-AC-07 "today" is a parameter (the injectable clock of US-01-Q-06)', () => {
    it('US-02-AC-07 the same inputs on another day give another price: vehicle 2021 is 5 on 2026-12-31 and 6 on 2027-01-01', () => {
      const out = output('1990-05-15', 2021);
      expect(calculateFinalPrice(1000000, out, day(2026, 12, 31))).toBe(1100000);
      expect(calculateFinalPrice(1000000, out, day(2027, 1, 1))).toBe(1000000);
    });

    it('US-02-AC-07 a birthday changes the price on the day itself: 26th birthday on 2026-11-21', () => {
      const out = output('2000-11-21', 2016);
      expect(calculateFinalPrice(1000000, out, day(2026, 11, 20))).toBe(1200000);
      expect(calculateFinalPrice(1000000, out, day(2026, 11, 21))).toBe(1000000);
    });

    it('US-02-AC-07 the real system clock is never read: faking the system time to 2050 changes nothing', () => {
      vi.useFakeTimers({ now: new Date(2050, 0, 1) });
      expect(calculateFinalPrice(1000000, output('1990-05-15', 2022), TODAY)).toBe(1100000);
    });
  });

  describe('US-02-AC-07 rounding is half up on integers (ADR-0007: floor((n + 5000) / 10000))', () => {
    // Age 36 and vehicle year 2022 (4 years): factor 1.10. Age 36 and 2015 (11 years): factor 0.90.
    const rows: [string, number, number, number][] = [
      ['5 x 1.10 = 5.5 -> 6', 5, 2022, 6],
      ['15 x 1.10 = 16.5 -> 17 (not 16: not banker rounding)', 15, 2022, 17],
      ['45 x 1.10 = 49.5 -> 50', 45, 2022, 50],
      ['25 x 0.90 = 22.5 -> 23 (not 22: not banker rounding)', 25, 2015, 23],
      ['15 x 0.90 = 13.5 -> 14', 15, 2015, 14],
      ['1 x 1.10 = 1.1 -> 1', 1, 2022, 1],
      ['3 x 1.10 = 3.3 -> 3', 3, 2022, 3],
      ['4 x 1.10 = 4.4 -> 4', 4, 2022, 4],
      ['6 x 1.10 = 6.6 -> 7', 6, 2022, 7],
    ];
    for (const [why, base, vehicleYear, final] of rows) {
      it(`US-02-AC-07 ${why}`, () => {
        expect(calculateFinalPrice(base, output('1990-05-15', vehicleYear), TODAY)).toBe(final);
      });
    }

    it('US-02-AC-07 the result is at least 1: base 1 with the lowest factor (0.90) is 1', () => {
      expect(calculateFinalPrice(1, output('1990-05-15', 2015), TODAY)).toBe(1);
    });

    it('US-02-AC-07 the result is always a whole number', () => {
      for (const base of [1, 2, 3, 7, 99, 12345, 999999, 1000001]) {
        for (const birthDate of ['2001-11-21', '1990-05-15', '1965-11-21']) {
          for (const vehicleYear of [2027, 2022, 2020, 2015]) {
            const price = calculateFinalPrice(base, output(birthDate, vehicleYear), TODAY);
            expect(Number.isInteger(price)).toBe(true);
            expect(price).toBeGreaterThanOrEqual(1);
          }
        }
      }
    });
  });

  describe('US-02-AC-07 integer exactness up to the largest base price (2 147 483 647) with the largest factors', () => {
    const MAX_BASE = 2_147_483_647;

    /** The ADR-0007 formula evaluated in BigInt: exact whatever the magnitude. */
    const reference = (base: number, driverPct: number, vehiclePct: number): number =>
      Number((BigInt(base) * BigInt(driverPct) * BigInt(vehiclePct) + 5000n) / 10000n);

    it('US-02-AC-07 base 2147483647 with age 25 (120) and vehicle 4 (110) is exactly 2834678414', () => {
      expect(calculateFinalPrice(MAX_BASE, output('2001-11-21', 2022), TODAY)).toBe(2_834_678_414);
    });

    // [age factor, a birth date with that factor on 2026-11-21], [vehicle factor, a vehicle year with that factor]
    const drivers: [number, string][] = [
      [120, '2001-11-21'],
      [100, '1990-05-15'],
      [110, '1965-11-21'],
    ];
    const vehicles: [number, number][] = [
      [110, 2022],
      [100, 2016],
      [90, 2015],
    ];
    for (const [driverPct, birthDate] of drivers) {
      for (const [vehiclePct, vehicleYear] of vehicles) {
        it(`US-02-AC-07 every step is exact: bases up to the maximum with factors ${driverPct} and ${vehiclePct} equal the BigInt reference`, () => {
          for (const base of [1, 2, 7, 45, 999999, 1000000, 123456789, 2_000_000_000, MAX_BASE - 1, MAX_BASE]) {
            expect(calculateFinalPrice(base, output(birthDate, vehicleYear), TODAY), `base ${base}`).toBe(reference(base, driverPct, vehiclePct));
          }
        });
      }
    }
  });

  describe('US-02-BR-04 / US-01-Q-08 a missing or null input is neutral (factor 100) and the warning names the key, never the value', () => {
    it('US-02-AC-07 birthDate null: age factor 1.00 and a warning that names "birthDate" and not the vehicle year', () => {
      expect(calculateFinalPrice(1000000, output(null, 2015), TODAY)).toBe(900000);
      expect(warned()).toContain('birthDate');
      expect(warned()).not.toContain('2015');
    });

    it('US-02-AC-07 vehicleYear null: vehicle factor 1.00 and a warning that names "vehicleYear" and not the birth date', () => {
      expect(calculateFinalPrice(1000000, output('2001-11-21', null), TODAY)).toBe(1200000);
      expect(warned()).toContain('vehicleYear');
      expect(warned()).not.toContain('2001');
    });

    it('US-02-AC-07 birthDate absent from the output (an editor removed the reserved field): neutral and a warning with the key', () => {
      expect(calculateFinalPrice(1000000, step1({ vehicleYear: 2015 }), TODAY)).toBe(900000);
      expect(warned()).toContain('birthDate');
    });

    it('US-02-AC-07 vehicleYear absent from the output: neutral and a warning with the key', () => {
      expect(calculateFinalPrice(1000000, step1({ birthDate: '2001-11-21' }), TODAY)).toBe(1200000);
      expect(warned()).toContain('vehicleYear');
    });

    it('US-02-AC-07 both inputs missing: the price equals the base price, with a warning for each key', () => {
      expect(calculateFinalPrice(1000000, step1({}), TODAY)).toBe(1000000);
      expect(warned()).toContain('birthDate');
      expect(warned()).toContain('vehicleYear');
    });

    it('US-02-AC-07 no step 1 value (name, document, plate, birth date, year) ever reaches a warning', () => {
      calculateFinalPrice(
        1000000,
        step1({ fullName: 'Ana Prueba Ficticia', documentNumber: '1012345678', plate: 'ABC123', birthDate: null, vehicleYear: null }),
        TODAY,
      );
      for (const value of ['Ana Prueba Ficticia', '1012345678', 'ABC123']) expect(warned()).not.toContain(value);
    });
  });

  describe('US-02-BR-04 the function is pure and the same for every country (ADR-0007)', () => {
    it('US-02-AC-07 Colombia and Chile get the same price for the same inputs: no country branch', () => {
      const values = { birthDate: '1990-05-15', vehicleYear: 2022 };
      expect(calculateFinalPrice(1000000, step1(values, 'CO'), TODAY)).toBe(calculateFinalPrice(1000000, step1(values, 'CL'), TODAY));
    });

    it('US-02-AC-07 other step 1 values do not change the price', () => {
      const plain = calculateFinalPrice(1000000, output('1990-05-15', 2022), TODAY);
      const rich = calculateFinalPrice(
        1000000,
        step1({ birthDate: '1990-05-15', vehicleYear: 2022, fullName: 'Ana Prueba Ficticia', city: 'MDE', make: 'mazda', dataConsent: true }),
        TODAY,
      );
      expect(rich).toBe(plain);
    });

    it('US-02-AC-07 does not modify its inputs', () => {
      const out = Object.freeze({ country: 'CO', values: Object.freeze({ birthDate: '1990-05-15', vehicleYear: 2022 }) });
      const when = day(2026, 11, 21);
      const before = when.getTime();
      expect(() => calculateFinalPrice(850000, out, when)).not.toThrow();
      expect(when.getTime()).toBe(before);
    });
  });
});
