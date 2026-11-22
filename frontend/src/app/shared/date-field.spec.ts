import { TestBed } from '@angular/core/testing';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { QuoteStore } from '../core/quote-store';
import { configureAppTest, createAppTest, type AppTest } from '../../testing/app-harness';
import { day } from '../../testing/clock';
import { control, describedText, fillForm, leave, normalise, press, settleUi, shownValue, typeInto, typeKeys } from '../../testing/dom';
import {
  buttonNamed,
  calendarDialog,
  calendarTitle,
  columnNames,
  dayCell,
  dayCells,
  focusedDay,
  isDayDisabledInDom,
  openCalendar,
  topLevelOf,
  yearTexts,
} from '../../testing/custom-controls';
import { CO_VALID_INPUT, CO_VALID_RAW, WIZARD_STORAGE_KEY, seedStrapiItems, toStrapiFieldItem, wizardEntry } from '../../testing/seed-fixtures';

/**
 * US-04-AC-08, AC-09, AC-10 (and BR-06): the date field and its calendar, tested through the real step 1
 * page ("Fecha de nacimiento", rule minAge 18), with "today" pinned to 2026-11-21 unless a test says
 * otherwise. jsdom has no real focus trap, no backdrop hit-testing and no `inert`: those are proven in
 * e2e; here the dialog's role, name, `aria-hidden` on the page behind, focus placement, return of
 * focus, keyboard grid, names and disabled days are asserted.
 */

const TODAY = day(2026, 11, 21);
const LABEL = 'Fecha de nacimiento';
const REQUIRED = 'Ingresa tu fecha de nacimiento.';
const UNDERAGE = 'Debes ser mayor de edad (18 años o más) para cotizar.';
/** US-04-BR-18 (v0.3): the message of text that is not a complete, existing date. Code-owned copy (spec 8.1). */
const UNREADABLE = 'Fecha no válida. Usa el formato dd/mm/aaaa.';

/** The full date as the calendar names a day, from the locale tag (day numeric, month long, year): "15 de mayo de 1990". */
const longDate = (tag: string, y: number, m: number, d: number): string => new Intl.DateTimeFormat(tag, { day: 'numeric', month: 'long', year: 'numeric' }).format(new Date(y, m - 1, d));

describe('US-04 date field and calendar (component tests through the real routes)', () => {
  let app: AppTest;

  async function start(address: string, stored?: string): Promise<void> {
    if (stored !== undefined) sessionStorage.setItem(WIZARD_STORAGE_KEY, stored);
    app = await createAppTest();
    await app.open(address);
  }
  const store = (): QuoteStore => TestBed.inject(QuoteStore);
  const stored = (key: string): string => String(store().values()[key] ?? '');
  const date = (label = LABEL): HTMLInputElement => control(app.root, label) as HTMLInputElement;
  const calendarButton = (label = LABEL): HTMLButtonElement => buttonNamed(app.root, `Elegir fecha: ${label}`);
  const typeDate = async (text: string, label = LABEL): Promise<void> => {
    typeInto(date(label), text);
    await settleUi();
  };
  const leaveDate = async (label = LABEL): Promise<void> => {
    leave(date(label));
    await app.settle();
  };
  const dialog = (): HTMLElement => calendarDialog() as HTMLElement;
  const clickIn = async (name: string): Promise<void> => {
    buttonNamed(dialog(), name).click();
    await settleUi();
  };
  const reopenWith = (today: Date): void => {
    TestBed.resetTestingModule();
    sessionStorage.clear();
    configureAppTest({ today });
  };

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
  describe('US-04-AC-08 typed date: every row of the AC table', () => {
    const rows: [string, string, string, string | null][] = [
      ['15/05/1990', '15/05/1990', '1990-05-15', null],
      ['5/5/1990', '05/05/1990', '1990-05-05', null],
      ['15-05-1990', '15/05/1990', '1990-05-15', null],
      ['15.05.1990', '15/05/1990', '1990-05-15', null],
      ['15051990', '15/05/1990', '1990-05-15', null],
      ['29/02/2000', '29/02/2000', '2000-02-29', null],
      ['29/02/2001', '29/02/2001', '', UNREADABLE],
      ['31/04/1990', '31/04/1990', '', UNREADABLE],
      ['15/05/199', '15/05/199', '', UNREADABLE],
      ['15/05/90', '15/05/90', '', UNREADABLE],
      ['01/03/2010', '01/03/2010', '2010-03-01', UNDERAGE],
    ];

    it.each(rows)('US-04-AC-08 typing "%s" and leaving shows "%s", the state holds "%s", and the error is %s', async (typed, shown, storedIso, message) => {
      await start('/co/datos');
      await typeDate(typed);
      await leaveDate();
      expect(date().value).toBe(shown);
      expect(stored('birthDate')).toBe(storedIso);
      if (message === null) {
        expect(date().getAttribute('aria-invalid')).not.toBe('true');
        expect(describedText(date())).not.toContain(REQUIRED);
        expect(describedText(date())).not.toContain(UNDERAGE);
      } else {
        expect(date().getAttribute('aria-invalid')).toBe('true');
        expect(describedText(date())).toContain(message);
      }
    });

    it('US-04-AC-08 the date is typed as dd/mm/aaaa for every country, independent of the browser locale: Chile reads "15/05/1990" as 15 May', async () => {
      await start('/cl/datos');
      await typeDate('15/05/1990');
      await leaveDate();
      expect(date().value).toBe('15/05/1990');
      expect(stored('birthDate')).toBe('1990-05-15');
    });

    it('US-04-AC-08 unreadable text is the former badInput: stored "" while the text stays visible, also after leaving and after a failed "Continuar", and "Continuar" does not move on', async () => {
      await start('/co/datos');
      // every other required field is valid, so the unreadable date is the only invalid field (ADR-0004: focus on the first invalid one)
      await fillForm(app.root, { ...CO_VALID_INPUT, [LABEL]: null });
      await typeDate('15/05/199');
      await leaveDate();
      expect(stored('birthDate')).toBe('');
      expect(date().value).toBe('15/05/199');
      expect(describedText(date())).toContain(UNREADABLE);
      const form = app.root.querySelector('form') as HTMLFormElement;
      form.requestSubmit();
      await app.settle();
      expect(app.path()).toBe('/co/datos');
      expect(date().value).toBe('15/05/199');
      expect(describedText(date())).toContain(UNREADABLE);
      expect(document.activeElement).toBe(date());
    });

    it('US-04-AC-08 a stored date is shown in the display format, with no error', async () => {
      await start('/co/datos', wizardEntry('CO', { ...CO_VALID_RAW }));
      expect(date().value).toBe('15/05/1990');
      expect(shownValue(date())).toBe('15/05/1990');
      expect(date().getAttribute('aria-invalid')).not.toBe('true');
      expect(stored('birthDate')).toBe('1990-05-15');
    });

    it('US-04-AC-08 the text box has the placeholder "dd/mm/aaaa" and the hint "Formato: dd/mm/aaaa" is part of its accessible description', async () => {
      await start('/co/datos');
      expect(date().getAttribute('placeholder')).toBe('dd/mm/aaaa');
      expect(describedText(date())).toContain('Formato: dd/mm/aaaa');
    });

    it('US-04-AC-08 typing "15" leaves "15" (a "/" is shown only once the next group has a digit; the mask itself is AC-25)', async () => {
      await start('/co/datos');
      await typeDate('15');
      expect(date().value).toBe('15');
    });

    it('US-04-AC-08 an optional date "Fecha de revisión" typed "10/13/2026" blocks "Continuar" with the unreadable-date message (US-04-Q-24, not its own errorMessage), stays on step 1 with the focus on it, and the state holds ""', async () => {
      sessionStorage.setItem(WIZARD_STORAGE_KEY, wizardEntry('CO', { ...CO_VALID_RAW }));
      app = await createAppTest();
      app.server.fields['CO'] = [
        ...seedStrapiItems('CO'),
        toStrapiFieldItem({ key: 'inspectionDate', type: 'date', label: 'Fecha de revisión', isRequired: false, sortOrder: 95, errorMessage: 'Ingresa una fecha válida.', rules: [] }, 90),
      ];
      await app.open('/co/datos');
      await typeDate('10/13/2026', 'Fecha de revisión');
      (app.root.querySelector('form') as HTMLFormElement).requestSubmit();
      await app.settle();
      expect(app.path()).toBe('/co/datos');
      expect(describedText(date('Fecha de revisión'))).toContain(UNREADABLE);
      expect(describedText(date('Fecha de revisión'))).not.toContain('Ingresa una fecha válida.');
      expect(document.activeElement).toBe(date('Fecha de revisión'));
      expect(stored('inspectionDate')).toBe('');
    });
  });

  // -------------------------------------------------------------------------------------------
  describe('US-04-AC-25 typed date: the mask, key by key (Colombia)', () => {
    const rows: [string, string][] = [
      ['15051990', '15/05/1990'],
      ['15/05/1990', '15/05/1990'],
      ['15-05-1990', '15/05/1990'],
      ['150', '15/0'],
      ['5/5/1990', '05/05/1990'],
      ['15a05b1990', '15/05/1990'],
      ['150519901', '15/05/1990'],
    ];

    it.each(rows)('US-04-AC-25 typing the keys "%s" one at a time shows "%s"', async (keys, shown) => {
      await start('/co/datos');
      await typeKeys(date(), keys);
      expect(date().value).toBe(shown);
    });

    it('US-04-AC-25 the text box has inputmode numeric, maxlength 10 and the placeholder "dd/mm/aaaa"', async () => {
      await start('/co/datos');
      expect(date().getAttribute('inputmode')).toBe('numeric');
      expect(date().getAttribute('maxlength')).toBe('10');
      expect(date().getAttribute('placeholder')).toBe('dd/mm/aaaa');
    });

    it('US-04-AC-25 Backspace over a separator: from "15/05/1990" at the end, 4 Backspaces show "15/05" and a fifth shows "15/0"', async () => {
      await start('/co/datos');
      await typeDate('15/05/1990');
      const backspace = async (): Promise<void> => {
        // the browser removes the last character, then the input event reaches the mask
        typeInto(date(), date().value.slice(0, -1));
        await settleUi();
      };
      for (let i = 0; i < 4; i++) await backspace();
      expect(date().value).toBe('15/05');
      await backspace();
      expect(date().value).toBe('15/0');
    });

    it.each([
      ['15/05/1990', '15/05/1990'],
      ['15-05-1990', '15/05/1990'],
      ['15.05.1990', '15/05/1990'],
      ['15051990', '15/05/1990'],
      ['5/5/1990', '05/05/1990'],
    ])('US-04-AC-25 pasting "%s" (one input event with the whole text) shows "%s"', async (pasted, shown) => {
      await start('/co/datos');
      await typeDate(pasted);
      expect(date().value).toBe(shown);
    });

    const messageRows: [string, string, string, string | null][] = [
      ['15051990', '15/05/1990', '1990-05-15', null],
      ['29202001', '29/20/2001', '', UNREADABLE],
      ['31021990', '31/02/1990', '', UNREADABLE],
      ['29022001', '29/02/2001', '', UNREADABLE],
      ['1505199', '15/05/199', '', UNREADABLE],
      ['1505', '15/05', '', UNREADABLE],
      ['', '', '', REQUIRED],
      ['01032010', '01/03/2010', '2010-03-01', UNDERAGE],
    ];

    it.each(messageRows)('US-04-AC-25 typing "%s" and leaving shows "%s", the state holds "%s", and the message is %s', async (typed, shown, storedIso, message) => {
      await start('/co/datos');
      await typeKeys(date(), typed);
      await leaveDate();
      expect(date().value).toBe(shown);
      expect(stored('birthDate')).toBe(storedIso);
      if (message === null) {
        expect(date().getAttribute('aria-invalid')).not.toBe('true');
        expect(describedText(date())).not.toContain(UNREADABLE);
      } else {
        expect(date().getAttribute('aria-invalid')).toBe('true');
        expect(describedText(date())).toContain(message);
      }
      if (message !== UNREADABLE) expect(describedText(date())).not.toContain(UNREADABLE);
    });

    it('US-04-AC-25 an unreadable date never shows the required message (the old "Ingresa tu fecha de nacimiento." for "29/20/2001")', async () => {
      await start('/co/datos');
      await typeKeys(date(), '29202001');
      await leaveDate();
      expect(describedText(date())).not.toContain(REQUIRED);
    });

    it('US-04-AC-25 no message while typing: "150" without leaving the field shows no message and is not aria-invalid', async () => {
      await start('/co/datos');
      await typeKeys(date(), '150');
      expect(date().value).toBe('15/0');
      expect(date().getAttribute('aria-invalid')).not.toBe('true');
      expect(describedText(date())).not.toContain(UNREADABLE);
      expect(describedText(date())).not.toContain(REQUIRED);
    });

    it('US-04-AC-25 an invalid date blocks "Continuar": it stays on /co/datos, the focus is on the date box and it is described by the message', async () => {
      await start('/co/datos');
      await fillForm(app.root, { ...CO_VALID_INPUT, [LABEL]: null });
      await typeKeys(date(), '29202001');
      (app.root.querySelector('form') as HTMLFormElement).requestSubmit();
      await app.settle();
      expect(app.path()).toBe('/co/datos');
      expect(document.activeElement).toBe(date());
      expect(describedText(date())).toContain(UNREADABLE);
      expect(stored('birthDate')).toBe('');
    });

    it('US-04-AC-25 a typed date completes step 1: "15/05/1990" typed key by key (no calendar) reaches /co/planes with birthDate 1990-05-15', async () => {
      await start('/co/datos');
      await fillForm(app.root, { ...CO_VALID_INPUT, [LABEL]: null });
      await typeKeys(date(), '15/05/1990');
      await leaveDate();
      (app.root.querySelector('form') as HTMLFormElement).requestSubmit();
      await app.settle();
      expect(app.path()).toBe('/co/planes');
      expect(stored('birthDate')).toBe('1990-05-15');
    });
  });

  // -------------------------------------------------------------------------------------------
  describe('US-04-AC-09 calendar: choose a birth date (Chile, today 2026-11-21)', () => {
    it('US-04-AC-09 "Elegir fecha" opens a modal dialog named by its visible month and year "noviembre de 2008", with the focus on 21 de noviembre de 2008 (the latest selectable day)', async () => {
      await start('/cl/datos');
      const opened = await openCalendar(app.root, LABEL);
      expect(opened.getAttribute('role')).toBe('dialog');
      expect(opened.getAttribute('aria-modal')).toBe('true');
      expect(calendarTitle(opened)).toBe('noviembre de 2008');
      expect(focusedDay()).toBe('21 de noviembre de 2008');
      expect(opened.querySelector('[role="grid"]')).not.toBeNull();
    });

    it('US-04-AC-09 / US-04-BR-08 "Elegir año" then 1990 shows (month and day names from Intl with the country locale) "noviembre de 1990"; "Mes anterior" 6 times shows "mayo de 1990"; choosing the day 15 closes the dialog, returns the focus to "Elegir fecha" and stores 1990-05-15', async () => {
      await start('/cl/datos');
      await openCalendar(app.root, LABEL);
      await clickIn('Elegir año');
      const year = Array.from(dialog().querySelectorAll<HTMLElement>('[role="option"]')).find((o) => normalise(o.textContent) === '1990');
      expect(year, 'the year 1990 is offered').toBeDefined();
      (year as HTMLElement).click();
      await settleUi();
      expect(calendarTitle(dialog())).toBe('noviembre de 1990');
      for (let i = 0; i < 6; i++) await clickIn('Mes anterior');
      expect(calendarTitle(dialog())).toBe('mayo de 1990');
      (dayCell(dialog(), '15 de mayo de 1990') as HTMLElement).click();
      await app.settle();
      expect(calendarDialog()).toBeNull();
      expect(document.activeElement).toBe(calendarButton());
      expect(date().value).toBe('15/05/1990');
      expect(stored('birthDate')).toBe('1990-05-15');
    });

    it('US-04-AC-09 "Mes siguiente" moves forward one month and "Mes anterior" back, crossing the year', async () => {
      await start('/cl/datos', wizardEntry('CL', { birthDate: '1990-01-15' }));
      await openCalendar(app.root, LABEL);
      expect(calendarTitle(dialog())).toBe('enero de 1990');
      await clickIn('Mes anterior');
      expect(calendarTitle(dialog())).toBe('diciembre de 1989');
      await clickIn('Mes siguiente');
      await clickIn('Mes siguiente');
      expect(calendarTitle(dialog())).toBe('febrero de 1990');
    });

    it('US-04-AC-09 the year selector is a listbox of years with the current year selected; choosing one returns to the grid', async () => {
      await start('/cl/datos', wizardEntry('CL', { birthDate: '1990-05-15' }));
      await openCalendar(app.root, LABEL);
      await clickIn('Elegir año');
      const selected = Array.from(dialog().querySelectorAll('[role="option"][aria-selected="true"]')).map((o) => normalise(o.textContent));
      expect(selected).toEqual(['1990']);
      (Array.from(dialog().querySelectorAll<HTMLElement>('[role="option"]')).find((o) => normalise(o.textContent) === '1985') as HTMLElement).click();
      await settleUi();
      expect(dialog().querySelector('[role="grid"]')).not.toBeNull();
      expect(calendarTitle(dialog())).toBe('mayo de 1985');
    });

    it('US-04-AC-09 "Cerrar" closes the dialog without changing the value and returns the focus to "Elegir fecha"', async () => {
      await start('/cl/datos', wizardEntry('CL', { birthDate: '1990-05-15' }));
      await openCalendar(app.root, LABEL);
      await clickIn('Cerrar');
      expect(calendarDialog()).toBeNull();
      expect(document.activeElement).toBe(calendarButton());
      expect(date().value).toBe('15/05/1990');
      expect(stored('birthDate')).toBe('1990-05-15');
    });

    it('US-04-AC-09 with a stored valid date the calendar opens on it (initial focus: the stored date)', async () => {
      await start('/cl/datos', wizardEntry('CL', { birthDate: '1985-03-20' }));
      await openCalendar(app.root, LABEL);
      expect(calendarTitle(dialog())).toBe('marzo de 1985');
      expect(focusedDay()).toBe('20 de marzo de 1985');
    });

    it('US-04-AC-09 the page behind the dialog is hidden from assistive technology (aria-hidden="true" on the siblings of the overlay container) and is visible again after closing', async () => {
      await start('/cl/datos');
      const behind = topLevelOf(app.root) as Element;
      expect(behind.getAttribute('aria-hidden')).not.toBe('true');
      await openCalendar(app.root, LABEL);
      expect(behind.getAttribute('aria-hidden')).toBe('true');
      expect(topLevelOf(dialog())?.getAttribute('aria-hidden')).not.toBe('true');
      await press(document.activeElement as Element, 'Escape');
      expect(calendarDialog()).toBeNull();
      expect(behind.getAttribute('aria-hidden')).not.toBe('true');
    });

    it('US-04-AC-09 the dialog adds no heading and no label to the page (the month and year is text, the outline stays h1 only)', async () => {
      await start('/cl/datos');
      const labelsBefore = document.querySelectorAll('label').length;
      await openCalendar(app.root, LABEL);
      expect(Array.from(document.querySelectorAll('h1, h2, h3, h4, h5, h6')).map((h) => h.tagName.toLowerCase())).toEqual(['h1']);
      expect(document.querySelectorAll('label').length).toBe(labelsBefore);
    });

    it('US-04-AC-09 "Elegir fecha" is the one new Tab stop: a button named "Elegir fecha: Fecha de nacimiento" right after the date text box', async () => {
      await start('/cl/datos');
      const stops = Array.from(app.root.querySelectorAll<HTMLElement>('input, button, select, textarea, a[href]')).filter((e) => e.getAttribute('aria-hidden') !== 'true');
      const at = stops.indexOf(date());
      expect(stops[at + 1]).toBe(calendarButton());
      expect(calendarButton().getAttribute('type')).toBe('button');
    });
  });

  // -------------------------------------------------------------------------------------------
  describe('US-04-AC-09 calendar keyboard: every row of the AC table', () => {
    interface Row {
      tag: string;
      country: string;
      from: [number, number, number];
      key: string;
      shift?: boolean;
      to: [number, number, number];
    }
    const rows: Row[] = [
      { tag: 'es-CL', country: 'cl', from: [1990, 5, 15], key: 'ArrowRight', to: [1990, 5, 16] },
      { tag: 'es-CL', country: 'cl', from: [1990, 5, 15], key: 'ArrowLeft', to: [1990, 5, 14] },
      { tag: 'es-CL', country: 'cl', from: [1990, 5, 15], key: 'ArrowDown', to: [1990, 5, 22] },
      { tag: 'es-CL', country: 'cl', from: [1990, 5, 15], key: 'ArrowUp', to: [1990, 5, 8] },
      { tag: 'es-CL', country: 'cl', from: [1990, 5, 15], key: 'Home', to: [1990, 5, 14] },
      { tag: 'es-CL', country: 'cl', from: [1990, 5, 15], key: 'End', to: [1990, 5, 20] },
      { tag: 'es-CO', country: 'co', from: [1990, 5, 15], key: 'Home', to: [1990, 5, 13] },
      { tag: 'es-CO', country: 'co', from: [1990, 5, 15], key: 'End', to: [1990, 5, 19] },
      { tag: 'es-CL', country: 'cl', from: [1990, 5, 15], key: 'PageDown', to: [1990, 6, 15] },
      { tag: 'es-CL', country: 'cl', from: [1990, 5, 31], key: 'PageUp', to: [1990, 4, 30] },
      { tag: 'es-CL', country: 'cl', from: [1990, 5, 15], key: 'PageUp', shift: true, to: [1989, 5, 15] },
      { tag: 'es-CL', country: 'cl', from: [2000, 2, 29], key: 'PageDown', shift: true, to: [2001, 2, 28] },
    ];
    const pad = (n: number): string => String(n).padStart(2, '0');
    const iso = ([y, m, d]: [number, number, number]): string => `${y}-${pad(m)}-${pad(d)}`;

    it.each(rows)('US-04-AC-09 $country, calendar on $from: $key (shift $shift) moves the focus to $to', async (row) => {
      await start(`/${row.country}/datos`, wizardEntry(row.country.toUpperCase(), { birthDate: iso(row.from) }));
      await openCalendar(app.root, LABEL);
      expect(focusedDay()).toBe(longDate(row.tag, ...row.from));
      await press(document.activeElement as Element, row.key, { shift: !!row.shift });
      expect(focusedDay()).toBe(longDate(row.tag, ...row.to));
      expect(calendarDialog(), 'the dialog stays open').not.toBeNull();
    });

    it('US-04-AC-09 Enter on the focused day closes the dialog, the field shows "15/05/1990" and the focus returns to "Elegir fecha"', async () => {
      await start('/cl/datos', wizardEntry('CL', { birthDate: '1990-05-15' }));
      await openCalendar(app.root, LABEL);
      await press(document.activeElement as Element, 'Enter');
      expect(calendarDialog()).toBeNull();
      expect(date().value).toBe('15/05/1990');
      expect(stored('birthDate')).toBe('1990-05-15');
      expect(document.activeElement).toBe(calendarButton());
    });

    it('US-04-AC-09 Enter after moving the focus (ArrowRight) chooses the new day: "16/05/1990"', async () => {
      await start('/cl/datos', wizardEntry('CL', { birthDate: '1990-05-15' }));
      await openCalendar(app.root, LABEL);
      await press(document.activeElement as Element, 'ArrowRight');
      await press(document.activeElement as Element, 'Enter');
      expect(date().value).toBe('16/05/1990');
      expect(stored('birthDate')).toBe('1990-05-16');
    });

    it('US-04-AC-09 Space also chooses the focused day', async () => {
      await start('/cl/datos', wizardEntry('CL', { birthDate: '1990-05-15' }));
      await openCalendar(app.root, LABEL);
      await press(document.activeElement as Element, 'ArrowLeft');
      await press(document.activeElement as Element, ' ');
      expect(calendarDialog()).toBeNull();
      expect(stored('birthDate')).toBe('1990-05-14');
    });

    it('US-04-AC-09 Escape closes the dialog, the field value is unchanged and the focus returns to "Elegir fecha"', async () => {
      await start('/cl/datos', wizardEntry('CL', { birthDate: '1990-05-15' }));
      await openCalendar(app.root, LABEL);
      await press(document.activeElement as Element, 'ArrowRight');
      await press(document.activeElement as Element, 'Escape');
      expect(calendarDialog()).toBeNull();
      expect(date().value).toBe('15/05/1990');
      expect(stored('birthDate')).toBe('1990-05-15');
      expect(document.activeElement).toBe(calendarButton());
    });

    it('US-04-AC-09 the arrows move the focus across the month: ArrowRight from 31/05/1990 shows "junio de 1990" with 1 de junio de 1990 focused', async () => {
      await start('/cl/datos', wizardEntry('CL', { birthDate: '1990-05-31' }));
      await openCalendar(app.root, LABEL);
      await press(document.activeElement as Element, 'ArrowRight');
      expect(focusedDay()).toBe('1 de junio de 1990');
      expect(calendarTitle(dialog())).toBe('junio de 1990');
    });
  });

  // -------------------------------------------------------------------------------------------
  describe('US-04-AC-09 calendar names and first day of the week (from the country locale, CLDR)', () => {
    const outlines: [string, string, string[]][] = [
      ['Colombia', '/co/datos', ['domingo', 'lunes', 'martes', 'miércoles', 'jueves', 'viernes', 'sábado']],
      ['Chile', '/cl/datos', ['lunes', 'martes', 'miércoles', 'jueves', 'viernes', 'sábado', 'domingo']],
    ];

    it.each(outlines)('US-04-AC-09 %s: the grid column headers expose the full Spanish day names in the order %j', async (_country, address, order) => {
      await start(address, wizardEntry(address.startsWith('/co') ? 'CO' : 'CL', { birthDate: '1990-05-15' }));
      await openCalendar(app.root, LABEL);
      expect(columnNames(dialog())).toEqual(order);
    });

    it.each(outlines)('US-04-AC-09 %s: each day cell is named by its full date, the selected day has aria-selected="true" and is the only one', async (_country, address) => {
      await start(address, wizardEntry(address.startsWith('/co') ? 'CO' : 'CL', { birthDate: '1990-05-15' }));
      await openCalendar(app.root, LABEL);
      const names = dayCells(dialog()).map((c) => normalise(c.getAttribute('aria-label')));
      expect(names).toHaveLength(31);
      expect(names[0]).toBe('1 de mayo de 1990');
      expect(names[14]).toBe('15 de mayo de 1990');
      expect(names[30]).toBe('31 de mayo de 1990');
      const selected = dayCells(dialog()).filter((c) => c.getAttribute('aria-selected') === 'true');
      expect(selected.map((c) => c.getAttribute('aria-label'))).toEqual(['15 de mayo de 1990']);
    });

    it('US-04-AC-09 the grid starts the week on the locale\'s first day: "1 de mayo de 1990" (a Tuesday) is the third cell of its row in Colombia (Sunday first) and the second in Chile (Monday first)', async () => {
      for (const [address, entry, column] of [
        ['/co/datos', 'CO', 2],
        ['/cl/datos', 'CL', 1],
      ] as const) {
        TestBed.resetTestingModule();
        sessionStorage.clear();
        configureAppTest({ today: TODAY });
        await start(address, wizardEntry(entry, { birthDate: '1990-05-15' }));
        await openCalendar(app.root, LABEL);
        const first = dayCell(dialog(), '1 de mayo de 1990') as HTMLElement;
        expect(Array.from((first.parentElement as HTMLElement).children).indexOf(first), address).toBe(column);
      }
    });
  });

  // -------------------------------------------------------------------------------------------
  describe('US-04-AC-10 days disabled by the rules (minAge 18, pinned clock)', () => {
    it('US-04-AC-10 on 2026-11-21 the calendar opens on "noviembre de 2008": 21 de noviembre (turns 18 today) is enabled and 22 de noviembre is disabled (aria-disabled="true")', async () => {
      await start('/cl/datos');
      await openCalendar(app.root, LABEL);
      expect(isDayDisabledInDom(dayCell(dialog(), '21 de noviembre de 2008') as HTMLElement)).toBe(false);
      expect(isDayDisabledInDom(dayCell(dialog(), '22 de noviembre de 2008') as HTMLElement)).toBe(true);
      expect(isDayDisabledInDom(dayCell(dialog(), '1 de noviembre de 2008') as HTMLElement)).toBe(false);
    });

    it('US-04-AC-10 a disabled day cannot be chosen by click or Enter: the dialog stays open and nothing is stored', async () => {
      await start('/cl/datos');
      await openCalendar(app.root, LABEL);
      (dayCell(dialog(), '22 de noviembre de 2008') as HTMLElement).click();
      await settleUi();
      expect(calendarDialog()).not.toBeNull();
      expect(stored('birthDate')).toBe('');
      await press(document.activeElement as Element, 'ArrowRight'); // reachable with the arrows
      expect(focusedDay()).toBe('22 de noviembre de 2008');
      await press(document.activeElement as Element, 'Enter');
      expect(calendarDialog()).not.toBeNull();
      expect(stored('birthDate')).toBe('');
      expect(date().value).toBe('');
    });

    it('US-04-AC-10 on 2026-02-28 the day 29 de febrero de 2008 is disabled (its 18th anniversary is on 1 March in a non-leap year) and 28 de febrero is enabled', async () => {
      reopenWith(day(2026, 2, 28));
      await start('/cl/datos');
      await openCalendar(app.root, LABEL);
      expect(calendarTitle(dialog())).toBe('febrero de 2008');
      expect(focusedDay()).toBe('28 de febrero de 2008');
      expect(isDayDisabledInDom(dayCell(dialog(), '28 de febrero de 2008') as HTMLElement)).toBe(false);
      expect(isDayDisabledInDom(dayCell(dialog(), '29 de febrero de 2008') as HTMLElement)).toBe(true);
    });

    it('US-04-AC-10 on 2026-03-01 the day 29 de febrero de 2008 is enabled and can be chosen: "29/02/2008" is stored as 2008-02-29', async () => {
      reopenWith(day(2026, 3, 1));
      await start('/cl/datos');
      await openCalendar(app.root, LABEL);
      expect(focusedDay()).toBe('1 de marzo de 2008');
      await press(document.activeElement as Element, 'ArrowLeft');
      expect(focusedDay()).toBe('29 de febrero de 2008');
      expect(isDayDisabledInDom(dayCell(dialog(), '29 de febrero de 2008') as HTMLElement)).toBe(false);
      await press(document.activeElement as Element, 'Enter');
      expect(calendarDialog()).toBeNull();
      expect(date().value).toBe('29/02/2008');
      expect(stored('birthDate')).toBe('2008-02-29');
      expect(date().getAttribute('aria-invalid')).not.toBe('true');
    });

    it('US-04-AC-10 the year selector with minAge 18 runs from 1906 (Y-120) to 2008 (the year of the latest valid date), and offers no later year', async () => {
      await start('/cl/datos');
      await openCalendar(app.root, LABEL);
      await clickIn('Elegir año');
      const years = yearTexts(dialog());
      expect(years[0]).toBe('1906');
      expect(years[years.length - 1]).toBe('2008');
      expect(years).not.toContain('2009');
      expect(years).toHaveLength(2008 - 1906 + 1);
    });

    it('US-04-AC-10 typing a disabled day keeps the validation: "22/11/2008" shows "Debes ser mayor de edad (18 años o más) para cotizar." and the state holds 2008-11-22', async () => {
      await start('/co/datos');
      await typeDate('22/11/2008');
      await leaveDate();
      expect(describedText(date())).toContain(UNDERAGE);
      expect(date().getAttribute('aria-invalid')).toBe('true');
      expect(stored('birthDate')).toBe('2008-11-22');
    });

    it('US-04-AC-10 a date field without minAge ("Fecha de revisión", no rules): no day is disabled, the calendar opens on today and the year selector offers 1906 to 2036', async () => {
      sessionStorage.clear();
      app = await createAppTest();
      app.server.fields['CO'] = [
        ...seedStrapiItems('CO'),
        toStrapiFieldItem({ key: 'inspectionDate', type: 'date', label: 'Fecha de revisión', isRequired: false, sortOrder: 95, errorMessage: '', rules: [] }, 90),
      ];
      await app.open('/co/datos');
      await openCalendar(app.root, 'Fecha de revisión');
      expect(calendarTitle(dialog())).toBe('noviembre de 2026');
      expect(focusedDay()).toBe('21 de noviembre de 2026');
      expect(dayCells(dialog()).filter(isDayDisabledInDom)).toHaveLength(0);
      await clickIn('Elegir año');
      const years = yearTexts(dialog());
      expect(years[0]).toBe('1906');
      expect(years[years.length - 1]).toBe('2036');
    });
  });

  // -------------------------------------------------------------------------------------------
  describe('US-04-R1-F08 Escape in the year list returns to the day grid', () => {
    it('US-04-R1-F08 the first Escape closes the year list and shows the grid again with the focus on the focused day; the dialog stays open; a second Escape closes the dialog and returns the focus to "Elegir fecha"', async () => {
      await start('/cl/datos', wizardEntry('CL', { birthDate: '1990-05-15' }));
      await openCalendar(app.root, LABEL);
      expect(focusedDay()).toBe('15 de mayo de 1990');
      await clickIn('Elegir año');
      expect(dialog().querySelector('[role="grid"]')).toBeNull();
      expect(yearTexts(dialog()).length).toBeGreaterThan(0);

      await press(document.activeElement as Element, 'Escape');
      expect(calendarDialog(), 'the dialog stays open').not.toBeNull();
      expect(yearTexts(dialog())).toEqual([]);
      expect(dialog().querySelector('[role="grid"]')).not.toBeNull();
      expect(calendarTitle(dialog())).toBe('mayo de 1990');
      expect(focusedDay()).toBe('15 de mayo de 1990');
      expect(stored('birthDate')).toBe('1990-05-15');

      await press(document.activeElement as Element, 'Escape');
      expect(calendarDialog()).toBeNull();
      expect(document.activeElement).toBe(calendarButton());
      expect(date().value).toBe('15/05/1990');
    });
  });
});
