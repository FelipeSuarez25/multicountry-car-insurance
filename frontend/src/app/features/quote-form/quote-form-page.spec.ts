import { TestBed } from '@angular/core/testing';
import { By } from '@angular/platform-browser';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { QuoteFormPage } from './quote-form-page';
import { QuoteStore } from '../../core/quote-store';
import type { FieldConfig } from '../../shared/field-config.model';
import { configureAppTest, createAppTest, type AppTest } from '../../../testing/app-harness';
import {
  PROMPT,
  allControls,
  allLabels,
  alertTexts,
  button,
  choose,
  control,
  describedText,
  expectPrompt,
  fillForm,
  invalidControls,
  isExposedAsRequired,
  labelsWithErrors,
  leave,
  listboxOf,
  maybeButton,
  maybeControl,
  normalise,
  openCombobox,
  optionTexts,
  settleUi,
  shownValue,
  typeInto,
  typeKeys,
} from '../../../testing/dom';
import { maybeButtonNamed, selectedOptionTexts } from '../../../testing/custom-controls';
import {
  CL_VALID_INPUT,
  CL_VALID_RAW,
  CONSENT_LABEL_CL,
  CONSENT_LABEL_CO,
  CO_EXPECTED_OUTPUT,
  CO_VALID_INPUT,
  CO_VALID_RAW,
  WIZARD_STORAGE_KEY,
  seedFieldConfigs,
  seedLabels,
  seedStrapiItems,
  strapiCountryItem,
  seedCountryItems,
  toStrapiFieldItem,
  wizardEntry,
  type StrapiItem,
} from '../../../testing/seed-fixtures';

const HEADING = 'Tus datos y los de tu vehículo';
const LOAD_ERROR = 'No pudimos cargar el formulario. Intenta de nuevo.';
const COUNTRIES_ERROR = 'No pudimos cargar la lista de países. Intenta de nuevo.';

/** US-04-BR-18 (v0.3): the message of a typed date that is not a complete, existing date (code-owned copy, spec 8.1). */
const UNREADABLE_DATE = 'Fecha no válida. Usa el formato dd/mm/aaaa.';

describe('US-01 step 1 page (component tests through the real routes)', () => {
  let app: AppTest;

  /** One page load. A stored entry is placed before the load, as a reload would find it. */
  async function start(storedEntry?: string): Promise<AppTest> {
    if (storedEntry !== undefined) sessionStorage.setItem(WIZARD_STORAGE_KEY, storedEntry);
    app = await createAppTest();
    return app;
  }

  const store = (): QuoteStore => TestBed.inject(QuoteStore);
  const continuar = async (): Promise<void> => {
    button(app.root, 'Continuar').click();
    await app.settle();
  };
  const fillCo = async (overrides: Record<string, string | boolean | null> = {}): Promise<void> => {
    await fillForm(app.root, { ...CO_VALID_INPUT, ...overrides });
    await app.settle();
  };
  const fillCl = async (overrides: Record<string, string | boolean | null> = {}): Promise<void> => {
    await fillForm(app.root, { ...CL_VALID_INPUT, ...overrides });
    await app.settle();
  };
  const heading = (): HTMLElement => app.root.querySelector('h1') as HTMLElement;
  const sanitiseCity = (items: StrapiItem[], dropOption: string): StrapiItem[] =>
    items.map((i) =>
      i['key'] === 'city' ? { ...i, options: (i['options'] as StrapiItem[]).filter((o) => o['value'] !== dropOption) } : i,
    );

  beforeEach(() => {
    configureAppTest();
    vi.spyOn(console, 'warn').mockImplementation(() => undefined);
  });
  afterEach(() => {
    vi.useRealTimers();
    vi.restoreAllMocks();
    sessionStorage.clear();
  });

  describe('US-01-AC-01 form configured by country (rendering)', () => {
    it('US-01-AC-01 in the context of Colombia shows exactly these field labels, in this order', async () => {
      await start();
      await app.open('/co/datos');
      expect(allLabels(app.root)).toEqual(seedLabels('CO'));
      expect(app.harness.fixture.debugElement.query(By.directive(QuoteFormPage))).not.toBeNull();
    });

    it('US-01-AC-01 in the context of Chile shows exactly these field labels, in this order, and none that is Colombia-only', async () => {
      await start();
      await app.open('/cl/datos');
      expect(allLabels(app.root)).toEqual(seedLabels('CL'));
      expect(maybeControl(app.root, 'Tipo de documento')).toBeNull();
      expect(maybeControl(app.root, 'Placa')).toBeNull();
    });

    it('US-01-AC-01 requests only the fields of the context country, by the published code', async () => {
      await start();
      await app.open('/cl/datos');
      expect(app.server.requestsOf('form-fields').map((r) => r.countryCode)).toEqual(['CL']);
      expect(app.server.requestsOf('countries')).toHaveLength(1);
    });

    // US-04 spec 11.1: renamed from "renders its native control"; the select and the date are now custom controls.
    it('US-01-AC-01 every field type renders its control: text (textbox), number (text box, numeric), date (textbox plus "Elegir fecha"), select (combobox) and checkbox', async () => {
      await start();
      await app.open('/co/datos');
      expect(control(app.root, 'Número de documento')).toMatchObject({ tagName: 'INPUT', type: 'text' });
      // US-04 spec 11.1.1 (BR-19): a number field is a text box with a numeric keyboard, no spinbutton
      expect(control(app.root, 'Modelo (año)')).toMatchObject({ tagName: 'INPUT', type: 'text' });
      expect(control(app.root, 'Modelo (año)').getAttribute('inputmode')).toBe('numeric');
      expect(app.root.querySelector('[role="spinbutton"], input[type="number"]')).toBeNull();
      expect(control(app.root, CONSENT_LABEL_CO)).toMatchObject({ tagName: 'INPUT', type: 'checkbox' });

      // date: a text box (not a native date input, not a combobox) and a button that opens the calendar
      const date = control(app.root, 'Fecha de nacimiento');
      expect(date).toMatchObject({ tagName: 'INPUT', type: 'text' });
      expect(date.getAttribute('role')).not.toBe('combobox');
      expect(maybeButtonNamed(app.root, 'Elegir fecha: Fecha de nacimiento')).not.toBeNull();

      // select: a combobox, collapsed; once opened, aria-expanded is true and aria-controls refers to the rendered listbox
      for (const label of ['Tipo de documento', 'Ciudad', 'Marca']) {
        const combo = control(app.root, label);
        expect(combo.tagName, label).not.toBe('SELECT');
        expect(combo.getAttribute('role'), label).toBe('combobox');
        expect(combo.getAttribute('aria-expanded'), label).toBe('false');
        const listbox = await openCombobox(combo);
        expect(combo.getAttribute('aria-expanded'), label).toBe('true');
        expect(listbox.getAttribute('role')).toBe('listbox');
        expect(listboxOf(combo), `${label}: aria-controls refers to the rendered listbox`).toBe(listbox);
        await settleUi();
      }
    });

    it('US-01-AC-01 shows the step heading, the required note, the help texts and "Continuar" (Ready state)', async () => {
      await start();
      await app.open('/co/datos');
      expect(normalise(heading().textContent)).toBe(HEADING);
      expect(app.root.textContent).toContain('Los campos marcados con * son obligatorios.');
      expect(app.root.textContent).toContain('Ejemplo: ABC123.');
      expect(app.root.textContent).toContain('Por ejemplo: Spark GT.');
      expect(maybeButton(app.root, 'Continuar')).not.toBeNull();
    });

    it('US-01-BR-06 a field published in Strapi appears at its sortOrder with no code change (35: between "Nombre completo" and "Fecha de nacimiento")', async () => {
      await start();
      app.server.fields['CO'] = [
        ...seedStrapiItems('CO'),
        toStrapiFieldItem(
          { key: 'mobilePhone', type: 'text', label: 'Teléfono celular', isRequired: false, sortOrder: 35, errorMessage: 'Ingresa un número de celular válido.', rules: [] },
          90,
        ),
      ];
      await app.open('/co/datos');
      const labels = allLabels(app.root);
      expect(labels.indexOf('Teléfono celular')).toBe(labels.indexOf('Nombre completo') + 1);
      expect(labels.indexOf('Fecha de nacimiento')).toBe(labels.indexOf('Teléfono celular') + 1);
    });

    it('US-01-BR-06 a label edited in Strapi is what the page shows', async () => {
      await start();
      app.server.fields['CO'] = seedStrapiItems('CO').map((i) => (i['key'] === 'documentNumber' ? { ...i, label: 'Documento de identidad' } : i));
      await app.open('/co/datos');
      expect(maybeControl(app.root, 'Documento de identidad')).not.toBeNull();
      expect(maybeControl(app.root, 'Número de documento')).toBeNull();
    });

    it('US-01-BR-07 a country that exists only in the content works with no code change ("PE": its own fields, requested by its own code)', async () => {
      await start();
      app.server.countries = [...seedCountryItems(), strapiCountryItem('PE', 'Perú', 'PEN', 'es-PE', 30, 2)];
      app.server.fields['PE'] = [
        toStrapiFieldItem({ key: 'documentNumber', type: 'text', label: 'Documento nacional', isRequired: true, sortOrder: 10, errorMessage: 'Ingresa tu documento.', rules: [] }, 0),
      ];
      await app.open('/pe/datos');
      expect(allLabels(app.root)).toEqual(['Documento nacional']);
      expect(app.server.requestsOf('form-fields').map((r) => r.countryCode)).toEqual(['PE']);
    });
  });

  describe('US-01-AC-07 select options come from Strapi (US-01-BR-02)', () => {
    // US-04 spec 11.1: "Ciudad" has 4 options, so it is a searchable select; its prompt is the placeholder and the
    // prompt is not an option (US-04-BR-05). The list is read while it is open; nothing is selected; stored values are checked.
    async function openCity(address: string): Promise<{ city: ReturnType<typeof control>; listbox: HTMLElement }> {
      await start();
      await app.open(address);
      const city = control(app.root, 'Ciudad');
      expectPrompt(city);
      const listbox = await openCombobox(city);
      return { city, listbox };
    }

    it('US-01-AC-07 Colombia "Ciudad" shows the prompt and then exactly the 4 cities, in this order, and none is selected', async () => {
      const { city, listbox } = await openCity('/co/datos');
      expect(optionTexts(listbox)).toEqual(['Bogotá', 'Medellín', 'Cali', 'Barranquilla']);
      expect(selectedOptionTexts(listbox)).toEqual([]);
      expect(store().values()['city'] ?? '').toBe('');
      expect(city.getAttribute('aria-expanded')).toBe('true');
    });

    it('US-01-AC-07 Chile "Ciudad" shows the prompt and then exactly the 4 cities, in this order, and none is selected', async () => {
      const { listbox } = await openCity('/cl/datos');
      expect(optionTexts(listbox)).toEqual(['Santiago', 'Valparaíso', 'Concepción', 'Antofagasta']);
      expect(selectedOptionTexts(listbox)).toEqual([]);
    });

    it('US-01-BR-02 the prompt is not an option, and choosing each option stores its value (BOG, MDE, CLO, BAQ), not its label', async () => {
      const { city, listbox } = await openCity('/co/datos');
      expect(optionTexts(listbox)).not.toContain(PROMPT);
      expect(listbox.querySelectorAll('[role="option"]')).toHaveLength(4);
      await settleUi();
      for (const [label, value] of [
        ['Bogotá', 'BOG'],
        ['Medellín', 'MDE'],
        ['Cali', 'CLO'],
        ['Barranquilla', 'BAQ'],
      ]) {
        await choose(city, label);
        expect(shownValue(city), label).toBe(label);
        expect(store().values()['city'], label).toBe(value);
      }
    });

    it('US-01-BR-02 the options follow their sortOrder, not the order Strapi sent them', async () => {
      await start();
      app.server.fields['CO'] = seedStrapiItems('CO').map((i) =>
        i['key'] === 'city'
          ? {
              ...i,
              options: [
                { id: 4, value: 'BAQ', label: 'Barranquilla', sortOrder: 40 },
                { id: 2, value: 'MDE', label: 'Medellín', sortOrder: 20 },
                { id: 1, value: 'BOG', label: 'Bogotá', sortOrder: 10 },
                { id: 3, value: 'CLO', label: 'Cali', sortOrder: 30 },
              ],
            }
          : i,
      );
      await app.open('/co/datos');
      const listbox = await openCombobox(control(app.root, 'Ciudad'));
      expect(optionTexts(listbox)).toEqual(['Bogotá', 'Medellín', 'Cali', 'Barranquilla']);
    });
  });

  describe('US-01-AC-02 field validation', () => {
    const rows: [string, string | boolean | null, string][] = [
      ['Placa', 'AB12', 'Ingresa una placa válida: 3 letras y 3 números (por ejemplo, ABC123).'],
      ['Ciudad', null, 'Selecciona tu ciudad.'],
      ['Fecha de nacimiento', '01/03/2010', 'Debes ser mayor de edad (18 años o más) para cotizar.'],
      ['Modelo (año)', '2005', 'El modelo debe estar entre los últimos 20 años y el próximo año.'],
      [CONSENT_LABEL_CO, false, 'Debes autorizar el tratamiento de tus datos para continuar.'],
      ['Nombre completo', 'Al', 'Ingresa tu nombre completo, solo letras (entre 3 y 80 caracteres).'],
    ];

    it.each(rows)('US-01-AC-02 "%s" holding %s shows its message next to the field and blocks the next step', async (label, input, message) => {
      await start();
      await app.open('/co/datos');
      await fillCo({ [label]: input });
      await continuar();

      const field = control(app.root, label);
      expect(describedText(field)).toContain(message);
      expect(field.getAttribute('aria-invalid')).toBe('true');
      expect(labelsWithErrors(app.root)).toEqual([label]);
      expect(app.path()).toBe('/co/datos');
      expect(maybeButton(app.root, 'Continuar')).not.toBeNull();
      expect(store().step1Output()).toBeNull();
    });

    it('US-01-AC-02 with every field valid, "Continuar" moves on', async () => {
      await start();
      await app.open('/co/datos');
      await fillCo();
      await continuar();
      expect(app.path()).toBe('/co/planes');
    });
  });

  describe('US-01-AC-10 when errors are shown, and focus on a failed attempt (US-01-Q-13)', () => {
    it('US-01-AC-10 shows no error message before any interaction', async () => {
      await start();
      await app.open('/cl/datos');
      expect(alertTexts(app.root)).toEqual([]);
      expect(invalidControls(app.root)).toEqual([]);
      expect(labelsWithErrors(app.root)).toEqual([]);
    });

    it('US-01-AC-10 shows the message after leaving an empty "Nombre completo", and it disappears when a valid name is typed', async () => {
      await start();
      await app.open('/cl/datos');
      const name = control(app.root, 'Nombre completo');
      name.focus();
      leave(name);
      await app.settle();
      expect(describedText(name)).toContain('Ingresa tu nombre completo, solo letras (entre 3 y 80 caracteres).');

      typeInto(name, 'Ana Prueba Ficticia');
      await app.settle();
      expect(describedText(name)).not.toContain('Ingresa tu nombre completo');
      expect(name.getAttribute('aria-invalid')).not.toBe('true');
    });

    it('US-01-AC-10 an error that is shown keeps updating while the person types', async () => {
      await start();
      await app.open('/cl/datos');
      const name = control(app.root, 'Nombre completo');
      typeInto(name, 'Al');
      leave(name);
      await app.settle();
      expect(describedText(name)).toContain('Ingresa tu nombre completo');
      typeInto(name, 'Ana');
      await app.settle();
      expect(describedText(name)).not.toContain('Ingresa tu nombre completo');
    });

    it('US-01-AC-10 typing in a field that has not been left does not show an error yet', async () => {
      await start();
      await app.open('/cl/datos');
      const name = control(app.root, 'Nombre completo');
      typeInto(name, 'Al');
      await app.settle();
      expect(describedText(name)).not.toContain('Ingresa tu nombre completo');
    });

    it('US-01-AC-10 "Continuar" without touching anything shows every invalid field message and focuses the first one in sortOrder, "RUT"', async () => {
      await start();
      await app.open('/cl/datos');
      await continuar();
      expect(labelsWithErrors(app.root)).toEqual(seedLabels('CL'));
      expect(describedText(control(app.root, 'RUT'))).toContain('Ingresa tu RUT.');
      expect(describedText(control(app.root, 'Patente'))).toContain('Ingresa una patente válida (por ejemplo, BCDF12 o AB1234).');
      expect(document.activeElement).toBe(control(app.root, 'RUT'));
      expect(app.path()).toBe('/cl/datos');
    });

    it('US-01-AC-10 each failed attempt focuses the first field that is still invalid in sortOrder', async () => {
      await start();
      await app.open('/cl/datos');
      await continuar();
      expect(document.activeElement).toBe(control(app.root, 'RUT'));

      await fillCl({ RUT: CL_VALID_INPUT['RUT'] as string, 'Nombre completo': null, 'Fecha de nacimiento': null, Ciudad: null, Patente: null, Marca: null, Modelo: null, Año: null, [CONSENT_LABEL_CL]: null });
      await continuar();
      expect(document.activeElement).toBe(control(app.root, 'Nombre completo'));

      await fillCl({ RUT: null, Ciudad: null, Patente: null, Marca: null, Modelo: null, Año: null, [CONSENT_LABEL_CL]: null });
      await continuar();
      expect(document.activeElement).toBe(control(app.root, 'Ciudad'));
    });
  });

  describe('US-01-AC-15 content cannot be loaded (US-01-Q-17)', () => {
    it('US-01-AC-15 an HTTP error shows the error message and "Reintentar", with no field and no "Continuar", and focus on "Reintentar"', async () => {
      await start();
      app.server.fields['CO'] = 'error';
      await app.open('/co/datos');
      expect(alertTexts(app.root)).toContain(LOAD_ERROR);
      expect(document.activeElement).toBe(button(app.root, 'Reintentar'));
      expect(allControls(app.root)).toEqual([]);
      expect(maybeButton(app.root, 'Continuar')).toBeNull();
    });

    it('US-01-AC-15 after the content is available again, "Reintentar" shows the form of the same country, and the error is gone', async () => {
      await start();
      app.server.fields['CL'] = 'error';
      await app.open('/cl/datos');
      expect(alertTexts(app.root)).toContain(LOAD_ERROR);

      app.server.fields['CL'] = seedStrapiItems('CL');
      button(app.root, 'Reintentar').click();
      await app.settle();
      expect(allLabels(app.root)).toEqual(seedLabels('CL'));
      expect(alertTexts(app.root)).not.toContain(LOAD_ERROR);
      expect(maybeButton(app.root, 'Reintentar')).toBeNull();
      expect(app.server.requestsOf('form-fields')).toHaveLength(2);
    });

    it('US-01-AC-15 while loading it shows "Cargando formulario…" and the heading, busy, with no field and no "Continuar"; at 10 seconds it shows the error (9.999 s still loading)', async () => {
      vi.useFakeTimers();
      await start();
      app.server.fields['CL'] = 'hang';
      const requestedAt = Date.now(); // fake clock: the form request is issued at this instant
      const elapsed = (): number => Date.now() - requestedAt;
      const navigation = app.begin('/cl/datos');
      await app.settle();

      expect(app.root.textContent).toContain('Cargando formulario…');
      expect(normalise(heading().textContent)).toBe(HEADING);
      expect(app.root.querySelector('[aria-busy="true"]')).not.toBeNull();
      expect(allControls(app.root)).toEqual([]);
      expect(maybeButton(app.root, 'Continuar')).toBeNull();

      await vi.advanceTimersByTimeAsync(9_999 - elapsed());
      TestBed.tick();
      expect(elapsed()).toBe(9_999);
      expect(app.root.textContent).toContain('Cargando formulario…');
      expect(alertTexts(app.root)).not.toContain(LOAD_ERROR);

      await vi.advanceTimersByTimeAsync(1);
      await vi.advanceTimersByTimeAsync(50);
      TestBed.tick();
      await navigation;
      expect(alertTexts(app.root)).toContain(LOAD_ERROR);
      expect(app.root.textContent).not.toContain('Cargando formulario…');
      expect(document.activeElement).toBe(button(app.root, 'Reintentar'));
      expect(allControls(app.root)).toEqual([]);
      expect(maybeButton(app.root, 'Continuar')).toBeNull();
    });

    it('US-01-AC-15 after a timeout there are no automatic retries; "Reintentar" asks again and shows the form', async () => {
      vi.useFakeTimers();
      await start();
      app.server.fields['CL'] = 'hang';
      const navigation = app.begin('/cl/datos');
      await app.settle();
      await vi.advanceTimersByTimeAsync(10_000);
      await app.settle();
      await navigation;
      await vi.advanceTimersByTimeAsync(120_000);
      await app.settle();
      expect(app.server.requestsOf('form-fields')).toHaveLength(1);

      app.server.fields['CL'] = seedStrapiItems('CL');
      button(app.root, 'Reintentar').click();
      await app.settle();
      expect(allLabels(app.root)).toEqual(seedLabels('CL'));
      expect(app.server.requestsOf('form-fields')).toHaveLength(2);
    });
  });

  describe('US-01-AC-16 no valid fields', () => {
    it('US-01-AC-16 a country with no published field shows the error state, not an empty form', async () => {
      await start();
      app.server.fields['CL'] = [];
      await app.open('/cl/datos');
      expect(alertTexts(app.root)).toContain(LOAD_ERROR);
      expect(maybeButton(app.root, 'Reintentar')).not.toBeNull();
      expect(allControls(app.root)).toEqual([]);
      expect(maybeButton(app.root, 'Continuar')).toBeNull();
    });

    it('US-01-AC-16 a country whose fields are all malformed shows the same error state', async () => {
      await start();
      app.server.fields['CL'] = [
        { ...toStrapiFieldItem(seedFieldConfigs('CL')[0], 0), type: 'slider' },
        { ...toStrapiFieldItem(seedFieldConfigs('CL')[1], 1), label: '' },
      ];
      await app.open('/cl/datos');
      expect(alertTexts(app.root)).toContain(LOAD_ERROR);
      expect(maybeButton(app.root, 'Reintentar')).not.toBeNull();
      expect(allControls(app.root)).toEqual([]);
      expect(maybeButton(app.root, 'Continuar')).toBeNull();
    });

    it('US-01-AC-14 one malformed field does not stop the rest from rendering, and nothing extra is shown', async () => {
      await start();
      app.server.fields['CO'] = [
        ...seedStrapiItems('CO'),
        { ...toStrapiFieldItem(seedFieldConfigs('CO')[0], 80), key: 'sliderField', label: 'Control deslizante', type: 'slider' },
      ];
      await app.open('/co/datos');
      expect(allLabels(app.root)).toEqual(seedLabels('CO'));
      expect(alertTexts(app.root)).toEqual([]);
    });
  });

  describe('US-01-AC-18 a valid form moves to step 2; an invalid one produces no typed output', () => {
    it('US-01-AC-18 a valid "Continuar" navigates to the step 2 route of Colombia and the wizard state holds the typed output', async () => {
      await start();
      await app.open('/co/datos');
      await fillCo();
      await continuar();
      expect(app.path()).toBe('/co/planes');
      expect(store().step1Output()).toEqual(CO_EXPECTED_OUTPUT);
      expect(typeof store().step1Output()?.values['vehicleYear']).toBe('number');
    });

    // Replaces the US-01 test "the step 2 route has no page of its own" (US-01-Q-27): US-02 attaches
    // its page to this route, so the step 2 address now shows the plan list, not an empty area.
    it('US-01-AC-18 "I see step 2": after a valid "Continuar" the step 2 route shows the plan list page (heading "Elige tu plan"), with no step 1 field', async () => {
      await start();
      await app.open('/co/datos');
      await fillCo();
      await continuar();
      expect(normalise(heading().textContent)).toBe('Elige tu plan');
      expect(allControls(app.root).filter((c) => c.type !== 'radio')).toEqual([]);
      expect(maybeButton(app.root, 'Atrás')).not.toBeNull();
    });

    it('US-01-AC-18 an invalid "Continuar" ("Modelo (año)" = 2005) stays on step 1, produces no typed output and keeps the typed values', async () => {
      await start();
      await app.open('/co/datos');
      await fillCo({ 'Modelo (año)': '2005' });
      await continuar();
      expect(app.path()).toBe('/co/datos');
      expect(store().step1Output()).toBeNull();
      expect(store().values()['vehicleYear']).toBe('2005');
      expect(JSON.parse(sessionStorage.getItem(WIZARD_STORAGE_KEY) ?? '{}').step1.values.vehicleYear).toBe('2005');
    });

    it('US-01-AC-18 the Chile form (RUT with check digit) also moves to its own step 2 route', async () => {
      await start();
      await app.open('/cl/datos');
      await fillCl();
      await continuar();
      expect(app.path()).toBe('/cl/planes');
      expect(store().step1Output()?.country).toBe('CL');
    });
  });

  describe('US-01-AC-04 keep data when going back / US-01-AC-20 browser back keeps data', () => {
    const expectEveryValueShown = (): void => {
      for (const [label, value] of Object.entries(CO_VALID_INPUT)) {
        expect(shownValue(control(app.root, label))).toBe(value);
      }
    };

    it('US-01-AC-04 returning to the step 1 route (as "Atrás" will) shows every value that was entered and no error', async () => {
      await start();
      await app.open('/co/datos');
      await fillCo();
      await continuar();
      expect(app.path()).toBe('/co/planes');

      await app.open('/co/datos');
      expectEveryValueShown();
      expect(alertTexts(app.root)).toEqual([]);
      expect(invalidControls(app.root)).toEqual([]);
      expect(normalise(heading().textContent)).toBe(HEADING);
    });

    it('US-01-AC-20 the browser back action from step 2 shows step 1 with every value, no error, and focus on the step heading', async () => {
      await start();
      await app.open('/co/datos');
      await fillCo();
      await continuar();
      expect(app.path()).toBe('/co/planes');

      app.location.back();
      await vi.waitFor(() => expect(app.path()).toBe('/co/datos'));
      await app.settle();

      expect(allLabels(app.root)).toEqual(seedLabels('CO'));
      expectEveryValueShown();
      expect(alertTexts(app.root)).toEqual([]);
      expect(invalidControls(app.root)).toEqual([]);
      expect(document.activeElement).toBe(heading());
    });

    it('US-01-AC-20 each step is its own history entry: "Continuar" does not replace step 1', async () => {
      await start();
      await app.open('/co/datos');
      await fillCo();
      await continuar();
      app.location.back();
      await vi.waitFor(() => expect(app.path()).toBe('/co/datos'));
      await app.settle();
      expect(app.path()).toBe('/co/datos');
    });

    it('US-01-AC-04 the configuration is fetched once per page load, not again when going back to step 1', async () => {
      await start();
      await app.open('/co/datos');
      await fillCo();
      await continuar();
      await app.open('/co/datos');
      expect(app.server.requestsOf('form-fields')).toHaveLength(1);
    });

    it('US-01-AC-04 shows what each control type holds after hydration: text, number, date, select (both kinds) and checkbox, and the store still holds the stored values', async () => {
      await start(wizardEntry('CO', CO_VALID_RAW));
      await app.open('/co/datos');
      expect((control(app.root, 'Número de documento') as HTMLInputElement).value).toBe('1012345678');
      expect((control(app.root, 'Modelo (año)') as HTMLInputElement).value).toBe('2022');
      // US-04: the date is shown as dd/mm/aaaa, stored as ISO
      expect((control(app.root, 'Fecha de nacimiento') as HTMLInputElement).value).toBe('15/05/1990');
      expect(store().values()['birthDate']).toBe('1990-05-15');
      // searchable select: its input shows the option label
      expect(shownValue(control(app.root, 'Ciudad'))).toBe('Medellín');
      expect(store().values()['city']).toBe('MDE');
      // select-only select: its button shows the option label
      expect(shownValue(control(app.root, 'Tipo de documento'))).toBe('Cédula de ciudadanía');
      expect(store().values()['documentType']).toBe('CC');
      expect((control(app.root, CONSENT_LABEL_CO) as HTMLInputElement).checked).toBe(true);
      expect(invalidControls(app.root)).toEqual([]);
    });
  });

  describe('US-01-AC-19 step 2 cannot be reached with an incomplete step 1 (through the routes)', () => {
    it('US-01-AC-19 opening the step 2 address directly with no data takes the person to step 1 of the same country', async () => {
      await start();
      await app.open('/co/planes');
      expect(app.path()).toBe('/co/datos');
      expect(allLabels(app.root)).toEqual(seedLabels('CO'));
    });
  });

  describe('US-01-AC-21 data survives a reload', () => {
    it('US-01-AC-21 after a reload on step 2, step 2 stays reachable and step 1 shows the entered values', async () => {
      await start(wizardEntry('CL', CL_VALID_RAW));
      await app.open('/cl/planes');
      expect(app.path()).toBe('/cl/planes');
      await app.open('/cl/datos');
      for (const [label, value] of Object.entries(CL_VALID_INPUT)) {
        expect(shownValue(control(app.root, label))).toBe(value);
      }
    });

    it('US-01-AC-21 an unfinished step 1 survives a reload as typed ("Ana" and "2015.5"), pristine: no error message', async () => {
      await start(wizardEntry('CL', { fullName: 'Ana', vehicleYear: '2015.5' }));
      await app.open('/cl/datos');
      expect((control(app.root, 'Nombre completo') as HTMLInputElement).value).toBe('Ana');
      expect((control(app.root, 'Año') as HTMLInputElement).value).toBe('2015.5');
      expect(alertTexts(app.root)).toEqual([]);
      expect(invalidControls(app.root)).toEqual([]);
    });

    // US-04 spec 11.1.1 (BR-19): the "." of "2015.5" is not entered, so what is shown and stored is "2015".
    it('US-01-AC-21 what is typed is written as it changes, so a reload at any moment restores it (typing "2015.5" in "Año" shows and stores "2015")', async () => {
      await start();
      await app.open('/cl/datos');
      typeInto(control(app.root, 'Nombre completo'), 'Ana');
      typeInto(control(app.root, 'Año'), '2015.5');
      await app.settle();
      expect((control(app.root, 'Año') as HTMLInputElement).value).toBe('2015');
      const entry = JSON.parse(sessionStorage.getItem(WIZARD_STORAGE_KEY) ?? '{}');
      expect(entry.country).toBe('CL');
      expect(entry.step1.values).toMatchObject({ fullName: 'Ana', vehicleYear: '2015' });
    });
  });

  describe('US-01-AC-09 / US-01-AC-21 a letter cannot be entered into a number field, and the wizard state and sessionStorage hold what is shown (R2-F01, US-04 BR-19)', () => {
    /**
     * US-04 spec 11.1.1: a number field is a text box with the digits profile, so there is no native
     * number control and no `validity.badInput` any more. The former "unparseable text" cases are
     * typing: the letter is not entered, so the shown, stored and persisted text agree.
     */
    const typeAndSettle = async (el: HTMLInputElement, text: string): Promise<void> => {
      typeInto(el, text);
      await app.settle();
    };
    const storedValues = (): Record<string, unknown> => JSON.parse(sessionStorage.getItem(WIZARD_STORAGE_KEY) ?? '{}').step1.values;

    it('US-01-AC-09 after "2015" and then "2015e", the text box shows "2015" and the store holds "2015" (the "e" is not entered)', async () => {
      await start();
      await app.open('/cl/datos');
      const year = control(app.root, 'Año') as HTMLInputElement;
      await typeAndSettle(year, '2015');
      expect(store().values()['vehicleYear']).toBe('2015');
      await typeAndSettle(year, '2015e');
      leave(year);
      await app.settle();
      expect(year.value).toBe('2015');
      expect(store().values()['vehicleYear']).toBe('2015');
    });

    it('US-01-AC-09 typing "1e" in "Año" shows "1" and stores "1"; "Continuar" then shows the yearRange message and stays on step 1', async () => {
      await start();
      await app.open('/cl/datos');
      await fillCl({ Año: null });
      const year = control(app.root, 'Año') as HTMLInputElement;
      await typeAndSettle(year, '1e');
      leave(year);
      await app.settle();
      expect(year.value).toBe('1');
      expect(store().values()['vehicleYear']).toBe('1');
      await continuar();
      expect(describedText(year)).toContain('El año debe estar entre los últimos 20 años y el próximo año.');
      expect(year.getAttribute('aria-invalid')).toBe('true');
      expect(app.path()).toBe('/cl/datos');
      expect(store().step1Output()).toBeNull();
    });

    it('US-01-AC-21 the browser storage holds "2015" for "2015e" (what is shown), so a reload restores what the person saw', async () => {
      await start();
      await app.open('/cl/datos');
      const year = control(app.root, 'Año') as HTMLInputElement;
      await typeAndSettle(year, '2015e');
      expect(storedValues()['vehicleYear']).toBe('2015');
    });

    it('US-01-AC-09 a required number left empty shows errorMessage and "Continuar" stays on step 1', async () => {
      await start();
      await app.open('/cl/datos');
      await fillCl({ Año: null });
      const year = control(app.root, 'Año') as HTMLInputElement;
      await typeAndSettle(year, 'abc');
      expect(year.value).toBe('');
      leave(year);
      await app.settle();
      await continuar();
      expect(describedText(year)).toContain('El año debe estar entre los últimos 20 años y el próximo año.');
      expect(year.getAttribute('aria-invalid')).toBe('true');
      expect(app.path()).toBe('/cl/datos');
      expect(store().step1Output()).toBeNull();
    });

    it('US-01-AC-09 a required number with a requiredMessage shows that message when it is left empty', async () => {
      await start();
      app.server.fields['CL'] = seedStrapiItems('CL').map((i) =>
        i['key'] === 'vehicleYear' ? { ...i, requiredMessage: 'Indica el año de tu vehículo.' } : i,
      );
      await app.open('/cl/datos');
      await fillCl({ Año: null });
      const year = control(app.root, 'Año') as HTMLInputElement;
      leave(year);
      await app.settle();
      await continuar();
      expect(describedText(year)).toContain('Indica el año de tu vehículo.');
      expect(app.path()).toBe('/cl/datos');
    });

    /** An optional CO number "Kilometraje" (not seed content), added to this test's content-server response only. */
    const MILEAGE_MESSAGE = 'Ingresa un kilometraje válido (solo números enteros).';
    const withOptional = (country: 'CO', config: FieldConfig): StrapiItem[] => [
      ...seedStrapiItems(country),
      toStrapiFieldItem(config, 90),
    ];
    const mileageField = (errorMessage: string): FieldConfig => ({
      key: 'mileage',
      type: 'number',
      label: 'Kilometraje',
      isRequired: false,
      sortOrder: 95,
      errorMessage,
      rules: [{ kind: 'max', value: 999999 }],
    });

    for (const [typed, entered] of [
      ['1e', '1'],
      ['2015e', '2015'],
    ] as const) {
      it(`US-01-AC-09 an optional number typed "${typed}" (Kilometraje, CO) shows "${entered}" and stores "${entered}": the letter is not entered and "Continuar" is not blocked`, async () => {
        await start();
        app.server.fields['CO'] = withOptional('CO', mileageField(MILEAGE_MESSAGE));
        await app.open('/co/datos');
        await fillCo();
        const mileage = control(app.root, 'Kilometraje') as HTMLInputElement;
        await typeAndSettle(mileage, typed);
        leave(mileage);
        await app.settle();
        expect(mileage.value).toBe(entered);
        expect(store().values()['mileage']).toBe(entered);
        expect(storedValues()['mileage']).toBe(entered);
        expect(mileage.getAttribute('aria-invalid')).not.toBe('true');
        await continuar();
        expect(app.path()).toBe('/co/planes');
      });
    }

    it('US-01-AC-09 an optional number out of its range (Kilometraje 1000000, max 999999) is an error: errorMessage shown, "Continuar" blocked', async () => {
      await start();
      app.server.fields['CO'] = withOptional('CO', mileageField(MILEAGE_MESSAGE));
      await app.open('/co/datos');
      await fillCo();
      const mileage = control(app.root, 'Kilometraje') as HTMLInputElement;
      await typeAndSettle(mileage, '1000000');
      leave(mileage);
      await app.settle();
      await continuar();
      expect(describedText(mileage)).toContain(MILEAGE_MESSAGE);
      expect(mileage.getAttribute('aria-invalid')).toBe('true');
      expect(app.path()).toBe('/co/datos');
      expect(store().step1Output()).toBeNull();
    });

    it('US-01-AC-09 an optional number out of its range with no errorMessage shows "Revisa este campo." and blocks "Continuar"', async () => {
      await start();
      app.server.fields['CO'] = withOptional('CO', mileageField(''));
      await app.open('/co/datos');
      await fillCo();
      const mileage = control(app.root, 'Kilometraje') as HTMLInputElement;
      await typeAndSettle(mileage, '1000000');
      leave(mileage);
      await app.settle();
      await continuar();
      expect(describedText(mileage)).toContain('Revisa este campo.');
      expect(mileage.getAttribute('aria-invalid')).toBe('true');
      expect(app.path()).toBe('/co/datos');
      expect(store().step1Output()).toBeNull();
    });

    // US-04 spec 11.1.1 (US-04-Q-24): an unreadable typed date shows the code-owned message, whatever the field's errorMessage.
    for (const [name, errorMessage] of [
      ['a field errorMessage', 'Ingresa una fecha de revisión válida.'],
      ['an empty errorMessage', ''],
    ] as const) {
      it(`US-01-AC-09 / US-01-AC-10 an optional date the person typed unreadably (10/13/2026) with ${name} is an error showing "Fecha no válida. Usa el formato dd/mm/aaaa.": "Continuar" blocked, focus on the date, store holds "" and the text stays`, async () => {
        await start();
        app.server.fields['CO'] = withOptional('CO', {
          key: 'inspectionDate',
          type: 'date',
          label: 'Fecha de revisión',
          isRequired: false,
          sortOrder: 95,
          errorMessage,
          rules: [],
        });
        await app.open('/co/datos');
        await fillCo();
        const date = control(app.root, 'Fecha de revisión') as HTMLInputElement;
        typeInto(date, '10/01/2026');
        await app.settle();
        expect(store().values()['inspectionDate']).toBe('2026-01-10');
        typeInto(date, '10/13/2026');
        leave(date);
        await app.settle();
        expect(store().values()['inspectionDate']).toBe('');
        expect(date.value).toBe('10/13/2026');
        await continuar();
        expect(describedText(date)).toContain(UNREADABLE_DATE);
        if (errorMessage) expect(describedText(date)).not.toContain(errorMessage);
        expect(date.getAttribute('aria-invalid')).toBe('true');
        expect(document.activeElement).toBe(date);
        expect(app.path()).toBe('/co/datos');
        expect(store().step1Output()).toBeNull();
        expect(storedValues()['inspectionDate']).toBe('');
        expect(date.value).toBe('10/13/2026');
      });
    }
  });

  describe('US-01-AC-02 / US-01-AC-10 / US-01-AC-18 a required date emptied after it was valid (US-01-R3-F01)', () => {
    const submitWithEnter = async (): Promise<void> => {
      // Enter in a text field submits the form through the default button.
      const form = app.root.querySelector('form') as HTMLFormElement;
      form.requestSubmit();
      await app.settle();
    };

    // US-04 spec 11.1: the stubbed badInput becomes real typing. "Partly cleared" is "15/05/199" (unreadable text that stays
    // on screen); "cleared" is an empty text box. Same assertions as before, plus the typed text stays visible.
    // US-04 spec 11.1.1 (BR-18): unreadable text shows the code-owned message; the cleared (empty) box keeps the Strapi required message.
    for (const [how, text, MESSAGE] of [
      ['an unreadable (partly cleared) date', '15/05/199', UNREADABLE_DATE],
      ['a cleared date', '', 'Ingresa tu fecha de nacimiento.'],
    ] as const) {
      const emptyDate = (el: HTMLInputElement): void => typeInto(el, text);

      it(`US-01-AC-02 ${how}: shows its message (required, or unreadable date) with aria-invalid after leaving the field`, async () => {
        await start();
        await app.open('/co/datos');
        await fillCo();
        const date = control(app.root, 'Fecha de nacimiento') as HTMLInputElement;
        expect(store().values()['birthDate']).toBe('1990-05-15');
        emptyDate(date);
        leave(date);
        await app.settle();
        expect(describedText(date)).toContain(MESSAGE);
        expect(date.getAttribute('aria-invalid')).toBe('true');
        expect(date.value).toBe(text);
      });

      it(`US-01-AC-02 / US-01-AC-10 / US-01-AC-18 ${how}: "Continuar" by click stays on /co/datos, focuses the date, and no step 1 output carries the stale date`, async () => {
        await start();
        await app.open('/co/datos');
        await fillCo();
        const date = control(app.root, 'Fecha de nacimiento') as HTMLInputElement;
        emptyDate(date);
        leave(date);
        await app.settle();
        await continuar();
        expect(app.path()).toBe('/co/datos');
        expect(document.activeElement).toBe(date);
        expect(describedText(date)).toContain(MESSAGE);
        expect(store().step1Output()).toBeNull();
        expect(JSON.stringify(store().step1Output())).not.toContain('1990-05-15');
        expect(store().values()['birthDate']).toBe('');
        expect(date.value).toBe(text);
      });

      it(`US-01-AC-02 / US-01-AC-10 / US-01-AC-18 ${how}: submitting with Enter stays on /co/datos, focuses the date, and no step 1 output carries the stale date`, async () => {
        await start();
        await app.open('/co/datos');
        await fillCo();
        const date = control(app.root, 'Fecha de nacimiento') as HTMLInputElement;
        emptyDate(date);
        leave(date);
        await app.settle();
        await submitWithEnter();
        expect(app.path()).toBe('/co/datos');
        expect(document.activeElement).toBe(date);
        expect(describedText(date)).toContain(MESSAGE);
        expect(store().step1Output()).toBeNull();
      });
    }
  });

  describe('US-01-AC-23 configuration changed while data is stored', () => {
    it('US-01-AC-23 the removed field is not shown, the removed option leaves "Ciudad" at the prompt, and "Continuar" asks for the city', async () => {
      await start(wizardEntry('CO', CO_VALID_RAW));
      app.server.fields['CO'] = sanitiseCity(
        seedStrapiItems('CO').filter((i) => i['key'] !== 'model'),
        'MDE',
      );
      await app.open('/co/datos');

      expect(maybeControl(app.root, 'Línea')).toBeNull();
      expect(store().values()).not.toHaveProperty('model');
      const city = control(app.root, 'Ciudad');
      expectPrompt(city);
      expect(store().values()['city']).toBe('');
      expect(alertTexts(app.root)).toEqual([]);
      // the rest of the stored data is kept
      expect((control(app.root, 'Nombre completo') as HTMLInputElement).value).toBe('Ana Prueba Ficticia');

      await continuar();
      expect(describedText(city)).toContain('Selecciona tu ciudad.');
      expect(app.path()).toBe('/co/datos');
    });

    it('US-01-AC-23 the pruned state is written back to the browser storage', async () => {
      await start(wizardEntry('CO', CO_VALID_RAW));
      app.server.fields['CO'] = sanitiseCity(
        seedStrapiItems('CO').filter((i) => i['key'] !== 'model'),
        'MDE',
      );
      await app.open('/co/datos');
      const values = JSON.parse(sessionStorage.getItem(WIZARD_STORAGE_KEY) ?? '{}').step1.values;
      expect(values).not.toHaveProperty('model');
      expect(values.city).toBe('');
      expect(values.plate).toBe('ABC123');
    });
  });

  describe('US-01-AC-22 data does not cross countries, and ADR-0003 clearing rules', () => {
    it('US-01-AC-22 opening Chile after Colombia shows an empty step 1, and the Colombia data is gone from the browser storage', async () => {
      await start(wizardEntry('CO', CO_VALID_RAW));
      await app.open('/cl/datos');
      for (const label of seedLabels('CL')) {
        const value = shownValue(control(app.root, label));
        expect([ '', false, PROMPT ]).toContain(value);
      }
      expect(sessionStorage.getItem(WIZARD_STORAGE_KEY) ?? '').not.toContain('1012345678');
      expect(sessionStorage.getItem(WIZARD_STORAGE_KEY) ?? '').not.toContain('Ana Prueba Ficticia');
    });

    it('US-01-AC-22 opening an unknown country does not discard the stored state', async () => {
      await start(wizardEntry('CO', CO_VALID_RAW));
      await app.open('/ar/datos');
      expect(sessionStorage.getItem(WIZARD_STORAGE_KEY) ?? '').toContain('1012345678');
      expect(app.server.requestsOf('form-fields')).toEqual([]);
    });
  });

  describe('US-01-AC-17 country context states (component level; the full scenarios run in e2e)', () => {
    it('US-01-AC-17 an unsupported country shows "Este país no está disponible." with links to the published countries and requests no field', async () => {
      await start();
      await app.open('/ar/datos');
      expect(app.root.textContent).toContain('Este país no está disponible.');
      const links = Array.from(app.root.querySelectorAll('a')).map((a) => [normalise(a.textContent), a.getAttribute('href')]);
      expect(links).toEqual([
        ['Colombia', '/co/datos'],
        ['Chile', '/cl/datos'],
      ]);
      expect(app.server.requestsOf('form-fields')).toEqual([]);
    });

    it('US-01-AC-17 the root address is a chooser with a link per published country', async () => {
      await start();
      await app.open('/');
      const links = Array.from(app.root.querySelectorAll('a')).map((a) => [normalise(a.textContent), a.getAttribute('href')]);
      expect(links).toEqual([
        ['Colombia', '/co/datos'],
        ['Chile', '/cl/datos'],
      ]);
    });

    it.each([
      ['/', 'the country chooser'],
      ['/ar/datos', 'the unknown-country page'],
      ['/co/datos', 'step 1 of Colombia'],
    ])('US-01-AC-17 when the country list cannot be loaded at %s it says so, never "no disponible", and Reintentar recovers (%s)', async (address) => {
      await start();
      app.server.countries = 'error';
      await app.open(address);
      expect(alertTexts(app.root)).toContain(COUNTRIES_ERROR);
      expect(app.root.textContent).not.toContain('Este país no está disponible.');
      expect(app.root.querySelectorAll('a')).toHaveLength(0);
      expect(app.server.requestsOf('form-fields')).toEqual([]);
      expect(document.activeElement).toBe(button(app.root, 'Reintentar'));

      app.server.countries = seedCountryItems();
      button(app.root, 'Reintentar').click();
      await app.settle();
      if (address === '/co/datos') {
        expect(allLabels(app.root)).toEqual(seedLabels('CO'));
      } else {
        expect(app.root.textContent).toContain(address === '/' ? 'Colombia' : 'Este país no está disponible.');
        expect(Array.from(app.root.querySelectorAll('a')).map((a) => normalise(a.textContent))).toEqual(['Colombia', 'Chile']);
      }
    });
  });

  describe('US-01-AC-25 accessible labels, help text and errors (Chile)', () => {
    it('US-01-AC-25 every control has its configured label as accessible name, and there are no unlabelled controls', async () => {
      await start();
      await app.open('/cl/datos');
      const configs = seedFieldConfigs('CL');
      for (const cfg of configs) expect(maybeControl(app.root, cfg.label), cfg.label).not.toBeNull();
      expect(allControls(app.root)).toHaveLength(configs.length);
    });

    it('US-01-AC-25 the accessible description of "Patente" includes its help text "Ejemplo: BCDF12 o AB1234."', async () => {
      await start();
      await app.open('/cl/datos');
      expect(describedText(control(app.root, 'Patente'))).toContain('Ejemplo: BCDF12 o AB1234.');
    });

    it('US-01-AC-25 every configured help text is part of its control description', async () => {
      await start();
      await app.open('/cl/datos');
      for (const cfg of seedFieldConfigs('CL').filter((c) => c.helpText)) {
        expect(describedText(control(app.root, cfg.label)), cfg.label).toContain(cfg.helpText!);
      }
    });

    it('US-01-AC-25 every required control is exposed as required, and an optional one is not', async () => {
      await start();
      app.server.fields['CL'] = [
        ...seedStrapiItems('CL'),
        toStrapiFieldItem({ key: 'mobilePhone', type: 'text', label: 'Teléfono celular', isRequired: false, sortOrder: 95, errorMessage: 'Ingresa un número de celular válido.', rules: [] }, 90),
      ];
      await app.open('/cl/datos');
      for (const cfg of seedFieldConfigs('CL')) expect(isExposedAsRequired(control(app.root, cfg.label)), cfg.label).toBe(true);
      expect(isExposedAsRequired(control(app.root, 'Teléfono celular'))).toBe(false);
    });

    it('US-01-AC-25 an invalid "Patente" is exposed as invalid and its error text is part of its description; a valid one is not invalid', async () => {
      await start();
      await app.open('/cl/datos');
      const plate = control(app.root, 'Patente');
      expect(plate.getAttribute('aria-invalid')).not.toBe('true');
      typeInto(plate, 'ABC123');
      leave(plate);
      await app.settle();
      expect(plate.getAttribute('aria-invalid')).toBe('true');
      expect(describedText(plate)).toContain('Ingresa una patente válida (por ejemplo, BCDF12 o AB1234).');
      expect(describedText(plate)).toContain('Ejemplo: BCDF12 o AB1234.');

      typeInto(plate, 'BCDF12');
      await app.settle();
      expect(plate.getAttribute('aria-invalid')).not.toBe('true');
    });

    it('US-01-AC-25 the error is in one live region and is not re-announced on every keystroke', async () => {
      await start();
      await app.open('/cl/datos');
      const plate = control(app.root, 'Patente');
      typeInto(plate, 'ABC123');
      leave(plate);
      await app.settle();

      const message = 'Ingresa una patente válida (por ejemplo, BCDF12 o AB1234).';
      const regions = (): Element[] =>
        Array.from(app.root.querySelectorAll('[role="alert"], [aria-live]')).filter((e) => normalise(e.textContent).includes(message));
      expect(regions()).toHaveLength(1);
      const first = regions()[0];

      typeInto(plate, 'ABC1234');
      await app.settle();
      typeInto(plate, 'ABC12345');
      await app.settle();
      expect(regions()).toHaveLength(1);
      expect(regions()[0]).toBe(first);
      expect(normalise(first.textContent)).toBe(message);
    });
  });

  // ---------------------------------------------------------------------------------------------
  // US-04: icons, skeleton, heading outline of step 1
  // ---------------------------------------------------------------------------------------------

  describe('US-04-AC-04 field icons: hidden from assistive technology, by key, with a default (the table itself is in field-icons.spec.ts)', () => {
    /** The smallest element that holds both the label and its control: the field. */
    const fieldOf = (label: string): HTMLElement => {
      const el = control(app.root, label);
      const lab = Array.from(app.root.querySelectorAll('label')).find((l) => l.control === el) as HTMLLabelElement;
      let node: HTMLElement | null = el.parentElement;
      while (node && !node.contains(lab)) node = node.parentElement;
      return node as HTMLElement;
    };
    const firstIcon = (label: string): string => fieldOf(label).querySelector('svg')?.outerHTML ?? '';

    it('US-04-AC-04 every text, number, select and date field of Colombia shows an icon, and the consent checkbox shows none', async () => {
      await start();
      await app.open('/co/datos');
      for (const label of seedLabels('CO').filter((l) => l !== CONSENT_LABEL_CO)) {
        expect(fieldOf(label).querySelectorAll('svg').length, label).toBeGreaterThan(0);
      }
      expect(fieldOf(CONSENT_LABEL_CO).querySelectorAll('svg')).toHaveLength(0);
    });

    it('US-04-AC-04 every icon of the page is hidden from assistive technology (aria-hidden="true", not focusable, no title, no text)', async () => {
      await start();
      await app.open('/co/datos');
      const icons = Array.from(app.root.querySelectorAll('svg'));
      expect(icons.length).toBeGreaterThan(9);
      for (const icon of icons) {
        expect(icon.getAttribute('aria-hidden'), icon.outerHTML.slice(0, 80)).toBe('true');
        expect(icon.getAttribute('tabindex')).toBeNull();
        expect(icon.querySelector('title')).toBeNull();
        expect(normalise(icon.textContent)).toBe('');
      }
    });

    it('US-04-AC-04 each field is still named exactly by its label, and "Continuar" is still named "Continuar"', async () => {
      await start();
      await app.open('/co/datos');
      for (const cfg of seedFieldConfigs('CO')) expect(normalise(control(app.root, cfg.label).labels?.[0]?.textContent), cfg.label).toBe(cfg.label);
      expect(normalise(button(app.root, 'Continuar').textContent)).toBe('Continuar');
    });

    it('US-04-AC-04 a field added in Strapi with an unmapped key ("mobilePhone", and a number "mileage") shows the same default icon, different from every mapped one', async () => {
      await start();
      app.server.fields['CO'] = [
        ...seedStrapiItems('CO'),
        toStrapiFieldItem({ key: 'mobilePhone', type: 'text', label: 'Teléfono celular', isRequired: false, sortOrder: 35, errorMessage: 'Ingresa un número de celular válido.', rules: [] }, 90),
        toStrapiFieldItem({ key: 'mileage', type: 'number', label: 'Kilometraje', isRequired: false, sortOrder: 95, errorMessage: '', rules: [] }, 91),
      ];
      await app.open('/co/datos');
      const dflt = firstIcon('Teléfono celular');
      expect(dflt).not.toBe('');
      expect(firstIcon('Kilometraje')).toBe(dflt);
      for (const mapped of ['Número de documento', 'Nombre completo', 'Placa', 'Línea']) expect(firstIcon(mapped), mapped).not.toBe(dflt);
    });

    it('US-04-AC-04 the icon follows the key: "Número de documento" (Colombia) and "RUT" (Chile), both key documentNumber, show the same icon', async () => {
      await start();
      await app.open('/co/datos');
      const co = firstIcon('Número de documento');
      // Chile is another page load (a country is never switched inside the wizard, US-01-Q-02)
      TestBed.resetTestingModule();
      configureAppTest();
      await start();
      await app.open('/cl/datos');
      expect(firstIcon('RUT')).toBe(co);
    });
  });

  describe('US-04-AC-15 skeletons while the form loads (the live text stays)', () => {
    const shapes = (): number =>
      Array.from(app.root.querySelectorAll('[aria-hidden="true"]')).filter((e) => e.tagName.toLowerCase() !== 'svg' && normalise(e.textContent) === '').length;
    const liveTexts = (): string[] =>
      Array.from(app.root.querySelectorAll('[role="status"], [aria-live="polite"]')).map((e) => normalise(e.textContent));

    it('US-04-AC-15 while the form fields load there are skeleton shapes hidden from assistive technology, "Cargando formulario…" is still in the polite live region, and the container is busy; when the content arrives the shapes are gone', async () => {
      vi.useFakeTimers();
      await start();
      app.server.fields['CO'] = 'hang';
      const navigation = app.begin('/co/datos');
      await app.settle();
      const loading = shapes();
      expect(loading, 'skeleton shapes while loading').toBeGreaterThan(0);
      expect(liveTexts()).toContain('Cargando formulario…');
      expect(app.root.querySelector('[aria-busy="true"]')).not.toBeNull();
      // the live text is not inside a hidden subtree
      const status = Array.from(app.root.querySelectorAll('[role="status"], [aria-live="polite"]')).find((e) => normalise(e.textContent) === 'Cargando formulario…');
      expect(status?.closest('[aria-hidden="true"]')).toBeNull();

      await vi.advanceTimersByTimeAsync(10_000);
      await vi.advanceTimersByTimeAsync(50);
      TestBed.tick();
      await navigation;
      app.server.fields['CO'] = seedStrapiItems('CO');
      button(app.root, 'Reintentar').click();
      await app.settle();
      expect(allLabels(app.root)).toEqual(seedLabels('CO'));
      expect(shapes(), 'the skeleton is replaced by the content').toBeLessThan(loading);
      expect(liveTexts()).not.toContain('Cargando formulario…');
    });
  });

  describe('US-04-AC-20 heading outline of step 1 (header, indicator, panels and calendar add no heading)', () => {
    it('US-04-AC-20 step 1 in Chile has exactly one heading: h1 "Tus datos y los de tu vehículo"', async () => {
      await start();
      await app.open('/cl/datos');
      const outline = Array.from(app.root.querySelectorAll('h1, h2, h3, h4, h5, h6')).map((h) => [h.tagName.toLowerCase(), normalise(h.textContent)]);
      expect(outline).toEqual([['h1', HEADING]]);
      expect(app.root.querySelectorAll('main')).toHaveLength(1);
    });

    it('US-04-AC-20 with a select panel open there is still no other heading in the document', async () => {
      await start();
      await app.open('/cl/datos');
      await openCombobox(control(app.root, 'Ciudad'));
      expect(Array.from(document.querySelectorAll('h1, h2, h3, h4, h5, h6')).map((h) => h.tagName.toLowerCase())).toEqual(['h1']);
    });
  });

  // ---------------------------------------------------------------------------------------------
  // US-04 v0.3: input profiles and maximum lengths (BR-19, ADR-0014 section 3)
  // ---------------------------------------------------------------------------------------------

  describe('US-04-AC-26 input profiles and maximum lengths', () => {
    const input = (label: string): HTMLInputElement => control(app.root, label) as HTMLInputElement;
    const MESSAGE = 'Ingresa tu nombre completo, solo letras (entre 3 y 80 caracteres).';

    const attributeRows: [string, string, string, string | null, string | null, string | null][] = [
      // country, label, maxlength, inputmode, autocomplete, autocapitalize (null = absent)
      ['CO', 'Nombre completo', '80', null, 'name', 'words'],
      ['CO', 'Número de documento', '10', 'numeric', null, null],
      ['CL', 'RUT', '12', 'text', null, null],
      ['CO', 'Placa', '6', null, 'off', 'characters'],
      ['CO', 'Línea', '40', null, null, null],
      ['CO', 'Modelo (año)', '4', 'numeric', null, null],
      ['CL', 'Año', '4', 'numeric', null, null],
    ];

    it.each(attributeRows)('US-04-AC-26 %s "%s" is a text box (type text) with maxlength %s, inputmode %s, autocomplete %s and autocapitalize %s', async (country, label, maxlength, inputmode, autocomplete, autocapitalize) => {
      await start();
      await app.open(`/${country.toLowerCase()}/datos`);
      const el = input(label);
      expect(el.tagName).toBe('INPUT');
      expect(el.getAttribute('type')).toBe('text');
      expect(el.getAttribute('maxlength')).toBe(maxlength);
      expect(el.getAttribute('inputmode')).toBe(inputmode);
      expect(el.getAttribute('autocomplete')).toBe(autocomplete);
      expect(el.getAttribute('autocapitalize')).toBe(autocapitalize);
    });

    const typingRows: [string, string, string, string, string][] = [
      // country, label, typed (key by key), shown (and stored), key
      ['CO', 'Nombre completo', 'Ana 2', 'Ana ', 'fullName'],
      ['CO', 'Nombre completo', "José Núñez-O'Neil Jr.", "José Núñez-O'Neil Jr.", 'fullName'],
      ['CO', 'Número de documento', '1.012.345.678', '1012345678', 'documentNumber'],
      ['CO', 'Número de documento', '123456789012', '1234567890', 'documentNumber'],
      ['CL', 'RUT', '12.345.678-k', '12.345.678-K', 'documentNumber'],
      ['CL', 'RUT', '12.345.678-5x9', '12.345.678-5', 'documentNumber'],
      ['CO', 'Placa', 'abc-123x', 'ABC123', 'plate'],
      ['CL', 'Patente', 'bcdf12', 'BCDF12', 'plate'],
      ['CO', 'Línea', '3 Touring+', '3 Touring', 'model'],
      ['CO', 'Modelo (año)', '20e2.5', '2025', 'vehicleYear'],
      ['CO', 'Modelo (año)', '20225', '2022', 'vehicleYear'],
      ['CL', 'Año', 'abc', '', 'vehicleYear'],
    ];

    it.each(typingRows)('US-04-AC-26 %s "%s": typing "%s" shows "%s" and the state holds the same for "%s"', async (country, label, typed, shown, key) => {
      await start();
      await app.open(`/${country.toLowerCase()}/datos`);
      await typeKeys(input(label), typed);
      await app.settle();
      expect(input(label).value).toBe(shown);
      expect(store().values()[key]).toBe(shown);
    });

    it('US-04-AC-26 pasting "Ana 2 Prueba" into "Nombre completo" shows "Ana  Prueba" with the caret at the end', async () => {
      await start();
      await app.open('/co/datos');
      const name = input('Nombre completo');
      typeInto(name, 'Ana 2 Prueba');
      await app.settle();
      expect(name.value).toBe('Ana  Prueba');
      expect(name.selectionStart).toBe(name.value.length);
      expect(name.selectionEnd).toBe(name.value.length);
      expect(store().values()['fullName']).toBe('Ana  Prueba');
    });

    it('US-04-AC-26 the sanitised value is what is written to the browser storage (a reload restores "Ana ", not "Ana 2")', async () => {
      await start();
      await app.open('/co/datos');
      typeInto(input('Nombre completo'), 'Ana 2');
      await app.settle();
      const entry = JSON.parse(sessionStorage.getItem(WIZARD_STORAGE_KEY) ?? '{}');
      expect(entry.step1.values.fullName).toBe('Ana ');
    });

    it('US-04-AC-26 the maximum length comes from the Strapi maxLength rule when there is one (a rule of 50 on fullName gives maxlength 50, not the profile 80)', async () => {
      await start();
      app.server.fields['CO'] = seedStrapiItems('CO').map((i) =>
        i['key'] === 'fullName'
          ? toStrapiFieldItem({ ...(seedFieldConfigs('CO').find((c) => c.key === 'fullName') as FieldConfig), rules: [{ kind: 'maxLength', value: 50 }] }, 20)
          : i,
      );
      await app.open('/co/datos');
      expect(input('Nombre completo').getAttribute('maxlength')).toBe('50');
      typeInto(input('Nombre completo'), 'a'.repeat(60));
      await app.settle();
      expect(input('Nombre completo').value).toBe('a'.repeat(50));
    });

    it('US-04-AC-26 fields the front end does not know: "Teléfono celular" (rule maxLength 15) has maxlength 15 and accepts "300 123-4567"; "Kilometraje" (optional number, no rules) is a numeric text box with no maxlength and "12e3.4" shows "1234"', async () => {
      await start();
      app.server.fields['CO'] = [
        ...seedStrapiItems('CO'),
        toStrapiFieldItem({ key: 'mobilePhone', type: 'text', label: 'Teléfono celular', isRequired: false, sortOrder: 35, errorMessage: 'Ingresa un número de celular válido.', rules: [{ kind: 'maxLength', value: 15 }] }, 90),
        toStrapiFieldItem({ key: 'mileage', type: 'number', label: 'Kilometraje', isRequired: false, sortOrder: 95, errorMessage: '', rules: [] }, 91),
      ];
      await app.open('/co/datos');
      const phone = input('Teléfono celular');
      expect(phone.getAttribute('maxlength')).toBe('15');
      await typeKeys(phone, '300 123-4567');
      expect(phone.value).toBe('300 123-4567');
      const mileage = input('Kilometraje');
      expect(mileage.getAttribute('type')).toBe('text');
      expect(mileage.getAttribute('inputmode')).toBe('numeric');
      expect(mileage.hasAttribute('maxlength')).toBe(false);
      await typeKeys(mileage, '12e3.4');
      expect(mileage.value).toBe('1234');
      expect(store().values()['mileage']).toBe('1234');
    });

    it('US-04-AC-26 the seed rules still validate what the filter cannot see: a stored "Ana 2" is shown as stored (not filtered) and "Continuar" shows the fullName message and stays on step 1', async () => {
      await start(wizardEntry('CO', { ...CO_VALID_RAW, fullName: 'Ana 2' }));
      await app.open('/co/datos');
      expect(input('Nombre completo').value).toBe('Ana 2');
      await continuar();
      expect(describedText(input('Nombre completo'))).toContain(MESSAGE);
      expect(input('Nombre completo').getAttribute('aria-invalid')).toBe('true');
      expect(app.path()).toBe('/co/datos');
    });

    it('US-04-AC-26 a stored "2015.5" in a number field is shown as stored and is still invalid (the filter only acts on typing)', async () => {
      await start(wizardEntry('CL', { ...CL_VALID_RAW, vehicleYear: '2015.5' }));
      await app.open('/cl/datos');
      expect(input('Año').value).toBe('2015.5');
      await continuar();
      expect(input('Año').getAttribute('aria-invalid')).toBe('true');
      expect(app.path()).toBe('/cl/datos');
    });
  });
});
