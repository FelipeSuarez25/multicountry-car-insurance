/// <reference types="node" />
import { describe, expect, it } from 'vitest';
import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join } from 'node:path';

/**
 * The review greps of ADR-0008 and ADR-0009 ("Confirmation"), as tests, so that they run in the
 * gate and not only in a reviewer's terminal. They read the production sources of `frontend/src`
 * (test files and the `testing/` helpers excluded) and `frontend/package.json`.
 *
 * US-03-AC-13 / ADR-0009: no `innerHTML`, `outerHTML`, `insertAdjacentHTML`, `bypassSecurityTrust*`
 *   or `DomSanitizer` anywhere in the front end.
 * US-03-AC-15 / ADR-0008: no card, bank or payment-provider vocabulary outside the copy that says
 *   no charge is made; no `autocomplete` token starting with `cc-`; `SimulatedPaymentGateway` does
 *   not inject `HttpClient`; `sessionStorage` is referenced only by `QuoteStore`; the confirmation
 *   is not deferred (`@defer`) or lazy loaded; no new dependency (the list below is the one of
 *   the start of US-03).
 */

const SRC = join(process.cwd(), 'src');

function walk(dir: string): string[] {
  return readdirSync(dir).flatMap((name) => {
    const path = join(dir, name);
    return statSync(path).isDirectory() ? walk(path) : [path];
  });
}

const isTest = (path: string): boolean => /\.spec\.ts$/.test(path) || path.includes(`${join('src', 'testing')}`);
const production = walk(SRC).filter((p) => /\.(ts|html)$/.test(p) && !isTest(p));
const read = (path: string): string => readFileSync(path, 'utf8');
const matches = (pattern: RegExp, files = production): string[] => files.filter((p) => pattern.test(read(p))).map((p) => p.replace(SRC, 'src'));

describe('US-03-AC-13 / ADR-0009 the front end has no HTML string path', () => {
  it('US-03-AC-13 the production sources are found (the guard looks at something)', () => {
    expect(production.length).toBeGreaterThan(20);
  });

  it('US-03-AC-13 no innerHTML, outerHTML, insertAdjacentHTML, bypassSecurityTrust or DomSanitizer in production code', () => {
    expect(matches(/innerHTML|outerHTML|insertAdjacentHTML|bypassSecurityTrust|DomSanitizer/)).toEqual([]);
  });

  it('US-03-AC-13 the renderer exists and binds its content with interpolation only (no property or attribute binding of a span text)', () => {
    const files = production.filter((p) => /rich-text\.(ts|html)$/.test(p));
    expect(files.length).toBeGreaterThan(0);
    for (const file of files) {
      expect(read(file), file).not.toMatch(/\[(innerHTML|href|src|style|class|attr\.[a-z-]+)\]\s*=\s*"[^"]*span/);
    }
  });
});

describe('US-03-AC-15 / ADR-0008 no card data, no payment SDK, no request from the simulation', () => {
  it('US-03-AC-15 no card, bank or payment-provider vocabulary in production code (cc-number, cc-exp, cc-csc, cvv, cvc, iban, stripe, paypal, mercadopago, payu, wompi, webpay)', () => {
    expect(matches(/cc-(number|exp|csc|name)|\bcvv\b|\bcvc\b|\biban\b|stripe|paypal|mercadopago|payu|wompi|webpay/i)).toEqual([]);
  });

  it('US-03-AC-15 no autocomplete token that starts with cc-', () => {
    expect(matches(/autocomplete\s*=\s*["'][^"']*cc-/i)).toEqual([]);
  });

  it('US-03-AC-15 "tarjeta" or "card" appear only in copy that says no charge is made (none today)', () => {
    const hits = production.filter((p) => /tarjeta|\bcard\b/i.test(read(p)) && !/no se (realiza|realizó) ningún cobro/.test(read(p)));
    expect(hits.map((p) => p.replace(SRC, 'src'))).toEqual([]);
  });

  it('US-03-AC-15 SimulatedPaymentGateway does not use HttpClient (the file exists and has no HTTP import)', () => {
    const files = production.filter((p) => p.endsWith('simulated-payment-gateway.ts'));
    expect(files).toHaveLength(1);
    expect(read(files[0])).not.toMatch(/HttpClient|HttpBackend|fetch\(|XMLHttpRequest|sessionStorage|localStorage|@angular\/common\/http/);
  });

  it('US-03-AC-15 the payment gateway boundary has no card-shaped field (number, expiry, cvv, holder)', () => {
    // Both the boundary and its simulated implementation, matched by exact basename.
    const files = production.filter((p) => ['payment-gateway.ts', 'simulated-payment-gateway.ts'].includes(p.split(/[\\/]/).pop() ?? ''));
    expect(files.map((p) => p.split(/[\\/]/).pop()).sort()).toEqual(['payment-gateway.ts', 'simulated-payment-gateway.ts']);
    for (const file of files) expect(read(file), file).not.toMatch(/cardNumber|expiry|expiration|securityCode|holder/i);
  });

  it('US-03-AC-11 sessionStorage is referenced only by QuoteStore (ADR-0003)', () => {
    expect(matches(/sessionStorage/)).toEqual([join('src', 'app', 'core', 'quote-store.ts')]);
  });

  it('US-03-AC-03 the confirmation is not deferred or lazy loaded: no @defer and no loadComponent in the summary feature', () => {
    const summary = production.filter((p) => p.includes(join('features', 'summary')));
    expect(summary.length).toBeGreaterThan(0);
    for (const file of summary) expect(read(file), file).not.toMatch(/@defer|loadComponent|import\(/);
  });

  it('US-03-AC-15 the dependencies of frontend/package.json are exactly those before US-03 (no payment SDK, no markdown or sanitiser library)', () => {
    const pkg = JSON.parse(read(join(process.cwd(), 'package.json'))) as { dependencies: Record<string, string>; devDependencies: Record<string, string> };
    const names = [...Object.keys(pkg.dependencies), ...Object.keys(pkg.devDependencies)];
    for (const forbidden of ['marked', 'markdown-it', 'ngx-markdown', 'dompurify', 'sanitize-html', 'blocks-html-renderer', '@strapi/blocks-react-renderer', 'stripe', '@stripe/stripe-js', 'paypal']) {
      expect(names, forbidden).not.toContain(forbidden);
    }
    for (const version of Object.values({ ...pkg.dependencies, ...pkg.devDependencies })) expect(version).toMatch(/^\d+\.\d+\.\d+/);
  });
});
