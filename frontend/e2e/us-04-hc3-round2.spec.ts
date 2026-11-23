import { readFileSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { expect, test, type Locator, type Page } from '@playwright/test';
import { field } from './support/form';
import { TODAY, reachPlansInChile } from './support/plans';
import { acceptTerms, confirmedHeading, pagar, reachSummaryInChile, reachSummaryInColombia } from './support/summary';
import { VIEWPORTS, expectFocusIndicatorOnActive } from './support/design';

/**
 * US-04 HC3 round 2 (spec v0.4, BR-22, BR-23) against the real stack with the seed: the header that
 * belongs to the page (AC-30: translucent token surface, gradient edge with the country accent, brand
 * mark, Archivo product name, chip link, height and clipping, reduced transparency, forced colors, no
 * motion) and the icons served by the web container (AC-31).
 *
 * The header is found by its role (`banner`; `includeHidden` because an open modal dialog makes it
 * aria-hidden). Colours, gradients and sizes are compared with the RESOLVED value of the token, read by
 * a probe element appended inside the header (so it inherits the country scope), never with a literal.
 */

const PRODUCT = 'Cotizador de seguro de auto';
const CHIP_CO = 'Cambiar país (actual: Colombia)';

const header = (page: Page): Locator => page.getByRole('banner', { includeHidden: true });

type Accent = 'co' | 'cl' | null;
interface PageRow {
  name: string;
  accent: Accent;
  show: (page: Page) => Promise<void>;
}

const CHOOSER: PageRow = {
  name: '"/" (country chooser)',
  accent: null,
  show: async (page) => {
    await page.goto('/');
    await expect(page.getByRole('heading', { level: 1, name: 'Elige tu país' })).toBeVisible();
  },
};
const CO_DATOS: PageRow = {
  name: '"/co/datos"',
  accent: 'co',
  show: async (page) => {
    await page.clock.setFixedTime(TODAY);
    await page.goto('/co/datos');
    await expect(field(page, 'Placa')).toBeVisible();
  },
};
const CL_PLANES: PageRow = { name: '"/cl/planes"', accent: 'cl', show: reachPlansInChile };
const CO_RESUMEN: PageRow = { name: '"/co/resumen"', accent: 'co', show: (page) => reachSummaryInColombia(page) };
const CL_CONFIRMATION: PageRow = {
  name: 'the payment confirmation in Chile',
  accent: 'cl',
  show: async (page) => {
    await reachSummaryInChile(page);
    await acceptTerms(page).check();
    await pagar(page).click();
    await expect(confirmedHeading(page)).toBeVisible();
  },
};
const ALL_PAGES = [CHOOSER, CO_DATOS, CL_PLANES, CO_RESUMEN, CL_CONFIRMATION];

// ---------------------------------------------------------------------------------------------
// Readers (run in the page). A probe is a throwaway child of the header.
// ---------------------------------------------------------------------------------------------

/** The computed value of `property` when it is set to `value` on a probe inside the header (a `var(--token)` is resolved in the header's scope). */
async function probe(page: Page, property: string, value: string): Promise<string> {
  return header(page).evaluate(
    (el, [prop, val]) => {
      const p = document.createElement('div');
      p.style.setProperty(prop, val);
      el.appendChild(p);
      const out = getComputedStyle(p).getPropertyValue(prop);
      p.remove();
      return out;
    },
    [property, value],
  );
}

/** The resolved colour of the country accent of `key`, read on a probe with the accent attribute on the body. */
async function accentColour(page: Page, key: 'co' | 'cl'): Promise<string> {
  return page.evaluate((k) => {
    const p = document.createElement('div');
    p.setAttribute('data-country-accent', k);
    p.style.color = 'var(--color-country-accent)';
    document.body.appendChild(p);
    const out = getComputedStyle(p).color;
    p.remove();
    return out;
  }, key);
}

const styleOf = (page: Page, property: string): Promise<string> => header(page).evaluate((el, prop) => getComputedStyle(el).getPropertyValue(prop), property);

/** The alpha of a computed `rgb()`, `rgba()` or `color(srgb ... / a)` colour. */
function alphaOf(colour: string): number {
  const rgba = /^rgba\(([^)]*)\)$/.exec(colour.trim());
  if (rgba) return parseFloat(rgba[1].split(',')[3]);
  const mod = /\/\s*([\d.]+%?)\s*\)$/.exec(colour.trim());
  if (mod) return mod[1].endsWith('%') ? parseFloat(mod[1]) / 100 : parseFloat(mod[1]);
  return 1;
}

interface Painter {
  where: string;
  image: string;
  borderImage: string;
  height: string;
  borderBottomWidth: string;
  borderBottomStyle: string;
  backgroundSize: string;
}

/** Every element of the header, and its ::before / ::after, as a possible painter of the bottom edge. */
async function painters(page: Page): Promise<Painter[]> {
  return header(page).evaluate((root) => {
    const out: Painter[] = [];
    for (const el of [root, ...Array.from(root.querySelectorAll('*'))]) {
      for (const pseudo of [null, '::before', '::after'] as const) {
        const s = getComputedStyle(el, pseudo);
        if (pseudo && s.content === 'none') continue;
        out.push({
          where: `${el.tagName.toLowerCase()}${pseudo ?? ''}`,
          image: s.backgroundImage,
          borderImage: s.borderImageSource,
          height: pseudo ? s.height : `${el.getBoundingClientRect().height}px`,
          borderBottomWidth: s.borderBottomWidth,
          borderBottomStyle: s.borderBottomStyle,
          backgroundSize: s.backgroundSize,
        });
      }
    }
    return out;
  });
}

const paintsGradient = (p: Painter, gradient: string): boolean => p.image.includes(gradient) || p.borderImage.includes(gradient);
const isOnePixel = (p: Painter): boolean => p.height === '1px' || (p.borderBottomWidth === '1px' && p.borderImage !== 'none') || /\b1px\b/.test(p.backgroundSize);

/** Put a tall test-only spacer in the block that contains the sticky header, so there is something to scroll. */
async function makePageTall(page: Page): Promise<void> {
  await header(page).evaluate((el) => {
    let parent = el.parentElement as HTMLElement;
    while (getComputedStyle(parent).display === 'contents' && parent.parentElement) parent = parent.parentElement;
    if (parent.querySelector(':scope > [data-test-spacer]')) return;
    const spacer = document.createElement('div');
    spacer.setAttribute('data-test-spacer', ''); // test-only layout aid: re-added when the page re-renders its container
    spacer.setAttribute('aria-hidden', 'true');
    spacer.style.height = '3000px';
    parent.appendChild(spacer);
  });
}

interface Boxes {
  header: DOMRect;
  mark: DOMRect;
  name: DOMRect;
  chip: DOMRect | null;
  nameScrollWidth: number;
  nameClientWidth: number;
  nameEllipsis: string;
  nameLines: number;
}

/** The first svg of the header that is not inside a link, the element holding the product name, and the chip. */
async function boxesOf(page: Page): Promise<Boxes> {
  return header(page).evaluate((root, product) => {
    const mark = Array.from(root.querySelectorAll('svg')).find((s) => !s.closest('a'));
    const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT);
    let nameEl: HTMLElement | null = null;
    for (let n = walker.nextNode(); n && !nameEl; n = walker.nextNode()) {
      if ((n.textContent ?? '').replace(/\s+/g, ' ').includes(product)) nameEl = n.parentElement;
    }
    const chip = root.querySelector('a');
    if (!mark || !nameEl) throw new Error('The header has no brand mark or no product name');
    const range = document.createRange();
    range.selectNodeContents(nameEl);
    const tops = new Set(Array.from(range.getClientRects()).map((r) => Math.round(r.top)));
    return {
      header: root.getBoundingClientRect(),
      mark: mark.getBoundingClientRect(),
      name: nameEl.getBoundingClientRect(),
      chip: chip ? chip.getBoundingClientRect() : null,
      nameScrollWidth: nameEl.scrollWidth,
      nameClientWidth: nameEl.clientWidth,
      nameEllipsis: getComputedStyle(nameEl).textOverflow,
      nameLines: tops.size,
    };
  }, PRODUCT);
}

async function emulateReducedTransparency(page: Page): Promise<void> {
  const session = await page.context().newCDPSession(page);
  await session.send('Emulation.setEmulatedMedia', { features: [{ name: 'prefers-reduced-transparency', value: 'reduce' }] });
}

// ---------------------------------------------------------------------------------------------
test.describe('US-04-AC-30 translucent surface with a gradient edge (1280 x 800)', () => {
  for (const row of ALL_PAGES) {
    test(`US-04-AC-30 ${row.name}: the header background is --component-header-bg (translucent, not --color-surface-raised) and its backdrop-filter is --component-header-backdrop`, async ({ page }) => {
      await page.setViewportSize(VIEWPORTS.desktop);
      await row.show(page);
      const background = await styleOf(page, 'background-color');
      expect(background, 'not the old raised surface').not.toBe(await probe(page, 'background-color', 'var(--color-surface-raised)'));
      expect(background, 'the component token').toBe(await probe(page, 'background-color', 'var(--component-header-bg)'));
      const alpha = alphaOf(background);
      expect(alpha, `alpha of ${background}`).toBeGreaterThan(0);
      expect(alpha, `alpha of ${background}`).toBeLessThan(1);
      const backdrop = await styleOf(page, 'backdrop-filter');
      expect(backdrop).not.toBe('none');
      expect(backdrop).toBe(await probe(page, 'backdrop-filter', 'var(--component-header-backdrop)'));
    });

    test(`US-04-AC-30 ${row.name}: the bottom edge is 1 CSS px and painted with --gradient-header-edge, and no grey hairline remains`, async ({ page }) => {
      await page.setViewportSize(VIEWPORTS.desktop);
      await row.show(page);
      const edge = await probe(page, 'background-image', 'var(--gradient-header-edge)');
      expect(edge, 'the token resolves to a gradient').toMatch(/linear-gradient/);
      const all = await painters(page);
      const painter = all.filter((p) => paintsGradient(p, edge));
      expect(painter.map((p) => p.where), 'an element, pseudo-element or border image that paints the edge gradient').not.toEqual([]);
      expect(painter.some(isOnePixel), `the edge is 1px tall: ${JSON.stringify(painter)}`).toBe(true);
      // the header's own border-bottom is not a plain line: it is zero, none, or the gradient border image
      const own = all[0];
      const plain = own.borderBottomStyle !== 'none' && parseFloat(own.borderBottomWidth) > 0 && own.borderImage === 'none';
      expect(plain, `the header keeps a plain border-bottom: ${own.borderBottomWidth} ${own.borderBottomStyle}`).toBe(false);
    });

    test(`US-04-AC-30 ${row.name}: the header stays at the top of the viewport after scrolling down 400 CSS px`, async ({ page }) => {
      await page.setViewportSize(VIEWPORTS.desktop);
      await row.show(page);
      await expect
        .poll(async () => {
          await makePageTall(page);
          await page.evaluate(() => window.scrollTo(0, 400));
          return page.evaluate(() => window.scrollY);
        })
        .toBeGreaterThanOrEqual(399);
      const top = await header(page).evaluate((el) => el.getBoundingClientRect().top);
      expect(top).toBeGreaterThanOrEqual(-0.5);
      expect(top).toBeLessThanOrEqual(0.5);
    });
  }
});

test.describe('US-04-AC-30 the edge carries the country accent only as decoration', () => {
  for (const row of [CO_DATOS, CL_PLANES, CHOOSER]) {
    test(`US-04-AC-30 ${row.name}: the stops of the edge ${row.accent ? `include the ${row.accent === 'co' ? 'Colombia' : 'Chile'} accent` : 'hold no country accent (brand violets only)'}, and no header text has an accent colour`, async ({ page }) => {
      await page.setViewportSize(VIEWPORTS.desktop);
      await row.show(page);
      const co = await accentColour(page, 'co');
      const cl = await accentColour(page, 'cl');
      const edge = (await painters(page)).filter((p) => p.image.includes('linear-gradient') || p.borderImage.includes('linear-gradient')).map((p) => `${p.image} ${p.borderImage}`).join(' ');
      expect(edge, 'a painted gradient edge').not.toBe('');
      if (row.accent) {
        expect(edge).toContain(row.accent === 'co' ? co : cl);
        expect(edge).not.toContain(row.accent === 'co' ? cl : co);
      } else {
        expect(edge).not.toContain(co);
        expect(edge).not.toContain(cl);
      }
      const textColours = await header(page).evaluate((root) => {
        const out: string[] = [];
        for (const el of Array.from(root.querySelectorAll('*'))) {
          const own = Array.from(el.childNodes).some((n) => n.nodeType === Node.TEXT_NODE && (n.textContent ?? '').trim() !== '');
          if (own) out.push(getComputedStyle(el).color);
        }
        return out;
      });
      expect(textColours.length, 'text elements in the header').toBeGreaterThan(0);
      expect(textColours).not.toContain(co);
      expect(textColours).not.toContain(cl);
    });
  }
});

test.describe('US-04-AC-30 brand mark and product name', () => {
  for (const row of [CHOOSER, CO_DATOS]) {
    test(`US-04-AC-30 ${row.name}: the first content of the header is the brand mark (svg, aria-hidden, no tabindex, title or desc, no text, size --size-brand-mark), followed by the product name`, async ({ page }) => {
      await page.setViewportSize(VIEWPORTS.desktop);
      await row.show(page);
      const first = await header(page).evaluate((root, product) => {
        // content elements in DOM order: svg, img, links, buttons, and elements with their own text
        const content = Array.from(root.querySelectorAll('*')).filter((el) => {
          if (el.closest('svg') && el.tagName.toLowerCase() !== 'svg') return false;
          const r = el.getBoundingClientRect();
          if (r.width === 0 || r.height === 0) return false;
          const own = Array.from(el.childNodes).some((n) => n.nodeType === Node.TEXT_NODE && (n.textContent ?? '').trim() !== '');
          return ['svg', 'img', 'a', 'button'].includes(el.tagName.toLowerCase()) || own;
        });
        const mark = content[0];
        const nameIndex = content.findIndex((el) => (el.textContent ?? '').replace(/\s+/g, ' ').includes(product) && el.tagName.toLowerCase() !== 'svg');
        return {
          tag: mark?.tagName.toLowerCase(),
          inLink: !!mark?.closest('a'),
          ariaHidden: mark?.getAttribute('aria-hidden'),
          hasTabindex: mark?.hasAttribute('tabindex'),
          titleOrDesc: mark?.querySelector('title, desc') !== null,
          text: (mark?.textContent ?? '').trim(),
          width: mark?.getBoundingClientRect().width,
          height: mark?.getBoundingClientRect().height,
          nameIndex,
          imgCount: root.querySelectorAll('img').length,
          text0: (root.textContent ?? '').replace(/\s+/g, ' ').trim(),
        };
      }, PRODUCT);
      expect(first.tag, 'the first element with a rendered box and content').toBe('svg');
      expect(first.inLink).toBe(false);
      expect(first.nameIndex, 'the product name follows the mark').toBeGreaterThan(0);
      expect(first.ariaHidden).toBe('true');
      expect(first.hasTabindex).toBe(false);
      expect(first.titleOrDesc).toBe(false);
      expect(first.text).toBe('');
      expect(first.imgCount).toBe(0);
      expect(first.text0.startsWith(PRODUCT)).toBe(true);
      const size = await probe(page, 'width', 'var(--size-brand-mark)');
      expect(parseFloat(size), `--size-brand-mark resolves to ${size}`).toBeGreaterThan(0);
      expect(Math.abs((first.width as number) - parseFloat(size))).toBeLessThanOrEqual(1);
      expect(Math.abs((first.height as number) - parseFloat(size))).toBeLessThanOrEqual(1);
      expect(Math.abs((first.width as number) - 32), 'also 32 px at the default root size').toBeLessThanOrEqual(1);
    });

    test(`US-04-AC-30 ${row.name}: the product name is not a heading and not a link, and its first font family is Archivo`, async ({ page }) => {
      await page.setViewportSize(VIEWPORTS.desktop);
      await row.show(page);
      await expect(header(page).getByRole('heading')).toHaveCount(0);
      const name = await header(page).evaluate((root, product) => {
        const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT);
        for (let n = walker.nextNode(); n; n = walker.nextNode()) {
          if ((n.textContent ?? '').replace(/\s+/g, ' ').includes(product)) {
            const el = n.parentElement as HTMLElement;
            return { family: getComputedStyle(el).fontFamily, blocked: el.closest('h1, h2, h3, h4, h5, h6, a') !== null };
          }
        }
        throw new Error('no product name');
      }, PRODUCT);
      expect(name.blocked).toBe(false);
      expect(name.family.split(',')[0].trim().replace(/^["']|["']$/g, '')).toBe('Archivo');
    });
  }
});

test.describe('US-04-AC-30 the chip keeps its link semantics', () => {
  test('US-04-AC-30 "/co/datos" at 1280 x 800: one link named "Cambiar país (actual: Colombia)", address "/", visible text "Colombia" without a "Cambiar" hint, at least 44 x 44, with a visible focus indicator on itself', async ({ page }) => {
    await page.setViewportSize(VIEWPORTS.desktop);
    await CO_DATOS.show(page);
    const links = header(page).getByRole('link');
    await expect(links).toHaveCount(1);
    const chip = header(page).getByRole('link', { name: CHIP_CO, exact: true });
    await expect(chip).toHaveAttribute('href', '/');
    expect(((await chip.innerText()) ?? '').replace(/\s+/g, ' ').trim()).toBe('Colombia');
    const box = await chip.boundingBox();
    expect(box?.width).toBeGreaterThanOrEqual(43.5);
    expect(box?.height).toBeGreaterThanOrEqual(43.5);
    await chip.focus();
    await expect(chip).toBeFocused();
    await expectFocusIndicatorOnActive(page, 'the country chip link');
  });
});

test.describe('US-04-AC-30 height and no clipping', () => {
  const rows: { viewport: { width: number; height: number }; row: PageRow }[] = [
    { viewport: VIEWPORTS.narrow, row: CHOOSER },
    { viewport: VIEWPORTS.narrow, row: CO_DATOS },
    { viewport: VIEWPORTS.tablet, row: CHOOSER },
    { viewport: VIEWPORTS.tablet, row: CL_PLANES },
    { viewport: VIEWPORTS.desktop, row: CHOOSER },
    { viewport: VIEWPORTS.desktop, row: CO_DATOS },
  ];
  for (const { viewport, row } of rows) {
    test(`US-04-AC-30 ${viewport.width} x ${viewport.height}, ${row.name}: the header is --size-header-height tall (plus or minus 1 px); the mark, the name and the chip are inside the viewport and the header, the name is not clipped and has at most two lines`, async ({ page }) => {
      await page.setViewportSize(viewport);
      await row.show(page);
      const wanted = parseFloat(await probe(page, 'height', 'var(--size-header-height)'));
      const b = await boxesOf(page);
      expect(Math.abs(b.header.height - wanted), `header ${b.header.height}px, token ${wanted}px`).toBeLessThanOrEqual(1);
      const inside = (what: string, r: DOMRect): void => {
        expect(r.left, `${what} left`).toBeGreaterThanOrEqual(-0.5);
        expect(r.right, `${what} right`).toBeLessThanOrEqual(viewport.width + 0.5);
        expect(r.top, `${what} top`).toBeGreaterThanOrEqual(b.header.top - 0.5);
        expect(r.bottom, `${what} bottom`).toBeLessThanOrEqual(b.header.bottom + 0.5);
      };
      inside('brand mark', b.mark);
      inside('product name', b.name);
      if (row.accent) {
        expect(b.chip, 'the chip').not.toBeNull();
        inside('chip', b.chip as DOMRect);
      }
      expect(b.nameScrollWidth).toBeLessThanOrEqual(b.nameClientWidth);
      expect(b.nameEllipsis).not.toBe('ellipsis');
      expect(b.nameLines, 'lines of the product name').toBeLessThanOrEqual(2);
      const [scroll, inner] = await page.evaluate(() => [document.documentElement.scrollWidth, window.innerWidth]);
      expect(scroll, 'horizontal scroll').toBeLessThanOrEqual(inner);
    });
  }
});

test.describe('US-04-AC-30 reduced transparency, forced colors and motion', () => {
  test('US-04-AC-30 under prefers-reduced-transparency: reduce, "/co/datos" has the opaque --component-header-bg-solid background and no backdrop-filter', async ({ page }) => {
    await page.setViewportSize(VIEWPORTS.desktop);
    await emulateReducedTransparency(page);
    await CO_DATOS.show(page);
    expect(await page.evaluate(() => matchMedia('(prefers-reduced-transparency: reduce)').matches), 'the emulation is active').toBe(true);
    const background = await styleOf(page, 'background-color');
    expect(background).toBe(await probe(page, 'background-color', 'var(--component-header-bg-solid)'));
    expect(alphaOf(background)).toBe(1);
    expect(await styleOf(page, 'backdrop-filter')).toBe('none');
  });

  test('US-04-AC-30 under forced-colors: active, "/co/datos" has a Canvas background, a solid CanvasText bottom border of at least 1 px, and CanvasText product name without a text gradient', async ({ page }) => {
    await page.setViewportSize(VIEWPORTS.desktop);
    await page.emulateMedia({ forcedColors: 'active' });
    await CO_DATOS.show(page);
    expect(await page.evaluate(() => matchMedia('(forced-colors: active)').matches), 'the emulation is active').toBe(true);
    const canvas = await probe(page, 'background-color', 'Canvas');
    const canvasText = await probe(page, 'color', 'CanvasText');
    expect(await styleOf(page, 'background-color')).toBe(canvas);
    expect(await styleOf(page, 'border-bottom-style')).toBe('solid');
    expect(parseFloat(await styleOf(page, 'border-bottom-width'))).toBeGreaterThanOrEqual(1);
    expect(await styleOf(page, 'border-bottom-color')).toBe(canvasText);
    const name = await header(page).evaluate((root, product) => {
      const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT);
      for (let n = walker.nextNode(); n; n = walker.nextNode()) {
        if ((n.textContent ?? '').replace(/\s+/g, ' ').includes(product)) {
          const s = getComputedStyle(n.parentElement as HTMLElement);
          return { color: s.color, clip: s.backgroundClip, image: s.backgroundImage };
        }
      }
      throw new Error('no product name');
    }, PRODUCT);
    expect(name.color).toBe(canvasText);
    expect(name.clip === 'text' && name.image !== 'none', `text gradient: clip ${name.clip}, image ${name.image}`).toBe(false);
  });

  test('US-04-AC-30 with no reduced-motion preference, no animation targets the header, its edge or the brand mark once "/co/datos" has loaded', async ({ page }) => {
    await page.setViewportSize(VIEWPORTS.desktop);
    await page.emulateMedia({ reducedMotion: 'no-preference' });
    await CO_DATOS.show(page);
    const targets = await header(page).evaluate((root) =>
      document
        .getAnimations()
        .map((a) => (a.effect as KeyframeEffect | null)?.target as Element | null)
        .filter((t): t is Element => !!t && (t === root || root.contains(t)))
        .map((t) => t.tagName.toLowerCase()),
    );
    expect(targets).toEqual([]);
  });
});

// ---------------------------------------------------------------------------------------------
test.describe('US-04-AC-31 the web container serves our icons', () => {
  const files: [string, string][] = [
    ['/favicon.svg', 'image/svg+xml'],
    ['/favicon-32.png', 'image/png'],
    ['/apple-touch-icon.png', 'image/png'],
  ];
  for (const [path, type] of files) {
    test(`US-04-AC-31 GET ${path} answers 200 with Content-Type ${type} and the committed file (same byte length)`, async ({ request }) => {
      const response = await request.get(path);
      expect(response.status()).toBe(200);
      expect(response.headers()['content-type'] ?? '').toMatch(new RegExp(`^${type.replace('+', '\\+')}`));
      const committed = statSync(join(process.cwd(), 'public', path.slice(1))).size;
      expect((await response.body()).length).toBe(committed);
      expect((await response.body()).equals(readFileSync(join(process.cwd(), 'public', path.slice(1))))).toBe(true);
    });
  }

  test('US-04-AC-31 GET /favicon.ico is not an icon any more (the Angular default is gone: the fallback page is html, never an image)', async ({ request }) => {
    const response = await request.get('/favicon.ico');
    expect(response.headers()['content-type'] ?? '').not.toMatch(/^image\//);
  });

  test('US-04-AC-31 "/" links the icons on its own origin, with the theme colour of the header, and no icon request leaves the origin', async ({ page, baseURL }) => {
    const requests: string[] = [];
    page.on('request', (r) => requests.push(r.url()));
    await page.goto('/');
    await expect(header(page)).toBeVisible();
    const links = await page.evaluate(() =>
      Array.from(document.querySelectorAll<HTMLLinkElement>('link[rel~="icon"], link[rel="apple-touch-icon"]')).map((l) => ({ rel: l.rel, type: l.type, href: l.href })),
    );
    expect(links.map((l) => new URL(l.href).pathname).sort()).toEqual(['/apple-touch-icon.png', '/favicon-32.png', '/favicon.svg']);
    const origin = new URL(baseURL as string).origin;
    for (const l of links) expect(new URL(l.href).origin).toBe(origin);
    for (const url of requests.filter((u) => /favicon|apple-touch-icon/.test(u))) expect(new URL(url).origin).toBe(origin);
    const theme = await page.locator('meta[name="theme-color"]').getAttribute('content');
    const solid = await probe(page, 'background-color', 'var(--component-header-bg-solid)');
    const [r, g, b] = (/\((\d+),\s*(\d+),\s*(\d+)/.exec(solid) ?? []).slice(1).map(Number);
    expect((theme ?? '').toLowerCase()).toBe(`#${[r, g, b].map((n) => n.toString(16).padStart(2, '0')).join('')}`);
  });
});
