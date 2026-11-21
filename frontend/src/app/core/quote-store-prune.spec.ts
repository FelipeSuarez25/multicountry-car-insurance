import { TestBed } from '@angular/core/testing';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { CLOCK } from './clock';
import { QuoteStore } from './quote-store';
import { SPEC_TODAY, fixedClock } from '../../testing/clock';
import { CO_VALID_RAW, WIZARD_STORAGE_KEY, seedFieldConfigs } from '../../testing/seed-fixtures';
import type { FieldConfig } from '../shared/field-config.model';

/**
 * US-03-R1-F02 (ADR-0003, "When it is written": the pruned state is written back). When `prune()`
 * removes every stored key (every stored field is no longer configured) the existing `quote-wizard`
 * entry must be removed, not left with the values of removed fields; and an empty state never
 * writes an entry.
 */
const unrelated: FieldConfig = { key: 'somethingElse', type: 'text', label: 'Otro', isRequired: false, sortOrder: 10, errorMessage: 'Revisa este campo.', rules: [] };

describe('US-03-R1-F02 QuoteStore.prune() and the empty state', () => {
  let store: QuoteStore;
  beforeEach(() => {
    sessionStorage.clear();
    vi.spyOn(console, 'warn').mockImplementation(() => undefined);
    TestBed.configureTestingModule({ providers: [{ provide: CLOCK, useValue: fixedClock(SPEC_TODAY) }] });
    store = TestBed.inject(QuoteStore);
  });
  afterEach(() => {
    vi.restoreAllMocks();
    sessionStorage.clear();
  });

  function fill(): void {
    store.enterCountry('CO');
    for (const [key, value] of Object.entries(CO_VALID_RAW)) store.setValue(key, value);
  }

  it('US-03-R1-F02 control: a prune that keeps some keys writes the pruned values back', () => {
    fill();
    store.prune(seedFieldConfigs('CO').filter((c) => c.key === 'plate'));
    const entry = JSON.parse(sessionStorage.getItem(WIZARD_STORAGE_KEY) ?? 'null') as { step1: { values: Record<string, unknown> } };
    expect(entry.step1.values).toEqual({ plate: 'ABC123' });
  });

  it('US-03-R1-F02 when prune() removes every stored key, the "quote-wizard" entry is removed (getItem is null)', () => {
    fill();
    expect(sessionStorage.getItem(WIZARD_STORAGE_KEY)).not.toBeNull();
    store.prune([unrelated]);
    expect(store.values()).toEqual({});
    expect(sessionStorage.getItem(WIZARD_STORAGE_KEY)).toBeNull();
  });

  it('US-03-R1-F02 the same with an empty configuration', () => {
    fill();
    store.prune([]);
    expect(sessionStorage.getItem(WIZARD_STORAGE_KEY)).toBeNull();
  });

  it('US-03-R1-F02 the old values do not come back after a reload', () => {
    fill();
    store.prune([unrelated]);
    TestBed.resetTestingModule();
    TestBed.configureTestingModule({ providers: [{ provide: CLOCK, useValue: fixedClock(SPEC_TODAY) }] });
    const fresh = TestBed.inject(QuoteStore);
    expect(fresh.values()).toEqual({});
    expect(sessionStorage.getItem(WIZARD_STORAGE_KEY)).toBeNull();
  });

  it('US-03-R1-F02 an empty state never writes an entry: entering a country writes nothing', () => {
    store.enterCountry('CO');
    expect(sessionStorage.getItem(WIZARD_STORAGE_KEY)).toBeNull();
  });

  it('US-03-R1-F02 pruning an already empty state writes nothing', () => {
    store.enterCountry('CO');
    store.prune(seedFieldConfigs('CO'));
    expect(sessionStorage.getItem(WIZARD_STORAGE_KEY)).toBeNull();
  });
});
