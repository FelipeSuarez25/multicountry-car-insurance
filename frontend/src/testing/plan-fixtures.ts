/**
 * Fictitious plan fixtures derived from specs/US-02/seed-plans.md (annex of spec section 7.3).
 *
 * `seedPlans` returns the logical content of the plans a country OFFERS (published, active), in
 * display order. `toStrapiPlanItem` turns one into what Strapi 5 answers over REST for the request
 * of spec section 7.2 (flattened attributes, `documentId`, components with `id`), so tests exercise
 * the real boundary. Draft-only plans never appear in a published response, so they have no
 * fixture; the published-but-inactive plans do (`hiddenSeedPlans`), because the boundary must drop
 * them even if a caller forgets the `isActive` filter (US-02-Q-10).
 */
import type { SeedCountry, StrapiItem } from './seed-fixtures';

export interface PlanSeed {
  key: string;
  name: string;
  shortDescription: string;
  basePrice: number;
  sortOrder: number;
  isRecommended: boolean;
  isActive: boolean;
  coverages: string[];
  benefits: string[];
}

const CO_PLANS: PlanSeed[] = [
  {
    key: 'basico',
    name: 'Plan Básico',
    shortDescription: 'Protección esencial frente a los daños que causes a terceros.',
    basePrice: 850000,
    sortOrder: 10,
    isRecommended: false,
    isActive: true,
    coverages: ['Responsabilidad civil extracontractual hasta $ 500.000.000', 'Asistencia jurídica en proceso penal'],
    benefits: ['Asistencia en carretera (grúa hasta 50 km)'],
  },
  {
    key: 'clasico',
    name: 'Plan Clásico',
    shortDescription: 'Cubre los daños a terceros y la pérdida total de tu vehículo.',
    basePrice: 1400000,
    sortOrder: 20,
    isRecommended: true,
    isActive: true,
    coverages: [
      'Responsabilidad civil extracontractual hasta $ 1.000.000.000',
      'Pérdida total por daños',
      'Pérdida total por hurto',
      'Asistencia jurídica en proceso penal',
    ],
    benefits: ['Asistencia en carretera 24/7', 'Conductor elegido (2 servicios al año)'],
  },
  {
    key: 'total',
    name: 'Plan Total',
    shortDescription: 'Protección completa, también para daños parciales.',
    basePrice: 2100000,
    sortOrder: 30,
    isRecommended: false,
    isActive: true,
    coverages: [
      'Responsabilidad civil extracontractual hasta $ 2.000.000.000',
      'Pérdida total y parcial por daños',
      'Pérdida total y parcial por hurto',
      'Accidentes personales del conductor',
      'Asistencia jurídica en proceso penal',
    ],
    benefits: ['Asistencia en carretera 24/7', 'Vehículo de reemplazo hasta 10 días', 'Conductor elegido (5 servicios al año)'],
  },
];

const CO_HIDDEN: PlanSeed[] = [
  {
    key: 'total-plus',
    name: 'Plan Total Plus',
    shortDescription: 'Todo lo del Plan Total, sin deducible.',
    basePrice: 2900000,
    sortOrder: 40,
    isRecommended: false,
    isActive: false,
    coverages: ['Responsabilidad civil extracontractual hasta $ 3.000.000.000', 'Pérdida total y parcial por daños sin deducible'],
    benefits: ['Asistencia en carretera 24/7', 'Vehículo de reemplazo hasta 20 días'],
  },
];

const CL_PLANS: PlanSeed[] = [
  {
    key: 'esencial',
    name: 'Plan Esencial',
    shortDescription: 'Cubre los daños que causes a terceros.',
    basePrice: 290000,
    sortOrder: 10,
    isRecommended: false,
    isActive: true,
    coverages: ['Responsabilidad civil hasta UF 500', 'Defensa penal'],
    benefits: ['Asistencia en ruta (grúa hasta 50 km)'],
  },
  {
    key: 'protegido',
    name: 'Plan Protegido',
    shortDescription: 'Daños a terceros y pérdida total de tu auto.',
    basePrice: 480000,
    sortOrder: 20,
    isRecommended: true,
    isActive: true,
    coverages: ['Responsabilidad civil hasta UF 1.000', 'Pérdida total por daño', 'Robo total', 'Defensa penal'],
    benefits: ['Asistencia en ruta 24/7', 'Auto de reemplazo hasta 7 días'],
  },
  {
    key: 'premium',
    name: 'Plan Premium',
    shortDescription: 'Cobertura completa con deducible bajo.',
    basePrice: 720000,
    sortOrder: 30,
    isRecommended: false,
    isActive: true,
    coverages: [
      'Responsabilidad civil hasta UF 2.000',
      'Daños propios (pérdida parcial y total)',
      'Robo, hurto o uso no autorizado',
      'Accidentes personales',
      'Defensa penal',
    ],
    benefits: ['Asistencia en ruta 24/7', 'Auto de reemplazo hasta 15 días', 'Deducible de UF 3'],
  },
];

const CL_HIDDEN: PlanSeed[] = [
  {
    key: 'premium-plus',
    name: 'Plan Premium Plus',
    shortDescription: 'Todo lo del Plan Premium, sin deducible.',
    basePrice: 950000,
    sortOrder: 40,
    isRecommended: false,
    isActive: false,
    coverages: ['Responsabilidad civil hasta UF 3.000', 'Daños propios sin deducible'],
    benefits: ['Asistencia en ruta 24/7', 'Auto de reemplazo hasta 30 días'],
  },
];

/** The plans a country offers, in display order (a fresh deep copy on every call). */
export function seedPlans(country: SeedCountry): PlanSeed[] {
  return structuredClone(country === 'CO' ? CO_PLANS : CL_PLANS);
}

/** Published plans that are not offered because `isActive` is false (spec 7.3, proves AC-08). */
export function hiddenSeedPlans(country: SeedCountry): PlanSeed[] {
  return structuredClone(country === 'CO' ? CO_HIDDEN : CL_HIDDEN);
}

export function seedPlan(country: SeedCountry, key: string): PlanSeed {
  const found = [...seedPlans(country), ...hiddenSeedPlans(country)].find((p) => p.key === key);
  if (!found) throw new Error(`No seed plan "${key}" for ${country}`);
  return found;
}

/** One plan as Strapi 5 answers it for the request of spec 7.2 (the parser ignores id and documentId). */
export function toStrapiPlanItem(plan: PlanSeed, index = 0): StrapiItem {
  return {
    id: index + 1,
    documentId: `fixtureplan${String(index + 1).padStart(4, '0')}`,
    key: plan.key,
    name: plan.name,
    shortDescription: plan.shortDescription,
    basePrice: plan.basePrice,
    sortOrder: plan.sortOrder,
    isRecommended: plan.isRecommended,
    isActive: plan.isActive,
    coverages: plan.coverages.map((label, i) => ({ id: index * 100 + i + 1, label })),
    benefits: plan.benefits.map((label, i) => ({ id: index * 100 + i + 51, label })),
  };
}

export interface SeedPlanItemsOptions {
  /** Keys flagged `isRecommended` (default: only what the seed flags). */
  recommended?: string[];
  /** Extra items appended after the seed (for example a published inactive plan or a malformed one). */
  extra?: StrapiItem[];
}

/** The offered plans of a country as Strapi items, in a deliberately shuffled order. */
export function seedPlanItems(country: SeedCountry, options: SeedPlanItemsOptions = {}): StrapiItem[] {
  const plans = seedPlans(country).map((p) => ({
    ...p,
    isRecommended: options.recommended ? options.recommended.includes(p.key) : p.isRecommended,
  }));
  // Reverse: the front end, not Strapi, must apply sortOrder.
  const items = plans.map((p, i) => toStrapiPlanItem(p, i)).reverse();
  return [...items, ...(options.extra ?? [])];
}

/** The sessionStorage entry of ADR-0003 with the chosen plan of US-02 (`plan: { key }`, spec 7.4). */
export function wizardEntryWithPlan(country: string, values: Record<string, unknown>, planKey: string | null): string {
  return JSON.stringify({
    version: 1,
    country,
    step1: { values },
    ...(planKey === null ? {} : { plan: { key: planKey } }),
  });
}

/** "I completed step 1 in Chile" of spec section 5: birth date 15/05/1990 (stored 1990-05-15), year 2022 (age 36, vehicle 4). */
export const CL_SPEC_INPUT: Record<string, string | boolean> = {
  RUT: '12.345.678-5',
  'Nombre completo': 'Ana Prueba Ficticia',
  'Fecha de nacimiento': '15/05/1990',
  Ciudad: 'Santiago',
  Patente: 'BCDF12',
  Marca: 'Kia',
  Modelo: 'Rio 5',
  Año: '2022',
  'Acepto el tratamiento de mis datos personales.': true,
};

/** The raw editing values of the same input, as the store keeps them. */
export const CL_SPEC_RAW: Record<string, string | boolean> = {
  documentNumber: '12.345.678-5',
  fullName: 'Ana Prueba Ficticia',
  birthDate: '1990-05-15',
  city: 'SCL',
  plate: 'BCDF12',
  make: 'kia',
  model: 'Rio 5',
  vehicleYear: '2022',
  dataConsent: true,
};
