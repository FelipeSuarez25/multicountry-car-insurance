/**
 * Seed of the terms and conditions (specs/US-03/seed-terms.md, spec 7.3). Spanish, fictitious,
 * no legal value. `body` is Strapi `blocks` JSON (ADR-0009). Natural key: country code + title.
 */
type Inline = { type: 'text'; text: string; bold?: boolean };
type Block =
  | { type: 'paragraph'; children: Inline[] }
  | { type: 'heading'; level: 2; children: Inline[] }
  | { type: 'list'; format: 'ordered' | 'unordered'; children: { type: 'list-item'; children: Inline[] }[] };

export interface TermSeed {
  title: string;
  body: Block[];
  /** Draft-only entries are created unpublished (US-03-AC-14). */
  draftOnly?: boolean;
}

const t = (text: string): Inline => ({ type: 'text', text });
const p = (...children: Inline[]): Block => ({ type: 'paragraph', children });
const list = (format: 'ordered' | 'unordered', items: string[]): Block => ({
  type: 'list',
  format,
  children: items.map((item) => ({ type: 'list-item' as const, children: [t(item)] })),
});
const fictitious = (): Block =>
  p(t('Este documento es '), { type: 'text', text: 'ficticio', bold: true }, t(' y se usa solo para demostrar el cotizador. No constituye una oferta real de seguro.'));

export const SEED_TERMS: Record<string, TermSeed[]> = {
  CO: [
    {
      title: 'Términos y condiciones del seguro de auto – Colombia',
      body: [
        fictitious(),
        p(t('Al aceptar, declaras que los datos que ingresaste son verdaderos y que conoces las condiciones del plan elegido.')),
        { type: 'heading', level: 2, children: [t('Condiciones principales')] },
        list('unordered', [
          'La vigencia de la póliza es de un año desde la fecha de pago.',
          'El precio mostrado es anual y está expresado en pesos colombianos (COP).',
          'Puedes retractarte dentro de los 10 días siguientes al pago.',
        ]),
        p(t('Ley aplicable: Colombia. Texto de prueba sin validez legal.')),
      ],
    },
    {
      title: 'Términos y condiciones (borrador)',
      draftOnly: true,
      body: [p(t('Borrador no publicado: este texto nunca debe mostrarse.'))],
    },
  ],
  CL: [
    {
      title: 'Términos y condiciones del seguro automotriz – Chile',
      body: [
        fictitious(),
        p(t('Al aceptar, declaras que la información entregada es fidedigna y autorizas el uso de tu RUT solo para esta cotización.')),
        { type: 'heading', level: 2, children: [t('Condiciones generales')] },
        list('ordered', [
          'La cobertura comienza al día siguiente del pago.',
          'El precio mostrado es anual y está expresado en pesos chilenos (CLP).',
          'Puedes desistir dentro de los 10 días siguientes al pago.',
        ]),
        p(t('Ley aplicable: Chile. Texto de prueba sin validez legal.')),
      ],
    },
  ],
};
