# US-04 visual evidence

## `before/` (captured 2026-11-21, before any US-04 change)

Captured by the orchestrator on a clean stack built from the US-03 closure (`66fc262`), with headless
Chromium (Playwright) and fictitious data seeded in `sessionStorage` (ADR-0003 entry) for steps 2–4.
CO and CL at 360×740, 768×1024 and 1280×800. No capture has horizontal scroll.

| File prefix | What |
|---|---|
| `00-paises-` | Country chooser at `/` (one set, it is not country-specific; captured afterwards from the same code) |
| `01-datos-` | Step 1, empty |
| `01b-datos-select-focused-` | Step 1 with the native city select focused |
| `01c-datos-date-focused-` | Step 1 with the native date input focused |
| `01d-datos-errors-` | Step 1 after "Continuar" with every field empty (focus on the first invalid field) |
| `02-planes-` | Step 2, plan list |
| `03-resumen-` | Step 3, summary and payment |
| `04-confirmacion-` | Confirmation after a simulated approved payment |

**Limitation.** The native `<select>` list and the native date picker are drawn by the browser outside
the page, so a page screenshot cannot show them open. The "before" set shows those fields focused
instead. The "after" set will show the custom select and calendar open (story requirement).

## `after/` (captured 2026-11-21, after the US-04 implementation)

Captured by the orchestrator on a clean stack built from `876d0f3` (gate attempt 1 passed), same method
and sizes as `before/`. No capture has horizontal scroll. Same names as `before/`, except that the custom
controls can now be captured **open**:

| File prefix | What |
|---|---|
| `01b-datos-select-open-` | Step 1 with the custom city select open (anchored panel on wider screens, bottom sheet below 600 px) |
| `01c-datos-calendar-open-` | Step 1 with the calendar dialog open (week start from the locale: Sunday for CO, Monday for CL; days after the latest valid birth date disabled) |

Every other prefix matches `before/` one to one, so each pair can be compared side by side.
