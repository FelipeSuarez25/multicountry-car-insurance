import { TestBed } from '@angular/core/testing';
import { By } from '@angular/platform-browser';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { QuoteFormPage } from './quote-form-page';
import { QuoteStore } from '../../core/quote-store';
import { configureAppTest, createAppTest, type AppTest } from '../../../testing/app-harness';
import {
  allControls,
  allLabels,
  alertTexts,
  button,
  control,
  describedText,
  fillForm,
  invalidControls,
  isExposedAsRequired,
  labelsWithErrors,
  leave,
  maybeButton,
  maybeControl,
  normalise,
  shownValue,
  typeInto,
} from '../../../testing/dom';
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
const PROMPT = 'Selecciona una opción';

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
    fillForm(app.root, { ...CO_VALID_INPUT, ...overrides });
    await app.settle();
  };
  const fillCl = async (overrides: Record<string, string | boolean | null> = {}): Promise<void> => {
    fillForm(app.root, { ...CL_VALID_INPUT, ...overrides });
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

    it('US-01-AC-01 every field type renders its native control: text, number, date, select and checkbox', async () => {
      await start();
      await app.open('/co/datos');
      expect(control(app.root, 'Número de documento')).toMatchObject({ tagName: 'INPUT', type: 'text' });
      expect(control(app.root, 'Modelo (año)')).toMatchObject({ tagName: 'INPUT', type: 'number' });
      expect(control(app.root, 'Fecha de nacimiento')).toMatchObject({ tagName: 'INPUT', type: 'date' });
      expect(control(app.root, 'Ciudad').tagName).toBe('SELECT');
      expect(control(app.root, CONSENT_LABEL_CO)).toMatchObject({ tagName: 'INPUT', type: 'checkbox' });
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
    const optionTexts = (select: HTMLSelectElement): string[] => Array.from(select.options).map((o) => normalise(o.textContent));

    it('US-01-AC-07 Colombia "Ciudad" shows the prompt and then exactly the 4 cities, in this order, and none is selected', async () => {
      await start();
      await app.open('/co/datos');
      const city = control(app.root, 'Ciudad') as HTMLSelectElement;
      expect(optionTexts(city)).toEqual([PROMPT, 'Bogotá', 'Medellín', 'Cali', 'Barranquilla']);
      expect(city.value).toBe('');
      expect(normalise(city.selectedOptions[0].textContent)).toBe(PROMPT);
    });

    it('US-01-AC-07 Chile "Ciudad" shows the prompt and then exactly the 4 cities, in this order, and none is selected', async () => {
      await start();
      await app.open('/cl/datos');
      const city = control(app.root, 'Ciudad') as HTMLSelectElement;
      expect(optionTexts(city)).toEqual([PROMPT, 'Santiago', 'Valparaíso', 'Concepción', 'Antofagasta']);
      expect(city.value).toBe('');
    });

    it('US-01-BR-02 the first entry is a prompt that cannot be selected, and the option values are the stored values, not the labels', async () => {
      await start();
      await app.open('/co/datos');
      const city = control(app.root, 'Ciudad') as HTMLSelectElement;
      expect(city.options[0].disabled).toBe(true);
      expect(Array.from(city.options).map((o) => o.value)).toEqual(['', 'BOG', 'MDE', 'CLO', 'BAQ']);
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
      expect(optionTexts(control(app.root, 'Ciudad') as HTMLSelectElement)).toEqual([PROMPT, 'Bogotá', 'Medellín', 'Cali', 'Barranquilla']);
    });
  });

  describe('US-01-AC-02 field validation', () => {
    const rows: [string, string | boolean | null, string][] = [
      ['Placa', 'AB12', 'Ingresa una placa válida: 3 letras y 3 números (por ejemplo, ABC123).'],
      ['Ciudad', null, 'Selecciona tu ciudad.'],
      ['Fecha de nacimiento', '2010-03-01', 'Debes ser mayor de edad (18 años o más) para cotizar.'],
      ['Modelo (año)', '2005', 'El modelo debe estar entre los últimos 20 años y el próximo año.'],
      [CONSENT_LABEL_CO, false, 'Debes autorizar el tratamiento de tus datos para continuar.'],
      ['Nombre completo', 'Al', 'Ingresa tu nombre completo (entre 3 y 80 caracteres).'],
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
      expect(describedText(name)).toContain('Ingresa tu nombre completo (entre 3 y 80 caracteres).');

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

    it('US-01-AC-18 the step 2 route has no page of its own in US-01: no heading, no field, no button', async () => {
      await start();
      await app.open('/co/datos');
      await fillCo();
      await continuar();
      expect(app.root.querySelector('h1')).toBeNull();
      expect(allControls(app.root)).toEqual([]);
      expect(app.root.querySelectorAll('button')).toHaveLength(0);
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

    it('US-01-AC-04 shows what each control type holds after hydration: text, number, date, select and checkbox', async () => {
      await start(wizardEntry('CO', CO_VALID_RAW));
      await app.open('/co/datos');
      expect((control(app.root, 'Número de documento') as HTMLInputElement).value).toBe('1012345678');
      expect((control(app.root, 'Modelo (año)') as HTMLInputElement).value).toBe('2022');
      expect((control(app.root, 'Fecha de nacimiento') as HTMLInputElement).value).toBe('1990-05-15');
      expect((control(app.root, 'Ciudad') as HTMLSelectElement).value).toBe('MDE');
      expect((control(app.root, CONSENT_LABEL_CO) as HTMLInputElement).checked).toBe(true);
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

    it('US-01-AC-21 what is typed is written as it changes, so a reload at any moment restores it', async () => {
      await start();
      await app.open('/cl/datos');
      typeInto(control(app.root, 'Nombre completo'), 'Ana');
      typeInto(control(app.root, 'Año'), '2015.5');
      await app.settle();
      const entry = JSON.parse(sessionStorage.getItem(WIZARD_STORAGE_KEY) ?? '{}');
      expect(entry.country).toBe('CL');
      expect(entry.step1.values).toMatchObject({ fullName: 'Ana', vehicleYear: '2015.5' });
    });
  });

  describe('US-01-AC-09 / US-01-AC-21 a number the browser cannot parse reaches the model and the store as empty (R2-F01)', () => {
    /**
     * What Chromium reports for "1e" or "2015e" in a number input: the text is on screen
     * (`validity.badInput` is true), the sanitised `value` reads back as ''. jsdom has no such
     * state, so the control is made to report it. Then the input event a keystroke would fire.
     */
    function typeUnparseable(el: HTMLInputElement): void {
      Object.defineProperty(el, 'validity', { configurable: true, get: () => ({ badInput: true, valid: false }) });
      el.value = '';
      el.dispatchEvent(new Event('input', { bubbles: true }));
    }
    const storedValues = (): Record<string, unknown> => JSON.parse(sessionStorage.getItem(WIZARD_STORAGE_KEY) ?? '{}').step1.values;
    const makeYearOptional = (items: StrapiItem[]): StrapiItem[] =>
      items.map((i) => (i['key'] === 'vehicleYear' ? { ...i, isRequired: false } : i));

    it('US-01-AC-09 after "2015" and then unparseable text, the store holds "" (not the last parseable "2015")', async () => {
      await start();
      await app.open('/cl/datos');
      const year = control(app.root, 'Año') as HTMLInputElement;
      typeInto(year, '2015');
      await app.settle();
      expect(store().values()['vehicleYear']).toBe('2015');
      typeUnparseable(year);
      leave(year);
      await app.settle();
      expect(store().values()['vehicleYear']).toBe('');
    });

    it('US-01-AC-21 the browser storage holds "" for the unparseable entry, so a reload does not restore a valid "2015"', async () => {
      await start();
      await app.open('/cl/datos');
      const year = control(app.root, 'Año') as HTMLInputElement;
      typeInto(year, '2015');
      await app.settle();
      typeUnparseable(year);
      await app.settle();
      expect(storedValues()['vehicleYear']).toBe('');
    });

    it('US-01-AC-09 a required number with unparseable text shows requiredMessage ?? errorMessage and "Continuar" stays on step 1', async () => {
      await start();
      await app.open('/cl/datos');
      await fillCl({ Año: null });
      const year = control(app.root, 'Año') as HTMLInputElement;
      typeUnparseable(year);
      leave(year);
      await app.settle();
      await continuar();
      expect(describedText(year)).toContain('El año debe estar entre los últimos 20 años y el próximo año.');
      expect(year.getAttribute('aria-invalid')).toBe('true');
      expect(app.path()).toBe('/cl/datos');
      expect(store().step1Output()).toBeNull();
    });

    it('US-01-AC-09 a required number with a requiredMessage shows that message for unparseable text', async () => {
      await start();
      app.server.fields['CL'] = seedStrapiItems('CL').map((i) =>
        i['key'] === 'vehicleYear' ? { ...i, requiredMessage: 'Indica el año de tu vehículo.' } : i,
      );
      await app.open('/cl/datos');
      await fillCl({ Año: null });
      const year = control(app.root, 'Año') as HTMLInputElement;
      typeUnparseable(year);
      leave(year);
      await app.settle();
      await continuar();
      expect(describedText(year)).toContain('Indica el año de tu vehículo.');
      expect(app.path()).toBe('/cl/datos');
    });

    it('US-01-AC-09 an optional number with unparseable text counts as empty: no error, "Continuar" is not blocked, output is null', async () => {
      await start();
      app.server.fields['CL'] = makeYearOptional(seedStrapiItems('CL'));
      await app.open('/cl/datos');
      await fillCl({ Año: null });
      const year = control(app.root, 'Año') as HTMLInputElement;
      typeInto(year, '2015');
      await app.settle();
      typeUnparseable(year);
      leave(year);
      await app.settle();
      expect(store().values()['vehicleYear']).toBe('');
      expect(describedText(year)).not.toContain('El año debe estar entre');
      expect(year.getAttribute('aria-invalid')).not.toBe('true');

      await continuar();
      expect(app.path()).toBe('/cl/planes');
      expect(store().step1Output()?.values['vehicleYear']).toBeNull();
    });
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
      const city = control(app.root, 'Ciudad') as HTMLSelectElement;
      expect(city.value).toBe('');
      expect(normalise(city.selectedOptions[0].textContent)).toBe(PROMPT);
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
});
