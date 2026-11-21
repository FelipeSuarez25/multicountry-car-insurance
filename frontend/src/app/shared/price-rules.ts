import type { Step1Output } from './field-config.model';
import { ageOn, parseIsoDate } from './field-validators';

/**
 * Simulated price rule (ADR-0007, option A; spec 7.6). Pure: no Angular, no clock of its own, the
 * same for every country. Factors are whole percentages so every step is integer arithmetic.
 * US-03 imports `calculateFinalPrice` instead of copying it. The factors are illustrative, not
 * actuarial. A band with `toYears: null` has no upper limit.
 */
export interface FactorBand {
  fromYears: number;
  toYears: number | null;
  factorPercent: number;
}

/** Driver age in completed years on today's local date. */
export const DRIVER_AGE_FACTORS: readonly FactorBand[] = [
  { fromYears: 18, toYears: 25, factorPercent: 120 },
  { fromYears: 26, toYears: 60, factorPercent: 100 },
  { fromYears: 61, toYears: null, factorPercent: 110 },
];

/** Vehicle age: the year of today minus `vehicleYear`, never below 0. */
export const VEHICLE_AGE_FACTORS: readonly FactorBand[] = [
  { fromYears: 0, toYears: 5, factorPercent: 110 },
  { fromYears: 6, toYears: 10, factorPercent: 100 },
  { fromYears: 11, toYears: null, factorPercent: 90 },
];

/** Used when an input is missing or matches no band (always with a warning). */
const NEUTRAL_PERCENT = 100;
const PERCENT_SCALE = 10_000; // two factors, each a percentage

function factorFor(bands: readonly FactorBand[], years: number): number | null {
  const band = bands.find((b) => years >= b.fromYears && (b.toYears === null || years <= b.toYears));
  return band ? band.factorPercent : null;
}

function driverFactor(birthDate: unknown, today: Date): number {
  const birth = typeof birthDate === 'string' ? parseIsoDate(birthDate) : null;
  if (!birth) {
    console.warn('price rule: birthDate is missing or invalid, the neutral factor is used');
    return NEUTRAL_PERCENT;
  }
  const factor = factorFor(DRIVER_AGE_FACTORS, ageOn(birth, today));
  if (factor === null) {
    console.warn('price rule: the driver age matches no band, the neutral factor is used');
    return NEUTRAL_PERCENT;
  }
  return factor;
}

function vehicleFactor(vehicleYear: unknown, today: Date): number {
  if (typeof vehicleYear !== 'number' || !Number.isInteger(vehicleYear)) {
    console.warn('price rule: vehicleYear is missing or invalid, the neutral factor is used');
    return NEUTRAL_PERCENT;
  }
  const factor = factorFor(VEHICLE_AGE_FACTORS, Math.max(0, today.getFullYear() - vehicleYear));
  if (factor === null) {
    console.warn('price rule: the vehicle age matches no band, the neutral factor is used');
    return NEUTRAL_PERCENT;
  }
  return factor;
}

/**
 * `roundHalfUp(basePrice x driverFactor x vehicleFactor)` in integers, at least 1. `today` is the
 * injectable clock's date (US-01-Q-06). Warnings name the key, never a value.
 */
export function calculateFinalPrice(basePrice: number, step1: Step1Output, today: Date): number {
  const driver = driverFactor(step1.values['birthDate'], today);
  const vehicle = vehicleFactor(step1.values['vehicleYear'], today);
  const scaled = basePrice * driver * vehicle;
  return Math.max(1, Math.floor((scaled + PERCENT_SCALE / 2) / PERCENT_SCALE));
}
