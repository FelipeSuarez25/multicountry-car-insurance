import { TestBed } from '@angular/core/testing';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { QuoteStore } from '../../core/quote-store';
import { configureAppTest, createAppTest, type AppTest } from '../../../testing/app-harness';
import { day } from '../../../testing/clock';
import { alertTexts, button, control, fillForm, invalidControls, maybeButton, normalise, shownValue } from '../../../testing/dom';
import {
  CL_SPEC_INPUT,
  CL_SPEC_RAW,
  hiddenSeedPlans,
  seedPlan,
  seedPlanItems,
  seedPlans,
  toStrapiPlanItem,
  wizardEntryWithPlan,
} from '../../../testing/plan-fixtures';
import {
  accessibleDescription,
  accessibleName,
  cardOf,
  chosenNames,
  choosePlanOption,
  compact,
  groupName,
  groupOf,
  hasHeading,
  isPoliteLiveRegion,
  listAfterHeading,
  listItems,
  maybeRadio,
  planNames,
  planRadios,
  radio,
} from '../../../testing/plan-dom';
import { CO_VALID_INPUT, CO_VALID_RAW, WIZARD_STORAGE_KEY, seedCountryItems, seedStrapiItems, strapiCountryItem, type StrapiItem } from '../../../testing/seed-fixtures';

/**
 * Component tests of step 2 through the real routes (`/:country/planes`), with the content API
 * replaced by the scripted `ContentServer`. The page is found by what a person perceives: the
 * heading, the radio group, the buttons, the alerts. No class name or selector of the
 * implementation is used.
 *
 * Expected additions to `QuoteStore` (typed structurally here because they do not exist yet):
 *   plan(): { key: string } | null
 */
interface PlanState {
  plan(): { key: string } | null;
}

const TODAY = day(2026, 11, 21);
const HEADING = 'Elige tu plan';
const TITLE = 'Elige tu plan | Cotizador de seguro de auto';
const LOAD_ERROR = 'No pudimos cargar los planes. Intenta de nuevo.';
const EMPTY = 'No hay planes disponibles para tu país en este momento.';
const CHOOSE = 'Elige un plan para continuar.';
const LOADING = 'Cargando planes…';

const CO_NAMES = ['Plan Básico', 'Plan Clásico', 'Plan Total'];
const CL_NAMES = ['Plan Esencial', 'Plan Protegido', 'Plan Premium'];
/** Final prices of the seed with the step 1 of spec section 5 (age 36, vehicle 4: factor 1.10) at 2026-11-21. */
const CO_PRICES = ['$935.000', '$1.540.000', '$2.310.000'];
const CL_PRICES = ['$319.000', '$528.000', '$792.000'];

describe('US-02 step 2 page: the plan list (component tests through the real routes)', () => {
  let app: AppTest;
  let warn: ReturnType<typeof vi.spyOn>;

  /** One page load. A stored entry is placed before the load, as a reload would find it. */
  async function start(storedEntry?: string): Promise<AppTest> {
    if (storedEntry !== undefined) sessionStorage.setItem(WIZARD_STORAGE_KEY, storedEntry);
    app = await createAppTest();
    return app;
  }
  /** A person who completed step 1 in Colombia and reloaded on the plan list. */
  async function openCo(planKey: string | null = null): Promise<void> {
    await start(wizardEntryWithPlan('CO', CO_VALID_RAW, planKey));
    await app.open('/co/planes');
  }
  async function openCl(planKey: string | null = null): Promise<void> {
    await start(wizardEntryWithPlan('CL', CL_SPEC_RAW, planKey));
    await app.open('/cl/planes');
  }

  const store = (): QuoteStore & PlanState => TestBed.inject(QuoteStore) as QuoteStore & PlanState;
  const heading = (): HTMLElement => app.root.querySelector('h1') as HTMLElement;
  const names = (): string[] => planNames(app.root);
  const card = (planName: string): HTMLElement => cardOf(app.root, planName, names());
  const text = (): string => normalise(app.root.textContent);
  const continuar = async (): Promise<void> => {
    button(app.root, 'Continuar').click();
    await app.settle();
  };
  const storedPlan = (): unknown => (JSON.parse(sessionStorage.getItem(WIZARD_STORAGE_KEY) ?? '{}') as { plan?: unknown }).plan ?? null;
  const planRequests = (): number => app.server.requestsOf('plans').length;
  /** The plans whose card shows the word (counting per card, so a hidden duplicate for screen readers cannot skew it). */
  const withText = (word: string): string[] => names().filter((n) => normalise(card(n).textContent).includes(word));

  beforeEach(() => {
    configureAppTest({ today: TODAY });
    warn = vi.spyOn(console, 'warn').mockImplementation(() => undefined);
  });
  afterEach(() => {
    vi.useRealTimers();
    vi.restoreAllMocks();
    sessionStorage.clear();
  });

  const warned = (): string => warn.mock.calls.map((args: unknown[]) => args.map(String).join(' ')).join('\n');

  describe('US-02-AC-01 plans for the country', () => {
    it('US-02-AC-01 Colombia shows exactly "Plan Básico", "Plan Clásico", "Plan Total", in this order, though the response arrives reversed', async () => {
      await openCo();
      expect(names()).toEqual(CO_NAMES);
    });

    it('US-02-AC-01 Chile shows exactly "Plan Esencial", "Plan Protegido", "Plan Premium", in this order', async () => {
      await openCl();
      expect(names()).toEqual(CL_NAMES);
    });

    it('US-02-AC-01 no plan of the other country, no draft-only plan and no inactive plan is shown in Colombia', async () => {
      await openCo();
      expect(names()).toEqual(CO_NAMES); // the page is rendered, so the absences below mean something
      for (const hidden of ['Plan Joven', 'Plan Total Plus', ...CL_NAMES, 'Plan Flex', 'Plan Premium Plus']) {
        expect(text()).not.toContain(hidden);
      }
    });

    it('US-02-AC-01 no plan of the other country, no draft-only plan and no inactive plan is shown in Chile', async () => {
      await openCl();
      expect(names()).toEqual(CL_NAMES);
      for (const hidden of ['Plan Flex', 'Plan Premium Plus', ...CO_NAMES, 'Plan Joven', 'Plan Total Plus']) {
        expect(text()).not.toContain(hidden);
      }
    });

    it('US-02-AC-01 each plan shows its name, short description, final price with "Precio anual", coverages and benefits, in the configured order', async () => {
      await openCo();
      for (const [i, plan] of seedPlans('CO').entries()) {
        const el = card(plan.name);
        const content = normalise(el.textContent);
        expect(content).toContain(plan.shortDescription);
        expect(content).toContain('Precio anual');
        expect(compact(content)).toContain(CO_PRICES[i]);
        const coverages = listAfterHeading(el, 'Coberturas');
        const benefits = listAfterHeading(el, 'Beneficios');
        expect(coverages && listItems(coverages), `${plan.name} coverages`).toEqual(plan.coverages.map(normalise));
        expect(benefits && listItems(benefits), `${plan.name} benefits`).toEqual(plan.benefits.map(normalise));
      }
    });

    it('US-02-AC-01 every plan of Chile shows its final price with "Precio anual" and its own coverages', async () => {
      await openCl();
      for (const [i, plan] of seedPlans('CL').entries()) {
        const el = card(plan.name);
        expect(compact(el.textContent)).toContain(CL_PRICES[i]);
        expect(normalise(el.textContent)).toContain('Precio anual');
        const coverages = listAfterHeading(el, 'Coberturas');
        expect(coverages && listItems(coverages)).toEqual(plan.coverages.map(normalise));
      }
    });

    it('US-02-AC-01 only the final price is shown, never the base price (US-02-Q-08)', async () => {
      await openCo();
      expect(names()).toEqual(CO_NAMES);
      for (const base of ['$850.000', '$1.400.000', '$2.100.000']) expect(compact(text())).not.toContain(base);
    });

    it('US-02-AC-01 a plan with no benefits hides the "Beneficios" heading and keeps "Coberturas" (US-02-Q-12)', async () => {
      await start(wizardEntryWithPlan('CO', CO_VALID_RAW, null));
      app.server.plans['CO'] = seedPlanItems('CO').map((i) => (i['key'] === 'total' ? { ...i, benefits: [] } : i));
      await app.open('/co/planes');
      expect(hasHeading(card('Plan Total'), 'Beneficios')).toBe(false);
      expect(hasHeading(card('Plan Total'), 'Coberturas')).toBe(true);
      expect(hasHeading(card('Plan Básico'), 'Beneficios')).toBe(true);
    });

    it('US-02-AC-01 loads the plans of the context country only, once, by the published code, active plans only', async () => {
      await openCl();
      const requests = app.server.requestsOf('plans');
      expect(requests.map((r) => r.countryCode)).toEqual(['CL']);
      expect(requests[0].url).toContain('filters[isActive][$eq]=true');
      expect(requests[0].method).toBe('GET');
    });

    it('US-02-AC-01 choosing a plan does not request anything again (one plans request per page load)', async () => {
      await openCo();
      const before = app.server.requests.length;
      choosePlanOption(app.root, 'Plan Clásico');
      choosePlanOption(app.root, 'Plan Total');
      await app.settle();
      expect(app.server.requests.length).toBe(before);
    });
  });

  describe('US-02-AC-08 only active plans are shown (the boundary also drops them)', () => {
    it('US-02-AC-08 a published plan with isActive false that reaches the page ("Plan Total Plus") is not shown', async () => {
      await start(wizardEntryWithPlan('CO', CO_VALID_RAW, null));
      app.server.plans['CO'] = [...seedPlanItems('CO'), ...hiddenSeedPlans('CO').map((p, i) => toStrapiPlanItem(p, 40 + i))];
      await app.open('/co/planes');
      expect(names()).toEqual(CO_NAMES);
      expect(text()).not.toContain('Plan Total Plus');
    });
  });

  describe('US-02-AC-16 / US-02-BR-01 arrival on step 2: heading, focus and document title (spec 8, "Arrival")', () => {
    it('US-02-AC-16 the page has the heading "Elige tu plan", the focus is on it, and the document title is "Elige tu plan | Cotizador de seguro de auto"', async () => {
      await openCo();
      expect(normalise(heading().textContent)).toBe(HEADING);
      expect(document.activeElement).toBe(heading());
      expect(document.title).toBe(TITLE);
    });

    it('US-01-AC-24 on arriving at step 2 from a valid "Continuar" the keyboard focus is on the step 2 heading', async () => {
      await start();
      await app.open('/co/datos');
      fillForm(app.root, CO_VALID_INPUT);
      await app.settle();
      await continuar();
      expect(app.path()).toBe('/co/planes');
      expect(document.activeElement).toBe(heading());
      expect(document.title).toBe(TITLE);
    });

    it('US-02-AC-16 the focus is on the heading also after a reload on step 2 and after the browser back action from the summary', async () => {
      await openCo('total');
      await continuar();
      expect(app.path()).toBe('/co/resumen');
      app.location.back();
      await vi.waitFor(() => expect(app.path()).toBe('/co/planes'));
      await app.settle();
      expect(document.activeElement).toBe(heading());
    });

    it('US-02-AC-16 there is a single h1, and "Atrás" and "Continuar" are real buttons', async () => {
      await openCo();
      expect(app.root.querySelectorAll('h1')).toHaveLength(1);
      expect(maybeButton(app.root, 'Atrás')).not.toBeNull();
      expect(maybeButton(app.root, 'Continuar')).not.toBeNull();
    });
  });

  describe('US-02-AC-02 recommended plan', () => {
    it('US-02-AC-02 "Plan Protegido" shows the text "Recomendado", no other plan does, and it stays second', async () => {
      await openCl();
      expect(normalise(card('Plan Protegido').textContent)).toContain('Recomendado');
      expect(normalise(card('Plan Esencial').textContent)).not.toContain('Recomendado');
      expect(normalise(card('Plan Premium').textContent)).not.toContain('Recomendado');
      expect(withText('Recomendado')).toEqual(['Plan Protegido']);
      expect(names()[1]).toBe('Plan Protegido');
    });

    it('US-02-AC-02 the highlight is text, not colour alone: the word is in the accessible description of the option (WCAG 1.4.1)', async () => {
      await openCl();
      expect(accessibleDescription(radio(app.root, 'Plan Protegido'))).toContain('Recomendado');
      expect(accessibleDescription(radio(app.root, 'Plan Esencial'))).not.toContain('Recomendado');
    });

    it('US-02-AC-02 "Plan Clásico" of Colombia is the recommended plan of Colombia', async () => {
      await openCo();
      expect(withText('Recomendado')).toEqual(['Plan Clásico']);
    });
  });

  describe('US-02-AC-10 Scenario Outline "Recommended edge cases" (US-02-Q-09)', () => {
    async function openWith(recommended: string[], extra: StrapiItem[] = []): Promise<void> {
      await start(wizardEntryWithPlan('CO', CO_VALID_RAW, null));
      app.server.plans['CO'] = seedPlanItems('CO', { recommended, extra });
      await app.open('/co/planes');
    }

    it('US-02-AC-10 "Plan Clásico" only is flagged: "Recomendado" is shown on "Plan Clásico" only', async () => {
      await openWith(['clasico']);
      expect(withText('Recomendado')).toEqual(['Plan Clásico']);
      expect(warn).not.toHaveBeenCalled();
    });

    it('US-02-AC-10 no plan is flagged: "Recomendado" is shown nowhere', async () => {
      await openWith([]);
      expect(names()).toEqual(CO_NAMES);
      expect(withText('Recomendado')).toEqual([]);
      expect(warn).not.toHaveBeenCalled();
    });

    it('US-02-AC-10 "Plan Básico" and "Plan Total" are flagged: "Recomendado" is on "Plan Básico" only, and there is a console warning', async () => {
      await openWith(['basico', 'total']);
      expect(withText('Recomendado')).toEqual(['Plan Básico']);
      expect(warn).toHaveBeenCalled();
    });

    it('US-02-AC-10 only "Plan Total Plus", which is inactive, is flagged: "Recomendado" is shown nowhere', async () => {
      const inactive = toStrapiPlanItem({ ...seedPlan('CO', 'total-plus'), isRecommended: true }, 40);
      await openWith([], [inactive]);
      expect(names()).toEqual(CO_NAMES);
      expect(withText('Recomendado')).toEqual([]);
    });
  });

  describe('US-02-AC-03 / US-02-AC-05 plan selection', () => {
    it('US-02-AC-05 no plan is marked as chosen on first arrival, not even the recommended "Plan Protegido"', async () => {
      await openCl();
      expect(chosenNames(app.root)).toEqual([]);
      expect(withText('Seleccionado')).toEqual([]);
      expect(store().plan()).toBeNull();
      expect(storedPlan()).toBeNull();
    });

    it('US-02-AC-03 selecting "Plan Total" marks it as chosen: it is checked and shows "Seleccionado"; the wizard state holds the key "total" for Colombia', async () => {
      await openCo();
      choosePlanOption(app.root, 'Plan Total');
      await app.settle();
      expect(radio(app.root, 'Plan Total').checked).toBe(true);
      expect(normalise(card('Plan Total').textContent)).toContain('Seleccionado');
      expect(withText('Seleccionado')).toEqual(['Plan Total']);
      expect(store().country()).toBe('CO');
      expect(store().plan()).toEqual({ key: 'total' });
      expect(storedPlan()).toEqual({ key: 'total' });
    });

    it('US-02-AC-03 activating "Continuar" with "Plan Total" chosen moves on to the summary: the address is "/co/resumen"', async () => {
      await openCo();
      choosePlanOption(app.root, 'Plan Total');
      await app.settle();
      await continuar();
      expect(app.path()).toBe('/co/resumen');
    });

    it('US-02-AC-03 the same in Chile: "Plan Protegido" chosen, "Continuar" leads to "/cl/resumen"', async () => {
      await openCl();
      choosePlanOption(app.root, 'Plan Protegido');
      await app.settle();
      expect(store().plan()).toEqual({ key: 'protegido' });
      await continuar();
      expect(app.path()).toBe('/cl/resumen');
    });

    it('US-02-AC-05 choosing another plan replaces the choice: only "Plan Total" is marked and the state holds "total"', async () => {
      await openCo('basico');
      expect(chosenNames(app.root)).toEqual(['Plan Básico']);
      choosePlanOption(app.root, 'Plan Total');
      await app.settle();
      expect(chosenNames(app.root)).toEqual(['Plan Total']);
      expect(withText('Seleccionado')).toEqual(['Plan Total']);
      expect(store().plan()).toEqual({ key: 'total' });
    });

    it('US-02-AC-05 "Continuar" without a chosen plan stays on "/co/planes", shows "Elige un plan para continuar.", focuses the first option, and chooses nothing', async () => {
      await openCo();
      expect(alertTexts(app.root)).not.toContain(CHOOSE);
      await continuar();
      expect(app.path()).toBe('/co/planes');
      expect(alertTexts(app.root)).toContain(CHOOSE);
      expect(document.activeElement).toBe(radio(app.root, 'Plan Básico'));
      expect(chosenNames(app.root)).toEqual([]);
      expect(store().plan()).toBeNull();
    });

    it('US-02-AC-05 "Continuar" is always enabled, also with no plan chosen', async () => {
      await openCo();
      expect(button(app.root, 'Continuar').disabled).toBe(false);
    });

    it('US-02-AC-05 choosing a plan after the message removes the message, and "Continuar" then moves on', async () => {
      await openCo();
      await continuar();
      expect(alertTexts(app.root)).toContain(CHOOSE);
      choosePlanOption(app.root, 'Plan Clásico');
      await app.settle();
      expect(alertTexts(app.root)).not.toContain(CHOOSE);
      await continuar();
      expect(app.path()).toBe('/co/resumen');
    });

    it('US-02-AC-05 a second "Continuar" with no plan keeps a single message (it is announced once)', async () => {
      await openCo();
      await continuar();
      await continuar();
      expect(alertTexts(app.root).filter((t) => t === CHOOSE)).toHaveLength(1);
      expect(app.path()).toBe('/co/planes');
    });
  });

  describe('US-02-AC-04 no plans available (US-02-Q-15)', () => {
    async function openChileWith(items: StrapiItem[]): Promise<void> {
      await start(wizardEntryWithPlan('CL', CL_SPEC_RAW, null));
      app.server.plans['CL'] = items;
      await app.open('/cl/planes');
    }

    it('US-02-AC-04 an empty response shows "No hay planes disponibles para tu país en este momento.", no plan and no "Continuar", and keeps "Atrás"', async () => {
      await openChileWith([]);
      expect(text()).toContain(EMPTY);
      expect(planRadios(app.root)).toEqual([]);
      expect(maybeButton(app.root, 'Continuar')).toBeNull();
      expect(maybeButton(app.root, 'Atrás')).not.toBeNull();
      expect(normalise(heading().textContent)).toBe(HEADING);
    });

    it('US-02-AC-04 the message is in a polite live region, not an alert, and there is no retry (retrying would not help)', async () => {
      await openChileWith([]);
      const message = Array.from(app.root.querySelectorAll<HTMLElement>('*')).find((e) => e.children.length === 0 && normalise(e.textContent) === EMPTY);
      expect(message && isPoliteLiveRegion(message)).toBe(true);
      expect(alertTexts(app.root)).toEqual([]);
      expect(maybeButton(app.root, 'Reintentar')).toBeNull();
    });

    it('US-02-AC-04 every Chile plan malformed (price 0) is also the empty state, not the error state', async () => {
      await openChileWith(seedPlanItems('CL').map((i) => ({ ...i, basePrice: 0 })));
      expect(text()).toContain(EMPTY);
      expect(text()).not.toContain(LOAD_ERROR);
      expect(planRadios(app.root)).toEqual([]);
      expect(warn).toHaveBeenCalled();
    });

    it('US-02-AC-04 every Chile plan inactive is the empty state', async () => {
      await openChileWith(seedPlanItems('CL').map((i) => ({ ...i, isActive: false })));
      expect(text()).toContain(EMPTY);
      expect(maybeButton(app.root, 'Continuar')).toBeNull();
    });

    it('US-02-AC-04 "Atrás" takes me to step 1 of Chile with my data', async () => {
      await openChileWith([]);
      button(app.root, 'Atrás').click();
      await app.settle();
      expect(app.path()).toBe('/cl/datos');
      for (const [label, value] of Object.entries(CL_SPEC_INPUT)) expect(shownValue(control(app.root, label))).toBe(value);
      expect(invalidControls(app.root)).toEqual([]);
    });
  });

  describe('US-02-AC-11 loading, error and retry (US-02-Q-15)', () => {
    it('US-02-AC-11 while loading it shows "Cargando planes…" and the heading, busy, with no plan and no "Continuar"; at 10 seconds the error (9.999 s still loading)', async () => {
      vi.useFakeTimers();
      await start(wizardEntryWithPlan('CL', CL_SPEC_RAW, null));
      app.server.plans['CL'] = 'hang';
      const requestedAt = Date.now(); // fake clock: the plans request is issued at this instant
      const elapsed = (): number => Date.now() - requestedAt;
      const navigation = app.begin('/cl/planes');
      await app.settle();

      expect(text()).toContain(LOADING);
      expect(normalise(heading().textContent)).toBe(HEADING);
      expect(app.root.querySelector('[aria-busy="true"]')).not.toBeNull();
      expect(planRadios(app.root)).toEqual([]);
      expect(maybeButton(app.root, 'Continuar')).toBeNull();
      expect(maybeButton(app.root, 'Atrás')).not.toBeNull();

      await vi.advanceTimersByTimeAsync(9_999 - elapsed());
      TestBed.tick();
      expect(elapsed()).toBe(9_999);
      expect(text()).toContain(LOADING);
      expect(alertTexts(app.root)).not.toContain(LOAD_ERROR);

      await vi.advanceTimersByTimeAsync(1);
      await vi.advanceTimersByTimeAsync(50);
      TestBed.tick();
      await navigation;
      expect(alertTexts(app.root)).toContain(LOAD_ERROR);
      expect(text()).not.toContain(LOADING);
      expect(document.activeElement).toBe(button(app.root, 'Reintentar'));
      expect(planRadios(app.root)).toEqual([]);
      expect(maybeButton(app.root, 'Continuar')).toBeNull();
      expect(maybeButton(app.root, 'Atrás')).not.toBeNull();
    });

    it('US-02-AC-11 the loading text is in a polite live region', async () => {
      vi.useFakeTimers();
      await start(wizardEntryWithPlan('CL', CL_SPEC_RAW, null));
      app.server.plans['CL'] = 'hang';
      const navigation = app.begin('/cl/planes');
      await app.settle();
      const loading = Array.from(app.root.querySelectorAll<HTMLElement>('*')).find((e) => e.children.length === 0 && normalise(e.textContent) === LOADING);
      expect(loading && isPoliteLiveRegion(loading)).toBe(true);
      await vi.advanceTimersByTimeAsync(10_000);
      await app.settle();
      await navigation;
    });

    it('US-02-AC-11 an HTTP error shows "No pudimos cargar los planes. Intenta de nuevo." in an alert with "Reintentar" focused, and no plan, no "Continuar"', async () => {
      await start(wizardEntryWithPlan('CL', CL_SPEC_RAW, null));
      app.server.plans['CL'] = 'error';
      await app.open('/cl/planes');
      expect(alertTexts(app.root)).toContain(LOAD_ERROR);
      expect(document.activeElement).toBe(button(app.root, 'Reintentar'));
      expect(planRadios(app.root)).toEqual([]);
      expect(maybeButton(app.root, 'Continuar')).toBeNull();
      expect(maybeButton(app.root, 'Atrás')).not.toBeNull();
      expect(text()).not.toContain(EMPTY);
    });

    it('US-02-AC-11 once the content backend is available again, "Reintentar" shows the Chile plans and removes the error', async () => {
      await start(wizardEntryWithPlan('CL', CL_SPEC_RAW, null));
      app.server.plans['CL'] = 'error';
      await app.open('/cl/planes');
      expect(planRequests()).toBe(1); // no automatic retries

      app.server.plans['CL'] = seedPlanItems('CL');
      button(app.root, 'Reintentar').click();
      await app.settle();
      expect(names()).toEqual(CL_NAMES);
      expect(alertTexts(app.root)).not.toContain(LOAD_ERROR);
      expect(maybeButton(app.root, 'Reintentar')).toBeNull();
      expect(planRequests()).toBe(2);
    });

    it('US-02-AC-11 after a timeout there are no automatic retries; "Reintentar" asks again', async () => {
      vi.useFakeTimers();
      await start(wizardEntryWithPlan('CL', CL_SPEC_RAW, null));
      app.server.plans['CL'] = 'hang';
      const navigation = app.begin('/cl/planes');
      await app.settle();
      await vi.advanceTimersByTimeAsync(10_000);
      await app.settle();
      await navigation;
      await vi.advanceTimersByTimeAsync(120_000);
      await app.settle();
      expect(planRequests()).toBe(1);

      app.server.plans['CL'] = seedPlanItems('CL');
      button(app.root, 'Reintentar').click();
      await app.settle();
      expect(names()).toEqual(CL_NAMES);
      expect(planRequests()).toBe(2);
    });

    it('US-02-AC-11 "Atrás" works from the error state and takes me to step 1 of Chile', async () => {
      await start(wizardEntryWithPlan('CL', CL_SPEC_RAW, null));
      app.server.plans['CL'] = 'error';
      await app.open('/cl/planes');
      button(app.root, 'Atrás').click();
      await app.settle();
      expect(app.path()).toBe('/cl/datos');
    });

    it('US-02-AC-11 a country that cannot be formatted (an invalid localeTag rejected by Intl) shows the error state, not a broken price', async () => {
      await start(wizardEntryWithPlan('CO', CO_VALID_RAW, null));
      app.server.countries = [strapiCountryItem('CO', 'Colombia', 'COP', 'es_CO', 10, 0), ...seedCountryItems().slice(1)];
      await app.open('/co/planes');
      expect(alertTexts(app.root)).toContain(LOAD_ERROR);
      expect(planRadios(app.root)).toEqual([]);
      expect(maybeButton(app.root, 'Continuar')).toBeNull();
    });
  });

  describe('US-02-AC-13 the chosen plan is kept', () => {
    it('US-02-AC-13 back to step 1 with "Atrás": every step 1 field shows the value I entered; "Continuar" then shows "Plan Total" still chosen', async () => {
      await openCo('total');
      expect(chosenNames(app.root)).toEqual(['Plan Total']);

      button(app.root, 'Atrás').click();
      await app.settle();
      expect(app.path()).toBe('/co/datos');
      for (const [label, value] of Object.entries(CO_VALID_INPUT)) expect(shownValue(control(app.root, label))).toBe(value);

      button(app.root, 'Continuar').click();
      await app.settle();
      expect(app.path()).toBe('/co/planes');
      expect(chosenNames(app.root)).toEqual(['Plan Total']);
      expect(store().plan()).toEqual({ key: 'total' });
    });

    it('US-02-AC-13 the choice made in this page load survives "Atrás" and "Continuar" without a reload', async () => {
      await openCo();
      choosePlanOption(app.root, 'Plan Total');
      await app.settle();
      button(app.root, 'Atrás').click();
      await app.settle();
      button(app.root, 'Continuar').click();
      await app.settle();
      expect(chosenNames(app.root)).toEqual(['Plan Total']);
    });

    it('US-02-AC-13 reload on the plan list: "Plan Protegido" is still chosen with the final price "$528.000"', async () => {
      await openCl('protegido');
      expect(chosenNames(app.root)).toEqual(['Plan Protegido']);
      expect(compact(card('Plan Protegido').textContent)).toContain('$528.000');
      expect(normalise(card('Plan Protegido').textContent)).toContain('Seleccionado');
    });

    it('US-02-AC-13 changing "Modelo (año)" to 2015 keeps "Plan Clásico" chosen and recomputes its price from "$1.540.000" to "$1.260.000"', async () => {
      await openCo('clasico');
      expect(compact(card('Plan Clásico').textContent)).toContain('$1.540.000');

      button(app.root, 'Atrás').click();
      await app.settle();
      fillForm(app.root, { 'Modelo (año)': '2015' });
      await app.settle();
      button(app.root, 'Continuar').click();
      await app.settle();

      expect(app.path()).toBe('/co/planes');
      expect(chosenNames(app.root)).toEqual(['Plan Clásico']);
      expect(compact(card('Plan Clásico').textContent)).toContain('$1.260.000');
      expect(compact(card('Plan Clásico').textContent)).not.toContain('$1.540.000');
      expect(compact(card('Plan Básico').textContent)).toContain('$765.000'); // 850000 x 0.90
    });
  });

  describe('US-02-AC-07 final prices on the page (price rule, formatting and clock together)', () => {
    it('US-02-AC-07 Colombia shows "Plan Básico" $935.000, "Plan Clásico" $1.540.000, "Plan Total" $2.310.000', async () => {
      await openCo();
      CO_NAMES.forEach((name, i) => expect(compact(card(name).textContent)).toContain(CO_PRICES[i]));
    });

    it('US-02-AC-07 Chile shows "Plan Esencial" $319.000, "Plan Protegido" $528.000, "Plan Premium" $792.000', async () => {
      await openCl();
      CL_NAMES.forEach((name, i) => expect(compact(card(name).textContent)).toContain(CL_PRICES[i]));
    });

    it('US-02-AC-06 a price uses the country currency and format read from the country entry, without ISO code or decimals', async () => {
      await openCl();
      expect(names()).toEqual(CL_NAMES);
      const content = compact(text());
      expect(content).not.toContain('CLP');
      expect(content).not.toMatch(/\$\d[\d.]*,\d/);
    });

    it('US-02-AC-07 the price rule runs with the injected clock: on 2028-01-01 the 2022 vehicle is 6 years old (factor 1.00) and the base price is shown', async () => {
      TestBed.resetTestingModule();
      configureAppTest({ today: day(2028, 1, 1) });
      await openCo();
      // 2028 - 2022 = 6 years (factor 1.00) and the driver is 37 (1.00): the base price is shown.
      expect(compact(card('Plan Básico').textContent)).toContain('$850.000');
    });

    it('US-02-AC-07 a step 1 whose birth date or vehicle year reserved field was removed by the editor still renders, with a warning that has no value', async () => {
      await start(wizardEntryWithPlan('CO', CO_VALID_RAW, null));
      app.server.fields['CO'] = seedStrapiItems('CO').filter((i) => i['key'] !== 'vehicleYear');
      await app.open('/co/planes');
      expect(names()).toEqual(CO_NAMES);
      expect(compact(card('Plan Básico').textContent)).toContain('$850.000');
      expect(warned()).toContain('vehicleYear');
      expect(warned()).not.toContain('2022');
    });
  });

  describe('US-02-AC-14 a chosen plan that is no longer offered is dropped', () => {
    const rows: [string, (items: StrapiItem[]) => StrapiItem[]][] = [
      ['unpublishes "Plan Clásico" (it is no longer in the response)', (items) => items.filter((i) => i['key'] !== 'clasico')],
      ['sets isActive to false on "Plan Clásico"', (items) => items.map((i) => (i['key'] === 'clasico' ? { ...i, isActive: false } : i))],
    ];
    for (const [change, apply] of rows) {
      it(`US-02-AC-14 the business team ${change}: after a reload no plan is chosen, the wizard state holds none, and "Continuar" shows "Elige un plan para continuar."`, async () => {
        await start(wizardEntryWithPlan('CO', CO_VALID_RAW, 'clasico'));
        app.server.plans['CO'] = apply(seedPlanItems('CO'));
        await app.open('/co/planes');

        expect(names()).toEqual(['Plan Básico', 'Plan Total']);
        expect(chosenNames(app.root)).toEqual([]);
        expect(withText('Seleccionado')).toEqual([]);
        expect(store().plan()).toBeNull();
        expect(storedPlan()).toBeNull();
        expect(JSON.parse(sessionStorage.getItem(WIZARD_STORAGE_KEY) ?? '{}').step1.values).toEqual(CO_VALID_RAW);

        await continuar();
        expect(app.path()).toBe('/co/planes');
        expect(alertTexts(app.root)).toContain(CHOOSE);
      });
    }

    it('US-02-AC-14 a stored key that is still offered is kept', async () => {
      await openCo('clasico');
      expect(chosenNames(app.root)).toEqual(['Plan Clásico']);
      expect(storedPlan()).toEqual({ key: 'clasico' });
    });

    it('US-02-AC-14 a key of another country in the stored entry is not offered here: nothing is chosen', async () => {
      await start(wizardEntryWithPlan('CL', CL_SPEC_RAW, 'clasico'));
      await app.open('/cl/planes');
      expect(chosenNames(app.root)).toEqual([]);
      expect(storedPlan()).toBeNull();
    });
  });

  describe('US-02-AC-15 the summary route is registered with its guard (spec US-02-Q-03)', () => {
    it('US-02-AC-15 opening "/co/resumen" with no valid step 1 data ends at "/co/datos"', async () => {
      await start();
      await app.open('/co/resumen');
      expect(app.path()).toBe('/co/datos');
    });

    it('US-02-AC-15 opening "/co/resumen" with valid step 1 data and no chosen plan ends at "/co/planes", showing the plan list', async () => {
      await start(wizardEntryWithPlan('CO', CO_VALID_RAW, null));
      await app.open('/co/resumen');
      expect(app.path()).toBe('/co/planes');
      expect(names()).toEqual(CO_NAMES);
    });

    it('US-02-AC-15 opening "/co/resumen" with the chosen plan "joven" (draft only) ends at "/co/planes"', async () => {
      await start(wizardEntryWithPlan('CO', CO_VALID_RAW, 'joven'));
      await app.open('/co/resumen');
      expect(app.path()).toBe('/co/planes');
    });

    it('US-02-AC-15 opening "/co/resumen" with valid step 1 data and the chosen plan "total" stays at "/co/resumen"', async () => {
      await start(wizardEntryWithPlan('CO', CO_VALID_RAW, 'total'));
      await app.open('/co/resumen');
      expect(app.path()).toBe('/co/resumen');
    });
  });

  describe('US-02-AC-17 accessible plan options', () => {
    it('US-02-AC-17 the plans are one single-choice group whose accessible name is "Elige tu plan", made of native radios that share a name', async () => {
      await openCl();
      const group = groupOf(app.root);
      expect(group).not.toBeNull();
      expect(groupName(group as HTMLElement)).toBe(HEADING);
      const radios = planRadios(app.root);
      expect(radios).toHaveLength(3);
      expect(new Set(radios.map((r) => r.name)).size).toBe(1);
      expect(radios[0].name).not.toBe('');
      expect(radios.every((r) => group?.contains(r))).toBe(true);
    });

    it('US-02-AC-17 each option\'s accessible name is its plan name, for example "Plan Protegido"', async () => {
      await openCl();
      expect(planRadios(app.root).map(accessibleName)).toEqual(CL_NAMES);
      expect(maybeRadio(app.root, 'Plan Protegido')).not.toBeNull();
    });

    it('US-02-AC-17 the accessible description of "Plan Protegido" includes "Recomendado" and "$528.000"', async () => {
      await openCl();
      const description = accessibleDescription(radio(app.root, 'Plan Protegido'));
      expect(description).toContain('Recomendado');
      expect(compact(description)).toContain('$528.000');
    });

    it('US-02-AC-17 every option\'s description includes its own final price', async () => {
      await openCo();
      CO_NAMES.forEach((name, i) => expect(compact(accessibleDescription(radio(app.root, name)))).toContain(CO_PRICES[i]));
    });

    it('US-02-AC-17 each option exposes whether it is checked, and choosing moves it', async () => {
      await openCl();
      expect(planRadios(app.root).map((r) => r.checked)).toEqual([false, false, false]);
      choosePlanOption(app.root, 'Plan Premium');
      await app.settle();
      expect(planRadios(app.root).map((r) => r.checked)).toEqual([false, false, true]);
    });

    it('US-02-AC-17 "Coberturas" and "Beneficios" are headings followed by lists', async () => {
      await openCl();
      for (const plan of seedPlans('CL')) {
        const el = card(plan.name);
        expect(listAfterHeading(el, 'Coberturas'), `${plan.name} Coberturas`).not.toBeNull();
        expect(listAfterHeading(el, 'Beneficios'), `${plan.name} Beneficios`).not.toBeNull();
      }
    });

    it('US-02-AC-17 activating "Continuar" with no chosen plan shows "Elige un plan para continuar." in a single alert region', async () => {
      await openCl();
      expect(app.root.querySelectorAll('[role="alert"]')).toHaveLength(0);
      await continuar();
      expect(alertTexts(app.root)).toEqual([CHOOSE]);
      expect(app.root.querySelectorAll('[role="alert"]')).toHaveLength(1);
    });

    it('US-02-AC-17 the plan options are reachable by keyboard: none is disabled or removed from the tab order', async () => {
      await openCl();
      for (const r of planRadios(app.root)) {
        expect(r.disabled).toBe(false);
        expect(r.tabIndex).toBeGreaterThanOrEqual(0);
      }
      expect(button(app.root, 'Atrás').tabIndex).toBe(0);
      expect(button(app.root, 'Continuar').tabIndex).toBe(0);
    });

    it('US-02-AC-17 "Atrás" comes before "Continuar" in the document, after the plan group (Tab order of spec AC-16)', async () => {
      await openCo();
      const group = groupOf(app.root) as HTMLElement;
      const back = button(app.root, 'Atrás');
      const next = button(app.root, 'Continuar');
      const follows = (a: Node, b: Node): boolean => (a.compareDocumentPosition(b) & Node.DOCUMENT_POSITION_FOLLOWING) !== 0;
      expect(follows(group, back)).toBe(true);
      expect(follows(back, next)).toBe(true);
    });
  });

  describe('US-02-AC-19 / US-02-BR-04 step 1 data stays in the browser', () => {
    it('US-02-AC-19 from step 1 to the summary every request is a GET without an Authorization header, and none contains a step 1 value', async () => {
      await start();
      await app.open('/co/datos');
      fillForm(app.root, CO_VALID_INPUT);
      await app.settle();
      await continuar();
      expect(app.path()).toBe('/co/planes');
      choosePlanOption(app.root, 'Plan Total');
      await app.settle();
      await continuar();
      expect(app.path()).toBe('/co/resumen');

      const requests = app.server.requests;
      expect(requests.length).toBeGreaterThan(0);
      expect(requests.map((r) => r.method).filter((m) => m !== 'GET')).toEqual([]);
      expect(requests.filter((r) => r.hasAuthorization)).toEqual([]);
      expect(app.server.requestsOf('plans').length).toBeGreaterThan(0);
      const entered = ['Ana Prueba Ficticia', '1012345678', 'ABC123', '3 Touring', '1990-05-15', 'Medellín', 'MDE', 'mazda'];
      for (const request of requests) {
        for (const value of entered) {
          expect(request.url.toLowerCase(), `${request.url} must not carry "${value}"`).not.toContain(value.toLowerCase());
          expect(request.url.toLowerCase()).not.toContain(encodeURIComponent(value).toLowerCase());
        }
      }
    });

    it('US-02-AC-19 no warning and no log line of the page carries a step 1 value or a price', async () => {
      await openCo('clasico');
      expect(names()).toEqual(CO_NAMES);
      for (const value of ['Ana Prueba Ficticia', '1012345678', 'ABC123', '1990-05-15']) expect(warned()).not.toContain(value);
    });

    it('US-02-AC-19 the plans request carries only the country code of the context', async () => {
      await openCo();
      const [request] = app.server.requestsOf('plans');
      expect(request.countryCode).toBe('CO');
      expect(request.url).not.toMatch(/birth|vehicle|1990|2022|documentNumber|plate/i);
    });
  });
});
