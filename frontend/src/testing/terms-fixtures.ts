/**
 * Fictitious terms fixtures derived from specs/US-03/seed-terms.md (annex of spec section 7.3).
 *
 * `seedTermsBody` is the Strapi `blocks` JSON of the seed (ADR-0009: the wire shape of
 * `@strapi/types` 5.63.0 `blocks.d.ts`). `toStrapiTermItem` turns one entry into what Strapi 5
 * answers over REST for the request of spec 7.2 (flattened attributes, `documentId`). Draft-only
 * terms never appear in a published response, so the draft has a title constant and no item.
 */
import type { SeedCountry, StrapiItem } from './seed-fixtures';

export const CO_TERMS_TITLE = 'Términos y condiciones del seguro de auto – Colombia';
export const CL_TERMS_TITLE = 'Términos y condiciones del seguro automotriz – Chile';
export const CO_DRAFT_TERMS_TITLE = 'Términos y condiciones (borrador)';
export const CO_DRAFT_TEXT = 'Borrador no publicado: este texto nunca debe mostrarse.';

/** A node of the `blocks` wire format. Deliberately loose: it is what the boundary receives. */
export type WireNode = Record<string, unknown>;

export function text(value: string, marks: Record<string, boolean> = {}): WireNode {
  return { type: 'text', text: value, ...marks };
}

export function paragraph(...children: WireNode[]): WireNode {
  return { type: 'paragraph', children };
}

export function heading(level: number, ...children: WireNode[]): WireNode {
  return { type: 'heading', level, children };
}

export function listItem(...children: WireNode[]): WireNode {
  return { type: 'list-item', children };
}

export function list(format: 'ordered' | 'unordered', ...children: WireNode[]): WireNode {
  return { type: 'list', format, children };
}

/** The body of the published terms of a country, as Strapi stores and returns it (5 top-level blocks). */
export function seedTermsBody(country: SeedCountry): WireNode[] {
  const intro = paragraph(
    text('Este documento es '),
    text('ficticio', { bold: true }),
    text(' y se usa solo para demostrar el cotizador. No constituye una oferta real de seguro.'),
  );
  if (country === 'CO') {
    return [
      intro,
      paragraph(text('Al aceptar, declaras que los datos que ingresaste son verdaderos y que conoces las condiciones del plan elegido.')),
      heading(2, text('Condiciones principales')),
      list(
        'unordered',
        listItem(text('La vigencia de la póliza es de un año desde la fecha de pago.')),
        listItem(text('El precio mostrado es anual y está expresado en pesos colombianos (COP).')),
        listItem(text('Puedes retractarte dentro de los 10 días siguientes al pago.')),
      ),
      paragraph(text('Ley aplicable: Colombia. Texto de prueba sin validez legal.')),
    ];
  }
  return [
    intro,
    paragraph(text('Al aceptar, declaras que la información entregada es fidedigna y autorizas el uso de tu RUT solo para esta cotización.')),
    heading(2, text('Condiciones generales')),
    list(
      'ordered',
      listItem(text('La cobertura comienza al día siguiente del pago.')),
      listItem(text('El precio mostrado es anual y está expresado en pesos chilenos (CLP).')),
      listItem(text('Puedes desistir dentro de los 10 días siguientes al pago.')),
    ),
    paragraph(text('Ley aplicable: Chile. Texto de prueba sin validez legal.')),
  ];
}

export function seedTermsTitle(country: SeedCountry): string {
  return country === 'CO' ? CO_TERMS_TITLE : CL_TERMS_TITLE;
}

export interface TermsSeed {
  title: string;
  body: unknown;
  publishedAt: string | null;
}

export function toStrapiTermItem(terms: TermsSeed, index = 0): StrapiItem {
  return {
    id: index + 1,
    documentId: `fixtureterms${String(index + 1).padStart(4, '0')}`,
    title: terms.title,
    body: terms.body,
    publishedAt: terms.publishedAt,
  };
}

/** The published terms of a country as Strapi items (the seed has one per country). */
export function seedTermsItems(country: SeedCountry): StrapiItem[] {
  return [toStrapiTermItem({ title: seedTermsTitle(country), body: seedTermsBody(country), publishedAt: '2026-11-21T08:00:00.000Z' })];
}

/** One-paragraph terms, for tests that need a specific text, title or publication instant. */
export function simpleTermsItem(title: string, paragraphText: string, publishedAt: string | null, index = 0): StrapiItem {
  return toStrapiTermItem({ title, body: [paragraph(text(paragraphText))], publishedAt }, index);
}
