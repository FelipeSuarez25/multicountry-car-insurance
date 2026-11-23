import { TestBed } from '@angular/core/testing';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { configureAppTest, createAppTest, type AppTest } from '../../testing/app-harness';
import { day } from '../../testing/clock';
import { normalise } from '../../testing/dom';
import { nameOf, wizardHeader } from '../../testing/custom-controls';
import { wizardEntryWithPlan, CL_SPEC_RAW } from '../../testing/plan-fixtures';
import { CO_VALID_RAW } from '../../testing/seed-fixtures';

/**
 * US-04-AC-30 / US-04-BR-22 (spec v0.4, HC3 round 2): the app header holds our decorative brand mark
 * before the product name. jsdom has no layout, so "the first element with a rendered box" is checked
 * as "the first element in DOM order": an inline svg that precedes the product name text and is not the
 * flag of the chip. The look (surface, edge, size) is checked in the e2e file and the static specs.
 */

const TODAY = day(2026, 11, 21);
const PRODUCT = 'Cotizador de seguro de auto';

describe('US-04-AC-30 / US-04-BR-22 the header brand mark and product name', () => {
  let app: AppTest;

  beforeEach(() => {
    configureAppTest({ today: TODAY });
    vi.spyOn(console, 'warn').mockImplementation(() => undefined);
  });
  afterEach(() => {
    vi.restoreAllMocks();
    sessionStorage.clear();
    TestBed.resetTestingModule();
  });

  const co = (): string => wizardEntryWithPlan('CO', CO_VALID_RAW, 'total');
  const cl = (): string => wizardEntryWithPlan('CL', CL_SPEC_RAW, 'protegido');

  const pages: [string, string | null, string | null][] = [
    ['/', null, null],
    ['/co/datos', 'Colombia', 'co'],
    ['/cl/planes', 'Chile', 'cl'],
  ];

  async function show(address: string, entry: string | null): Promise<HTMLElement> {
    if (entry) sessionStorage.setItem('quote-wizard', entry);
    app = await createAppTest();
    await app.open(address);
    const header = wizardHeader(app.root);
    expect(header, `a header at ${address}`).not.toBeNull();
    return header as HTMLElement;
  }

  function productNameNode(header: HTMLElement): Text {
    const walker = document.createTreeWalker(header, NodeFilter.SHOW_TEXT);
    for (let node = walker.nextNode(); node; node = walker.nextNode()) {
      if (normalise(node.textContent).includes(PRODUCT)) return node as Text;
    }
    throw new Error('The product name is not in the header');
  }

  const entryFor = (country: string | null): string | null => (country === 'Colombia' ? co() : country === 'Chile' ? cl() : null);

  it.each(pages)('US-04-AC-30 at %s the first svg of the header is the brand mark: not inside a link, and before the product name', async (address, country) => {
    const header = await show(address, entryFor(country));
    const mark = header.querySelector('svg');
    expect(mark, 'an inline svg in the header').not.toBeNull();
    expect(mark?.closest('a'), 'the mark is not the chip flag').toBeNull();
    const name = productNameNode(header);
    expect((mark as SVGElement).compareDocumentPosition(name) & Node.DOCUMENT_POSITION_FOLLOWING, 'the product name follows the mark').toBeTruthy();
  });

  it.each(pages)('US-04-AC-30 at %s the mark has aria-hidden="true", no tabindex, no title, no desc and no text', async (address, country) => {
    const header = await show(address, entryFor(country));
    const mark = header.querySelector('svg') as SVGElement;
    expect(mark.getAttribute('aria-hidden')).toBe('true');
    expect(mark.hasAttribute('tabindex')).toBe(false);
    expect(mark.querySelector('title, desc')).toBeNull();
    expect(mark.textContent?.trim()).toBe('');
    expect(mark.querySelector('text'), 'no <text> element').toBeNull();
    expect(mark.querySelector('[tabindex]')).toBeNull();
  });

  it.each(pages)('US-04-AC-30 at %s the header has no img element and its text starts with the product name', async (address, country) => {
    const header = await show(address, entryFor(country));
    expect(header.querySelector('img')).toBeNull();
    expect(normalise(header.textContent).startsWith(PRODUCT)).toBe(true);
  });

  it.each(pages)('US-04-AC-30 at %s the product name is not a heading and not a link', async (address, country) => {
    const header = await show(address, entryFor(country));
    const name = productNameNode(header);
    expect(name.parentElement?.closest('h1, h2, h3, h4, h5, h6, a')).toBeNull();
    expect(header.querySelector('h1, h2, h3, h4, h5, h6')).toBeNull();
  });

  it('US-04-AC-30 on the chooser the header has no link; on a wizard page it has one link, named "Cambiar país (actual: Colombia)", with the address "/" and the visible text "Colombia" (no "Cambiar" hint, US-04-Q-29)', async () => {
    const chooser = await show('/', null);
    expect(chooser.querySelectorAll('a, button, input, select, textarea, [tabindex]')).toHaveLength(0);
    TestBed.resetTestingModule();
    configureAppTest({ today: TODAY });
    const wizard = await show('/co/datos', co());
    const links = Array.from(wizard.querySelectorAll('a'));
    expect(links).toHaveLength(1);
    expect(nameOf(links[0])).toBe('Cambiar país (actual: Colombia)');
    expect(links[0].getAttribute('href')).toBe('/');
    expect(normalise(links[0].textContent)).toBe('Colombia');
  });
});
