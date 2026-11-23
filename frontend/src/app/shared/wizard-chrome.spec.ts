import { TestBed } from '@angular/core/testing';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { configureAppTest, createAppTest, type AppTest } from '../../testing/app-harness';
import { day } from '../../testing/clock';
import { control, normalise, shownValue } from '../../testing/dom';
import { FOCUSABLE_OR_HEADING, STEP_LABELS, backLinksIn, indicatorItems, isBefore, linkNamed, nameOf, stepIndicator, tabStopNames, wizardHeader } from '../../testing/custom-controls';
import { wizardEntryWithPlan, CL_SPEC_RAW } from '../../testing/plan-fixtures';
import { chosenNames } from '../../testing/plan-dom';
import { CO_VALID_INPUT, CO_VALID_RAW, WIZARD_STORAGE_KEY, seedCountryItems, strapiCountryItem, toStrapiFieldItem } from '../../testing/seed-fixtures';

/**
 * US-04-AC-13 (step indicator and wizard header) and the header half of US-04-AC-03, as component
 * tests through the real routes. The header and the indicator must be rendered inside the routed
 * tree (a layout route or each page), not only in `App`, because the harness hosts the routes.
 *
 * DOM contract (spec 8.1, US-04-Q-17, ADR-0011):
 *  - the indicator is a list (`ol`) named "Progreso de la cotización", one `li` per step in the order
 *    "Tus datos", "Plan", "Resumen y pago"; the current step carries `aria-current="step"` (on the
 *    `li` or an element inside it) and the visually hidden text "Paso n de 3"; steps before it carry
 *    the hidden text "completado"; the indicator holds no focusable element and no heading; the header
 *    holds exactly one focusable element, the country chip link (v0.3, AC-28), and no heading;
 *  - the header is a `header` element with the text "Cotizador de seguro de auto" (not a heading, not
 *    a link) and the country chip: the flag (svg, `aria-hidden="true"`, `focusable="false"`, no text)
 *    next to the Strapi country name; the wizard shell sets `data-country-accent` ("co", "cl") on an
 *    element of the page, and sets none for a country with no front-end visuals.
 */

const TODAY = day(2026, 11, 21);
const PRODUCT = 'Cotizador de seguro de auto';

describe('US-04 wizard header and step indicator (component tests through the real routes)', () => {
  let app: AppTest;

  async function start(entry: string): Promise<void> {
    sessionStorage.setItem('quote-wizard', entry);
    app = await createAppTest();
  }
  const co = (): string => wizardEntryWithPlan('CO', CO_VALID_RAW, 'total');
  const cl = (): string => wizardEntryWithPlan('CL', CL_SPEC_RAW, 'protegido');
  const indicator = (): HTMLElement => stepIndicator(app.root) as HTMLElement;
  const items = (): HTMLElement[] => indicatorItems(indicator());

  beforeEach(() => {
    configureAppTest({ today: TODAY });
    vi.spyOn(console, 'warn').mockImplementation(() => undefined);
  });
  afterEach(() => {
    vi.restoreAllMocks();
    sessionStorage.clear();
  });

  describe('US-04-AC-13 the step indicator lists the three steps and marks the current one', () => {
    const rows: [string, number][] = [
      ['/co/datos', 1],
      ['/co/planes', 2],
      ['/co/resumen', 3],
    ];

    it.each(rows)('US-04-AC-13 at %s the indicator lists "Tus datos", "Plan", "Resumen y pago" in this order', async (address) => {
      await start(co());
      await app.open(address);
      expect(stepIndicator(app.root), 'a list named "Progreso de la cotización"').not.toBeNull();
      expect(items()).toHaveLength(3);
      items().forEach((item, i) => {
        expect(normalise(item.textContent), `step ${i + 1}`).toContain(STEP_LABELS[i]);
        for (const other of STEP_LABELS.filter((_, j) => j !== i)) expect(normalise(item.textContent)).not.toContain(other);
      });
    });

    it.each(rows)('US-04-AC-13 at %s only step %s has aria-current="step" and the text "Paso n de 3"; the steps before it are "completado", the others are not', async (address, n) => {
      await start(co());
      await app.open(address);
      const current = indicator().querySelectorAll('[aria-current]');
      expect(current).toHaveLength(1);
      expect(current[0].getAttribute('aria-current')).toBe('step');
      expect(items().indexOf(current[0].closest('li') as HTMLElement)).toBe(n - 1);
      expect(normalise(items()[n - 1].textContent)).toContain(`Paso ${n} de 3`);
      items().forEach((item, i) => {
        const done = normalise(item.textContent).includes('completado');
        expect(done, `step ${i + 1} completed`).toBe(i < n - 1);
      });
    });

    // US-04 spec 11.1.1 (AC-13 v0.3, AC-28): the header now holds the chip link, its only focusable element.
    it.each(rows)('US-04-AC-13 at %s the indicator contains no focusable element and no heading; the header contains exactly one focusable element (the country chip link) and no heading; the page keeps one h1', async (address) => {
      await start(co());
      await app.open(address);
      expect(indicator().querySelectorAll(FOCUSABLE_OR_HEADING)).toHaveLength(0);
      const header = wizardHeader(app.root);
      expect(header, 'the wizard header').not.toBeNull();
      const focusable = Array.from((header as HTMLElement).querySelectorAll(FOCUSABLE_OR_HEADING));
      expect(focusable).toHaveLength(1);
      expect(focusable[0].tagName).toBe('A');
      expect(nameOf(focusable[0])).toMatch(/^Cambiar país \(actual: Colombia\)$/);
      expect((header as HTMLElement).querySelectorAll('h1, h2, h3, h4, h5, h6')).toHaveLength(0);
      expect(app.root.querySelectorAll('h1')).toHaveLength(1);
    });

    it('US-04-AC-13 the indicator is not a way to navigate: no link and no button among its items (the ways back stay "Atrás", "Editar mis datos" and "Cambiar plan")', async () => {
      await start(co());
      await app.open('/co/resumen');
      expect(indicator().querySelectorAll('a, button')).toHaveLength(0);
      expect(app.path()).toBe('/co/resumen');
    });

    // US-04 spec 11.1.1 (AC-28): the first stops of step 3 are the chip link and "Volver a planes".
    it('US-04-AC-13 the Tab order of step 3: the first stops are the country chip link, "Volver a planes", then "Editar mis datos"; the indicator adds no stop', async () => {
      await start(co());
      await app.open('/co/resumen');
      const stops = tabStopNames(app.root);
      expect(stops.slice(0, 3)).toEqual(['Cambiar país (actual: Colombia)', 'Volver a planes', 'Editar mis datos']);
    });
  });

  describe('US-04-AC-03 the wizard header shows the product name and the country, with the flag hidden from assistive technology', () => {
    const rows: [string, string, string][] = [
      ['/co/datos', 'Colombia', 'co'],
      ['/cl/planes', 'Chile', 'cl'],
    ];

    it.each(rows)('US-04-AC-03 at %s the header shows "Cotizador de seguro de auto" and "%s" as text, and the page has one h1', async (address, country) => {
      await start(address.startsWith('/co') ? co() : cl());
      await app.open(address);
      const header = wizardHeader(app.root) as HTMLElement;
      expect(header).not.toBeNull();
      expect(normalise(header.textContent)).toContain(PRODUCT);
      expect(normalise(header.textContent)).toContain(country);
      expect(app.root.querySelectorAll('h1')).toHaveLength(1);
      // v0.3 (AC-28): the product name is not a link or heading; the only link of the header is the country chip
      expect(header.querySelector('h1, h2, h3, h4, h5, h6')).toBeNull();
      expect(Array.from(header.querySelectorAll('a[href]')).map(nameOf)).toEqual([`Cambiar país (actual: ${country})`]);
    });

    it.each(rows)('US-04-AC-03 at %s the header flag is an svg with aria-hidden="true", focusable="false", no text and no title', async (address) => {
      await start(address.startsWith('/co') ? co() : cl());
      await app.open(address);
      const flag = (wizardHeader(app.root) as HTMLElement).querySelector('a svg');
      expect(flag, 'a flag in the header').not.toBeNull();
      expect(flag?.getAttribute('aria-hidden')).toBe('true');
      expect(flag?.getAttribute('focusable')).toBe('false');
      expect(normalise(flag?.textContent)).toBe('');
      expect(flag?.querySelector('title')).toBeNull();
    });

    it.each(rows)('US-04-AC-03 at %s the wizard sets the country accent key "%s" (the colour lives in tokens.css only)', async (address, _country, accent) => {
      await start(address.startsWith('/co') ? co() : cl());
      await app.open(address);
      const holder = document.querySelector('[data-country-accent]');
      expect(holder?.getAttribute('data-country-accent')).toBe(accent);
    });

    it('US-04-AC-03 the flag of Colombia and the flag of Chile in the header are different drawings', async () => {
      await start(co());
      await app.open('/co/datos');
      const colombia = (wizardHeader(app.root) as HTMLElement).querySelector('a svg')?.innerHTML ?? '';
      // Chile is another page load (a country is never switched inside the wizard)
      TestBed.resetTestingModule();
      configureAppTest({ today: TODAY });
      await start(cl());
      await app.open('/cl/datos');
      const chile = (wizardHeader(app.root) as HTMLElement).querySelector('a svg')?.innerHTML ?? '';
      expect(colombia).not.toBe('');
      expect(chile).not.toBe('');
      expect(colombia).not.toBe(chile);
    });

    it('US-04-AC-03 a published country with no front-end visuals ("Perú") shows its name, a hidden neutral icon and the brand accent (no accent key), and no error', async () => {
      sessionStorage.clear();
      app = await createAppTest();
      app.server.countries = [...seedCountryItems(), strapiCountryItem('PE', 'Perú', 'PEN', 'es-PE', 30, 2)];
      app.server.fields['PE'] = [
        toStrapiFieldItem({ key: 'documentNumber', type: 'text', label: 'Documento nacional', isRequired: true, sortOrder: 10, errorMessage: 'Ingresa tu documento.', rules: [] }, 0),
      ];
      await app.open('/pe/datos');
      const header = wizardHeader(app.root) as HTMLElement;
      expect(normalise(header.textContent)).toContain('Perú');
      const icon = header.querySelector('a svg');
      expect(icon, 'the neutral globe icon').not.toBeNull();
      expect(icon?.getAttribute('aria-hidden')).toBe('true');
      expect(document.querySelector('[data-country-accent]')).toBeNull();
      expect(app.root.querySelector('[role="alert"]')).toBeNull();
    });

    it('US-04-AC-03 the unknown-country page is not a wizard page: no header, no indicator, no accent', async () => {
      sessionStorage.clear();
      app = await createAppTest();
      await app.open('/ar/datos');
      expect(wizardHeader(app.root)).toBeNull();
      expect(stepIndicator(app.root)).toBeNull();
      expect(document.querySelector('[data-country-accent]')).toBeNull();
    });
  });

  // -------------------------------------------------------------------------------------------
  describe('US-04-AC-28 back links, the country chip link and the change of country (US-04-BR-21)', () => {
    const step1Only = (): string => wizardEntryWithPlan('CO', CO_VALID_RAW, null);
    const h1 = (): HTMLElement => app.root.querySelector('h1') as HTMLElement;
    const clickLink = async (name: string): Promise<void> => {
      linkNamed(app.root, name).click();
      await app.settle();
    };

    const rows: [string, string, string, () => string][] = [
      ['/co/datos', 'Cambiar país', '/', step1Only],
      ['/co/planes', 'Volver a tus datos', '/co/datos', step1Only],
      ['/co/resumen', 'Volver a planes', '/co/planes', co],
    ];

    it.each(rows)('US-04-AC-28 at %s there is a link named exactly "%s" below the step indicator and above the h1, with a left arrow hidden from assistive technology', async (address, link, target, entry) => {
      await start(entry());
      await app.open(address);
      const anchor = linkNamed(app.root, link);
      expect(anchor.getAttribute('href')).toBe(target);
      expect(normalise(anchor.textContent)).toBe(link);
      const icon = anchor.querySelector('svg');
      expect(icon, 'an arrow icon').not.toBeNull();
      expect(icon?.getAttribute('aria-hidden')).toBe('true');
      expect(normalise(icon?.textContent)).toBe('');
      expect(isBefore(indicator(), anchor), 'after the step indicator').toBe(true);
      expect(isBefore(anchor, h1()), 'before the h1').toBe(true);
    });

    it.each(rows)('US-04-AC-28 at %s only the back link of that step, "%s", is present (not the other two)', async (address, link, _target, entry) => {
      await start(entry());
      await app.open(address);
      expect(backLinksIn(app.root)).toEqual([link]);
    });

    it('US-04-AC-28 "Cambiar país" on step 1 leads to the chooser, and opening "Colombia" again shows the same step 1 values', async () => {
      await start(step1Only());
      await app.open('/co/datos');
      await clickLink('Cambiar país');
      expect(app.path()).toBe('/');
      expect(h1().textContent).toContain('Elige tu país');
      await clickLink('Colombia');
      expect(app.path()).toBe('/co/datos');
      for (const label of ['Nombre completo', 'Número de documento', 'Placa', 'Línea']) {
        expect(shownValue(control(app.root, label)), label).toBe(CO_VALID_INPUT[label]);
      }
      expect(shownValue(control(app.root, 'Fecha de nacimiento'))).toBe('15/05/1990');
    });

    it('US-04-AC-28 "Volver a tus datos" on step 2 leads to /co/datos with the entered values, and the focus is on its h1', async () => {
      await start(step1Only());
      await app.open('/co/planes');
      await clickLink('Volver a tus datos');
      expect(app.path()).toBe('/co/datos');
      expect(shownValue(control(app.root, 'Nombre completo'))).toBe('Ana Prueba Ficticia');
      expect(shownValue(control(app.root, 'Fecha de nacimiento'))).toBe('15/05/1990');
      expect(document.activeElement).toBe(h1());
    });

    it('US-04-AC-28 "Volver a planes" on step 3 leads to /co/planes with "Plan Total" checked, and the focus is on its h1', async () => {
      await start(co());
      await app.open('/co/resumen');
      await clickLink('Volver a planes');
      expect(app.path()).toBe('/co/planes');
      expect(chosenNames(app.root)).toEqual(['Plan Total']);
      expect(document.activeElement).toBe(h1());
    });

    it('US-04-AC-28 the chooser, the unknown-country page and the country list that cannot be loaded have no back link and no chip link', async () => {
      sessionStorage.clear();
      app = await createAppTest();
      await app.open('/');
      expect(backLinksIn(app.root)).toEqual([]);
      expect(Array.from(app.root.querySelectorAll('a')).map(nameOf).filter((n) => n.startsWith('Cambiar país'))).toEqual([]);

      await app.open('/ar/datos');
      expect(backLinksIn(app.root)).toEqual([]);
      expect(Array.from(app.root.querySelectorAll('a')).map(nameOf).filter((n) => n.startsWith('Cambiar país'))).toEqual([]);

      TestBed.resetTestingModule();
      configureAppTest({ today: TODAY });
      app = await createAppTest();
      app.server.countries = 'error';
      await app.open('/co/datos');
      expect(backLinksIn(app.root)).toEqual([]);
      expect(Array.from(app.root.querySelectorAll('a')).map(nameOf).filter((n) => n.startsWith('Cambiar país'))).toEqual([]);
    });

    const chipRows: [string, string, () => string][] = [
      ['/co/datos', 'Colombia', co],
      ['/cl/planes', 'Chile', cl],
    ];

    it.each(chipRows)('US-04-AC-28 at %s the header has exactly one link, named "Cambiar país (actual: %s)", with the address "/", the country name as text and the flag hidden from assistive technology', async (address, country, entry) => {
      await start(entry());
      await app.open(address);
      const header = wizardHeader(app.root) as HTMLElement;
      const links = Array.from(header.querySelectorAll('a'));
      expect(links).toHaveLength(1);
      const chip = links[0];
      expect(nameOf(chip)).toBe(`Cambiar país (actual: ${country})`);
      expect(chip.getAttribute('href')).toBe('/');
      expect(normalise(chip.textContent)).toContain(country);
      const flag = chip.querySelector('svg');
      expect(flag, 'the flag').not.toBeNull();
      expect(flag?.getAttribute('aria-hidden')).toBe('true');
    });

    it('US-04-AC-28 Colombia to Chile: after completing step 1 in Colombia, the chip then "Chile" leads to /cl/datos with every field empty and no Colombian value stored', async () => {
      await start(step1Only());
      await app.open('/co/planes');
      await clickLink('Cambiar país (actual: Colombia)');
      expect(app.path()).toBe('/');
      await clickLink('Chile');
      expect(app.path()).toBe('/cl/datos');
      for (const label of ['RUT', 'Nombre completo', 'Año']) expect(shownValue(control(app.root, label)), label).toBe('');
      const raw = sessionStorage.getItem(WIZARD_STORAGE_KEY);
      const entry = raw === null ? null : JSON.parse(raw);
      expect(entry?.country ?? 'CL').not.toBe('CO');
      for (const colombian of ['Ana Prueba Ficticia', '1012345678', 'ABC123', '3 Touring']) expect(raw ?? '').not.toContain(colombian);
    });

    it('US-04-AC-28 back to the same country: the chip then "Colombia" leads to /co/datos and step 1 shows the entered values', async () => {
      await start(step1Only());
      await app.open('/co/planes');
      await clickLink('Cambiar país (actual: Colombia)');
      await clickLink('Colombia');
      expect(app.path()).toBe('/co/datos');
      expect(shownValue(control(app.root, 'Nombre completo'))).toBe('Ana Prueba Ficticia');
      expect(shownValue(control(app.root, 'Placa'))).toBe('ABC123');
    });

    const tabRows: [string, string, () => string][] = [
      ['/co/datos', 'Cambiar país', step1Only],
      ['/co/planes', 'Volver a tus datos', step1Only],
      ['/co/resumen', 'Volver a planes', co],
    ];

    it.each(tabRows)('US-04-AC-28 at %s the first Tab stop is the country chip link and the second is "%s"', async (address, link, entry) => {
      await start(entry());
      await app.open(address);
      const stops = tabStopNames(app.root);
      expect(stops[0]).toBe('Cambiar país (actual: Colombia)');
      expect(stops[1]).toBe(link);
    });
  });
});
