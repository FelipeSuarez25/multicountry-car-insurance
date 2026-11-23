/// <reference types="node" />
import { describe, expect, it } from 'vitest';
import { existsSync, readFileSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { TokenFile, coloursOf } from '../testing/css';

/**
 * US-04-AC-31 / US-04-BR-23 (spec v0.4, HC3 round 2), the static half: the links and the theme colour
 * of `index.html`, and the icon files of `frontend/public`. The GET from the web container (status,
 * content type, length) is in `frontend/e2e/us-04-hc3-round2.spec.ts`.
 */

const ROOT = process.cwd();
const PUBLIC = join(ROOT, 'public');
const indexHtml = (): string => readFileSync(join(ROOT, 'src', 'index.html'), 'utf8');
const tokens = (): TokenFile => new TokenFile(readFileSync(join(ROOT, 'src', 'styles', 'tokens.css'), 'utf8'));

/** Attributes of every `<tag ...>` in the html, lower-cased names. */
function tagsOf(html: string, tag: string): Record<string, string>[] {
  const out: Record<string, string>[] = [];
  for (const m of html.matchAll(new RegExp(`<${tag}\\b([^>]*)>`, 'gi'))) {
    const attrs: Record<string, string> = {};
    for (const a of m[1].matchAll(/([a-zA-Z-]+)\s*=\s*("([^"]*)"|'([^']*)')/g)) attrs[a[1].toLowerCase()] = a[3] ?? a[4];
    out.push(attrs);
  }
  return out;
}

function toHex([r, g, b]: number[]): string {
  return `#${[r, g, b].map((n) => n.toString(16).padStart(2, '0')).join('')}`;
}

function pngHeader(file: string): { signature: string; width: number; height: number; colourType: number } {
  const bytes = readFileSync(join(PUBLIC, file));
  return {
    signature: bytes.subarray(0, 8).toString('hex'),
    width: bytes.readUInt32BE(16),
    height: bytes.readUInt32BE(20),
    colourType: bytes[25],
  };
}
const PNG_SIGNATURE = '89504e470d0a1a0a';

describe('US-04-AC-31 / US-04-BR-23 index.html declares our icons and the theme colour', () => {
  it('US-04-AC-31 has exactly one <link rel="icon" type="image/svg+xml" href="favicon.svg">', () => {
    const links = tagsOf(indexHtml(), 'link').filter((l) => l['rel'] === 'icon' && l['type'] === 'image/svg+xml');
    expect(links).toHaveLength(1);
    expect(links[0]['href']).toBe('favicon.svg');
  });

  it('US-04-AC-31 has exactly one <link rel="icon" type="image/png" sizes="32x32" href="favicon-32.png">', () => {
    const links = tagsOf(indexHtml(), 'link').filter((l) => l['rel'] === 'icon' && l['type'] === 'image/png');
    expect(links).toHaveLength(1);
    expect(links[0]['sizes']).toBe('32x32');
    expect(links[0]['href']).toBe('favicon-32.png');
  });

  it('US-04-AC-31 has exactly one <link rel="apple-touch-icon" sizes="180x180" href="apple-touch-icon.png">', () => {
    const links = tagsOf(indexHtml(), 'link').filter((l) => l['rel'] === 'apple-touch-icon');
    expect(links).toHaveLength(1);
    expect(links[0]['sizes']).toBe('180x180');
    expect(links[0]['href']).toBe('apple-touch-icon.png');
  });

  it('US-04-AC-31 has exactly one <meta name="theme-color"> equal (case-insensitive) to the resolved --component-header-bg-solid', () => {
    const metas = tagsOf(indexHtml(), 'meta').filter((m) => m['name'] === 'theme-color');
    expect(metas).toHaveLength(1);
    const [solid] = coloursOf(tokens(), '--component-header-bg-solid');
    expect(metas[0]['content'].toLowerCase()).toBe(toHex(solid.rgb));
  });

  it('US-04-AC-31 no <link> has href "favicon.ico" or type "image/x-icon"', () => {
    for (const link of tagsOf(indexHtml(), 'link')) {
      expect(link['href'], JSON.stringify(link)).not.toMatch(/favicon\.ico$/);
      expect(link['type'], JSON.stringify(link)).not.toBe('image/x-icon');
    }
  });

  it('US-04-AC-31 every icon link is relative to the app origin (no http, no //)', () => {
    for (const link of tagsOf(indexHtml(), 'link').filter((l) => /icon/.test(l['rel'] ?? ''))) expect(link['href']).not.toMatch(/^(https?:)?\/\//);
  });
});

describe('US-04-AC-31 / US-04-BR-23 the icon files in frontend/public', () => {
  it('US-04-AC-31 favicon.svg exists, has a square viewBox, and is at most 4 kB', () => {
    expect(existsSync(join(PUBLIC, 'favicon.svg')), 'favicon.svg').toBe(true);
    const svg = readFileSync(join(PUBLIC, 'favicon.svg'), 'utf8');
    const box = /viewBox\s*=\s*["']\s*([-\d.]+)[\s,]+([-\d.]+)[\s,]+([\d.]+)[\s,]+([\d.]+)\s*["']/.exec(svg);
    expect(box, 'a viewBox attribute').not.toBeNull();
    expect(parseFloat((box as RegExpExecArray)[3])).toBeGreaterThan(0);
    expect(parseFloat((box as RegExpExecArray)[3])).toBe(parseFloat((box as RegExpExecArray)[4]));
    expect(statSync(join(PUBLIC, 'favicon.svg')).size).toBeLessThanOrEqual(4096);
  });

  it('US-04-AC-31 favicon.svg has no <text>, no <script>, no "http" or "//" reference and no href or xlink:href to another file', () => {
    const svg = readFileSync(join(PUBLIC, 'favicon.svg'), 'utf8');
    expect(svg).not.toMatch(/<text\b/i);
    expect(svg).not.toMatch(/<script\b/i);
    // the xmlns declaration of the SVG namespace is not a reference (a standalone SVG does not render without it)
    const withoutNamespace = svg.replace(/\sxmlns(:\w+)?\s*=\s*["'][^"']*["']/g, '');
    expect(withoutNamespace).not.toMatch(/http/i);
    expect(withoutNamespace).not.toMatch(/\/\//);
    expect(svg).not.toMatch(/xlink:href\s*=/i);
    // an href is allowed only as a local reference to an id inside the file ("#gradient")
    for (const m of svg.matchAll(/\bhref\s*=\s*["']([^"']*)["']/gi)) expect(m[1], `href ${m[1]}`).toMatch(/^#/);
    expect(svg).not.toMatch(/<image\b|<foreignObject\b/i);
  });

  it('US-04-AC-31 favicon-32.png is a PNG of 32 x 32', () => {
    expect(existsSync(join(PUBLIC, 'favicon-32.png')), 'favicon-32.png').toBe(true);
    const h = pngHeader('favicon-32.png');
    expect(h.signature).toBe(PNG_SIGNATURE);
    expect([h.width, h.height]).toEqual([32, 32]);
  });

  it('US-04-AC-31 apple-touch-icon.png is a PNG of 180 x 180 with colour type 2 (RGB, no alpha channel)', () => {
    expect(existsSync(join(PUBLIC, 'apple-touch-icon.png')), 'apple-touch-icon.png').toBe(true);
    const h = pngHeader('apple-touch-icon.png');
    expect(h.signature).toBe(PNG_SIGNATURE);
    expect([h.width, h.height]).toEqual([180, 180]);
    expect(h.colourType).toBe(2);
  });

  it('US-04-AC-31 favicon.ico (the Angular default) does not exist', () => {
    expect(existsSync(join(PUBLIC, 'favicon.ico'))).toBe(false);
  });

  it('US-04-AC-31 sensitivity: the html reader finds an x-icon link and a second theme-color meta in a deliberately wrong document', () => {
    const wrong = '<link rel="icon" type="image/x-icon" href="favicon.ico"><meta name="theme-color" content="#000000"><meta name="theme-color" content="#111111">';
    expect(tagsOf(wrong, 'link')[0]).toEqual({ rel: 'icon', type: 'image/x-icon', href: 'favicon.ico' });
    expect(tagsOf(wrong, 'meta').filter((m) => m['name'] === 'theme-color')).toHaveLength(2);
  });
});
