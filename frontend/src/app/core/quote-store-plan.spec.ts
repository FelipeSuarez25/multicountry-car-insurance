import { TestBed } from '@angular/core/testing';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { CLOCK } from './clock';
import { QuoteStore } from './quote-store';
import { SPEC_TODAY, fixedClock } from '../../testing/clock';
import { CO_VALID_RAW, WIZARD_STORAGE_KEY, seedFieldConfigs, wizardEntry } from '../../testing/seed-fixtures';
import { wizardEntryWithPlan } from '../../testing/plan-fixtures';

/**
 * US-02 additions to the wizard state (ADR-0003, spec 7.4): the entry gains `plan: { key }`, the
 * identifier of the chosen plan and nothing else. The US-01 behaviour of the store is covered in
 * `quote-store.spec.ts` and must not change.
 *
 * Expected API on `QuoteStore` (the test types it structurally because it does not exist yet):
 *   plan: Signal<{ key: string } | null>        the chosen plan, or null
 *   choosePlan(key: string): void               choose (replaces any earlier choice); written to storage
 *   prunePlan(offeredKeys: readonly string[]): void   clears the choice if its key is not offered; written back
 */
interface PlanState {
  plan(): { key: string } | null;
  choosePlan(key: string): void;
  prunePlan(offeredKeys: readonly string[]): void;
}
type Store = QuoteStore & PlanState;

const CANARY = 'CANARY-1012345678';

function newStore(): Store {
  return TestBed.inject(QuoteStore) as Store;
}

/** A new page load: a new injector, the same sessionStorage (what a reload keeps). */
function reload(): Store {
  TestBed.resetTestingModule();
  TestBed.configureTestingModule({ providers: [{ provide: CLOCK, useValue: fixedClock(SPEC_TODAY) }] });
  return newStore();
}

interface Stored {
  version: number;
  country: string;
  step1: { values: Record<string, unknown> };
  plan?: unknown;
}
function stored(): Stored | null {
  const raw = sessionStorage.getItem(WIZARD_STORAGE_KEY);
  return raw === null ? null : (JSON.parse(raw) as Stored);
}

function typeAll(store: Store, values: Record<string, string | boolean>): void {
  for (const [key, value] of Object.entries(values)) store.setValue(key, value);
}

describe('US-02 QuoteStore: the chosen plan (ADR-0003, spec 7.4)', () => {
  let warn: ReturnType<typeof vi.spyOn>;
  const logged = (): string => warn.mock.calls.map((args: unknown[]) => args.map(String).join(' ')).join('\n');

  beforeEach(() => {
    sessionStorage.clear();
    warn = vi.spyOn(console, 'warn').mockImplementation(() => undefined);
    TestBed.configureTestingModule({ providers: [{ provide: CLOCK, useValue: fixedClock(SPEC_TODAY) }] });
  });
  afterEach(() => {
    vi.restoreAllMocks();
    sessionStorage.clear();
  });

  describe('US-02-AC-03 / US-02-BR-05 choosing a plan', () => {
    it('US-02-AC-05 no plan is chosen on first arrival', () => {
      const store = newStore();
      store.enterCountry('CO');
      expect(store.plan()).toBeNull();
    });

    it('US-02-AC-03 choosing "total" holds the key in the wizard state for Colombia', () => {
      const store = newStore();
      store.enterCountry('CO');
      store.choosePlan('total');
      expect(store.country()).toBe('CO');
      expect(store.plan()).toEqual({ key: 'total' });
    });

    it('US-02-AC-03 the choice is written to sessionStorage at once, next to the step 1 values, as { key } only', () => {
      const store = newStore();
      store.enterCountry('CO');
      typeAll(store, CO_VALID_RAW);
      store.choosePlan('total');
      const entry = stored();
      expect(entry).toMatchObject({ version: 1, country: 'CO', step1: { values: CO_VALID_RAW }, plan: { key: 'total' } });
      expect(Object.keys(entry?.plan as object)).toEqual(['key']);
    });

    it('US-02-AC-05 choosing another plan replaces the choice: only "total" is held', () => {
      const store = newStore();
      store.enterCountry('CO');
      store.choosePlan('basico');
      store.choosePlan('total');
      expect(store.plan()).toEqual({ key: 'total' });
      expect(stored()?.plan).toEqual({ key: 'total' });
    });

    it('US-02-BR-07 names, prices and coverages are never stored: the entry has no text of a plan', () => {
      const store = newStore();
      store.enterCountry('CO');
      store.choosePlan('total');
      const raw = sessionStorage.getItem(WIZARD_STORAGE_KEY) ?? '';
      for (const forbidden of ['Plan Total', 'basePrice', '2100000', '2310000', 'Cobertura', 'coverages']) expect(raw).not.toContain(forbidden);
    });
  });

  describe('US-02-AC-13 the chosen plan is kept', () => {
    it('US-02-AC-13 a new store instance (a reload) restores the chosen plan', () => {
      const first = newStore();
      first.enterCountry('CL');
      first.choosePlan('protegido');
      const afterReload = reload();
      expect(afterReload.country()).toBe('CL');
      expect(afterReload.plan()).toEqual({ key: 'protegido' });
    });

    it('US-02-AC-13 editing step 1 values keeps the choice (the price is recomputed elsewhere)', () => {
      const store = newStore();
      store.enterCountry('CO');
      typeAll(store, CO_VALID_RAW);
      store.choosePlan('clasico');
      store.setValue('vehicleYear', '2015');
      expect(store.plan()).toEqual({ key: 'clasico' });
      expect(stored()?.plan).toEqual({ key: 'clasico' });
    });

    it('US-02-AC-13 a valid "Continuar" of step 1 (completeStep1) keeps the choice', () => {
      const store = newStore();
      store.enterCountry('CO');
      typeAll(store, CO_VALID_RAW);
      store.choosePlan('total');
      expect(store.completeStep1(seedFieldConfigs('CO'))).not.toBeNull();
      expect(store.plan()).toEqual({ key: 'total' });
    });

    it('US-02-AC-13 pruning step 1 against the configuration (hydration) keeps the choice', () => {
      const store = newStore();
      store.enterCountry('CO');
      typeAll(store, CO_VALID_RAW);
      store.choosePlan('total');
      store.prune(seedFieldConfigs('CO'));
      expect(store.plan()).toEqual({ key: 'total' });
      expect(stored()?.plan).toEqual({ key: 'total' });
    });

    it('US-02-AC-13 entering the same country again keeps the choice', () => {
      const store = newStore();
      store.enterCountry('CO');
      store.choosePlan('total');
      store.enterCountry('CO');
      expect(store.plan()).toEqual({ key: 'total' });
    });
  });

  describe('US-02-AC-14 a chosen plan that is no longer offered is dropped (pruning)', () => {
    it('US-02-AC-14 prunePlan clears a key that is not among the offered keys, and writes the entry back without it', () => {
      sessionStorage.setItem(WIZARD_STORAGE_KEY, wizardEntryWithPlan('CO', CO_VALID_RAW, 'clasico'));
      const store = reload();
      expect(store.plan()).toEqual({ key: 'clasico' });
      store.prunePlan(['basico', 'total']);
      expect(store.plan()).toBeNull();
      expect(stored()?.plan ?? null).toBeNull();
      expect(stored()?.step1.values).toEqual(CO_VALID_RAW);
    });

    it('US-02-AC-14 prunePlan keeps a key that is offered', () => {
      const store = newStore();
      store.enterCountry('CO');
      store.choosePlan('clasico');
      store.prunePlan(['basico', 'clasico', 'total']);
      expect(store.plan()).toEqual({ key: 'clasico' });
      expect(stored()?.plan).toEqual({ key: 'clasico' });
    });

    it('US-02-AC-14 with no offered plan at all the choice is cleared', () => {
      const store = newStore();
      store.enterCountry('CO');
      store.choosePlan('clasico');
      store.prunePlan([]);
      expect(store.plan()).toBeNull();
    });

    it('US-02-AC-14 pruning with nothing chosen changes nothing', () => {
      const store = newStore();
      store.enterCountry('CO');
      typeAll(store, CO_VALID_RAW);
      store.prunePlan(['basico']);
      expect(store.plan()).toBeNull();
      expect(store.values()).toEqual(CO_VALID_RAW);
    });

    it('US-02-AC-14 the key is compared exactly: "total" is not kept by an offer of "total-plus"', () => {
      const store = newStore();
      store.enterCountry('CO');
      store.choosePlan('total');
      store.prunePlan(['total-plus']);
      expect(store.plan()).toBeNull();
    });
  });

  describe('US-02-BR-07 the entry with a plan is validated at the boundary (ADR-0003)', () => {
    it('US-01-AC-21 an entry from US-01 without a plan is still valid: it restores and the plan is null', () => {
      sessionStorage.setItem(WIZARD_STORAGE_KEY, wizardEntry('CO', CO_VALID_RAW));
      const store = reload();
      expect(store.country()).toBe('CO');
      expect(store.values()).toEqual(CO_VALID_RAW);
      expect(store.plan()).toBeNull();
    });

    it('US-02-BR-07 an entry with "plan": null means no plan chosen and is valid', () => {
      sessionStorage.setItem(WIZARD_STORAGE_KEY, JSON.stringify({ version: 1, country: 'CO', step1: { values: CO_VALID_RAW }, plan: null }));
      const store = reload();
      expect(store.country()).toBe('CO');
      expect(store.plan()).toBeNull();
    });

    const invalidPlans: [string, unknown][] = [
      ['a string', 'total'],
      ['an object without key', {}],
      ['an object with a number key', { key: 5 }],
      ['an object with a null key', { key: null }],
      ['an array', ['total']],
      ['a number', 7],
      ['a boolean', true],
    ];
    for (const [why, plan] of invalidPlans) {
      it(`US-02-BR-07 a "plan" that is ${why} makes the entry invalid: it is discarded with a warning that has no value`, () => {
        sessionStorage.setItem(
          WIZARD_STORAGE_KEY,
          JSON.stringify({ version: 1, country: 'CO', step1: { values: { ...CO_VALID_RAW, fullName: CANARY } }, plan }),
        );
        const store = reload();
        expect(store.country()).toBeNull();
        expect(store.values()).toEqual({});
        expect(store.plan()).toBeNull();
        expect(sessionStorage.getItem(WIZARD_STORAGE_KEY)).toBeNull();
        expect(warn).toHaveBeenCalled();
        expect(logged()).not.toContain(CANARY);
        expect(logged()).not.toContain('total');
      });
    }
  });

  describe('US-02-BR-07 / ADR-0003 the choice is discarded with the entry', () => {
    it('US-02-BR-07 entering another country discards the previous country, its step 1 values and its chosen plan', () => {
      const store = newStore();
      store.enterCountry('CO');
      typeAll(store, CO_VALID_RAW);
      store.choosePlan('total');
      store.enterCountry('CL');
      expect(store.country()).toBe('CL');
      expect(store.values()).toEqual({});
      expect(store.plan()).toBeNull();
      expect(stored()?.plan ?? null).toBeNull();
    });

    it('US-02-BR-07 going back to the first country does not bring its plan back', () => {
      const store = newStore();
      store.enterCountry('CO');
      store.choosePlan('total');
      store.enterCountry('CL');
      store.enterCountry('CO');
      expect(store.plan()).toBeNull();
    });

    it('US-02-AC-13 the typed step 1 output is still produced only on a valid "Continuar", with a plan chosen or not', () => {
      const store = newStore();
      store.enterCountry('CO');
      typeAll(store, { ...CO_VALID_RAW, vehicleYear: '2005' });
      store.choosePlan('total');
      expect(store.completeStep1(seedFieldConfigs('CO'))).toBeNull();
      expect(store.step1Output()).toBeNull();
      expect(store.plan()).toEqual({ key: 'total' });
    });
  });
});
