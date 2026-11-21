<!--
Provenance (not part of the story)
- Source: the human's request in the working session of 2026-11-21 (Felipe Sabogal), written in
  Spanish. The verbatim original is in the exported session log (logs/sessions/), message that
  starts "1. Cierra US-03 igual que US-01 y US-02".
- This file is an English translation by Claude Code (Opus 5.5, main session), because every
  repository artifact is in English (CLAUDE.md §2). It is faithful: structure and every requirement
  kept; nothing added. The human confirms the translation at HC1.
- Not part of the assessment PDF, so scripts/check-story-fidelity.py does not apply.
- Reference images: the human shared reference screenshots for style inspiration only (composition,
  density, tone). They are not stored in the repository: no brand, logo, name or text of any real
  insurer (or any other company) may be copied.
- Status: input. Never edit; refinements belong in spec.md.
-->

# US-04 – Design system and visual redesign

## Story

As the product owner, I want a visual redesign built on a tokenized design system, so that the quoting
wizard is pleasant, consistent and accessible in Colombia and Chile, on mobile, tablet and desktop.

## How it is delivered

Treated as one more story of the flow: spec → ADR → tests → implementation → review → HC3.

Visual references are provided by the human as style inspiration (composition, density, tone). Do not
copy brands, logos, names or texts of any real insurer.

## Third-party design skills

- The human has `ui-ux-pro-max`, `impeccable` and `frontend-design` installed globally. Evaluate them
  as `angular-developer` was evaluated: review their content and decide ADOPT / ADOPT WITH ADJUSTMENTS /
  REJECT. If adopted, vendor them inside `.claude/skills/` with their entries in `THIRD_PARTY.md` and
  `docs/skills/third-party-evaluation.md`. Do not use the global copies directly. Wait for the human's
  decision before using them.
- Precedence as always: CLAUDE.md > accepted ADRs > project skills > third-party skills.

## Scope of the redesign

- **Tokens** as CSS custom properties in a single source file (color, typography, spacing, radii,
  shadows, gradients, animation durations and easing curves, z-index). Primitive → semantic →
  component tokens. No loose values in components.
- **Flags** of Colombia and Chile in SVG (a licensed library or our own optimized SVGs), visible in the
  country selector/context and in the wizard header. A per-country accent color through tokens. The
  flag is decorative next to the country name (`aria-hidden`), never the only indicator.
- **Subtle gradients** in backgrounds, headers and the primary button, making sure the text on top
  meets WCAG AA contrast.
- **Icons:** a single library with SVG icons imported individually (propose `lucide-angular` or
  another, with license and exact version). Add icons where they help the experience: inside the
  inputs (document, name, date, city, plate, make, model, year), in the wizard steps, in the plans, in
  help, error and success messages. The input icon comes from a front-end mapping by field key, with a
  generic default icon for new fields that arrive from Strapi. Decorative icons `aria-hidden`; icons
  that carry meaning have a label.
- **Custom select and calendar** (not the browser's native ones):
  - Select: our own dropdown in the design system's style, with an icon, search when the list is long
    (e.g. cities, makes), and the selected option marked.
  - Calendar (birth date): our own date picker with month navigation and fast year navigation (a year
    selector, because it is a birth date), days disabled according to the rules (minAge), and the date
    can also be typed by hand.
  - Built on accessible primitives, not from scratch: Angular CDK (Overlay, Listbox, a11y) or
    `@angular/aria` if it is stable in our version. Justify it in the ADR.
  - Full accessibility per the WAI-ARIA patterns (combobox/listbox and date picker dialog): arrows,
    Enter, Escape, Home/End, focus trapped and returned on close, screen-reader announcements.
  - On mobile the panel opens as a bottom sheet or full screen, comfortable to tap.
  - Validations and the stored value do not change; keyboard tests are added for both components.
- **Supporting text:** clear microcopy in help texts, placeholders, empty states and errors, so the
  experience is pleasant. Business content keeps coming from Strapi; only interface texts live in the
  front end.
- **Interactions and animation:** an animated wizard step indicator, transition between steps,
  hover/focus/active/disabled states, validation with soft feedback, skeletons while Strapi loads, plan
  selection with interactive cards, and a summary with micro-animations. Propose the library in the ADR
  (for example Angular's native `animate.enter`/`animate.leave` with CSS, or Motion/GSAP if it really
  adds value) and justify bundle weight and maintenance.
- Everything honors **`prefers-reduced-motion`**: no movement if the user asks for it.
- **Responsive, mobile-first:** it must look good and be usable on phone, tablet and desktop (at least
  360×740, 768×1024 and 1280×800), with no horizontal scroll, touch targets of at least 44×44 px, and a
  layout that reorganizes (for example, plans in a column on mobile and in a grid on desktop).
- **Typography:** at most 2 families, loaded efficiently.

## Rules that do not change

- Logic, the contracts with Strapi and the texts that come from Strapi do not change; it is a visual
  change. The existing e2e tests must keep passing without being loosened; if a selector changes, it is
  adjusted using accessible roles/labels, not CSS classes.
- Accessibility: visible focus everywhere, tab order intact, AA contrast, heading hierarchy per
  ADR-0009.
- Exact versions of any new dependency, license reviewed.
- Evidence in `docs/qa/US-04/`: before/after screenshots of CO and CL at the three sizes, for every
  wizard step, including the select and the calendar open.

## First deliverable

The evaluation of the skills and a short proposal (spec + design-system ADR, with an example palette
and type scale). Wait for the human's approval (HC1/HC2) before implementing.
