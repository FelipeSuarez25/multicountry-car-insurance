import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { parsePlans, recommendedPlanKey } from './plan';
import type { Plan } from './plan.model';
import { seedPlan, seedPlanItems, seedPlans, toStrapiPlanItem, hiddenSeedPlans } from '../../testing/plan-fixtures';
import { strapiListResponse, type StrapiItem } from '../../testing/seed-fixtures';

/**
 * Boundary parser of the plans response (spec 7.2, US-02-Q-18), sorting (US-02-Q-11) and the
 * recommended highlight (US-02-Q-09).
 *
 * Expected API (`frontend/src/app/shared/plan.ts` and `plan.model.ts`):
 *   parsePlans(body: unknown): Plan[]          offered plans only, sorted by sortOrder then key
 *   recommendedPlanKey(plans: Plan[]): string | null   the first flagged plan in display order
 *   interface Plan { key; name; shortDescription; basePrice; sortOrder; isRecommended;
 *                    coverages: string[]; benefits: string[] }
 */

const SEED_CO_KEYS = ['basico', 'clasico', 'total'];

/** A well-formed extra plan of Colombia; `overrides` break one attribute at a time. */
function extra(overrides: Record<string, unknown>): StrapiItem {
  return {
    ...toStrapiPlanItem({ ...seedPlan('CO', 'clasico'), key: 'probe-plan', name: 'Plan Prueba', sortOrder: 50, isRecommended: false }, 20),
    ...overrides,
  };
}

function parseCo(extras: StrapiItem[] = [], recommended?: string[]): Plan[] {
  return parsePlans(strapiListResponse(seedPlanItems('CO', { recommended, extra: extras })));
}

describe('US-02 plan boundary parser', () => {
  let warn: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    warn = vi.spyOn(console, 'warn').mockImplementation(() => undefined);
  });
  afterEach(() => {
    vi.restoreAllMocks();
  });

  const warned = (): string => warn.mock.calls.map((args: unknown[]) => args.map(String).join(' ')).join('\n');

  describe('US-02-AC-01 offered plans, mapped to the logical shape and sorted', () => {
    it('US-02-AC-01 maps the wire attributes to the logical plan and ignores id, documentId and isActive', () => {
      const plans = parseCo();
      expect(plans[1]).toEqual({
        key: 'clasico',
        name: 'Plan Clásico',
        shortDescription: 'Cubre los daños a terceros y la pérdida total de tu vehículo.',
        basePrice: 1400000,
        sortOrder: 20,
        isRecommended: true,
        coverages: seedPlan('CO', 'clasico').coverages,
        benefits: seedPlan('CO', 'clasico').benefits,
      });
    });

    it('US-02-AC-01 a valid seed response produces exactly the three plans, with no warning', () => {
      expect(parseCo().map((p: Plan) => p.key)).toEqual(SEED_CO_KEYS);
      expect(warn).not.toHaveBeenCalled();
    });

    it('US-02-AC-01 sorts by sortOrder ascending although the response arrives in another order (the server sort is not trusted)', () => {
      const items = seedPlanItems('CO'); // already reversed by the fixture
      expect(items.map((i) => i['key'])).toEqual(['total', 'clasico', 'basico']);
      expect(parsePlans(strapiListResponse(items)).map((p: Plan) => p.key)).toEqual(SEED_CO_KEYS);
    });

    it('US-02-AC-01 ties in sortOrder are broken by key ascending (US-02-Q-11)', () => {
      const tie = [
        extra({ key: 'beta', name: 'Plan Beta', sortOrder: 5 }),
        extra({ key: 'alfa', name: 'Plan Alfa', sortOrder: 5 }),
        extra({ key: 'alfa-dos', name: 'Plan Alfa Dos', sortOrder: 5 }),
      ];
      expect(parseCo(tie).map((p: Plan) => p.key)).toEqual(['alfa', 'alfa-dos', 'beta', 'basico', 'clasico', 'total']);
    });

    it('US-02-AC-01 sortOrder compares as a number, not as text (9 before 10)', () => {
      const plans = parseCo([extra({ key: 'nine', name: 'Plan Nueve', sortOrder: 9 })]);
      expect(plans.map((p: Plan) => p.key).slice(0, 2)).toEqual(['nine', 'basico']);
    });

    it('US-02-AC-01 keeps coverages and benefits in the order they were configured', () => {
      const plans = parseCo();
      expect(plans[2].coverages).toEqual(seedPlan('CO', 'total').coverages);
      expect(plans[2].benefits).toEqual(['Asistencia en carretera 24/7', 'Vehículo de reemplazo hasta 10 días', 'Conductor elegido (5 servicios al año)']);
    });

    it('US-02-AC-01 an empty list of plans is not an error: it parses to no plans', () => {
      expect(parsePlans(strapiListResponse([]))).toEqual([]);
    });
  });

  describe('US-02-AC-08 / US-02-BR-02 only active plans are offered, sorted by sortOrder then key (US-02-Q-10, Q-11)', () => {
    it('US-02-AC-08 drops a published plan with isActive false even if the request filter was forgotten', () => {
      const inactive = hiddenSeedPlans('CO').map((p, i) => toStrapiPlanItem(p, 30 + i));
      expect(parseCo(inactive).map((p: Plan) => p.key)).toEqual(SEED_CO_KEYS);
    });

    it.each([
      ['isActive missing', undefined],
      ['isActive null', null],
      ['isActive the text "true"', 'true'],
      ['isActive the number 1', 1],
    ])('US-02-AC-08 drops a plan whose %s (only the boolean true is offered)', (_why, value) => {
      const item = extra({ key: 'probe-active', isActive: value });
      if (value === undefined) delete item['isActive'];
      expect(parseCo([item]).map((p: Plan) => p.key)).toEqual(SEED_CO_KEYS);
    });

    it('US-02-AC-08 an inactive plan flagged as recommended highlights nothing', () => {
      const items = seedPlanItems('CO', { recommended: [] });
      const inactiveRecommended = toStrapiPlanItem({ ...seedPlan('CO', 'total-plus'), isRecommended: true }, 40);
      expect(recommendedPlanKey(parsePlans(strapiListResponse([...items, inactiveRecommended])))).toBeNull();
    });
  });

  describe('US-02-AC-09 Scenario Outline "Malformed plan is skipped": the 3 seed plans stay, the bad one goes, a warning names the key and the problem', () => {
    const rows: { problem: string; key: string; attribute: string; overrides: Record<string, unknown> }[] = [
      { problem: 'its basePrice is 0', key: 'probe-zero', attribute: 'basePrice', overrides: { basePrice: 0 } },
      { problem: 'its basePrice is 850000.5', key: 'probe-decimal', attribute: 'basePrice', overrides: { basePrice: 850000.5 } },
      { problem: 'its basePrice is the text "850000"', key: 'probe-text', attribute: 'basePrice', overrides: { basePrice: '850000' } },
      { problem: 'it has no coverage', key: 'probe-nocov', attribute: 'coverages', overrides: { coverages: [] } },
      {
        problem: 'every coverage label is blank',
        key: 'probe-blankcov',
        attribute: 'coverages',
        overrides: { coverages: [{ id: 1, label: '' }, { id: 2, label: '   ' }, { id: 3, label: null }] },
      },
      { problem: 'its name is empty', key: 'probe-noname', attribute: 'name', overrides: { name: '' } },
      { problem: 'its shortDescription is null', key: 'probe-nodesc', attribute: 'shortDescription', overrides: { shortDescription: null } },
      { problem: 'its key "Plan 4" does not match the pattern', key: 'Plan 4', attribute: 'key', overrides: { key: 'Plan 4' } },
      { problem: 'its sortOrder is null', key: 'probe-nosort', attribute: 'sortOrder', overrides: { sortOrder: null } },
    ];

    for (const row of rows) {
      it(`US-02-AC-09 ${row.problem}: the 3 seed plans are kept, it is dropped, and a warning names "${row.key}" and "${row.attribute}"`, () => {
        const plans = parseCo([extra({ key: row.key, ...row.overrides })]);
        expect(plans.map((p: Plan) => p.key)).toEqual(SEED_CO_KEYS);
        expect(warn).toHaveBeenCalled();
        expect(warned()).toContain(row.key);
        expect(warned()).toContain(row.attribute);
      });
    }

    it('US-02-AC-09 its key "clasico" duplicates a plan earlier in sortOrder: the earlier one is kept, the later one is dropped, a warning names the key', () => {
      const duplicate = extra({ key: 'clasico', name: 'Plan Clásico Repetido', basePrice: 111, sortOrder: 90 });
      const plans = parseCo([duplicate]);
      expect(plans.map((p: Plan) => p.key)).toEqual(SEED_CO_KEYS);
      const kept = plans.find((p: Plan) => p.key === 'clasico');
      expect(kept?.name).toBe('Plan Clásico');
      expect(kept?.basePrice).toBe(1400000);
      expect(warned()).toContain('clasico');
    });

    it('US-02-AC-09 the duplicate rule keeps the first in display order, not the first in the response', () => {
      // The response lists the later plan first; after sorting by sortOrder the earlier one wins.
      const later = extra({ key: 'clasico', name: 'Plan Clásico Repetido', sortOrder: 90 });
      const items = [later, ...seedPlanItems('CO')];
      const plans = parsePlans(strapiListResponse(items));
      expect(plans.find((p: Plan) => p.key === 'clasico')?.name).toBe('Plan Clásico');
      expect(plans).toHaveLength(3);
    });

    it('US-02-AC-09 several malformed plans in one response are all dropped and the list still works', () => {
      const plans = parseCo([extra({ key: 'probe-a', basePrice: 0 }), extra({ key: 'probe-b', name: '' }), extra({ key: 'probe-c', coverages: [] })]);
      expect(plans.map((p: Plan) => p.key)).toEqual(SEED_CO_KEYS);
      for (const key of ['probe-a', 'probe-b', 'probe-c']) expect(warned()).toContain(key);
    });

    it.each([
      ['name of only spaces', { name: '   ' }],
      ['shortDescription empty', { shortDescription: '' }],
      ['shortDescription of only spaces', { shortDescription: '  ' }],
      ['basePrice negative', { basePrice: -5 }],
      ['basePrice above the integer limit (2147483648)', { basePrice: 2147483648 }],
      ['basePrice null', { basePrice: null }],
      ['sortOrder 1.5', { sortOrder: 1.5 }],
      ['sortOrder the text "10"', { sortOrder: '10' }],
      ['key with an upper-case letter', { key: 'Probe-upper' }],
      ['key starting with a digit', { key: '4plan' }],
      ['key with an underscore', { key: 'plan_4' }],
      ['key empty', { key: '' }],
      ['coverages null', { coverages: null }],
    ])('US-02-AC-09 drops a plan with %s', (_why, overrides) => {
      const plans = parseCo([extra({ key: 'probe-bad', ...overrides })]);
      expect(plans.map((p: Plan) => p.key)).toEqual(SEED_CO_KEYS);
      expect(warn).toHaveBeenCalled();
    });

    it.each([
      ['basePrice 1 (the lowest)', { basePrice: 1 }],
      ['basePrice 2147483647 (the integer limit)', { basePrice: 2147483647 }],
      ['sortOrder 0', { sortOrder: 0 }],
      ['sortOrder negative', { sortOrder: -10 }],
      ['key of one letter', { key: 'a' }],
      ['key with digits and hyphens', { key: 'plan-4-b' }],
    ])('US-02-AC-09 keeps a plan with %s (boundary, valid side)', (_why, overrides) => {
      const plans = parseCo([extra({ key: 'probe-ok', ...overrides })]);
      const expectedKey = (overrides as { key?: string }).key ?? 'probe-ok';
      expect(plans.map((p: Plan) => p.key)).toContain(expectedKey);
      expect(warn).not.toHaveBeenCalled();
    });

    it('US-02-AC-09 a blank coverage line is skipped with a warning and the plan stays when one coverage remains', () => {
      const plans = parseCo([
        extra({ key: 'probe-lines', coverages: [{ id: 1, label: 'Pérdida total por daño' }, { id: 2, label: '  ' }, { id: 3, label: 'Defensa penal' }] }),
      ]);
      expect(plans.find((p: Plan) => p.key === 'probe-lines')?.coverages).toEqual(['Pérdida total por daño', 'Defensa penal']);
      expect(warn).toHaveBeenCalled();
      expect(warned()).toContain('probe-lines');
    });

    it('US-02-AC-09 a blank benefit line is skipped with a warning; the plan stays', () => {
      const plans = parseCo([extra({ key: 'probe-ben', benefits: [{ id: 1, label: 'Asistencia en carretera' }, { id: 2, label: '' }] })]);
      expect(plans.find((p: Plan) => p.key === 'probe-ben')?.benefits).toEqual(['Asistencia en carretera']);
      expect(warned()).toContain('probe-ben');
    });

    it.each([
      ['benefits null', null],
      ['benefits an empty list', []],
    ])('US-02-AC-09 %s means no benefits: the plan stays with an empty list and no warning', (_why, benefits) => {
      const plans = parseCo([extra({ key: 'probe-nob', benefits })]);
      expect(plans.find((p: Plan) => p.key === 'probe-nob')?.benefits).toEqual([]);
      expect(warn).not.toHaveBeenCalled();
    });

    it('US-02-AC-09 benefits absent from the item mean no benefits', () => {
      const item = extra({ key: 'probe-noben' });
      delete item['benefits'];
      expect(parseCo([item]).find((p: Plan) => p.key === 'probe-noben')?.benefits).toEqual([]);
    });

    it('US-02-AC-09 every plan malformed: the result is empty (the page then shows "no plans available")', () => {
      const bad = [extra({ key: 'probe-a', basePrice: 0 }), extra({ key: 'probe-b', name: '' })];
      expect(parsePlans(strapiListResponse(bad))).toEqual([]);
    });
  });

  describe('US-02-AC-10 Scenario Outline "Recommended edge cases" (US-02-Q-09)', () => {
    const recommended = (flagged: string[], extras: StrapiItem[] = []): string | null => recommendedPlanKey(parseCo(extras, flagged));

    it('US-02-AC-10 "Plan Clásico" only is flagged: it is the highlighted plan', () => {
      expect(recommended(['clasico'])).toBe('clasico');
      expect(warn).not.toHaveBeenCalled();
    });

    it('US-02-AC-10 no plan is flagged: nothing is highlighted', () => {
      expect(recommended([])).toBeNull();
      expect(warn).not.toHaveBeenCalled();
    });

    it('US-02-AC-10 "Plan Básico" and "Plan Total" are flagged: only "Plan Básico" (first in order) is highlighted, with a warning', () => {
      expect(recommended(['basico', 'total'])).toBe('basico');
      expect(warn).toHaveBeenCalled();
    });

    it('US-02-AC-10 the first flagged plan is the first in display order, whatever the order of the response', () => {
      expect(recommended(['total', 'clasico'])).toBe('clasico');
    });

    it('US-02-AC-10 only "Plan Total Plus", which is inactive, is flagged: nothing is highlighted', () => {
      const inactiveFlagged = toStrapiPlanItem({ ...seedPlan('CO', 'total-plus'), isRecommended: true }, 40);
      expect(recommended([], [inactiveFlagged])).toBeNull();
    });

    it('US-02-AC-10 recommendedPlanKey works on parsed plans: an empty list has none', () => {
      expect(recommendedPlanKey([])).toBeNull();
    });

    it('US-02-AC-10 the recommended plan keeps its configured position (it is not moved to the top)', () => {
      expect(parseCo([], ['total']).map((p: Plan) => p.key)).toEqual(SEED_CO_KEYS);
    });

    it.each([
      ['the text "true"', 'true'],
      ['null', null],
      ['the number 1', 1],
    ])('US-02-AC-10 isRecommended %s is not true: it is normalised to false', (_why, value) => {
      const plans = parsePlans(strapiListResponse(seedPlanItems('CO').map((i) => ({ ...i, isRecommended: value }))));
      expect(plans.every((p: Plan) => p.isRecommended === false)).toBe(true);
      expect(recommendedPlanKey(plans)).toBeNull();
    });

    it('US-02-AC-10 isRecommended missing is false', () => {
      const items = seedPlanItems('CO').map((i) => {
        const { isRecommended: _flag, ...rest } = i;
        return rest;
      });
      expect(parsePlans(strapiListResponse(items)).every((p: Plan) => p.isRecommended === false)).toBe(true);
    });
  });

  describe('US-02-AC-01 the seed of Chile', () => {
    it('US-02-AC-01 Chile offers "Plan Esencial", "Plan Protegido" and "Plan Premium", in this order, with "Plan Protegido" recommended', () => {
      const plans = parsePlans(strapiListResponse(seedPlanItems('CL')));
      expect(plans.map((p: Plan) => p.name)).toEqual(['Plan Esencial', 'Plan Protegido', 'Plan Premium']);
      expect(recommendedPlanKey(plans)).toBe('protegido');
      expect(plans.map((p: Plan) => p.basePrice)).toEqual(seedPlans('CL').map((p: Plan) => p.basePrice));
    });
  });
});
