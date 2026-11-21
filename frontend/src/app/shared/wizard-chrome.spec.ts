import { TestBed } from '@angular/core/testing';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { configureAppTest, createAppTest, type AppTest } from '../../testing/app-harness';
import { day } from '../../testing/clock';
import { normalise } from '../../testing/dom';
import { FOCUSABLE_OR_HEADING, STEP_LABELS, indicatorItems, stepIndicator, wizardHeader } from '../../testing/custom-controls';
import { wizardEntryWithPlan, CL_SPEC_RAW } from '../../testing/plan-fixtures';
import { CO_VALID_RAW, seedCountryItems, strapiCountryItem, toStrapiFieldItem } from '../../testing/seed-fixtures';

/**
 * US-04-AC-13 (step indicator and wizard header) and the header half of US-04-AC-03, as component
 * tests through the real routes. The header and the indicator must be rendered inside the routed
 * tree (a layout route or each page), not only in `App`, because the harness hosts the routes.
 *
 * DOM contract (spec 8.1, US-04-Q-17, ADR-0011):
 *  - the indicator is a list (`ol`) named "Progreso de la cotización", one `li` per step in the order
 *    "Tus datos", "Plan", "Resumen y pago"; the current step carries `aria-current="step"` (on the
 *    `li` or an element inside it) and the visually hidden text "Paso n de 3"; steps before it carry
 *    the hidden text "completado"; neither the indicator nor the header holds a focusable element or
 *    a heading;
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

    it.each(rows)('US-04-AC-13 at %s neither the indicator nor the header contains a focusable element or a heading, and the page keeps one h1', async (address) => {
      await start(co());
      await app.open(address);
      expect(indicator().querySelectorAll(FOCUSABLE_OR_HEADING)).toHaveLength(0);
      const header = wizardHeader(app.root);
      expect(header, 'the wizard header').not.toBeNull();
      expect((header as HTMLElement).querySelectorAll(FOCUSABLE_OR_HEADING)).toHaveLength(0);
      expect(app.root.querySelectorAll('h1')).toHaveLength(1);
    });

    it('US-04-AC-13 the indicator is not a way to navigate: no link and no button among its items (the ways back stay "Atrás", "Editar mis datos" and "Cambiar plan")', async () => {
      await start(co());
      await app.open('/co/resumen');
      expect(indicator().querySelectorAll('a, button')).toHaveLength(0);
      expect(app.path()).toBe('/co/resumen');
    });

    it('US-04-AC-13 the Tab order of step 3 is unchanged: the header and the indicator add no tab stop (first stop is "Editar mis datos")', async () => {
      await start(co());
      await app.open('/co/resumen');
      const stops = Array.from(app.root.querySelectorAll<HTMLElement>('a[href], button, input, select, textarea, [tabindex]:not([tabindex="-1"])')).filter(
        (e) => e.getAttribute('aria-hidden') !== 'true' && !(e as HTMLButtonElement).disabled,
      );
      expect(normalise(stops[0].textContent)).toBe('Editar mis datos');
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
      expect(header.querySelector('h1, h2, h3, h4, h5, h6, a[href]')).toBeNull();
    });

    it.each(rows)('US-04-AC-03 at %s the header flag is an svg with aria-hidden="true", focusable="false", no text and no title', async (address) => {
      await start(address.startsWith('/co') ? co() : cl());
      await app.open(address);
      const flag = (wizardHeader(app.root) as HTMLElement).querySelector('svg');
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
      const colombia = (wizardHeader(app.root) as HTMLElement).querySelector('svg')?.innerHTML ?? '';
      // Chile is another page load (a country is never switched inside the wizard)
      TestBed.resetTestingModule();
      configureAppTest({ today: TODAY });
      await start(cl());
      await app.open('/cl/datos');
      const chile = (wizardHeader(app.root) as HTMLElement).querySelector('svg')?.innerHTML ?? '';
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
      const icon = header.querySelector('svg');
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
});
