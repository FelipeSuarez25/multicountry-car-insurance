import { TestBed } from '@angular/core/testing';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { QuoteStore } from '../core/quote-store';
import { configureAppTest, createAppTest, type AppTest } from '../../testing/app-harness';
import { day } from '../../testing/clock';
import { PROMPT, control, describedText, expectPrompt, leave, listboxOf, normalise, openCombobox, optionTexts, press, settleUi, shownValue, typeInto, typeKeys, type Control, choose } from '../../testing/dom';
import { activeOptionText, politeText, selectedOptionTexts } from '../../testing/custom-controls';
import { CO_VALID_RAW, seedStrapiItems, strapiCountryItem, seedCountryItems, wizardEntry, WIZARD_STORAGE_KEY, CL_VALID_RAW } from '../../testing/seed-fixtures';

/**
 * US-04-AC-05, AC-06, AC-07 (and BR-05): the custom select, tested through the real step 1 page so
 * that the whole path is exercised: the combobox, its popup, the Signal Forms binding and the store.
 *
 * Kinds (ADR-0012 section 3): "Tipo de documento" (2 options) is select-only, a `<button role="combobox">`;
 * "Ciudad" (4) and "Marca" (5) are searchable, an `<input role="combobox">`. jsdom has no real focus
 * movement for Tab and no top layer: the focus trap and the focus that follows Tab are proven in e2e.
 */

const TODAY = day(2026, 11, 21);

describe('US-04 custom select (component tests through the real routes)', () => {
  let app: AppTest;

  async function start(address: string, stored?: string): Promise<void> {
    if (stored !== undefined) sessionStorage.setItem(WIZARD_STORAGE_KEY, stored);
    app = await createAppTest();
    await app.open(address);
  }
  const store = (): QuoteStore => TestBed.inject(QuoteStore);
  const listbox = (): HTMLElement | null => document.querySelector<HTMLElement>('[role="listbox"]');
  const stored = (key: string): string => String(store().values()[key] ?? '');

  beforeEach(() => {
    configureAppTest({ today: TODAY });
    vi.spyOn(console, 'warn').mockImplementation(() => undefined);
  });
  afterEach(() => {
    vi.useRealTimers();
    vi.restoreAllMocks();
    sessionStorage.clear();
  });

  // -------------------------------------------------------------------------------------------
  describe('US-04-AC-05 custom select: choose and show', () => {
    it('US-04-AC-05 "Tipo de documento" (select-only) is a collapsed, required combobox whose text is "Selecciona una opción"; the state holds ""', async () => {
      await start('/co/datos');
      const tipo = control(app.root, 'Tipo de documento');
      expect(tipo.tagName).toBe('BUTTON');
      expect(tipo.getAttribute('role')).toBe('combobox');
      expect(tipo.getAttribute('aria-expanded')).toBe('false');
      expect(tipo.getAttribute('aria-required')).toBe('true');
      expect(normalise(tipo.textContent)).toBe(PROMPT);
      expect(stored('documentType')).toBe('');
      expect(listbox()).toBeNull();
    });

    it('US-04-AC-05 "Ciudad" (searchable) is a collapsed, required combobox with the placeholder "Selecciona una opción" and an empty input value; the state holds ""', async () => {
      await start('/co/datos');
      const ciudad = control(app.root, 'Ciudad');
      expect(ciudad.tagName).toBe('INPUT');
      expect(ciudad.getAttribute('role')).toBe('combobox');
      expect(ciudad.getAttribute('aria-expanded')).toBe('false');
      expect(ciudad.getAttribute('aria-required')).toBe('true');
      expectPrompt(ciudad);
      expect(stored('city')).toBe('');
    });

    it('US-04-AC-05 activating "Ciudad" opens a listbox with exactly Bogotá, Medellín, Cali, Barranquilla, in this order, none selected; aria-expanded is true and aria-controls refers to that listbox', async () => {
      await start('/co/datos');
      const ciudad = control(app.root, 'Ciudad');
      const open = await openCombobox(ciudad);
      expect(open.getAttribute('role')).toBe('listbox');
      expect(optionTexts(open)).toEqual(['Bogotá', 'Medellín', 'Cali', 'Barranquilla']);
      expect(selectedOptionTexts(open)).toEqual([]);
      expect(ciudad.getAttribute('aria-expanded')).toBe('true');
      expect(listboxOf(ciudad)).toBe(open);
    });

    it('US-04-AC-05 choosing "Medellín" closes the listbox, "Ciudad" shows "Medellín" in its input and keeps the focus, and the state holds "MDE"', async () => {
      await start('/co/datos');
      const ciudad = control(app.root, 'Ciudad');
      await choose(ciudad, 'Medellín');
      expect(listbox()).toBeNull();
      expect(ciudad.getAttribute('aria-expanded')).toBe('false');
      expect(shownValue(ciudad)).toBe('Medellín');
      expect(document.activeElement).toBe(ciudad);
      expect(stored('city')).toBe('MDE');
    });

    it('US-04-AC-05 opening "Ciudad" again marks "Medellín" as selected (aria-selected="true" and a check icon) and no other option', async () => {
      await start('/co/datos');
      const ciudad = control(app.root, 'Ciudad');
      await choose(ciudad, 'Medellín');
      const open = await openCombobox(ciudad);
      expect(selectedOptionTexts(open)).toEqual(['Medellín']);
      const rows = Array.from(open.querySelectorAll('[role="option"]'));
      const withIcon = rows.filter((r) => r.querySelector('svg') !== null).map((r) => normalise(r.textContent));
      expect(withIcon).toEqual(['Medellín']);
      expect(rows.find((r) => normalise(r.textContent) === 'Medellín')?.querySelector('svg')?.getAttribute('aria-hidden')).toBe('true');
      expect(rows.filter((r) => r.getAttribute('aria-selected') === 'true')).toHaveLength(1);
    });

    it('US-04-AC-05 a select-only "Tipo de documento": choosing shows the label in the button, stores the value ("CE"), keeps the focus, and marks the option when reopened', async () => {
      await start('/co/datos');
      const tipo = control(app.root, 'Tipo de documento');
      const open = await openCombobox(tipo);
      expect(optionTexts(open)).toEqual(['Cédula de ciudadanía', 'Cédula de extranjería']);
      await choose(tipo, 'Cédula de extranjería');
      expect(shownValue(tipo)).toBe('Cédula de extranjería');
      expect(stored('documentType')).toBe('CE');
      expect(document.activeElement).toBe(tipo);
      expect(listbox()).toBeNull();
      expect(selectedOptionTexts(await openCombobox(tipo))).toEqual(['Cédula de extranjería']);
    });

    it('US-04-AC-05 the stored value is the option value, never its label, and the typed step 1 output is unchanged', async () => {
      await start('/co/datos');
      await choose(control(app.root, 'Marca'), 'Mazda');
      expect(stored('make')).toBe('mazda');
      expect(Object.values(store().values())).not.toContain('Mazda');
    });

    it('US-04-AC-05 validation is unchanged: an untouched required select shows no error; leaving it empty shows "Selecciona el tipo de documento." with aria-invalid, described by the message; choosing clears it', async () => {
      await start('/co/datos');
      const tipo = control(app.root, 'Tipo de documento');
      expect(tipo.getAttribute('aria-invalid')).not.toBe('true');
      tipo.focus();
      leave(tipo);
      await settleUi();
      expect(tipo.getAttribute('aria-invalid')).toBe('true');
      expect(describedText(tipo)).toContain('Selecciona el tipo de documento.');
      await choose(tipo, 'Cédula de ciudadanía');
      expect(tipo.getAttribute('aria-invalid')).not.toBe('true');
      expect(describedText(tipo)).not.toContain('Selecciona el tipo de documento.');
    });

    it('US-04-AC-05 the accessible name is the label: the control is reached through its <label for>, with no extra label in the page while closed or open', async () => {
      await start('/co/datos');
      const before = app.root.querySelectorAll('label').length;
      const ciudad = control(app.root, 'Ciudad');
      expect(Array.from(ciudad.labels ?? []).map((l) => normalise(l.textContent))).toEqual(['Ciudad']);
      await openCombobox(ciudad);
      expect(document.querySelectorAll('label').length).toBe(before);
    });

    it('US-04-AC-05 a pointer click outside the open panel closes it without changing the value', async () => {
      await start('/co/datos', wizardEntry('CO', { city: 'MDE' }));
      const ciudad = control(app.root, 'Ciudad');
      await openCombobox(ciudad);
      const outside = app.root.querySelector('h1') as HTMLElement;
      for (const type of ['pointerdown', 'mousedown', 'pointerup', 'mouseup', 'click']) outside.dispatchEvent(new MouseEvent(type, { bubbles: true, cancelable: true }));
      await settleUi();
      expect(listbox()).toBeNull();
      expect(ciudad.getAttribute('aria-expanded')).toBe('false');
      expect(shownValue(ciudad)).toBe('Medellín');
      expect(stored('city')).toBe('MDE');
    });
  });

  // -------------------------------------------------------------------------------------------
  describe('US-04-AC-06 custom select keyboard (every row, on a searchable and on a select-only field)', () => {
    interface Kind {
      label: string;
      key: string;
      searchable: boolean;
      labels: string[];
      values: string[];
      /** The option shown when the select holds a stored value (index) and the entry that stores it. */
      hydrated: { index: number; entry: Record<string, string> };
      /** Text typed into the empty select, and the option that becomes active. */
      typed: { text: string; active: string };
    }
    const kinds: Kind[] = [
      {
        label: 'Marca',
        key: 'make',
        searchable: true,
        labels: ['Chevrolet', 'Renault', 'Mazda', 'Kia', 'Toyota'],
        values: ['chevrolet', 'renault', 'mazda', 'kia', 'toyota'],
        hydrated: { index: 2, entry: { make: 'mazda' } },
        typed: { text: 'maz', active: 'Mazda' },
      },
      {
        label: 'Tipo de documento',
        key: 'documentType',
        searchable: false,
        labels: ['Cédula de ciudadanía', 'Cédula de extranjería'],
        values: ['CC', 'CE'],
        hydrated: { index: 1, entry: { documentType: 'CE' } },
        typed: { text: 'ced', active: 'Cédula de ciudadanía' },
      },
    ];

    describe.each(kinds)('$label', (kind) => {
      const last = kind.labels.length - 1;
      const combo = (): Control => control(app.root, kind.label);
      const open = async (): Promise<void> => {
        await press(combo(), 'ArrowDown');
        expect(combo().getAttribute('aria-expanded')).toBe('true');
      };

      it(`US-04-AC-06 collapsed, empty: Enter opens the listbox with "${kind.labels[0]}" as the active option (aria-activedescendant)`, async () => {
        await start('/co/datos');
        combo().focus();
        await press(combo(), 'Enter');
        expect(combo().getAttribute('aria-expanded')).toBe('true');
        expect(listboxOf(combo())).not.toBeNull();
        expect(activeOptionText(combo())).toBe(kind.labels[0]);
      });

      it(
        kind.searchable
          ? 'US-04-AC-06 collapsed, empty: Space on a searchable select is left to the browser, so a space is typed into the filter (the key is not prevented)'
          : `US-04-AC-06 collapsed, empty: Space on a select-only select opens the listbox with "${kind.labels[0]}" active (the key is handled, so the page does not scroll)`,
        async () => {
          await start('/co/datos');
          combo().focus();
          const prevented = await press(combo(), ' ');
          if (kind.searchable) {
            expect(prevented).toBe(false);
          } else {
            expect(prevented).toBe(true);
            expect(combo().getAttribute('aria-expanded')).toBe('true');
            expect(activeOptionText(combo())).toBe(kind.labels[0]);
          }
        },
      );

      it(`US-04-AC-06 collapsed, empty: ArrowDown opens the listbox with "${kind.labels[0]}" active`, async () => {
        await start('/co/datos');
        combo().focus();
        await press(combo(), 'ArrowDown');
        expect(combo().getAttribute('aria-expanded')).toBe('true');
        expect(activeOptionText(combo())).toBe(kind.labels[0]);
      });

      it(`US-04-AC-06 collapsed, showing "${kind.labels[kind.hydrated.index]}": Alt+ArrowDown opens the listbox with that option active`, async () => {
        await start('/co/datos', wizardEntry('CO', kind.hydrated.entry));
        expect(shownValue(combo())).toBe(kind.labels[kind.hydrated.index]);
        combo().focus();
        await press(combo(), 'ArrowDown', { alt: true });
        expect(combo().getAttribute('aria-expanded')).toBe('true');
        expect(activeOptionText(combo())).toBe(kind.labels[kind.hydrated.index]);
      });

      it(`US-04-AC-06 open, active "${kind.labels[0]}": two ArrowDown move the active option to "${kind.labels[Math.min(2, last)]}" and nothing is stored yet`, async () => {
        await start('/co/datos');
        combo().focus();
        await open();
        await press(combo(), 'ArrowDown');
        await press(combo(), 'ArrowDown');
        expect(activeOptionText(combo())).toBe(kind.labels[Math.min(2, last)]);
        expect(stored(kind.key)).toBe('');
        expect(combo().getAttribute('aria-expanded')).toBe('true');
      });

      it(`US-04-AC-06 open: End makes "${kind.labels[last]}" active, Home makes "${kind.labels[0]}" active again, ArrowDown on the last option keeps it active (no wrap)`, async () => {
        await start('/co/datos');
        combo().focus();
        await open();
        await press(combo(), 'End');
        expect(activeOptionText(combo())).toBe(kind.labels[last]);
        await press(combo(), 'ArrowDown');
        expect(activeOptionText(combo())).toBe(kind.labels[last]);
        await press(combo(), 'Home');
        expect(activeOptionText(combo())).toBe(kind.labels[0]);
      });

      it(`US-04-AC-06 open, active "${kind.labels[Math.min(3, last)]}": Enter closes the listbox, the field shows it, stores "${kind.values[Math.min(3, last)]}" and the focus stays on the field`, async () => {
        await start('/co/datos');
        combo().focus();
        await open();
        for (let i = 0; i < Math.min(3, last); i++) await press(combo(), 'ArrowDown');
        expect(activeOptionText(combo())).toBe(kind.labels[Math.min(3, last)]);
        await press(combo(), 'Enter');
        expect(listbox()).toBeNull();
        expect(combo().getAttribute('aria-expanded')).toBe('false');
        expect(shownValue(combo())).toBe(kind.labels[Math.min(3, last)]);
        expect(stored(kind.key)).toBe(kind.values[Math.min(3, last)]);
        expect(document.activeElement).toBe(combo());
      });

      it(`US-04-AC-06 open, active another option, showing "${kind.labels[kind.hydrated.index]}": Escape closes the listbox, the field still shows "${kind.labels[kind.hydrated.index]}", the value is unchanged and the focus stays on the field`, async () => {
        await start('/co/datos', wizardEntry('CO', kind.hydrated.entry));
        combo().focus();
        await press(combo(), 'ArrowDown', { alt: true });
        await press(combo(), kind.hydrated.index === last ? 'Home' : 'ArrowDown');
        expect(activeOptionText(combo())).not.toBe(kind.labels[kind.hydrated.index]);
        await press(combo(), 'Escape');
        expect(listbox()).toBeNull();
        expect(shownValue(combo())).toBe(kind.labels[kind.hydrated.index]);
        expect(stored(kind.key)).toBe(kind.values[kind.hydrated.index]);
        expect(document.activeElement).toBe(combo());
      });

      it(`US-04-AC-06 open, active "${kind.labels[Math.min(3, last)]}": Tab chooses it and closes the listbox (the browser then moves the focus on, proven in e2e)`, async () => {
        await start('/co/datos');
        combo().focus();
        await open();
        for (let i = 0; i < Math.min(3, last); i++) await press(combo(), 'ArrowDown');
        await press(combo(), 'Tab');
        expect(listbox()).toBeNull();
        expect(shownValue(combo())).toBe(kind.labels[Math.min(3, last)]);
        expect(stored(kind.key)).toBe(kind.values[Math.min(3, last)]);
      });

      it(`US-04-AC-06 collapsed, empty: typing "${kind.typed.text}" opens the listbox with "${kind.typed.active}" active (case- and accent-insensitive)`, async () => {
        await start('/co/datos');
        combo().focus();
        await typeKeys(combo(), kind.typed.text);
        expect(combo().getAttribute('aria-expanded')).toBe('true');
        expect(activeOptionText(combo())).toBe(kind.typed.active);
      });

      it('US-04-AC-06 aria-expanded is true while open and false after closing, and aria-controls refers to the listbox while it is rendered', async () => {
        await start('/co/datos');
        combo().focus();
        expect(combo().getAttribute('aria-expanded')).toBe('false');
        await open();
        expect(listboxOf(combo())).toBe(listbox());
        await press(combo(), 'Escape');
        expect(combo().getAttribute('aria-expanded')).toBe('false');
        expect(listbox()).toBeNull();
      });
    });

    it('US-04-AC-06 on a select-only select, Space with the list open chooses the active option instead of typing', async () => {
      await start('/co/datos');
      const tipo = control(app.root, 'Tipo de documento');
      tipo.focus();
      await press(tipo, 'ArrowDown');
      await press(tipo, 'ArrowDown');
      expect(activeOptionText(tipo)).toBe('Cédula de extranjería');
      await press(tipo, ' ');
      expect(listbox()).toBeNull();
      expect(shownValue(tipo)).toBe('Cédula de extranjería');
      expect(stored('documentType')).toBe('CE');
    });

    it('US-04-AC-06 typing "ced" on a select-only select does not filter: it shows no text cursor and both options stay in the list', async () => {
      await start('/co/datos');
      const tipo = control(app.root, 'Tipo de documento');
      tipo.focus();
      await typeKeys(tipo, 'ced');
      expect(tipo.tagName).toBe('BUTTON');
      expect(optionTexts(listboxOf(tipo) as HTMLElement)).toEqual(['Cédula de ciudadanía', 'Cédula de extranjería']);
    });
  });

  // -------------------------------------------------------------------------------------------
  describe('US-04-AC-07 select search for long lists (Chile)', () => {
    const rows: [string, string, string[], string][] = [
      ['Ciudad', 'valpa', ['Valparaíso'], '1 opción'],
      ['Ciudad', 'CONCE', ['Concepción'], '1 opción'],
      ['Marca', 'u', ['Suzuki', 'Hyundai'], '2 opciones'],
    ];

    it.each(rows)('US-04-AC-07 typing "%s" in "%s" shows only the matching options, in order, and announces the count politely', async (field, text, expected, announcement) => {
      await start('/cl/datos');
      const el = control(app.root, field);
      el.focus();
      await typeKeys(el, text);
      expect(optionTexts(listboxOf(el) as HTMLElement)).toEqual(expected);
      expect(activeOptionText(el), 'the first match is active').toBe(expected[0]);
      await vi.waitFor(() => expect(politeText()).toContain(announcement), { timeout: 2000 });
    });

    it('US-04-AC-07 typing "xyz" in "Marca" shows no option and the text "No encontramos opciones para «xyz».", announced politely', async () => {
      await start('/cl/datos');
      const marca = control(app.root, 'Marca');
      marca.focus();
      await typeKeys(marca, 'xyz');
      expect(document.querySelectorAll('[role="option"]')).toHaveLength(0);
      expect(normalise(document.body.textContent)).toContain('No encontramos opciones para «xyz».');
      await vi.waitFor(() => expect(politeText()).toContain('No encontramos opciones para «xyz».'), { timeout: 2000 });
    });

    it('US-04-AC-07 the filter matches without accents and in any case: "valpa" and "VALPA" and "valparaiso" all show "Valparaíso"', async () => {
      for (const text of ['VALPA', 'valparaiso']) {
        sessionStorage.clear();
        TestBed.resetTestingModule();
        configureAppTest({ today: TODAY });
        await start('/cl/datos');
        const ciudad = control(app.root, 'Ciudad');
        ciudad.focus();
        await typeKeys(ciudad, text);
        expect(optionTexts(listboxOf(ciudad) as HTMLElement), text).toEqual(['Valparaíso']);
      }
    });

    it('US-04-AC-07 choosing a filtered option stores its value: "valpa" then Enter stores "VAP" and shows "Valparaíso"', async () => {
      await start('/cl/datos');
      const ciudad = control(app.root, 'Ciudad');
      ciudad.focus();
      await typeKeys(ciudad, 'valpa');
      await press(ciudad, 'Enter');
      expect(shownValue(ciudad)).toBe('Valparaíso');
      expect(stored('city')).toBe('VAP');
      expect(listbox()).toBeNull();
    });

    it('US-04-AC-07 "Ciudad" in Chile shows "Santiago", the person types "xyz" and presses Escape: it shows "Santiago" again and the state still holds "SCL"', async () => {
      await start('/cl/datos', wizardEntry('CL', { city: 'SCL' }));
      const ciudad = control(app.root, 'Ciudad');
      expect(shownValue(ciudad)).toBe('Santiago');
      ciudad.focus();
      typeInto(ciudad, 'xyz');
      await settleUi();
      await press(ciudad, 'Escape');
      expect(shownValue(ciudad)).toBe('Santiago');
      expect(stored('city')).toBe('SCL');
      expect(listbox()).toBeNull();
    });

    it('US-04-AC-07 the same when the focus moves away instead of Escape: it shows "Santiago" and the state still holds "SCL"', async () => {
      await start('/cl/datos', wizardEntry('CL', { city: 'SCL' }));
      const ciudad = control(app.root, 'Ciudad');
      ciudad.focus();
      typeInto(ciudad, 'xyz');
      await settleUi();
      leave(ciudad);
      await settleUi();
      expect(shownValue(ciudad)).toBe('Santiago');
      expect(stored('city')).toBe('SCL');
    });

    it('US-04-AC-07 short lists have no search: "Tipo de documento" (2 options) is a button, not a text input', async () => {
      await start('/co/datos');
      const tipo = control(app.root, 'Tipo de documento');
      expect(tipo.tagName).toBe('BUTTON');
      expect(control(app.root, 'Ciudad').tagName).toBe('INPUT');
      expect(control(app.root, 'Marca').tagName).toBe('INPUT');
    });

    it('US-04-AC-07 a select that gains options in Strapi becomes searchable with no code change: 3 options is select-only, 4 is searchable', async () => {
      sessionStorage.clear();
      app = await createAppTest();
      const withOptions = (n: number): ReturnType<typeof seedStrapiItems> =>
        seedStrapiItems('CO').map((i) =>
          i['key'] === 'documentType'
            ? {
                ...i,
                options: ['CC', 'CE', 'PA', 'TI'].slice(0, n).map((value, k) => ({ id: k + 1, value, label: `Documento ${value}`, sortOrder: (k + 1) * 10 })),
              }
            : i,
        );
      app.server.fields['CO'] = withOptions(3);
      await app.open('/co/datos');
      expect(control(app.root, 'Tipo de documento').tagName).toBe('BUTTON');

      TestBed.resetTestingModule();
      configureAppTest({ today: TODAY });
      app = await createAppTest();
      app.server.fields['CO'] = withOptions(4);
      await app.open('/co/datos');
      expect(control(app.root, 'Tipo de documento').tagName).toBe('INPUT');
    });
  });

  // -------------------------------------------------------------------------------------------
  describe('US-04-AC-05 the editing model, the store and the typed output are not changed by the control', () => {
    it('US-04-AC-05 hydration: "Ciudad" holding "MDE" shows "Medellín", "Marca" holding "mazda" shows "Mazda", "Tipo de documento" holding "CC" shows its label', async () => {
      await start('/co/datos', wizardEntry('CO', { ...CO_VALID_RAW }));
      expect(shownValue(control(app.root, 'Ciudad'))).toBe('Medellín');
      expect(shownValue(control(app.root, 'Marca'))).toBe('Mazda');
      expect(shownValue(control(app.root, 'Tipo de documento'))).toBe('Cédula de ciudadanía');
    });

    it('US-04-AC-05 Chile hydration: the searchable and the select-only kinds show their labels', async () => {
      await start('/cl/datos', wizardEntry('CL', { ...CL_VALID_RAW }));
      expect(shownValue(control(app.root, 'Ciudad'))).toBe('Santiago');
      expect(shownValue(control(app.root, 'Marca'))).toBe('Suzuki');
    });

    it('US-04-AC-05 a country that exists only in the content with a select works: the options come from Strapi, nothing in the control is per country', async () => {
      sessionStorage.clear();
      app = await createAppTest();
      app.server.countries = [...seedCountryItems(), strapiCountryItem('PE', 'Perú', 'PEN', 'es-PE', 30, 2)];
      app.server.fields['PE'] = seedStrapiItems('CO').filter((i) => i['key'] === 'documentType');
      await app.open('/pe/datos');
      const tipo = control(app.root, 'Tipo de documento');
      await choose(tipo, 'Cédula de extranjería');
      expect(shownValue(tipo)).toBe('Cédula de extranjería');
      expect(stored('documentType')).toBe('CE');
    });
  });
});
