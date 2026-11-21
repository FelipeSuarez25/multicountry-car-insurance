---
status: Accepted
date: 2026-11-21
decision-makers: Felipe Sabogal (accepted at HC2, 2026-11-21), architect subagent (proposal)
consulted: specs/US-04/story.md, specs/US-04/spec.md v0.1 (Draft; BR-09, BR-10, BR-13, AC-13, AC-14, AC-15, AC-17, Q-14, Q-15, Q-16, §8, §9), ADR-0001 (focus on the arriving heading), ADR-0010, ADR-0012, installed @angular/core and @angular/router 22.3.0 typings and bundles, packed @angular/cdk 22.3.0, vendored angular-developer skill references/angular-animations.md and route-animations.md (reference only), vendored frontend-design skill (EVAL-005), principles of pbakaus/impeccable restated with credit (EVAL-004), npm registry (motion 14.14.0, gsap 3.15.1), a throwaway production build of a copy of frontend/ in a temporary directory
informed: all agents via CLAUDE.md precedence; test-engineer (AC-14, AC-17); frontend-developer
---

# ADR-0013: Motion with native `animate.enter` and CSS on duration tokens, enter-only step transition, reduced motion by construction

## Context and Problem Statement

US-04 asks for an animated step indicator, a transition between steps, hover, focus, active and
disabled states, soft validation feedback, skeletons while Strapi loads, interactive plan cards
and summary micro-animations, all honouring `prefers-reduced-motion` ("no movement if the user asks
for it"), and asks the ADR to propose the library and "justify bundle weight and maintenance"
(story; US-04-BR-09, BR-10). The step transition must not put two pages, two `main` or two `h1`
elements in the document at once, and focus must still land on the arriving `h1` (US-04-AC-14;
ADR-0001). This ADR picks the mechanism, the motion tokens, the step transition and how reduced
motion is applied and tested (US-04-Q-14, Q-16).

## Decision Drivers

- D1. No movement under `prefers-reduced-motion: reduce`: every computed animation and transition
  duration 0 s and no running animation (US-04-BR-10, AC-17).
- D2. One page in the DOM during a step change, focus on the arriving `h1`, document title as today
  (US-04-AC-14; ADR-0001 "Focus on step change"; ADR-0009 heading outline).
- D3. Bundle weight and maintenance justified (story); budgets kept (spec §9); exact versions and a
  permissive licence for anything new (US-04-BR-14).
- D4. Animate `transform` and `opacity` only (spec §9, Performance).
- D5. Durations and easings are tokens (US-04-BR-01, ADR-0010).
- D6. Motion never interferes with announcements: role `alert`/`status` text is in the DOM at once
  (spec §8; US-04-Q-16: no counting-up of numbers).
- D7. Restraint: motion answers a person's action; one orchestrated moment beats scattered effects
  (vendored `frontend-design` skill, adopted with CLAUDE.md §5 overrides).

## Considered Options

1. **A. Native `animate.enter` / `animate.leave` + CSS keyframes and transitions** on duration and
   easing tokens; no animation library.
2. **B. Router `withViewTransitions()`** (View Transitions API) for the step change, plus CSS for
   everything else.
3. **C. An animation library**: Motion (`motion` 14.14.0) or GSAP (`gsap` 3.15.1), driven from
   `(animate.enter)` / `(animate.leave)` callbacks.

## Decision Outcome

Chosen option: **"A. Native `animate.enter` + CSS on tokens"**, because it costs zero bytes and no
dependency (D3), is stable public API in 22.3.0, covers every effect the spec lists with
`transform` and `opacity` (D4), and lets reduced motion be guaranteed by construction rather than by
overrides (D1). An enter-only page animation keeps exactly one page in the DOM (D2). B covers only
route changes, so it would be a second mechanism next to A, and it became public API only in this
very version. C adds 71–74 kB raw per library for effects CSS already does, and GSAP's licence is
not an OSI licence.

### What is decided

#### 1. Motion tokens (in `tokens.css`, ADR-0010)

| Token | Value | Used for |
|---|---|---|
| `--duration-fast` | 120ms | hover, press, focus ring, error fade-in, panel close (exits are faster than entries) |
| `--duration-base` | 200ms | step enter, panel open, bottom-sheet slide, indicator fill, segmented control |
| `--duration-slow` | 320ms | confirmation check-circle; upper bound of any single transition (AC-14) |
| `--delay-stagger-1` … `--delay-stagger-4` | 0ms, 50ms, 100ms, 150ms | summary sections (total ≤ 150 + 200 = 350 ms, under Q-16's 400 ms) |
| `--duration-shimmer` | 1400ms | skeleton shimmer loop |
| `--duration-spin` | 800ms | "Pagar" processing spinner |
| `--ease-out` | `cubic-bezier(0.22, 1, 0.36, 1)` | entries |
| `--ease-in` | `cubic-bezier(0.4, 0, 1, 1)` | exits |
| `--ease-standard` | `cubic-bezier(0.2, 0, 0, 1)` | state changes (colour, border, glow) |
| `--motion-rise` | 0.5rem (8 px) | step enter and panel offset |

No bounce or overshoot curves. Under `@media (prefers-reduced-motion: reduce)` every `--duration-*`
and `--delay-*` token is `0ms` (a second line of defence; see §3).

#### 2. Where motion is used (and where it is not)

| Effect | Mechanism | Property |
|---|---|---|
| Step change | `animate.enter="page-enter"` on the root element of each routed page; **no** `animate.leave` | opacity 0 → 1, translateY(`--motion-rise`) → 0, `--duration-base`, `--ease-out` |
| Step indicator fill | CSS transition on the progress bar | `transform: scaleX()` |
| Select panel open | `animate.enter` on the panel | opacity, translateY(−`--motion-rise`/2) |
| Bottom sheet open | `animate.enter` on the sheet | translateY(100%) → 0 |
| Panel close | instant by default; `animate.leave` only if the developer confirms it runs when the CDK overlay detaches (no AC needs it) | opacity |
| Error text | `animate.enter="error-enter"` | opacity only (no shake); the text is in the DOM, inside `role="alert"`, from the first frame (D6) |
| Hover / active / chosen plan | CSS transitions | `border-color`, `box-shadow`, `background-color` (paint), and a 2 px lift on hover only for `(hover: hover)` pointers |
| Skeleton shimmer | keyframes on a pseudo-element | `transform: translateX()` |
| "Pagar" spinner | keyframes on the icon | `transform: rotate()` |
| Summary sections | `animate.enter` with `--delay-stagger-n` by `:nth-of-type` | opacity, translateY |
| Confirmation | `animate.enter` on the check-circle | scale 0.85 → 1 and opacity, `--duration-slow` (the single orchestrated moment of the flow) |

Not animated: prices and numbers (no counting up, D6), headings, the country chooser list, text in
live regions. Hover transitions are colour and shadow changes, not motion, except the 2 px lift
(D7: "hover transitions on every card" read as generated; the plan cards are the one place where a
lift explains "this is clickable", US-04-BR-09).

**Step transition, why one page only.** The router removes the leaving component and inserts the
arriving one in the same change; with no `animate.leave`, Angular does not keep the old element.
Only the arriving page animates in, so there is never a second `h1` or `main` (AC-14). Focus moves
to the arriving `h1` as today: opacity and transform do not affect focus or the accessibility tree.

#### 3. Reduced motion, by construction (D1)

- In every style file except `tokens.css`, each `animation`, `animation-*`, `transition` and
  `transition-*` declaration sits inside `@media (prefers-reduced-motion: no-preference) { … }`.
  Under `reduce` no animation or transition is declared at all: computed durations are the initial
  `0s`, `document.getAnimations()` is empty, and states (colour, border, icon, text) still change,
  instantly. This keeps feedback while removing movement, a principle restated from
  `pbakaus/impeccable` `animate.md` (Apache-2.0, credited per EVAL-004), and it avoids the global
  `0.01ms !important` kill switch that the same source flags.
- `animate.enter` classes therefore have no animation under `reduce`; Angular reads the computed
  styles, finds none, and removes the class at once (`@angular/core@22.3.0`
  `determineLongestAnimation` falls back to computed styles when `getAnimations()` is empty;
  `MAX_ANIMATION_TIMEOUT` default 4000 ms is never reached).
- The duration tokens are also set to `0ms` under `reduce` in `tokens.css`, so a declaration that
  escapes the `no-preference` block still has no duration.
- **CDK overlays and dialogs** (ADR-0012) are created with `disableAnimations: true`. The CDK's own
  backdrop has `transition: opacity 400ms` and, under reduced motion, `transition-duration: 1ms`
  (`@angular/cdk@22.3.0` overlay styles), which would fail AC-17's "0s"; with
  `disableAnimations`, the CDK adds `cdk-overlay-backdrop-noop-animation` (`transition: none`). Our
  own backdrop fade, if any, is a token transition inside the `no-preference` block in
  `styles.css`.
- The spinner stops under `reduce`; "Procesando pago…" (US-03) remains the feedback.

#### 4. Tests (AC-14, AC-17)

- **Static guard** (extends ADR-0010's guard): outside `tokens.css`, no `animation`/`transition`
  declaration outside a `prefers-reduced-motion: no-preference` block; durations, delays and
  easings only as `var(--duration-*)`, `var(--delay-*)`, `var(--ease-*)`; `tokens.css` sets every
  `--duration-*` and `--delay-*` to `0ms` under `reduce`; every `createOverlayRef`,
  `cdkConnectedOverlay` and `Dialog.open` call passes `disableAnimations: true` (a grep on the
  production sources).
- **E2E AC-17**: a Playwright context with `reducedMotion: 'reduce'` walks step 1 (with "Ciudad"
  open and the calendar open), step 2, the summary and the confirmation; on each state it asserts
  that every element's computed `animationDuration` and `transitionDuration` list only `0s`, and
  `document.getAnimations()` is empty.
- **E2E AC-14**: with motion allowed, a `MutationObserver` installed before "Continuar" records the
  maximum number of `h1` and `main` elements seen during navigation (expected 1 and 1); then focus
  is on "Elige tu plan" and the title is unchanged; the page's enter animation reports a duration
  ≤ `--duration-slow` through `getAnimations()`.

### Consequences

- Good, because no dependency, no bytes, no licence question (D3); `animate.enter` is
  `@publicApi 20.2` in `@angular/core@22.3.0` and the vendored skill's own guidance for v20.2+.
- Good, because reduced motion is a property of how styles are written, enforced by a guard, not a
  late override that can be missed (D1).
- Good, because one page is ever in the DOM (D2), and focus and announcements are untouched (D6).
- Bad, because the old page disappears without an exit animation, so the change is a cut followed by
  a fade-in, less fluid than a cross-fade — mitigation: the fade is short (200 ms) and the step
  indicator fill gives continuity; B can be added later as an enhancement if the human wants a
  cross-fade (see *Revisit*).
- Bad, because closing a panel inside a CDK overlay may not run `animate.leave` (the overlay detaches
  its content) — mitigation: panels close instantly unless the developer proves the leave runs; no
  AC requires a close animation.
- Bad, because writing every animation inside a media block is a discipline — mitigation: the guard
  fails the gate otherwise.
- Neutral: the first page load also plays `page-enter` once; that is the single page-load moment.

### Strongest argument against

The View Transitions route (B) gives a real two-state transition with one line,
`withViewTransitions()`: the browser snapshots the old page and cross-fades it into the new one,
while the live DOM still holds only the new page (so AC-14 holds too). It can even morph the step
indicator between steps with a `view-transition-name`, which is the "animated step indicator" the
story asks for, and browsers without support simply skip it. Enter-only CSS is a hard cut followed
by a fade, the kind of generic "fade-and-rise" the `frontend-design` skill calls a tell of generated
pages.

**Why we accept it:** B only animates route changes, so the panels, errors, skeletons, cards,
spinner and confirmation still need A: two mechanisms, two reduced-motion paths (B also needs
`skipTransition()` or `::view-transition-*` rules under `reduce`, and its pseudo-element
animations show up in `document.getAnimations()` during AC-17). `withViewTransitions` is tagged
`@publicApi 22.3` in the 22.3.0 typings, so it has been public API only since the release we pin,
three days before this ADR. The fade-in here is brief and paired with the indicator fill, and the
one orchestrated moment is the confirmation, as the skill advises. B stays a contained later
enhancement on top of A.

### Confirmation

- Static guard rules of §4 (US-04-AC-17, AC-01).
- E2E `us-04-design-system.spec.ts`: AC-14 and AC-17 as in §4.
- Component tests (AC-15): skeletons are `aria-hidden`, the loading text stays in its live region.
- HC3: the human checks the motion with the OS setting on and off (AC-23).
- `frontend/package.json` contains no `motion`, `gsap`, `@angular/animations` or other animation
  dependency (dependency list guard of ADR-0010).

## Pros and Cons of the Options

### A. Native `animate.enter` / `animate.leave` + CSS (chosen)

- Good, because zero bytes and zero dependencies; stable API since 20.2.
- Good, because every effect is plain CSS on tokens, and reduced motion is enforced statically.
- Bad, because there is no exit for the leaving page (by design) and limited choreography.

### B. Router `withViewTransitions()`

`@angular/router@22.3.0` typings: `withViewTransitions` tagged `@publicApi 22.3`.

- Good, because a true cross-fade (or a morph of named elements) with one line; one page in the DOM.
- Good, because progressive: unsupported browsers navigate without a transition.
- Bad, because it covers route changes only; everything else still needs A.
- Bad, because reduced motion needs its own handling, and its animations appear in
  `document.getAnimations()` while running.
- Bad, because it became public API in 22.3.0 itself.

### C. Motion 14.14.0 or GSAP 3.15.1

Verified on npm (2026-11-21): `motion@14.14.0` MIT, unpacked 1.0 MB; `gsap@3.15.1` licence
"Standard 'no charge' license: https://gsap.com/standard-license", unpacked 6.3 MB. Measured on a
throwaway build (baseline initial 381.44 kB raw / 98.94 kB transfer): `import { animate } from
'motion'` **+74.10 kB raw / +23.97 kB transfer**; `motion/mini` **+8.92 / +2.71**; `gsap`
**+71.36 / +25.00**.

- Good, because springs, timelines and sequencing beyond CSS.
- Bad, because nothing in the spec needs them: every listed effect is a CSS transform or opacity.
- Bad, because the weight is real (motion, gsap) or the features are what CSS already has
  (motion/mini); one more dependency to upgrade.
- Bad, because GSAP's licence is not an OSI permissive licence, so US-04-BR-14 would need a human
  exception.

## Spec impact (reported to the orchestrator; the spec is not edited here)

1. **US-04-Q-16** "confirmation check-circle draw": a stroke "draw" animates `stroke-dashoffset`,
   which is neither transform nor opacity (spec §9). This ADR uses a scale-and-fade instead. If the
   human wants the draw, spec §9 should allow paint-only SVG stroke properties.
2. **US-04-AC-01 / BR-01** allowed media conditions: the guard of ADR-0010 must also accept the
   `(hover: hover)` media feature used for the card lift.
3. **US-04-AC-17** "document.getAnimations() returns no running animation": with §3 it returns no
   animation at all; the scenario may assert the stronger "empty".

## More Information

- **Verified on 2026-11-21** (installed `frontend/node_modules`, packed `@angular/cdk@22.3.0`, npm
  registry, a throwaway build in a temporary directory; nothing installed in the project):
  - `@angular/core@22.3.0` typings: `AnimationCallbackEvent` and the `animate.enter`/`animate.leave`
    types are `@publicApi 20.2`; runtime in `fesm2022/_debug_node-chunk.mjs`
    (`determineLongestAnimation`, `MAX_ANIMATION_TIMEOUT` default 4000).
  - `@angular/router@22.3.0` typings: `withViewTransitions` `@publicApi 22.3`.
  - `@angular/cdk@22.3.0`: `OverlayConfig.disableAnimations`, `DialogConfig.disableAnimations`;
    overlay styles: backdrop `transition: opacity 400ms …`, reduced-motion `transition-duration: 1ms`,
    `.cdk-overlay-backdrop-noop-animation { transition: none }`.
  - Bundle numbers in *Pros and Cons* C.
- **Credit:** "reduce movement, keep feedback", "exits faster than entries", "no bounce by reflex",
  "animate transform and opacity" are restated from `pbakaus/impeccable` at `0a4e72a` (`animate.md`,
  Apache-2.0), as EVAL-004 allows.
- **Skill notes:** the vendored `angular-animations.md` recommends `animate.enter`/`animate.leave`
  for v20.2+ (consistent); `route-animations.md` describes `withViewTransitions` (option B, not
  chosen). `@angular/animations` is not added.
- **Related ADRs:** ADR-0010 (tokens, guard), ADR-0012 (CDK overlays and dialog), ADR-0001 (focus on
  the arriving heading).
- **Revisit when:** the human asks for a cross-fade between steps (add B on top of A, with its own
  reduced-motion handling and an AC-17 row), or a later story needs choreography CSS cannot express.
