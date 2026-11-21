# US-03 — Seed annex: terms and conditions per country

Annex of [spec.md](spec.md) §7.3. IDs are defined in the spec only. All text is fictitious,
Spanish end-user content (CLAUDE.md §2), and has no legal value.

The structure below is **logical** (title, then an ordered list of blocks). The physical format
of `body` (Strapi `blocks`, Markdown `richtext` or plain `text`) is decided by the ADR of
US-03-Q-02; the strapi-developer writes these blocks in that format. With the proposed default
(Strapi `blocks`), each row is one top-level block node.

Natural key for idempotency: country code + `title`.

## CO — published

`title`: **Términos y condiciones del seguro de auto – Colombia**

| # | Block | Text (bold in **bold**) |
|---|---|---|
| 1 | paragraph | Este documento es **ficticio** y se usa solo para demostrar el cotizador. No constituye una oferta real de seguro. |
| 2 | paragraph | Al aceptar, declaras que los datos que ingresaste son verdaderos y que conoces las condiciones del plan elegido. |
| 3 | heading (level 2) | Condiciones principales |
| 4 | unordered list | (a) La vigencia de la póliza es de un año desde la fecha de pago. (b) El precio mostrado es anual y está expresado en pesos colombianos (COP). (c) Puedes retractarte dentro de los 10 días siguientes al pago. |
| 5 | paragraph | Ley aplicable: Colombia. Texto de prueba sin validez legal. |

## CL — published

`title`: **Términos y condiciones del seguro automotriz – Chile**

| # | Block | Text (bold in **bold**) |
|---|---|---|
| 1 | paragraph | Este documento es **ficticio** y se usa solo para demostrar el cotizador. No constituye una oferta real de seguro. |
| 2 | paragraph | Al aceptar, declaras que la información entregada es fidedigna y autorizas el uso de tu RUT solo para esta cotización. |
| 3 | heading (level 2) | Condiciones generales |
| 4 | ordered list | (1) La cobertura comienza al día siguiente del pago. (2) El precio mostrado es anual y está expresado en pesos chilenos (CLP). (3) Puedes desistir dentro de los 10 días siguientes al pago. |
| 5 | paragraph | Ley aplicable: Chile. Texto de prueba sin validez legal. |

## CO — draft only (never published; proves US-03-AC-14 and US-03-AC-19)

`title`: **Términos y condiciones (borrador)**

| # | Block | Text |
|---|---|---|
| 1 | paragraph | Borrador no publicado: este texto nunca debe mostrarse. |

## Strings the tests rely on

| Country | Distinct strings |
|---|---|
| CO | title above; heading "Condiciones principales"; "pesos colombianos (COP)" |
| CL | title above; heading "Condiciones generales"; "pesos chilenos (CLP)" |
| CO draft | "Borrador no publicado" (must never appear) |
