import { TestBed } from '@angular/core/testing';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { configureAppTest, createAppTest, type AppTest } from '../../../testing/app-harness';
import { alertTexts, button, normalise } from '../../../testing/dom';
import { STEP_LABELS, indicatorItems, stepIndicator, tabStopNames } from '../../../testing/custom-controls';
import { wizardEntryWithPlan } from '../../../testing/plan-fixtures';
import { CO_VALID_RAW, seedCountryItems, strapiCountryItem } from '../../../testing/seed-fixtures';

/**
 * Component tests of the country chooser (`/`) for US-04: flags next to the country names
 * (US-04-AC-03, ADR-0011), the neutral fallback for a country with no front-end visuals, and the
 * skeleton with the live text kept (US-04-AC-15). The accessible name of every link stays the
 * country name (US-01-AC-17 keeps its own tests in quote-form-page.spec.ts).
 */

describe('US-04 country chooser (component tests through the real routes)', () => {
  let app: AppTest;

  async function start(): Promise<AppTest> {
    app = await createAppTest();
    return app;
  }
  const links = (): HTMLAnchorElement[] => Array.from(app.root.querySelectorAll('a'));

  beforeEach(() => {
    configureAppTest();
    vi.spyOn(console, 'warn').mockImplementation(() => undefined);
  });
  afterEach(() => {
    vi.useRealTimers();
    vi.restoreAllMocks();
    sessionStorage.clear();
  });

  describe('US-04-AC-03 flags and country context on the chooser', () => {
    it('US-04-AC-03 each link shows a flag next to its country name: an svg hidden from assistive technology, not focusable, with no text', async () => {
      await start();
      await app.open('/');
      expect(links().map((a) => normalise(a.textContent))).toEqual(['Colombia', 'Chile']);
      for (const link of links()) {
        const flag = link.querySelector('svg');
        expect(flag, normalise(link.textContent)).not.toBeNull();
        expect(flag?.getAttribute('aria-hidden')).toBe('true');
        expect(flag?.getAttribute('focusable')).toBe('false');
        expect(flag?.getAttribute('tabindex')).toBeNull();
        expect(normalise(flag?.textContent)).toBe('');
        expect(flag?.querySelector('title')).toBeNull();
      }
    });

    it('US-04-AC-03 the accessible name of the links is exactly "Colombia" and "Chile" (no aria-label, no extra text from the flag)', async () => {
      await start();
      await app.open('/');
      for (const [i, name] of ['Colombia', 'Chile'].entries()) {
        const link = links()[i];
        expect(normalise(link.textContent)).toBe(name);
        expect(link.getAttribute('aria-label') ?? name).toBe(name);
        expect(link.getAttribute('aria-labelledby')).toBeNull();
      }
    });

    it('US-04-AC-03 the flags of the two countries are different drawings', async () => {
      await start();
      await app.open('/');
      const [co, cl] = links().map((a) => a.querySelector('svg')?.innerHTML ?? '');
      expect(co).not.toBe('');
      expect(cl).not.toBe('');
      expect(co).not.toBe(cl);
    });

    it('US-04-AC-03 a published country with no front-end visuals ("Perú", code PE) is listed with a hidden neutral icon, links to its own step 1, and there is no error', async () => {
      await start();
      app.server.countries = [...seedCountryItems(), strapiCountryItem('PE', 'Perú', 'PEN', 'es-PE', 30, 2)];
      await app.open('/');
      expect(links().map((a) => normalise(a.textContent))).toEqual(['Colombia', 'Chile', 'Perú']);
      const peru = links()[2];
      expect(peru.getAttribute('href')).toBe('/pe/datos');
      const icon = peru.querySelector('svg');
      expect(icon, 'the neutral globe icon').not.toBeNull();
      expect(icon?.getAttribute('aria-hidden')).toBe('true');
      expect(alertTexts(app.root)).toEqual([]);
      expect(app.root.textContent).not.toContain('Este país no está disponible.');
    });

    // US-04 spec 11.1.1 (AC-29): the chooser now has the app header, still no wizard chrome (no chip, no accent, no indicator).
    it('US-04-AC-03 the chooser is not a wizard page: a header with "Cotizador de seguro de auto" and no link, no chip and no accent; no step indicator', async () => {
      await start();
      await app.open('/');
      const header = app.root.querySelector('header, [role="banner"]') as HTMLElement | null;
      expect(header, 'the app header').not.toBeNull();
      expect(normalise(header?.textContent)).toContain('Cotizador de seguro de auto');
      expect(header?.querySelector('a[href], button, [data-country-accent]')).toBeNull();
      expect(stepIndicator(app.root)).toBeNull();
      expect(normalise(app.root.textContent)).not.toContain('Progreso de la cotización');
      expect(app.root.querySelector('[data-country-accent]')).toBeNull();
      expect(document.querySelector('[data-country-accent]')).toBeNull();
    });
  });

  // -------------------------------------------------------------------------------------------
  describe('US-04-AC-29 a richer country chooser (US-04-BR-20, Q-25)', () => {
    const LEAD =
      'Cotiza el seguro de tu auto en pocos minutos. Elige el país donde está matriculado tu vehículo para ver los planes y precios disponibles.';
    const STEPS: [string, string][] = [
      ['Tus datos', 'Cuéntanos sobre ti y tu vehículo.'],
      ['Plan', 'Compara coberturas y precios.'],
      ['Resumen y pago', 'Revisa, acepta los términos y paga.'],
    ];
    const headings = (): [string, string][] =>
      Array.from(app.root.querySelectorAll('h1, h2, h3, h4, h5, h6')).map((h) => [h.tagName.toLowerCase(), normalise(h.textContent)]);
    const howItWorks = (): HTMLElement => Array.from(app.root.querySelectorAll<HTMLElement>('h2')).find((h) => normalise(h.textContent) === 'Cómo funciona') as HTMLElement;

    it('US-04-AC-29 a header shows "Cotizador de seguro de auto" and contains no link, no button, no country chip and no step indicator', async () => {
      await start();
      await app.open('/');
      const header = app.root.querySelector('header, [role="banner"]') as HTMLElement;
      expect(header).not.toBeNull();
      expect(normalise(header.textContent)).toContain('Cotizador de seguro de auto');
      expect(header.querySelectorAll('a, button, [tabindex], ol, ul, h1, h2, h3')).toHaveLength(0);
      expect(normalise(header.textContent)).not.toContain('Colombia');
      expect(normalise(header.textContent)).not.toContain('Cambiar país');
      expect(stepIndicator(app.root)).toBeNull();
    });

    it('US-04-AC-29 the heading outline is exactly h1 "Elige tu país" and h2 "Cómo funciona"', async () => {
      await start();
      await app.open('/');
      expect(headings()).toEqual([
        ['h1', 'Elige tu país'],
        ['h2', 'Cómo funciona'],
      ]);
    });

    it('US-04-AC-29 right after the h1 comes the lead paragraph "Cotiza el seguro de tu auto en pocos minutos. …"', async () => {
      await start();
      await app.open('/');
      const h1 = app.root.querySelector('h1') as HTMLElement;
      const lead = h1.nextElementSibling as HTMLElement;
      expect(lead.tagName).toBe('P');
      expect(normalise(lead.textContent)).toBe(LEAD);
    });

    it('US-04-AC-29 then the links "Colombia" and "Chile", in the Strapi order, named exactly so, each with a flag and a chevron hidden from assistive technology', async () => {
      await start();
      await app.open('/');
      const lead = (app.root.querySelector('h1') as HTMLElement).nextElementSibling as HTMLElement;
      expect(links().map((a) => normalise(a.textContent))).toEqual(['Colombia', 'Chile']);
      for (const link of links()) {
        expect(link.getAttribute('aria-label') ?? normalise(link.textContent)).toBe(normalise(link.textContent));
        const icons = Array.from(link.querySelectorAll('svg'));
        expect(icons.length, `${normalise(link.textContent)}: flag and chevron`).toBeGreaterThanOrEqual(2);
        for (const icon of icons) {
          expect(icon.getAttribute('aria-hidden')).toBe('true');
          expect(normalise(icon.textContent)).toBe('');
        }
        expect(lead.compareDocumentPosition(link) & Node.DOCUMENT_POSITION_FOLLOWING).not.toBe(0);
        expect(link.compareDocumentPosition(howItWorks()) & Node.DOCUMENT_POSITION_FOLLOWING).not.toBe(0);
      }
    });

    it('US-04-AC-29 then the h2 "Cómo funciona" and an ordered list of exactly three items: step name then description, in this order', async () => {
      await start();
      await app.open('/');
      const list = howItWorks().nextElementSibling as HTMLElement;
      expect(list.tagName).toBe('OL');
      const items = Array.from(list.querySelectorAll(':scope > li'));
      expect(items).toHaveLength(3);
      items.forEach((item, i) => {
        const text = normalise(item.textContent);
        const [name, description] = STEPS[i];
        expect(text, `item ${i + 1}`).toContain(name);
        expect(text, `item ${i + 1}`).toContain(description);
        expect(text.indexOf(name), `item ${i + 1}: name before description`).toBeLessThan(text.indexOf(description));
        for (const [otherName] of STEPS.filter((_, j) => j !== i)) expect(text).not.toContain(otherName);
      });
    });

    it('US-04-AC-29 each item shows an icon hidden from assistive technology, the same drawing as the step indicator uses for that step', async () => {
      await start();
      await app.open('/');
      const list = howItWorks().nextElementSibling as HTMLElement;
      const icons = Array.from(list.querySelectorAll(':scope > li')).map((li) => li.querySelector('svg'));
      for (const icon of icons) {
        expect(icon, 'an icon in each item').not.toBeNull();
        expect(icon?.getAttribute('aria-hidden')).toBe('true');
        expect(normalise(icon?.textContent)).toBe('');
      }
      const chooserDrawings = icons.map((i) => i?.innerHTML ?? '');
      // the indicator is on a wizard page: another page load (a country is never switched inside the wizard)
      TestBed.resetTestingModule();
      configureAppTest();
      sessionStorage.setItem('quote-wizard', wizardEntryWithPlan('CO', CO_VALID_RAW, null));
      app = await createAppTest();
      await app.open('/co/datos');
      const indicatorDrawings = indicatorItems(stepIndicator(app.root) as HTMLElement).map((li) => li.querySelector('svg')?.innerHTML ?? '');
      expect(indicatorDrawings).toHaveLength(STEP_LABELS.length);
      expect(chooserDrawings).toEqual(indicatorDrawings);
      expect(new Set(chooserDrawings).size).toBe(3);
    });

    it('US-04-AC-29 Tab from the top of the document reaches "Colombia" and then "Chile" and no other element of the page', async () => {
      await start();
      await app.open('/');
      expect(tabStopNames(app.root)).toEqual(['Colombia', 'Chile']);
    });

    it('US-04-AC-29 the list cannot be loaded: the header, the h1, the lead and "Cómo funciona" are shown, with the load error and "Reintentar" and no country link', async () => {
      await start();
      app.server.countries = 'error';
      await app.open('/');
      const header = app.root.querySelector('header, [role="banner"]') as HTMLElement;
      expect(normalise(header?.textContent)).toContain('Cotizador de seguro de auto');
      expect(normalise(app.root.querySelector('h1')?.textContent)).toBe('Elige tu país');
      expect(normalise((app.root.querySelector('h1') as HTMLElement).nextElementSibling?.textContent)).toBe(LEAD);
      expect(headings()).toContainEqual(['h2', 'Cómo funciona']);
      expect(alertTexts(app.root)).toContain('No pudimos cargar la lista de países. Intenta de nuevo.');
      expect(button(app.root, 'Reintentar')).not.toBeNull();
      expect(links()).toHaveLength(0);
    });
  });

  describe('US-04-AC-15 skeleton while the countries load (the live text stays)', () => {
    const shapes = (): number =>
      Array.from(app.root.querySelectorAll('[aria-hidden="true"]')).filter((e) => e.tagName.toLowerCase() !== 'svg' && normalise(e.textContent) === '').length;

    it('US-04-AC-15 while the country list loads there are skeleton shapes hidden from assistive technology and "Cargando…" is still in the polite live region; when the list arrives the shapes are replaced by the links', async () => {
      vi.useFakeTimers();
      await start();
      app.server.countries = 'hang';
      const navigation = app.begin('/');
      await app.settle();
      const loading = shapes();
      expect(loading, 'skeleton shapes while loading').toBeGreaterThan(0);
      const status = Array.from(app.root.querySelectorAll<HTMLElement>('[role="status"], [aria-live="polite"]')).find((e) => normalise(e.textContent) === 'Cargando…');
      expect(status, 'the loading text is in a live region').toBeDefined();
      expect(status?.closest('[aria-hidden="true"]')).toBeNull();
      expect(app.root.querySelector('[aria-busy="true"]')).not.toBeNull();
      expect(links()).toHaveLength(0);

      await vi.advanceTimersByTimeAsync(10_000);
      await vi.advanceTimersByTimeAsync(50);
      TestBed.tick();
      await navigation;
      app.server.countries = seedCountryItems();
      button(app.root, 'Reintentar').click();
      await app.settle();
      expect(links().map((a) => normalise(a.textContent))).toEqual(['Colombia', 'Chile']);
      expect(shapes(), 'the skeleton is replaced by the list').toBeLessThan(loading);
      expect(normalise(app.root.textContent)).not.toContain('Cargando…');
    });
  });
});
