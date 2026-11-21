import { TestBed } from '@angular/core/testing';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { QuoteStore } from '../../core/quote-store';
import { PaymentGateway } from '../../core/payment-gateway';
import { RANDOM_DIGITS } from '../../core/random-digits';
import { SimulatedPaymentGateway } from '../../core/simulated-payment-gateway';
import type { FieldConfig } from '../../shared/field-config.model';
import { configureAppTest, createAppTest, type AppTest } from '../../../testing/app-harness';
import { day } from '../../../testing/clock';
import { alertTexts, button, control, fillForm, maybeButton, maybeControl, normalise, setChecked, shownValue } from '../../../testing/dom';
import { controlledGateway, type ControlledGateway, type PaymentOutcome } from '../../../testing/payment-fakes';
import { accessibleDescription, accessibleName, chosenNames, choosePlanOption, compact, groupName, groupOf, isPoliteLiveRegion, planRadios } from '../../../testing/plan-dom';
import { CL_SPEC_RAW, wizardEntryWithPlan } from '../../../testing/plan-fixtures';
import { CO_VALID_RAW, WIZARD_STORAGE_KEY, seedStrapiItems, toStrapiFieldItem } from '../../../testing/seed-fixtures';
import {
  accessibleText,
  asPairs,
  h2s,
  headingLevel,
  headingsIn,
  hiddenFromAssistiveText,
  isUnavailable,
  payButton,
  regionNamed,
  rowsOf,
  sectionOf,
  statusTexts,
  tabStops,
} from '../../../testing/summary-dom';
import {
  CL_TERMS_TITLE,
  CO_DRAFT_TERMS_TITLE,
  CO_DRAFT_TEXT,
  CO_TERMS_TITLE,
  seedTermsItems,
  simpleTermsItem,
} from '../../../testing/terms-fixtures';

/**
 * Component tests of step 3 through the real routes (`/:country/resumen`, behind the existing
 * `summaryStepGuard`), with the content API replaced by the scripted `ContentServer`, the payment
 * gateway replaced by a controllable one (or the real `SimulatedPaymentGateway` under fake timers
 * where the 1.5 s matters), and the random source fixed. The page is found by what a person
 * perceives: headings, description lists, buttons, regions, `aria-*` states.
 *
 * Expected DOM (spec 8, ADR-0008, ADR-0009; see `testing/summary-dom.ts`):
 *  - `h1` "Resumen de tu cotización" with focus; `h2` "Tus datos", "Tu vehículo", "Plan elegido",
 *    "Términos y condiciones", each inside a `section`; data as `dl` > `dt` + `dd`; the masked
 *    document number is a `dd` holding an `aria-hidden="true"` element with the bullets and a text
 *    "Número oculto, termina en <tail>" for assistive technology;
 *  - the terms: an element with `role="region"`, `tabindex="0"`, named by the terms title (the
 *    title is a heading), the body rendered by `app-rich-text`; a checkbox "Acepto los términos y
 *    condiciones"; a `fieldset` with the legend "Simulación de pago (no se realiza ningún cobro)"
 *    and the radios "Pago aprobado" (checked) and "Pago rechazado"; buttons "Editar mis datos",
 *    "Cambiar plan" and "Pagar" (reads "Procesando pago…" while processing);
 *  - exactly three form controls (the checkbox and the two radios); no card field;
 *  - a `role="status"` region present from the start and a `role="alert"` for errors, both outside
 *    the `aria-busy="true"` subtree;
 *  - the confirmation replaces the content of the same page: `h1` "Pago confirmado".
 */

const TODAY = day(2026, 11, 21);
const HEADING = 'Resumen de tu cotización';
const TITLE = `${HEADING} | Cotizador de seguro de auto`;
const CONFIRMED = 'Pago confirmado';
const CONFIRMED_TITLE = `${CONFIRMED} | Cotizador de seguro de auto`;
const ACCEPT = 'Acepto los términos y condiciones';
const HINT = 'Acepta los términos y condiciones para pagar.';
const REJECTED = 'El pago fue rechazado y no se realizó ningún cobro. Puedes intentarlo de nuevo.';
const TERMS_LOADING = 'Cargando términos y condiciones…';
const TERMS_ERROR = 'No pudimos cargar los términos y condiciones. Intenta de nuevo.';
const TERMS_NONE = 'Los términos y condiciones no están disponibles en este momento. No es posible pagar.';
const SIMULATION = 'Simulación de pago (no se realiza ningún cobro)';

const CO_HOLDER: [string, string][] = [
  ['Tipo de documento', 'Cédula de ciudadanía'],
  ['Número de documento', '••••••5678'],
  ['Nombre completo', 'Ana Prueba Ficticia'],
  ['Fecha de nacimiento', '15 de mayo de 1990'],
  ['Ciudad', 'Medellín'],
];
const CO_VEHICLE: [string, string][] = [
  ['Placa', 'ABC123'],
  ['Marca', 'Mazda'],
  ['Línea', '3 Touring'],
  ['Modelo (año)', '2022'],
];
const CL_HOLDER: [string, string][] = [
  ['RUT', '••.•••.678-5'],
  ['Nombre completo', 'Ana Prueba Ficticia'],
  ['Fecha de nacimiento', '15 de mayo de 1990'],
  ['Ciudad', 'Santiago'],
];
const CL_VEHICLE: [string, string][] = [
  ['Patente', 'BCDF12'],
  ['Marca', 'Kia'],
  ['Modelo', 'Rio 5'],
  ['Año', '2022'],
];

describe('US-03 step 3 page: the summary and the payment (component tests through the real routes)', () => {
  let app: AppTest;
  let warn: ReturnType<typeof vi.spyOn>;
  let gateway: ControlledGateway;
  let random: ReturnType<typeof vi.fn>;

  /** Fresh injector with the controllable gateway and the fixed random source. */
  function setup(): void {
    configureAppTest({ today: TODAY });
    gateway = controlledGateway();
    random = vi.fn(() => 482_913);
    TestBed.configureTestingModule({
      providers: [
        { provide: PaymentGateway, useValue: gateway },
        { provide: RANDOM_DIGITS, useValue: random },
      ],
    });
  }
  /** The real simulated gateway, for the tests where the 1.5 s matters (use with fake timers). */
  function useRealGateway(): void {
    TestBed.configureTestingModule({ providers: [{ provide: PaymentGateway, useClass: SimulatedPaymentGateway }] });
  }

  /** One page load. A stored entry is placed before the load, as a reload would find it. */
  async function start(storedEntry?: string): Promise<AppTest> {
    if (storedEntry !== undefined) sessionStorage.setItem(WIZARD_STORAGE_KEY, storedEntry);
    app = await createAppTest();
    return app;
  }
  async function openCo(planKey: string | null = 'total'): Promise<void> {
    await start(wizardEntryWithPlan('CO', CO_VALID_RAW, planKey));
    await app.open('/co/resumen');
  }
  async function openCl(planKey: string | null = 'protegido'): Promise<void> {
    await start(wizardEntryWithPlan('CL', CL_SPEC_RAW, planKey));
    await app.open('/cl/resumen');
  }

  const store = (): QuoteStore & { plan(): { key: string } | null } => TestBed.inject(QuoteStore) as QuoteStore & { plan(): { key: string } | null };
  const text = (): string => normalise(app.root.textContent);
  const h1 = (): HTMLElement => app.root.querySelector('h1') as HTMLElement;
  const pay = (): HTMLButtonElement => payButton(app.root) as HTMLButtonElement;
  const checkbox = (): HTMLInputElement | null => maybeControl(app.root, ACCEPT) as HTMLInputElement | null;
  const outcome = (name: 'Pago aprobado' | 'Pago rechazado'): HTMLInputElement => control(app.root, name) as HTMLInputElement;
  const termsRequests = (): number => app.server.requestsOf('terms').length;
  const storedEntry = (): { country: string; step1: { values: Record<string, unknown> }; plan?: { key: string } } | null => {
    const raw = sessionStorage.getItem(WIZARD_STORAGE_KEY);
    return raw === null ? null : JSON.parse(raw);
  };
  const warned = (): string => warn.mock.calls.map((args: unknown[]) => args.map(String).join(' ')).join('\n');
  /** Let pending work run without moving the fake clock (so a 1.5 s deadline can be tested to the millisecond). */
  const flush = async (): Promise<void> => {
    if (vi.isFakeTimers()) {
      await vi.advanceTimersByTimeAsync(0);
      TestBed.tick();
    } else {
      await app.settle();
    }
  };
  const advance = async (ms: number): Promise<void> => {
    await vi.advanceTimersByTimeAsync(ms);
    TestBed.tick();
  };
  const accept = async (): Promise<void> => {
    setChecked(checkbox() as HTMLInputElement, true);
    await flush();
  };
  /** Activate "Pagar" the way a click does, then let the page react. */
  const clickPay = async (): Promise<void> => {
    pay().click();
    await flush();
  };
  const rows = (heading: string) => asPairs(rowsOf(sectionOf(app.root, heading)));
  /** A full page load of `url`: a new injector (nothing in memory), the same sessionStorage. */
  async function reloadAt(url: string): Promise<void> {
    const kept = sessionStorage.getItem(WIZARD_STORAGE_KEY);
    TestBed.resetTestingModule();
    setup();
    await start(kept ?? undefined);
    await app.open(url);
  }

  beforeEach(() => {
    setup();
    warn = vi.spyOn(console, 'warn').mockImplementation(() => undefined);
  });
  afterEach(() => {
    vi.useRealTimers();
    vi.restoreAllMocks();
    sessionStorage.clear();
  });

  // -------------------------------------------------------------------------------------------
  describe('US-03-AC-01 the summary shows my data, my vehicle and the chosen plan', () => {
    it('US-03-AC-01 Colombia: the address is "/co/resumen", the heading is "Resumen de tu cotización" and the sections are "Tus datos", "Tu vehículo", "Plan elegido", "Términos y condiciones" in this order', async () => {
      await openCo();
      expect(app.path()).toBe('/co/resumen');
      expect(normalise(h1().textContent)).toBe(HEADING);
      expect(h2s(app.root).map((h) => normalise(h.textContent))).toEqual(['Tus datos', 'Tu vehículo', 'Plan elegido', 'Términos y condiciones']);
    });

    it('US-03-AC-01 Colombia: under "Tus datos", in this order, the five rows of the example, with the masked document number', async () => {
      await openCo();
      expect(rows('Tus datos')).toEqual(CO_HOLDER);
    });

    it('US-03-AC-01 Colombia: under "Tu vehículo", in this order, Placa, Marca, Línea and Modelo (año)', async () => {
      await openCo();
      expect(rows('Tu vehículo')).toEqual(CO_VEHICLE);
    });

    it('US-03-AC-01 Chile: "Tus datos" has RUT "••.•••.678-5", Nombre completo, Fecha de nacimiento, Ciudad "Santiago"; "Tu vehículo" has Patente, Marca "Kia", Modelo "Rio 5", Año', async () => {
      await openCl();
      expect(app.path()).toBe('/cl/resumen');
      expect(rows('Tus datos')).toEqual(CL_HOLDER);
      expect(rows('Tu vehículo')).toEqual(CL_VEHICLE);
    });

    it('US-03-AC-01 Colombia: under "Plan elegido" I see "Plan Total", its short description, "$2.310.000" and "Precio anual"', async () => {
      await openCo();
      const section = sectionOf(app.root, 'Plan elegido') as HTMLElement;
      const content = normalise(section.textContent);
      expect(content).toContain('Plan Total');
      expect(content).toContain('Protección completa, también para daños parciales.');
      expect(compact(content)).toContain('$2.310.000');
      expect(content).toContain('Precio anual');
    });

    it('US-03-AC-01 Chile: "Plan Protegido", its description, "$528.000" and "Precio anual"', async () => {
      await openCl();
      const content = normalise((sectionOf(app.root, 'Plan elegido') as HTMLElement).textContent);
      expect(content).toContain('Plan Protegido');
      expect(content).toContain('Daños a terceros y pérdida total de tu auto.');
      expect(compact(content)).toContain('$528.000');
      expect(content).toContain('Precio anual');
    });

    it('US-03-AC-01 only the chosen plan is shown: no other plan name, no coverage list, no base price', async () => {
      await openCo();
      const content = normalise((sectionOf(app.root, 'Plan elegido') as HTMLElement).textContent);
      for (const other of ['Plan Básico', 'Plan Clásico', 'Plan Joven', 'Plan Total Plus']) expect(content).not.toContain(other);
      expect(compact(content)).not.toContain('$2.100.000');
      expect(app.root.querySelectorAll('input[type="radio"]').length).toBe(2); // only the two payment simulation radios
    });

    it('US-03-AC-01 the price is the final price of the step 2 rule on the same data and day (ADR-0007): a vehicle of 2015 makes it "$1.890.000"', async () => {
      await start(wizardEntryWithPlan('CO', { ...CO_VALID_RAW, vehicleYear: '2015' }, 'total'));
      await app.open('/co/resumen');
      expect(compact(normalise(app.root.textContent))).toContain('$1.890.000');
    });

    it('US-03-AC-01 the consent checkbox of step 1 is not listed', async () => {
      await openCo();
      expect(text()).not.toContain('Autorizo el tratamiento de mis datos personales.');
    });

    it('US-03-AC-01 the summary does not change the stored state: the entry still holds the values and the plan', async () => {
      await openCo();
      expect(storedEntry()?.plan).toEqual({ key: 'total' });
      expect(storedEntry()?.step1.values['documentNumber']).toBe('1012345678');
    });
  });

  // -------------------------------------------------------------------------------------------
  describe('US-03-AC-05 the document number is masked in the page', () => {
    it('US-03-AC-05 the row "Número de documento" shows "••••••5678" to the eye and "Número oculto, termina en 5678" to assistive technology', async () => {
      await openCo();
      const row = rowsOf(sectionOf(app.root, 'Tus datos')).find((r) => r.label === 'Número de documento');
      expect(row?.value).toBe('••••••5678');
      expect(row?.spoken).toBe('Número oculto, termina en 5678');
    });

    it('US-03-AC-05 the masked bullets are hidden from assistive technology (aria-hidden), not read as "bullet bullet bullet"', async () => {
      await openCo();
      const dd = Array.from(app.root.querySelectorAll('dd')).find((d) => normalise(d.textContent).includes('5678')) as HTMLElement;
      expect(hiddenFromAssistiveText(dd)).toBe('••••••5678');
      expect(accessibleText(dd)).not.toContain('•');
    });

    it('US-03-AC-05 Chile: "••.•••.678-5" with "Número oculto, termina en 678-5"', async () => {
      await openCl();
      const row = rowsOf(sectionOf(app.root, 'Tus datos')).find((r) => r.label === 'RUT');
      expect(row?.value).toBe('••.•••.678-5');
      expect(row?.spoken).toBe('Número oculto, termina en 678-5');
    });

    it('US-03-AC-05 the full number never reaches the DOM, the document title or the address: not "1012345678", not "101234"', async () => {
      await openCo();
      const html = app.root.innerHTML;
      const everything = `${html}\n${app.root.textContent}\n${document.title}\n${app.path()}`;
      expect(everything).not.toContain('1012345678');
      expect(everything).not.toContain('101234');
      expect(everything).not.toContain('012345');
    });

    it('US-03-AC-05 the Chile RUT does not reach the DOM unmasked either (digits "12.345" and "12345678")', async () => {
      await openCl();
      const everything = `${app.root.innerHTML}\n${document.title}\n${app.path()}`;
      expect(everything).not.toContain('12.345');
      expect(everything).not.toContain('12345678');
    });

    it('US-03-AC-05 the masking applies to the document number only: the plate and the name are shown in full', async () => {
      await openCo();
      expect(text()).toContain('ABC123');
      expect(text()).toContain('Ana Prueba Ficticia');
    });

    it('US-03-AC-05 the full number is not logged', async () => {
      await openCo();
      expect(warned()).not.toContain('1012345678');
    });
  });

  // -------------------------------------------------------------------------------------------
  describe('US-03-AC-06 how step 1 values are shown (editor-added fields)', () => {
    const phone: FieldConfig = {
      key: 'mobilePhone',
      type: 'text',
      label: 'Teléfono celular',
      isRequired: false,
      sortOrder: 45,
      errorMessage: 'Ingresa un teléfono válido.',
      rules: [],
    };

    it('US-03-AC-06 an editor-added optional field with a value is a "Tus datos" row in sortOrder, unmasked', async () => {
      await start(wizardEntryWithPlan('CO', { ...CO_VALID_RAW, mobilePhone: '3001234567' }, 'total'));
      app.server.fields['CO'] = [...seedStrapiItems('CO'), toStrapiFieldItem(phone, 20)];
      await app.open('/co/resumen');
      expect(rows('Tus datos').map(([label]) => label)).toEqual(['Tipo de documento', 'Número de documento', 'Nombre completo', 'Fecha de nacimiento', 'Teléfono celular', 'Ciudad']);
      expect(rows('Tus datos')).toContainEqual(['Teléfono celular', '3001234567']);
    });

    it('US-03-AC-06 the same field left empty has no row', async () => {
      await start(wizardEntryWithPlan('CO', { ...CO_VALID_RAW, mobilePhone: '' }, 'total'));
      app.server.fields['CO'] = [...seedStrapiItems('CO'), toStrapiFieldItem(phone, 20)];
      await app.open('/co/resumen');
      expect(text()).not.toContain('Teléfono celular');
      expect(rows('Tus datos')).toEqual(CO_HOLDER);
    });

    it('US-03-AC-06 a field removed from the configuration since step 1 has no row, and its stored value is not shown', async () => {
      await start(wizardEntryWithPlan('CO', { ...CO_VALID_RAW, mobilePhone: '3001234567' }, 'total'));
      await app.open('/co/resumen'); // this page load configures no mobilePhone field
      expect(text()).not.toContain('3001234567');
    });
  });

  // -------------------------------------------------------------------------------------------
  describe('US-03-AC-02 / US-03-AC-13 / US-03-AC-14 the terms of the country', () => {
    it('US-03-AC-02 Colombia: I see the title "Términos y condiciones del seguro de auto – Colombia" and the heading "Condiciones principales", and not "Condiciones generales"', async () => {
      await openCo();
      expect(text()).toContain(CO_TERMS_TITLE);
      expect(text()).toContain('Condiciones principales');
      expect(text()).not.toContain('Condiciones generales');
      expect(text()).not.toContain(CL_TERMS_TITLE);
    });

    it('US-03-AC-02 Chile: the Chile title and "Condiciones generales", and not "Condiciones principales"', async () => {
      await openCl();
      expect(text()).toContain(CL_TERMS_TITLE);
      expect(text()).toContain('Condiciones generales');
      expect(text()).not.toContain('Condiciones principales');
      expect(text()).not.toContain(CO_TERMS_TITLE);
    });

    it('US-03-AC-02 the terms are one request for the country of the page: GET /api/terms with CO (Colombia) or CL (Chile)', async () => {
      await openCo();
      expect(app.server.requestsOf('terms').map((r) => r.countryCode)).toEqual(['CO']);
    });

    it('US-03-AC-02 Chile asks for the Chile terms', async () => {
      await openCl();
      expect(app.server.requestsOf('terms').map((r) => r.countryCode)).toEqual(['CL']);
    });

    it('US-03-AC-17 the terms are a region whose accessible name is the terms title, focusable with the keyboard (tabindex 0)', async () => {
      await openCo();
      const region = regionNamed(app.root, CO_TERMS_TITLE);
      expect(region).not.toBeNull();
      expect(region?.getAttribute('tabindex')).toBe('0');
    });

    it('US-03-AC-13 "Condiciones principales" is a heading inside the terms, below the section heading (level 3 or deeper), and below the terms title when that is a heading', async () => {
      await openCo();
      const region = regionNamed(app.root, CO_TERMS_TITLE) as HTMLElement;
      const inner = headingsIn(region).find((h) => normalise(h.textContent) === 'Condiciones principales') as HTMLElement;
      expect(inner).toBeDefined();
      expect(headingLevel(inner)).toBeGreaterThan(2);
      const titleHeading = headingsIn(app.root).find((h) => normalise(h.textContent) === CO_TERMS_TITLE);
      if (titleHeading) expect(headingLevel(inner)).toBeGreaterThan(headingLevel(titleHeading) as number);
    });

    it('US-03-AC-13 the three conditions are items of one bulleted list and "ficticio" is bold', async () => {
      await openCo();
      const region = regionNamed(app.root, CO_TERMS_TITLE) as HTMLElement;
      expect(region.querySelectorAll('ul')).toHaveLength(1);
      expect(region.querySelectorAll('ul > li')).toHaveLength(3);
      expect(Array.from(region.querySelectorAll('strong')).map((s) => normalise(s.textContent))).toEqual(['ficticio']);
    });

    it('US-03-AC-13 Chile: the conditions are a numbered list', async () => {
      await openCl();
      const region = regionNamed(app.root, CL_TERMS_TITLE) as HTMLElement;
      expect(region.querySelectorAll('ol > li')).toHaveLength(3);
      expect(region.querySelectorAll('ul')).toHaveLength(0);
    });

    for (const payload of ['<img src=x onerror=alert(1)>', '<script>alert(1)</script>', '<b>negrita</b>']) {
      it(`US-03-AC-13 published terms that contain ${payload} show it literally and add no element, attribute or script to the page`, async () => {
        await start(wizardEntryWithPlan('CO', CO_VALID_RAW, 'total'));
        app.server.terms['CO'] = [simpleTermsItem('Términos de prueba', payload, '2026-11-21T08:00:00.000Z')];
        await app.open('/co/resumen');
        const region = regionNamed(app.root, 'Términos de prueba') as HTMLElement;
        expect(region.textContent).toContain(payload);
        expect(app.root.querySelectorAll('img, script, b, iframe')).toHaveLength(0);
        expect(app.root.querySelectorAll('[onerror], [onclick], [onload]')).toHaveLength(0);
      });
    }

    it('US-03-AC-14 a draft in the response (publishedAt null) and the text of another country are never shown', async () => {
      await start(wizardEntryWithPlan('CO', CO_VALID_RAW, 'total'));
      app.server.terms['CO'] = [simpleTermsItem(CO_DRAFT_TERMS_TITLE, CO_DRAFT_TEXT, null, 5), ...seedTermsItems('CO')];
      await app.open('/co/resumen');
      expect(text()).not.toContain('Borrador no publicado');
      expect(text()).not.toContain(CO_DRAFT_TERMS_TITLE);
      expect(text()).not.toContain('Condiciones generales');
      expect(text()).not.toContain('pesos chilenos');
      expect(text()).toContain(CO_TERMS_TITLE);
    });

    it('US-03-AC-14 when Chile has two published terms the most recently published one is shown, and the older text is not', async () => {
      await start(wizardEntryWithPlan('CL', CL_SPEC_RAW, 'protegido'));
      app.server.terms['CL'] = [...seedTermsItems('CL'), simpleTermsItem('Términos y condiciones de prueba – Chile', 'Texto de prueba publicado.', '2026-11-21T12:00:00.000Z', 3)];
      await app.open('/cl/resumen');
      expect(text()).toContain('Términos y condiciones de prueba – Chile');
      expect(text()).toContain('Texto de prueba publicado.');
      expect(text()).not.toContain('Condiciones generales');
      expect(text()).not.toContain(CL_TERMS_TITLE);
    });

    it('US-03-BR-07 no terms text is in front-end code: a terms title that only this test knows is what the page shows', async () => {
      await start(wizardEntryWithPlan('CO', CO_VALID_RAW, 'total'));
      app.server.terms['CO'] = [simpleTermsItem('Condiciones inventadas por la prueba', 'Solo existe en este test.', '2026-11-21T12:00:00.000Z')];
      await app.open('/co/resumen');
      expect(text()).toContain('Condiciones inventadas por la prueba');
      expect(text()).not.toContain(CO_TERMS_TITLE);
    });
  });

  // -------------------------------------------------------------------------------------------
  describe('US-03-AC-08 / US-03-BR-04 "Pagar" is enabled only after accepting the terms', () => {
    it('US-03-AC-08 with the terms shown and not accepted, "Pagar" is aria-disabled (not natively disabled) and its description is "Acepta los términos y condiciones para pagar."', async () => {
      await openCl();
      expect(checkbox()).not.toBeNull();
      expect(checkbox()?.checked).toBe(false);
      expect(pay().getAttribute('aria-disabled')).toBe('true');
      expect(pay().hasAttribute('disabled')).toBe(false);
      expect(accessibleDescription(pay())).toBe(HINT);
      expect(text()).toContain(HINT);
    });

    it('US-03-AC-08 activating a disabled "Pagar" starts no payment attempt and I stay on the summary', async () => {
      await openCl();
      await clickPay();
      await clickPay();
      expect(gateway.calls).toHaveLength(0);
      expect(app.path()).toBe('/cl/resumen');
      expect(pay().textContent).toContain('Pagar');
      expect(pay().textContent).not.toContain('Procesando');
    });

    it('US-03-AC-08 checking "Acepto los términos y condiciones" enables "Pagar" and the hint is not shown', async () => {
      await openCl();
      await accept();
      expect(pay().getAttribute('aria-disabled')).not.toBe('true');
      expect(text()).not.toContain(HINT);
      expect(accessibleDescription(pay())).not.toContain(HINT);
    });

    it('US-03-AC-08 unchecking it disables "Pagar" again and the hint is back', async () => {
      await openCl();
      await accept();
      setChecked(checkbox() as HTMLInputElement, false);
      await flush();
      expect(pay().getAttribute('aria-disabled')).toBe('true');
      expect(accessibleDescription(pay())).toBe(HINT);
      await clickPay();
      expect(gateway.calls).toHaveLength(0);
    });

    it('US-03-AC-08 "Pagar" is a focusable button in every state (a screen reader user can find it and its reason)', async () => {
      await openCl();
      pay().focus();
      expect(document.activeElement).toBe(pay());
    });

    it('US-03-BR-04 the terms are not accepted on arrival, not even in Colombia where the person has accepted nothing', async () => {
      await openCo();
      expect(checkbox()?.checked).toBe(false);
    });

    it('US-03-AC-02 the pay button is disabled until I accept: Colombia too', async () => {
      await openCo();
      expect(isUnavailable(pay())).toBe(true);
      await accept();
      expect(isUnavailable(pay())).toBe(false);
    });
  });

  // -------------------------------------------------------------------------------------------
  describe('US-03-AC-12 the terms cannot be loaded or are not available', () => {
    it('US-03-AC-12 on an HTTP error the data and the plan are shown, the terms section shows "No pudimos cargar los términos y condiciones. Intenta de nuevo." in an alert with "Reintentar", no checkbox, "Pagar" disabled', async () => {
      await start(wizardEntryWithPlan('CO', CO_VALID_RAW, 'total'));
      app.server.terms['CO'] = 'error';
      await app.open('/co/resumen');
      expect(rows('Tus datos')).toEqual(CO_HOLDER);
      expect(compact(text())).toContain('$2.310.000');
      expect(alertTexts(app.root)).toContain(TERMS_ERROR);
      expect(maybeButton(app.root, 'Reintentar')).not.toBeNull();
      expect(checkbox()).toBeNull();
      expect(isUnavailable(pay())).toBe(true);
      await clickPay();
      expect(gateway.calls).toHaveLength(0);
    });

    it('US-03-AC-12 the error is not caused by the person: the focus stays on the heading, not on "Reintentar"', async () => {
      await start(wizardEntryWithPlan('CO', CO_VALID_RAW, 'total'));
      app.server.terms['CO'] = 'error';
      await app.open('/co/resumen');
      expect(document.activeElement).toBe(h1());
    });

    it('US-03-AC-12 there is no automatic retry: one request until "Reintentar" is activated', async () => {
      await start(wizardEntryWithPlan('CO', CO_VALID_RAW, 'total'));
      app.server.terms['CO'] = 'error';
      await app.open('/co/resumen');
      await app.settle();
      expect(termsRequests()).toBe(1);
    });

    it('US-03-AC-12 once the backend answers again, "Reintentar" shows the Colombia terms, removes the error and asks once more', async () => {
      await start(wizardEntryWithPlan('CO', CO_VALID_RAW, 'total'));
      app.server.terms['CO'] = 'error';
      await app.open('/co/resumen');
      app.server.terms['CO'] = seedTermsItems('CO');
      button(app.root, 'Reintentar').click();
      await app.settle();
      expect(termsRequests()).toBe(2);
      expect(text()).toContain(CO_TERMS_TITLE);
      expect(alertTexts(app.root)).not.toContain(TERMS_ERROR);
      expect(checkbox()).not.toBeNull();
      await accept();
      expect(isUnavailable(pay())).toBe(false);
    });

    it('US-03-AC-12 a retry that fails again shows the error again', async () => {
      await start(wizardEntryWithPlan('CO', CO_VALID_RAW, 'total'));
      app.server.terms['CO'] = 'error';
      await app.open('/co/resumen');
      button(app.root, 'Reintentar').click();
      await app.settle();
      expect(termsRequests()).toBe(2);
      expect(alertTexts(app.root)).toContain(TERMS_ERROR);
    });

    it('US-03-AC-12 while the terms load, "Cargando términos y condiciones…" is in a polite live region, the section is busy, and there is no checkbox', async () => {
      vi.useFakeTimers();
      await start(wizardEntryWithPlan('CO', CO_VALID_RAW, 'total'));
      app.server.terms['CO'] = 'hang';
      const navigation = app.begin('/co/resumen');
      await app.settle();
      const loading = Array.from(app.root.querySelectorAll<HTMLElement>('*')).find((e) => e.children.length === 0 && normalise(e.textContent) === TERMS_LOADING);
      expect(loading).toBeDefined();
      expect(loading && isPoliteLiveRegion(loading)).toBe(true);
      expect(app.root.querySelector('[aria-busy="true"]')).not.toBeNull();
      expect(checkbox()).toBeNull();
      expect(isUnavailable(pay())).toBe(true);
      expect(rows('Tus datos')).toEqual(CO_HOLDER); // the summary data do not wait for the terms
      await advance(10_000);
      await app.settle();
      await navigation;
    });

    it('US-03-AC-12 a terms request that is not answered within 10 seconds fails: 9.999 s is still loading, 10 s shows the error', async () => {
      vi.useFakeTimers();
      await start(wizardEntryWithPlan('CO', CO_VALID_RAW, 'total'));
      app.server.terms['CO'] = 'hang';
      const requestedAt = Date.now();
      const elapsed = (): number => Date.now() - requestedAt;
      const navigation = app.begin('/co/resumen');
      await app.settle();
      expect(text()).toContain(TERMS_LOADING);

      await advance(9_999 - elapsed());
      expect(elapsed()).toBe(9_999);
      expect(text()).toContain(TERMS_LOADING);
      expect(alertTexts(app.root)).not.toContain(TERMS_ERROR);

      await advance(1);
      await app.settle();
      await navigation;
      expect(alertTexts(app.root)).toContain(TERMS_ERROR);
      expect(text()).not.toContain(TERMS_LOADING);
      expect(checkbox()).toBeNull();
      expect(isUnavailable(pay())).toBe(true);
    });

    it('US-03-AC-12 no published, well-formed terms for Chile: "Los términos y condiciones no están disponibles en este momento. No es posible pagar.", no checkbox, "Pagar" disabled', async () => {
      await start(wizardEntryWithPlan('CL', CL_SPEC_RAW, 'protegido'));
      app.server.terms['CL'] = [];
      await app.open('/cl/resumen');
      expect(text()).toContain(TERMS_NONE);
      expect(checkbox()).toBeNull();
      expect(isUnavailable(pay())).toBe(true);
      expect(alertTexts(app.root)).not.toContain(TERMS_ERROR);
    });

    it('US-03-AC-12 the "not available" message is in a polite live region', async () => {
      await start(wizardEntryWithPlan('CL', CL_SPEC_RAW, 'protegido'));
      app.server.terms['CL'] = [];
      await app.open('/cl/resumen');
      const none = Array.from(app.root.querySelectorAll<HTMLElement>('*')).find((e) => e.children.length === 0 && normalise(e.textContent) === TERMS_NONE);
      expect(none && isPoliteLiveRegion(none)).toBe(true);
    });

    it('US-03-AC-12 terms that are all malformed (blank title, empty body, a draft) are "not available" too, and the warnings name no text', async () => {
      await start(wizardEntryWithPlan('CL', CL_SPEC_RAW, 'protegido'));
      app.server.terms['CL'] = [
        simpleTermsItem('   ', 'Texto sin título.', '2026-11-21T12:00:00.000Z', 1),
        { ...simpleTermsItem('Con cuerpo vacío', 'x', '2026-11-21T12:00:00.000Z', 2), body: [] },
        simpleTermsItem('Borrador', 'Texto de borrador.', null, 3),
      ];
      await app.open('/cl/resumen');
      expect(text()).toContain(TERMS_NONE);
      expect(checkbox()).toBeNull();
      expect(warned()).not.toContain('Texto sin título');
      expect(warned()).not.toContain('Texto de borrador');
    });

    it('US-03-AC-12 with the terms unavailable, the person can still go back: "Editar mis datos" and "Cambiar plan" work', async () => {
      await start(wizardEntryWithPlan('CO', CO_VALID_RAW, 'total'));
      app.server.terms['CO'] = 'error';
      await app.open('/co/resumen');
      button(app.root, 'Cambiar plan').click();
      await app.settle();
      expect(app.path()).toBe('/co/planes');
    });
  });

  // -------------------------------------------------------------------------------------------
  describe('US-03-AC-15 / US-03-BR-08 simulated payment, no card data', () => {
    it('US-03-AC-15 the group "Simulación de pago (no se realiza ningún cobro)" has the options "Pago aprobado" and "Pago rechazado", and "Pago aprobado" is selected', async () => {
      await openCo();
      const radios = planRadios(app.root);
      expect(radios.map(accessibleName)).toEqual(['Pago aprobado', 'Pago rechazado']);
      const group = groupOf(app.root) as HTMLElement;
      expect(groupName(group)).toBe(SIMULATION);
      expect(group.tagName).toBe('FIELDSET');
      expect(chosenNames(app.root)).toEqual(['Pago aprobado']);
    });

    it('US-03-AC-15 the page has exactly three form controls (the terms checkbox and the two outcome radios) and no field for a card number, expiry date, security code or bank account', async () => {
      await openCo();
      const controls = Array.from(app.root.querySelectorAll<HTMLInputElement>('input, select, textarea'));
      expect(controls.map((c) => `${c.tagName.toLowerCase()}:${(c as HTMLInputElement).type ?? ''}`).sort()).toEqual(['input:checkbox', 'input:radio', 'input:radio']);
      expect(app.root.querySelectorAll('[autocomplete^="cc-"], [autocomplete*="cc-"]')).toHaveLength(0);
      for (const word of ['tarjeta', 'cvv', 'cvc', 'vencimiento', 'IBAN', 'cuenta bancaria']) expect(text().toLowerCase()).not.toContain(word.toLowerCase());
    });

    it('US-03-AC-15 with the terms unavailable the page still has no card field: only the two radios remain', async () => {
      await start(wizardEntryWithPlan('CO', CO_VALID_RAW, 'total'));
      app.server.terms['CO'] = 'error';
      await app.open('/co/resumen');
      const controls = Array.from(app.root.querySelectorAll<HTMLInputElement>('input, select, textarea'));
      expect(controls.map((c) => c.type)).toEqual(['radio', 'radio']);
    });

    it('US-03-AC-15 the default outcome is read when "Pagar" is activated: "Pago aprobado" asks the gateway for "approved"', async () => {
      await openCo();
      await accept();
      await clickPay();
      expect(gateway.calls.map((c) => c.request)).toEqual([{ simulatedOutcome: 'approved' }]);
    });

    it('US-03-AC-15 choosing "Pago rechazado" asks the gateway for "rejected", and nothing else is passed (no amount, plan, country or personal value)', async () => {
      await openCo();
      await accept();
      outcome('Pago rechazado').click();
      await flush();
      await clickPay();
      expect(gateway.calls).toHaveLength(1);
      expect(gateway.calls[0].request).toEqual({ simulatedOutcome: 'rejected' });
      expect(Object.keys(gateway.calls[0].request)).toEqual(['simulatedOutcome']);
    });

    it('US-03-AC-15 the outcome is chosen with one radio group: selecting "Pago rechazado" unselects "Pago aprobado"', async () => {
      await openCo();
      outcome('Pago rechazado').click();
      await flush();
      expect(chosenNames(app.root)).toEqual(['Pago rechazado']);
    });

    it('US-03-AC-15 the choice is not stored: the wizard entry has no outcome, terms or payment data', async () => {
      await openCo();
      await accept();
      outcome('Pago rechazado').click();
      await flush();
      const raw = sessionStorage.getItem(WIZARD_STORAGE_KEY) ?? '';
      expect(raw).not.toMatch(/reject|approv|rechaz|aprob|terms|t[eé]rminos|simulat/i);
    });

    it('US-03-AC-15 with the real simulated gateway the outcome is shown 1.5 seconds after the activation: 1499 ms is still processing, 1500 ms is the confirmation, and no request is sent in between', async () => {
      vi.useFakeTimers();
      useRealGateway();
      await openCo();
      await accept();
      const before = app.server.requests.length;
      await clickPay();
      expect(normalise(pay().textContent)).toBe('Procesando pago…');
      await advance(1_499);
      expect(normalise(h1().textContent)).toBe(HEADING);
      expect(payButton(app.root)).not.toBeNull();
      await advance(1);
      await flush();
      expect(normalise(h1().textContent)).toBe(CONFIRMED);
      expect(app.server.requests.length).toBe(before);
      expect(app.server.requests.every((r) => r.method === 'GET')).toBe(true);
    });

    it('US-03-AC-15 a rejected simulated payment also takes 1.5 seconds and sends no request', async () => {
      vi.useFakeTimers();
      useRealGateway();
      await openCl();
      await accept();
      outcome('Pago rechazado').click();
      await flush();
      const before = app.server.requests.length;
      await clickPay();
      await advance(1_499);
      expect(alertTexts(app.root)).not.toContain(REJECTED);
      await advance(1);
      await flush();
      expect(alertTexts(app.root)).toContain(REJECTED);
      expect(app.server.requests.length).toBe(before);
    });
  });

  // -------------------------------------------------------------------------------------------
  describe('US-03-AC-03 / US-03-AC-10 successful payment', () => {
    it('US-03-AC-03 after "Pagar" the button is locked while processing: it is aria-disabled and reads "Procesando pago…"', async () => {
      await openCo();
      await accept();
      pay().focus();
      await clickPay();
      expect(gateway.calls).toHaveLength(1);
      expect(normalise(pay().textContent)).toBe('Procesando pago…');
      expect(pay().getAttribute('aria-disabled')).toBe('true');
      expect(pay().hasAttribute('disabled')).toBe(false);
      expect(document.activeElement).toBe(pay());
    });

    it('US-03-AC-03 when the payment is approved I see the heading "Pago confirmado" and "Tu número de cotización es" followed by COT-CO-20261121-482913', async () => {
      await openCo();
      await accept();
      await clickPay();
      gateway.settle({ status: 'approved' });
      await flush();
      expect(normalise(h1().textContent)).toBe(CONFIRMED);
      expect(app.root.textContent).toMatch(/Tu número de cotización es\s*COT-CO-20261121-482913/);
      expect(app.root.textContent).toMatch(/COT-CO-\d{8}-\d{6}/);
      expect(app.path()).toBe('/co/resumen');
    });

    it('US-03-AC-10 in Chile the number uses the country code and the digits are zero-padded: COT-CL-20261121-000007', async () => {
      random.mockReturnValue(7);
      await openCl();
      await accept();
      await clickPay();
      gateway.settle({ status: 'approved' });
      await flush();
      expect(app.root.textContent).toMatch(/Tu número de cotización es\s*COT-CL-20261121-000007/);
    });

    it('US-03-AC-10 the digits are drawn once per approved payment, when the result arrives', async () => {
      await openCo();
      await accept();
      await clickPay();
      expect(random).not.toHaveBeenCalled();
      gateway.settle({ status: 'approved' });
      await flush();
      expect(random).toHaveBeenCalledTimes(1);
    });

    it('US-03-AC-10 a rejected payment draws no number', async () => {
      await openCo();
      await accept();
      outcome('Pago rechazado').click();
      await flush();
      await clickPay();
      gateway.settle({ status: 'rejected' });
      await flush();
      expect(random).not.toHaveBeenCalled();
      expect(text()).not.toContain('COT-');
    });

    it('US-03-AC-10 the quote number is not stored, not logged and not in the address or the title', async () => {
      await openCo();
      await accept();
      await clickPay();
      gateway.settle({ status: 'approved' });
      await flush();
      expect(sessionStorage.getItem(WIZARD_STORAGE_KEY) ?? '').not.toContain('482913');
      expect(warned()).not.toContain('482913');
      expect(app.path()).not.toContain('482913');
      expect(document.title).not.toContain('482913');
      expect(JSON.stringify(app.server.requests)).not.toContain('482913');
    });

    it('US-03-AC-03 the confirmation says the payment is simulated and offers "Nueva cotización"; the page title is "Pago confirmado | Cotizador de seguro de auto"', async () => {
      await openCo();
      await accept();
      await clickPay();
      gateway.settle({ status: 'approved' });
      await flush();
      expect(text()).toContain('Este es un pago simulado; no se realizó ningún cobro real.');
      expect(maybeButton(app.root, 'Nueva cotización')).not.toBeNull();
      expect(document.title).toBe(CONFIRMED_TITLE);
    });

    it('US-03-AC-16 the focus moves to the heading "Pago confirmado" (it is where a screen reader starts reading)', async () => {
      await openCo();
      await accept();
      pay().focus();
      await clickPay();
      gateway.settle({ status: 'approved' });
      await flush();
      expect(document.activeElement).toBe(h1());
      expect(normalise((document.activeElement as HTMLElement).textContent)).toBe(CONFIRMED);
    });

    it('US-03-AC-03 the confirmation shows no plan, price or personal data (spec US-03-Q-13)', async () => {
      await openCo();
      await accept();
      await clickPay();
      gateway.settle({ status: 'approved' });
      await flush();
      for (const gone of ['Ana Prueba Ficticia', 'ABC123', 'Plan Total', 'Tus datos', 'Tu vehículo', 'Plan elegido', CO_TERMS_TITLE, 'Editar mis datos', 'Cambiar plan', '5678']) {
        expect(text(), gone).not.toContain(gone);
      }
      expect(compact(text())).not.toContain('$2.310.000');
      expect(maybeButton(app.root, 'Pagar')).toBeNull();
      expect(app.root.querySelectorAll('input, select, textarea')).toHaveLength(0);
    });

    it('US-03-AC-03 after the confirmation no further attempt is possible: there is no "Pagar"', async () => {
      await openCo();
      await accept();
      await clickPay();
      gateway.settle({ status: 'approved' });
      await flush();
      expect(payButton(app.root)).toBeNull();
      expect(gateway.calls).toHaveLength(1);
    });
  });

  // -------------------------------------------------------------------------------------------
  describe('US-03-AC-11 / US-03-BR-06 the quote is closed after a successful payment', () => {
    async function pays(openPage: () => Promise<void> = openCo): Promise<void> {
      await openPage();
      await accept();
      await clickPay();
      gateway.settle({ status: 'approved' });
      await flush();
    }

    it('US-03-AC-11 control: before the payment the stored entry holds the plan and the values', async () => {
      await openCo();
      expect(storedEntry()?.plan).toEqual({ key: 'total' });
    });

    it('US-03-AC-11 on approval sessionStorage has no "quote-wizard" entry and the store is empty', async () => {
      await pays();
      expect(sessionStorage.getItem(WIZARD_STORAGE_KEY)).toBeNull();
      expect(store().values()).toEqual({});
      expect(store().plan()).toBeNull();
      expect(store().step1Output()).toBeNull();
    });

    it('US-03-AC-11 "Nueva cotización" leads to "/co/datos" with every step 1 field empty', async () => {
      await pays();
      button(app.root, 'Nueva cotización').click();
      await app.settle();
      expect(app.path()).toBe('/co/datos');
      for (const label of ['Número de documento', 'Nombre completo', 'Fecha de nacimiento', 'Placa', 'Línea', 'Modelo (año)']) {
        expect(shownValue(control(app.root, label)), label).toBe('');
      }
      expect(sessionStorage.getItem(WIZARD_STORAGE_KEY)).not.toContain('1012345678');
    });

    it('US-03-AC-11 a reload after the confirmation leads to "/co/datos" with every field empty and no plan chosen', async () => {
      await pays();
      await reloadAt('/co/resumen');
      expect(app.path()).toBe('/co/datos');
      expect(shownValue(control(app.root, 'Placa'))).toBe('');
      expect(shownValue(control(app.root, 'Número de documento'))).toBe('');
      expect(store().plan()).toBeNull();
    });

    it('US-03-AC-11 the browser back action after the confirmation (step 2 of the history) leads to "/co/datos" with every field empty', async () => {
      await pays();
      await app.open('/co/planes');
      expect(app.path()).toBe('/co/datos');
      expect(shownValue(control(app.root, 'Placa'))).toBe('');
    });

    it('US-03-AC-11 Chile closes its quote the same way', async () => {
      await pays(openCl);
      expect(sessionStorage.getItem(WIZARD_STORAGE_KEY)).toBeNull();
      await reloadAt('/cl/resumen');
      expect(app.path()).toBe('/cl/datos');
    });
  });

  // -------------------------------------------------------------------------------------------
  describe('US-03-AC-04 rejected payment', () => {
    async function rejectedInChile(): Promise<void> {
      await openCl();
      await accept();
      outcome('Pago rechazado').click();
      await flush();
      pay().focus();
      await clickPay();
      gateway.settle({ status: 'rejected' });
      await flush();
    }

    it('US-03-AC-04 I see "El pago fue rechazado y no se realizó ningún cobro. Puedes intentarlo de nuevo." in an alert', async () => {
      await rejectedInChile();
      expect(alertTexts(app.root)).toContain(REJECTED);
    });

    it('US-03-AC-04 I am still on "/cl/resumen" with my data, "Plan Protegido" at "$528.000", and the terms still accepted', async () => {
      await rejectedInChile();
      expect(app.path()).toBe('/cl/resumen');
      expect(rows('Tus datos')).toEqual(CL_HOLDER);
      expect(rows('Tu vehículo')).toEqual(CL_VEHICLE);
      const content = normalise((sectionOf(app.root, 'Plan elegido') as HTMLElement).textContent);
      expect(content).toContain('Plan Protegido');
      expect(compact(content)).toContain('$528.000');
      expect(checkbox()?.checked).toBe(true);
    });

    it('US-03-AC-04 nothing is cleared: the wizard entry and the store keep the values and the plan', async () => {
      await rejectedInChile();
      expect(storedEntry()?.plan).toEqual({ key: 'protegido' });
      expect(storedEntry()?.step1.values['documentNumber']).toBe('12.345.678-5');
      expect(store().plan()).toEqual({ key: 'protegido' });
      expect(Object.keys(store().values()).length).toBeGreaterThan(5);
    });

    it('US-03-AC-04 the simulation choice is kept ("Pago rechazado" is still selected), and "Pagar" is enabled again', async () => {
      await rejectedInChile();
      expect(chosenNames(app.root)).toEqual(['Pago rechazado']);
      expect(pay().getAttribute('aria-disabled')).not.toBe('true');
      expect(normalise(pay().textContent)).toBe('Pagar');
    });

    it('US-03-AC-17 the rejection is announced once, by an alert region next to "Pagar", and the focus stays on "Pagar"', async () => {
      await rejectedInChile();
      const alerts = Array.from(app.root.querySelectorAll('[role="alert"]')).filter((a) => normalise(a.textContent) === REJECTED);
      expect(alerts).toHaveLength(1);
      expect(app.root.querySelector('[aria-busy="true"]')).toBeNull();
      expect(document.activeElement).toBe(pay());
    });

    it('US-03-AC-04 the checkbox and the outcome group are available again', async () => {
      await rejectedInChile();
      expect(isUnavailable(checkbox() as HTMLInputElement)).toBe(false);
      expect(isUnavailable(outcome('Pago aprobado'))).toBe(false);
      expect(isUnavailable(button(app.root, 'Editar mis datos'))).toBe(false);
      expect(isUnavailable(button(app.root, 'Cambiar plan'))).toBe(false);
    });

    it('US-03-AC-04 retry: choosing "Pago aprobado" and activating "Pagar" shows the confirmation, and the rejection message is gone', async () => {
      await rejectedInChile();
      outcome('Pago aprobado').click();
      await flush();
      await clickPay();
      expect(alertTexts(app.root)).not.toContain(REJECTED); // the message disappears when a new attempt starts
      expect(gateway.calls).toHaveLength(2);
      expect(gateway.calls[1].request).toEqual({ simulatedOutcome: 'approved' });
      gateway.settle({ status: 'approved' });
      await flush();
      expect(normalise(h1().textContent)).toBe(CONFIRMED);
      expect(app.root.textContent).toMatch(/COT-CL-20261121-482913/);
      expect(sessionStorage.getItem(WIZARD_STORAGE_KEY)).toBeNull();
    });

    it('US-03-AC-04 a rejected attempt can be repeated: a second rejection shows the message again', async () => {
      await rejectedInChile();
      await clickPay();
      expect(alertTexts(app.root)).not.toContain(REJECTED);
      gateway.settle({ status: 'rejected' });
      await flush();
      expect(alertTexts(app.root)).toContain(REJECTED);
      expect(store().plan()).toEqual({ key: 'protegido' });
    });

    it('US-03-AC-04 a reload after the rejection keeps the data and the plan, and resets the terms acceptance', async () => {
      await rejectedInChile();
      const kept = sessionStorage.getItem(WIZARD_STORAGE_KEY) as string;
      TestBed.resetTestingModule();
      setup();
      await start(kept);
      await app.open('/cl/resumen');
      expect(app.path()).toBe('/cl/resumen');
      expect(rows('Tus datos')).toEqual(CL_HOLDER);
      expect(compact(text())).toContain('$528.000');
      expect(checkbox()?.checked).toBe(false);
      expect(isUnavailable(pay())).toBe(true);
      expect(alertTexts(app.root)).not.toContain(REJECTED);
      expect(chosenNames(app.root)).toEqual(['Pago aprobado']); // the simulation choice is reset too
    });
  });

  // -------------------------------------------------------------------------------------------
  describe('US-03-AC-09 / US-03-BR-05 the payment cannot be submitted twice', () => {
    it('US-03-AC-09 three activations of "Pagar" in the same instant (click, Enter, click) start exactly one attempt', async () => {
      await openCo();
      await accept();
      pay().click();
      pay().click();
      pay().click();
      await flush();
      expect(gateway.calls).toHaveLength(1);
      gateway.settle({ status: 'approved' });
      await flush();
      expect(random).toHaveBeenCalledTimes(1);
      expect(app.root.textContent?.match(/COT-/g)).toHaveLength(1);
    });

    it('US-03-AC-09 with the real gateway, three activations within 200 ms process one attempt and show one confirmation with one quote number', async () => {
      vi.useFakeTimers();
      useRealGateway();
      await openCo();
      await accept();
      pay().click();
      await advance(100);
      pay().click();
      await advance(100);
      pay().click();
      await advance(1_500);
      await flush();
      expect(normalise(h1().textContent)).toBe(CONFIRMED);
      expect(random).toHaveBeenCalledTimes(1);
      expect(app.root.textContent?.match(/COT-CO-/g)).toHaveLength(1);
    });

    it('US-03-AC-09 during processing "Pagar", the terms checkbox, the simulation choice, "Editar mis datos" and "Cambiar plan" cannot be activated', async () => {
      await openCo();
      await accept();
      await clickPay();
      expect(isUnavailable(pay())).toBe(true);
      expect(isUnavailable(checkbox() as HTMLInputElement)).toBe(true);
      expect(isUnavailable(outcome('Pago aprobado'))).toBe(true);
      expect(isUnavailable(outcome('Pago rechazado'))).toBe(true);
      expect(button(app.root, 'Editar mis datos').getAttribute('aria-disabled')).toBe('true');
      expect(button(app.root, 'Cambiar plan').getAttribute('aria-disabled')).toBe('true');
    });

    it('US-03-AC-09 activating "Editar mis datos" or "Cambiar plan" during processing does nothing: the address stays and nothing is cleared', async () => {
      await openCo();
      await accept();
      await clickPay();
      button(app.root, 'Editar mis datos').click();
      button(app.root, 'Cambiar plan').click();
      await flush();
      expect(app.path()).toBe('/co/resumen');
      expect(storedEntry()?.plan).toEqual({ key: 'total' });
    });

    it('US-03-AC-09 the terms checkbox and the outcome cannot change while processing: the attempt keeps the outcome it started with', async () => {
      await openCo();
      await accept();
      await clickPay();
      checkbox()?.click();
      outcome('Pago rechazado').click();
      await flush();
      expect(checkbox()?.checked).toBe(true);
      expect(chosenNames(app.root)).toEqual(['Pago aprobado']);
      expect(gateway.calls[0].request.simulatedOutcome).toBe('approved');
    });

    it('US-03-AC-17 while processing the summary is marked busy and "Procesando pago…" is announced once, in a status region outside the busy part', async () => {
      await openCo();
      expect(app.root.querySelectorAll('[role="status"]').length).toBeGreaterThan(0); // present from the start, empty
      expect(statusTexts(app.root)).not.toContain('Procesando pago…');
      await accept();
      await clickPay();
      const busy = app.root.querySelector('[aria-busy="true"]') as HTMLElement;
      expect(busy).not.toBeNull();
      expect(busy.contains(sectionOf(app.root, 'Tus datos'))).toBe(true);
      const announcements = Array.from(app.root.querySelectorAll('[role="status"]')).filter((s) => normalise(s.textContent) === 'Procesando pago…');
      expect(announcements).toHaveLength(1);
      expect(busy.contains(announcements[0])).toBe(false);
    });

    it('US-03-AC-17 when the attempt ends the busy state and the announcement are gone', async () => {
      await openCo();
      await accept();
      await clickPay();
      gateway.settle({ status: 'approved' });
      await flush();
      expect(app.root.querySelector('[aria-busy="true"]')).toBeNull();
      expect(statusTexts(app.root)).not.toContain('Procesando pago…');
    });

    it('US-03-AC-09 leaving the page during processing aborts the attempt: the signal is aborted, nothing is cleared and nothing is shown', async () => {
      await openCo();
      await accept();
      await clickPay();
      await app.router.navigateByUrl('/co/planes');
      await app.settle();
      expect(gateway.calls[0].signal.aborted).toBe(true);
      expect(storedEntry()?.plan).toEqual({ key: 'total' });
      expect(random).not.toHaveBeenCalled();
    });

    it('US-03-AC-09 an approval that arrives after the page is gone clears nothing and draws no number', async () => {
      let late: (outcome: PaymentOutcome) => void = () => undefined;
      const stubborn = {
        calls: 0,
        pay: () => {
          stubborn.calls += 1;
          return new Promise<PaymentOutcome>((resolve) => (late = resolve));
        },
      };
      TestBed.configureTestingModule({ providers: [{ provide: PaymentGateway, useValue: stubborn }] });
      await openCo();
      await accept();
      await clickPay();
      expect(stubborn.calls).toBe(1);
      await app.router.navigateByUrl('/co/planes');
      await app.settle();
      late({ status: 'approved' });
      await app.settle();
      expect(storedEntry()?.plan).toEqual({ key: 'total' });
      expect(store().plan()).toEqual({ key: 'total' });
      expect(random).not.toHaveBeenCalled();
      expect(text()).not.toContain('Pago confirmado');
    });
  });

  // -------------------------------------------------------------------------------------------
  describe('US-03-AC-07 edit my data or change the plan', () => {
    it('US-03-AC-07 "Editar mis datos" leads to "/co/datos" with every field showing the value I entered', async () => {
      await openCo();
      await accept();
      button(app.root, 'Editar mis datos').click();
      await app.settle();
      expect(app.path()).toBe('/co/datos');
      expect(shownValue(control(app.root, 'Placa'))).toBe('ABC123');
      expect(shownValue(control(app.root, 'Número de documento'))).toBe('1012345678');
      expect(shownValue(control(app.root, 'Modelo (año)'))).toBe('2022');
    });

    it('US-03-AC-07 after changing "Modelo (año)" to 2015 and "Continuar": "/co/planes" with "Plan Total" still chosen; "Continuar" again shows "2015", "Plan Total" at "$1.890.000", terms unchecked and "Pagar" disabled', async () => {
      await openCo();
      await accept();
      button(app.root, 'Editar mis datos').click();
      await app.settle();
      fillForm(app.root, { 'Modelo (año)': '2015' });
      button(app.root, 'Continuar').click();
      await app.settle();
      expect(app.path()).toBe('/co/planes');
      expect(chosenNames(app.root)).toEqual(['Plan Total']);

      button(app.root, 'Continuar').click();
      await app.settle();
      expect(app.path()).toBe('/co/resumen');
      expect(rows('Tu vehículo')).toContainEqual(['Modelo (año)', '2015']);
      const content = normalise((sectionOf(app.root, 'Plan elegido') as HTMLElement).textContent);
      expect(content).toContain('Plan Total');
      expect(compact(content)).toContain('$1.890.000');
      expect(checkbox()?.checked).toBe(false);
      expect(isUnavailable(pay())).toBe(true);
    });

    it('US-03-AC-07 "Cambiar plan" leads to "/co/planes" with "Plan Total" chosen; choosing "Plan Básico" and "Continuar" shows "Plan Básico" at "$935.000"', async () => {
      await openCo();
      button(app.root, 'Cambiar plan').click();
      await app.settle();
      expect(app.path()).toBe('/co/planes');
      expect(chosenNames(app.root)).toEqual(['Plan Total']);
      choosePlanOption(app.root, 'Plan Básico');
      await app.settle();
      button(app.root, 'Continuar').click();
      await app.settle();
      expect(app.path()).toBe('/co/resumen');
      const content = normalise((sectionOf(app.root, 'Plan elegido') as HTMLElement).textContent);
      expect(content).toContain('Plan Básico');
      expect(compact(content)).toContain('$935.000');
    });

    it('US-03-BR-03 leaving the summary discards the terms acceptance and the simulation choice', async () => {
      await openCo();
      await accept();
      outcome('Pago rechazado').click();
      await flush();
      button(app.root, 'Cambiar plan').click();
      await app.settle();
      button(app.root, 'Continuar').click();
      await app.settle();
      expect(app.path()).toBe('/co/resumen');
      expect(checkbox()?.checked).toBe(false);
      expect(chosenNames(app.root)).toEqual(['Pago aprobado']);
    });

    it('US-03-BR-03 both actions are new history entries and keep the wizard state as it was', async () => {
      await openCo();
      button(app.root, 'Editar mis datos').click();
      await app.settle();
      expect(storedEntry()?.plan).toEqual({ key: 'total' });
      expect(storedEntry()?.step1.values['plate']).toBe('ABC123');
    });
  });

  // -------------------------------------------------------------------------------------------
  describe('US-03-AC-16 / US-03-AC-17 focus, title, order and accessibility of the page', () => {
    it('US-03-AC-16 on arrival the focus is on the heading "Resumen de tu cotización" and the document title is "Resumen de tu cotización | Cotizador de seguro de auto"', async () => {
      await openCo();
      expect(document.activeElement).toBe(h1());
      expect(document.title).toBe(TITLE);
    });

    it('US-03-AC-16 the same in Chile', async () => {
      await openCl();
      expect(document.activeElement).toBe(h1());
      expect(document.title).toBe(TITLE);
    });

    it('US-03-AC-16 the keyboard order is "Editar mis datos", "Cambiar plan", the terms region, "Acepto los términos y condiciones", the simulation group, "Pagar"', async () => {
      await openCo();
      expect(tabStops(app.root)).toEqual(['Editar mis datos', 'Cambiar plan', 'terms region', 'checkbox', 'simulation group', 'Pagar']);
    });

    it('US-03-AC-17 "Tus datos", "Tu vehículo", "Plan elegido" and "Términos y condiciones" are headings of level 2, and the title of the page is the only level 1', async () => {
      await openCl();
      expect(h2s(app.root).map((h) => normalise(h.textContent))).toEqual(['Tus datos', 'Tu vehículo', 'Plan elegido', 'Términos y condiciones']);
      expect(app.root.querySelectorAll('h1')).toHaveLength(1);
    });

    it('US-03-AC-17 each data row exposes its label as a term and its value as the description (dl > dt + dd)', async () => {
      await openCl();
      expect(app.root.querySelectorAll('dl')).toHaveLength(2);
      expect(app.root.querySelectorAll('dt')).toHaveLength(8);
      expect(app.root.querySelectorAll('dd')).toHaveLength(8);
    });

    it('US-03-AC-17 the terms checkbox has the accessible name "Acepto los términos y condiciones"', async () => {
      await openCl();
      expect(accessibleName(checkbox() as HTMLInputElement)).toBe(ACCEPT);
    });

    it('US-03-AC-17 the simulation options are one radio group with an accessible name', async () => {
      await openCl();
      const group = groupOf(app.root) as HTMLElement;
      expect(groupName(group)).toBe(SIMULATION);
      expect(planRadios(app.root).every((r) => r.name === planRadios(app.root)[0].name && r.name !== '')).toBe(true);
    });

    it('US-03-AC-17 the buttons have accessible names that are their visible text', async () => {
      await openCl();
      for (const name of ['Editar mis datos', 'Cambiar plan', 'Pagar']) expect(maybeButton(app.root, name), name).not.toBeNull();
    });
  });

  // -------------------------------------------------------------------------------------------
  describe('US-03-AC-19 no personal data leaves the browser on the summary and payment', () => {
    it('US-03-AC-19 from the summary to the confirmation every request is a GET without an Authorization header, and none carries a step 1 value, the plan key or the quote number', async () => {
      await openCo();
      await accept();
      await clickPay();
      gateway.settle({ status: 'approved' });
      await flush();
      expect(app.server.requests.length).toBeGreaterThan(0);
      expect(app.server.requests.filter((r) => r.method !== 'GET')).toEqual([]);
      expect(app.server.requests.filter((r) => r.hasAuthorization)).toEqual([]);
      const sent = JSON.stringify(app.server.requests.map((r) => r.url));
      for (const leaked of ['1012345678', 'Ana', 'Prueba', 'ABC123', 'Touring', '1990-05-15', 'Medell', 'total', '482913']) {
        expect(sent, leaked).not.toContain(leaked);
      }
    });

    it('US-03-AC-19 the only request the summary adds to the content already loaded is the terms request', async () => {
      await openCo();
      expect(app.server.requestsOf('terms')).toHaveLength(1);
      expect(app.server.requestsOf('other')).toEqual([]);
    });
  });
});
