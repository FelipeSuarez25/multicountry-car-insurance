import { Injectable, inject, signal } from '@angular/core';
import type { FieldConfig, RawValue, RawValues, Step1Output } from '../shared/field-config.model';
import { validateForm } from '../shared/field-validators';
import { hydrate, toOutput } from '../shared/field-values';
import { CLOCK } from './clock';

const STORAGE_KEY = 'quote-wizard';
const VERSION = 1;

/** The step 2 choice stored next to the step 1 values (spec 7.4). */
export interface ChosenPlan {
  key: string;
}

const isRecord = (v: unknown): v is Record<string, unknown> => typeof v === 'object' && v !== null && !Array.isArray(v);

/**
 * Wizard state (ADR-0003). Holds the raw editing values of step 1 for one country, written to
 * `sessionStorage` on every change, and the typed output that exists only after a valid
 * "Continuar". Values are never logged. When storage is unavailable the state lives in memory.
 */
@Injectable({ providedIn: 'root' })
export class QuoteStore {
  private readonly clock = inject(CLOCK);
  private readonly countrySignal = signal<string | null>(null);
  private readonly valuesSignal = signal<RawValues>({});
  private readonly outputSignal = signal<Step1Output | null>(null);
  private readonly planSignal = signal<ChosenPlan | null>(null);
  private warnedAboutStorage = false;

  readonly country = this.countrySignal.asReadonly();
  readonly values = this.valuesSignal.asReadonly();
  readonly step1Output = this.outputSignal.asReadonly();
  /** The chosen plan: its key only, never names or prices (ADR-0003, US-02-BR-07). */
  readonly plan = this.planSignal.asReadonly();

  constructor() {
    this.restore();
  }

  /** Enters a supported country's context; another country's stored state is discarded. */
  enterCountry(code: string): void {
    if (this.countrySignal() !== code) {
      this.valuesSignal.set({});
      this.outputSignal.set(null);
      this.planSignal.set(null);
      this.countrySignal.set(code);
      this.clearStorage();
    }
    this.persist();
  }

  /**
   * Closes the quote after a successful payment (ADR-0003, US-03-BR-06): the entry is removed and
   * the in-memory country, values, typed output and plan are reset, so a reload or a back action
   * leads to an empty step 1.
   */
  clearQuote(): void {
    this.countrySignal.set(null);
    this.valuesSignal.set({});
    this.outputSignal.set(null);
    this.planSignal.set(null);
    this.clearStorage();
  }

  setValue(key: string, value: RawValue): void {
    this.valuesSignal.update((values) => ({ ...values, [key]: value }));
    this.outputSignal.set(null);
    this.persist();
  }

  /** Chooses a plan, replacing any earlier choice; written to storage at once. */
  choosePlan(key: string): void {
    this.planSignal.set({ key });
    this.persist();
  }

  /** Clears the choice when its key is not among the plans offered in this page load. */
  prunePlan(offeredKeys: readonly string[]): void {
    const chosen = this.planSignal();
    if (chosen && !offeredKeys.includes(chosen.key)) {
      this.planSignal.set(null);
      this.persist();
    }
  }

  /** Drops values of keys no longer configured and clears select values whose option is gone. */
  prune(configs: FieldConfig[]): void {
    const pruned: RawValues = {};
    for (const [key, value] of Object.entries(this.valuesSignal())) {
      const config = configs.find((c) => c.key === key);
      if (!config) continue;
      const optionGone = config.type === 'select' && typeof value === 'string' && value !== '' && !config.options?.some((o) => o.value === value);
      pruned[key] = optionGone ? '' : value;
    }
    this.valuesSignal.set(pruned);
    this.persist();
  }

  /** True when the stored values are valid for the given configuration, on the clock's today. */
  isStep1Valid(configs: FieldConfig[]): boolean {
    const model = hydrate(configs, this.valuesSignal());
    return Object.keys(validateForm(configs, model, this.clock())).length === 0;
  }

  /** The typed output, only when every field is valid; otherwise `null` and no output is kept. */
  completeStep1(configs: FieldConfig[]): Step1Output | null {
    const country = this.countrySignal();
    if (country === null || !this.isStep1Valid(configs)) {
      this.outputSignal.set(null);
      return null;
    }
    const output: Step1Output = { country, values: toOutput(configs, hydrate(configs, this.valuesSignal())) };
    this.outputSignal.set(output);
    return output;
  }

  private restore(): void {
    let raw: string | null;
    try {
      raw = sessionStorage.getItem(STORAGE_KEY);
    } catch {
      this.warnStorageOnce();
      return;
    }
    if (raw === null) return;
    const entry = this.parseEntry(raw);
    if (entry === null) {
      console.warn('quote-wizard: the stored entry is invalid and was discarded');
      this.clearStorage();
      return;
    }
    this.countrySignal.set(entry.country);
    this.valuesSignal.set(entry.values);
    this.planSignal.set(entry.plan);
  }

  private parseEntry(raw: string): { country: string; values: RawValues; plan: ChosenPlan | null } | null {
    let parsed: unknown;
    try {
      parsed = JSON.parse(raw);
    } catch {
      return null;
    }
    if (!isRecord(parsed) || parsed['version'] !== VERSION) return null;
    const country = parsed['country'];
    if (typeof country !== 'string' || !/^[A-Z]{2}$/.test(country)) return null;
    const step1 = parsed['step1'];
    if (!isRecord(step1)) return null;
    const stored = step1['values'];
    if (!isRecord(stored)) return null;
    const values: RawValues = {};
    for (const [key, value] of Object.entries(stored)) {
      if (typeof value !== 'string' && typeof value !== 'boolean') return null;
      values[key] = value;
    }
    const plan = parsed['plan'];
    if (plan === undefined || plan === null) return { country, values, plan: null };
    if (!isRecord(plan) || typeof plan['key'] !== 'string') return null;
    return { country, values, plan: { key: plan['key'] } };
  }

  private persist(): void {
    const country = this.countrySignal();
    if (country === null) return;
    const plan = this.planSignal();
    // An empty state keeps no entry: any stored one is removed, and nothing is written until the
    // person types (US-03-AC-11, US-03-R1-F02).
    if (plan === null && Object.keys(this.valuesSignal()).length === 0) {
      this.clearStorage();
      return;
    }
    try {
      sessionStorage.setItem(STORAGE_KEY, JSON.stringify({ version: VERSION, country, step1: { values: this.valuesSignal() }, ...(plan ? { plan } : {}) }));
    } catch {
      this.warnStorageOnce();
    }
  }

  private clearStorage(): void {
    try {
      sessionStorage.removeItem(STORAGE_KEY);
    } catch {
      this.warnStorageOnce();
    }
  }

  private warnStorageOnce(): void {
    if (this.warnedAboutStorage) return;
    this.warnedAboutStorage = true;
    console.warn('quote-wizard: sessionStorage is unavailable, the state is kept in memory only');
  }
}
