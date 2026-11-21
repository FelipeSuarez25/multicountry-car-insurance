import { TestBed } from '@angular/core/testing';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { configureAppTest, createAppTest, type AppTest } from '../../../testing/app-harness';
import { alertTexts, button, normalise } from '../../../testing/dom';
import { seedCountryItems, strapiCountryItem } from '../../../testing/seed-fixtures';

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

    it('US-04-AC-03 the chooser is not a wizard page: no wizard header and no step indicator', async () => {
      await start();
      await app.open('/');
      expect(app.root.querySelector('header, [role="banner"]')).toBeNull();
      expect(normalise(app.root.textContent)).not.toContain('Progreso de la cotización');
      expect(app.root.querySelector('[data-country-accent]')).toBeNull();
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
