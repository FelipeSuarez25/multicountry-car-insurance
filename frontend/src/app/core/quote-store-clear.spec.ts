import { TestBed } from '@angular/core/testing';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { CLOCK } from './clock';
import { QuoteStore } from './quote-store';
import { SPEC_TODAY, fixedClock } from '../../testing/clock';
import { CO_VALID_RAW, WIZARD_STORAGE_KEY, seedFieldConfigs } from '../../testing/seed-fixtures';

/**
 * US-03-BR-06 / US-03-AC-11 (ADR-0003, ADR-0008): on a successful payment the whole wizard state is
 * deleted before the confirmation is shown: the `quote-wizard` entry and the store's in-memory step
 * 1 values, typed output and plan. Only `QuoteStore` touches `sessionStorage`.
 *
 * Expected API on `QuoteStore` (typed structurally here because it does not exist yet):
 *   clearQuote(): void
 * That nothing is cleared on a rejected payment is a page behaviour, tested in `summary-page.spec.ts`.
 */
interface ClearState {
  clearQuote(): void;
}
type Store = QuoteStore & ClearState;

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

function filled(): Store {
  const store = newStore();
  store.enterCountry('CO');
  for (const [key, value] of Object.entries(CO_VALID_RAW)) store.setValue(key, value);
  store.choosePlan('total');
  return store;
}

describe('US-03-AC-11 QuoteStore.clearQuote() (ADR-0003: "Entry deleted before the confirmation is shown")', () => {
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

  it('US-03-AC-11 control: before clearing, the entry exists with the values and the plan', () => {
    filled();
    const entry = JSON.parse(sessionStorage.getItem(WIZARD_STORAGE_KEY) ?? 'null') as { plan?: unknown; step1?: { values?: Record<string, unknown> } } | null;
    expect(entry?.plan).toEqual({ key: 'total' });
    expect(entry?.step1?.values?.['documentNumber']).toBe('1012345678');
  });

  it('US-03-AC-11 the "quote-wizard" entry is removed from sessionStorage', () => {
    const store = filled();
    store.clearQuote();
    expect(sessionStorage.getItem(WIZARD_STORAGE_KEY)).toBeNull();
  });

  it('US-03-AC-11 the in-memory step 1 values, the chosen plan and the typed output are reset', () => {
    const store = filled();
    expect(store.completeStep1(seedFieldConfigs('CO'))).not.toBeNull();
    expect(store.step1Output()).not.toBeNull();
    store.clearQuote();
    expect(store.values()).toEqual({});
    expect((store as QuoteStore & { plan(): unknown }).plan()).toBeNull();
    expect(store.step1Output()).toBeNull();
  });

  it('US-03-AC-11 the state is not resurrected: a reload after clearing finds no values, no plan and no country', () => {
    filled().clearQuote();
    const fresh = reload();
    expect(fresh.values()).toEqual({});
    expect((fresh as QuoteStore & { plan(): unknown }).plan()).toBeNull();
    expect(fresh.country()).toBeNull();
    expect(sessionStorage.getItem(WIZARD_STORAGE_KEY)).toBeNull();
  });

  it('US-03-AC-11 after clearing, the person can start again: entering the country and typing writes a new, empty-based entry', () => {
    const store = filled();
    store.clearQuote();
    store.enterCountry('CO');
    store.setValue('plate', 'XYZ789');
    const entry = JSON.parse(sessionStorage.getItem(WIZARD_STORAGE_KEY) ?? 'null') as { step1: { values: Record<string, unknown> }; plan?: unknown };
    expect(entry.step1.values).toEqual({ plate: 'XYZ789' });
    expect(entry.plan).toBeUndefined();
  });

  it('US-03-AC-11 clearing an empty store is harmless', () => {
    const store = newStore();
    expect(() => store.clearQuote()).not.toThrow();
    expect(sessionStorage.getItem(WIZARD_STORAGE_KEY)).toBeNull();
  });

  it('US-03-AC-11 clearing twice is harmless', () => {
    const store = filled();
    store.clearQuote();
    expect(() => store.clearQuote()).not.toThrow();
    expect(sessionStorage.getItem(WIZARD_STORAGE_KEY)).toBeNull();
  });

  it('US-03-AC-11 only the wizard entry is removed: another sessionStorage key stays', () => {
    sessionStorage.setItem('other-key', 'valor');
    filled().clearQuote();
    expect(sessionStorage.getItem('other-key')).toBe('valor');
    sessionStorage.removeItem('other-key');
  });

  it('US-03-AC-11 when sessionStorage is unavailable the memory state is still reset, nothing throws and no value is logged', () => {
    const store = filled();
    store.setValue('fullName', CANARY);
    vi.spyOn(Storage.prototype, 'removeItem').mockImplementation(() => {
      throw new Error('storage unavailable');
    });
    expect(() => store.clearQuote()).not.toThrow();
    expect(store.values()).toEqual({});
    expect((store as QuoteStore & { plan(): unknown }).plan()).toBeNull();
    expect(logged()).not.toContain(CANARY);
  });
});
