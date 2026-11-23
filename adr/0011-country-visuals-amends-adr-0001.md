---
status: Accepted
date: 2026-11-21
decision-makers: Felipe Sabogal (accepted at HC2, 2026-11-21), architect subagent (proposal)
consulted: specs/US-04/story.md, specs/US-04/spec.md v0.1 (Draft; BR-03, AC-03, Q-02, Q-03, Q-10, §7), ADR-0001, ADR-0002, ADR-0006, ADR-0010, strapi-content-modeling skill, frontend/src/app/shared/country.model.ts, Wikipedia "Flag of Colombia" and "Flag of Chile" (read 2026-11-21), contrast script of ADR-0010
informed: all agents via CLAUDE.md precedence; code-reviewer (the ADR-0001 review grep changes); test-engineer; frontend-developer; strapi-developer (no change)
---

# ADR-0011: Country visuals (flag and accent) as a presentation-only front-end map (amends ADR-0001)

## Context and Problem Statement

US-04 asks for the flag of Colombia and Chile next to the country name on the country chooser and
in a new wizard header, and for a per-country accent colour through tokens (US-04-BR-03, AC-03,
story "Flags"). ADR-0001 (Accepted) says: "The list of supported countries is content … **No
country code, name or list exists in front-end code**", and its *Confirmation* makes it a review
check (`grep -rnE "'(CO|CL)'" frontend/src` returns only tests and fixtures). The story also says
"the contracts with Strapi … do not change". One of the two must give (US-04-Q-02, blocks HC1).
This ADR decides where the flag and accent come from and amends ADR-0001 explicitly. Accepted
ADRs are not rewritten: ADR-0001 stays as it is, and this ADR states the exception.

## Decision Drivers

- D1. Adding a country stays content-only: a new published `country` must work with no front-end
  change, with sensible visuals (ADR-0001 D3; US-04-AC-03 second scenario).
- D2. The Strapi contract, seed, permissions and proxy do not change (story, "Rules that do not
  change"; US-04-BR-07; ADR-0002).
- D3. AA contrast of the accent on the dark surfaces is proven by test (US-04-BR-02, AC-02).
- D4. The flag is decorative next to the country name, never the only indicator; the country name
  still comes from Strapi (US-04-BR-03).
- D5. No `innerHTML`, no third-party runtime origin, no uploaded SVG rendered as markup
  (ADR-0009, ADR-0002; spec §9).
- D6. The exception to ADR-0001 is as narrow as possible and checked mechanically (CLAUDE.md §9).

## Considered Options

1. **A. Presentation-only country-visuals map in the front end**, keyed by ISO code, with a neutral
   fallback (globe icon, brand accent) for any other published country.
2. **B. Extend the Strapi `country` type** with an accent colour (validated hex) and a flag asset.
3. **C. Derive visuals from the code at runtime**: the flag emoji built from the ISO code's regional
   indicator symbols, and no per-country accent.

## Decision Outcome

Chosen option: **"A. Presentation-only country-visuals map"**, because it is the only option that
keeps the Strapi contract unchanged (D2), lets a test prove every accent's contrast (D3), and still
lets a new country work with no deployment through the fallback (D1). B changes the contract the
story freezes and hands contrast to editors; C cannot give an accent and renders as two letters on
systems without flag emoji.

### What is decided

**The map** — `frontend/src/app/shared/country-visuals.ts`:

```ts
// Presentation only (ADR-0011). No behaviour, validation, copy or routing depends on this map.
export interface CountryVisuals { flag: Type<unknown> | null; accent: 'co' | 'cl' | null; }
export function countryVisuals(code: string): CountryVisuals; // unknown code → { flag: null, accent: null }
```

- Keys are the upper-case ISO 3166-1 alpha-2 codes of ADR-0001, written as quoted string literals
  (`'CO'`, `'CL'`), so the guard below can see them. The function upper-cases its input.
- `flag` is a standalone flag component (ADR-0010 §8) or `null`; `null` renders `LucideEarth`
  (`aria-hidden`) in the same place.
- `accent` is a key into the token file, never a colour. The wizard shell sets
  `[attr.data-country-accent]` on its root to that key; `tokens.css` holds:

  ```css
  :root { --color-country-accent: var(--color-brand); }
  [data-country-accent='co'] { --color-country-accent: var(--primitive-accent-co); }
  [data-country-accent='cl'] { --color-country-accent: var(--primitive-accent-cl); }
  ```

  so every colour value stays in `tokens.css` and every pair stays testable (ADR-0010 §4).
- The **country name is not in the map**. The chooser and the header show the Strapi `name`
  (ADR-0001); the flag sits next to it, `aria-hidden="true"`, not focusable, no text.
- **Where the accent appears** (it never carries meaning alone; violet carries every interactive
  and selected state): the ring around the flag in the header country chip, a 2 px underline of
  the chip, and the filled part of the step indicator's progress line. The current step is still
  marked by violet, text and `aria-current="step"` (US-04-AC-13).

**Country primitives and contrast** (computed with the ADR-0010 script):

| Primitive | Hex | Source | On bg `#0B0B14` | On surface `#14131E` | On header `#1D1C2A` | Minimum |
|---|---|---|---|---|---|---|
| `--primitive-flag-co-yellow` | `#FFCD00` | FIAV / London 2012 manual, via Wikipedia (not set by law) | — | — | — | artwork |
| `--primitive-flag-co-blue` | `#003087` | same | 1.65 | — | 1.42 | artwork (ringed) |
| `--primitive-flag-co-red` | `#C8102E` | same | 3.33 | — | 2.85 | artwork |
| `--primitive-flag-cl-blue` | `#0039A6` | Wikipedia approximation (law names "turquí blue", no value) | 1.99 | — | 1.71 | artwork (ringed) |
| `--primitive-flag-cl-red` | `#D52B1E` | same | 3.91 | — | 3.35 | artwork |
| `--primitive-flag-cl-white` | `#FFFFFF` | — | — | — | — | artwork |
| `--primitive-accent-co` | `#FFCD00` | the flag yellow | **13.04** | **12.25** | **11.17** | 3 |
| `--primitive-accent-cl` | `#F66E5E` | the flag red's hue (OKLCH h 29) lightened to L 0.70 | **6.82** | **6.40** | **5.84** | 3 |
| flag ring `--color-border-control` | `#7E7E93` | ADR-0010 | — | — | **4.23** | 3 |

Flag artwork is decorative and sits next to text (WCAG 1.4.11 does not apply to it); its dark blue
areas get the 1 px ring so the flag shape stays visible on near-black. Chile's accent cannot be the
flag blue (1.71 on the header) or the flag red as is (3.35 on the header passes 3:1 but leaves no
margin and looks muddy on near-black), so it is a lighter tint of the red hue. The accents are rows
of `contrast-pairs.json` (`fg` `--color-country-accent` resolved per `data-country-accent` value,
`bg` bg, surface and header surface, `min` 3).

**Amendment to ADR-0001 (explicit).** ADR-0001's sentence "No country code, name or list exists
in front-end code" gains one exception, for presentation only:

- Country codes may appear in `frontend/src/app/shared/country-visuals.ts` and nowhere else in
  production TypeScript or HTML. Lower-case accent keys (`'co'`, `'cl'`) may appear in that file
  and in the `[data-country-accent=…]` selectors of `frontend/src/styles/tokens.css`.
- Country names may appear only as the **class names** of the flag components under
  `frontend/src/app/shared/flags/` (for example `FlagColombia`, `FlagChile`); no user-visible name.
- No behaviour, validation, routing, guard, price, copy or request may read the map. The country
  list, names, currency and locale remain content (ADR-0001, ADR-0006), unchanged.
- ADR-0001's review grep `grep -rnE "'(CO|CL)'" frontend/src` (expected: only tests and fixtures)
  becomes: only tests, fixtures and `src/app/shared/country-visuals.ts`. It is also turned into a
  static-guard test (below), so the gate enforces it.

Everything else in ADR-0001 (model, relation, routes, guards, chooser, unknown country) is
unchanged.

### Consequences

- Good, because Strapi, its seed, its permissions and the nginx allow-list stay exactly as they
  are (D2); the story's "contracts do not change" holds.
- Good, because a third country published in Strapi works at once with the globe and the brand
  accent, with no error and no deployment (D1, AC-03 second scenario); giving it a flag and accent
  later is a small front-end change.
- Good, because contrast is proven by the same test as every other pair (D3), and editors cannot
  break it.
- Good, because flags are our own small inline SVG components with no markup string (D5).
- Bad, because a country's flag and accent now need a front-end release, which is the kind of
  coupling ADR-0001 avoided — mitigation: the fallback keeps the country fully working, the map
  is presentation only, and the guard confines the coupling to one file.
- Bad, because the ADR-0001 rule now has an exception that reviewers must know — mitigation: the
  static guard encodes it, and ADR-0001's index row points here.
- Neutral: the flag colours are published approximations; neither law fixes sRGB values.

### Strongest argument against

Option B keeps ADR-0001 intact: the country, including how it looks, stays entirely content.
Marketing can give a new market its accent and flag the same day it publishes the country, with
no front-end release, which is the whole point of ADR-0001 D3. Strapi can validate a hex
attribute with a regex and the front end already validates every country at the boundary, so a
bad value could be dropped back to the brand accent. Option A puts country knowledge back into
the code, which is the exact shape ADR-0001 rejected, and it will grow with every market.

**Why we accept it:** the story freezes the Strapi contract for US-04 (D2), so B would need the
human to reverse that rule first. Even then, a regex cannot check contrast against our surfaces:
an editor-chosen accent could pass validation and fail AA, and the front end would have to compute
contrast at runtime or ignore the editor. A flag asset means either SVG uploads rendered as markup
(an XSS path ADR-0009 avoids) or raster images through a new public `/uploads` route (an ADR-0002
change). Under A the coupling is one presentation file, a new country works without it, and the
guard keeps it from spreading. If the business later needs self-service visuals, a superseding ADR
can move the accent to Strapi with a curated enumeration of tested accents, not free hex.

### Confirmation

- Static guard (US-04-AC-03): in production `.ts`/`.html` under `frontend/src`, a quoted
  `'CO'`/`'CL'`/`"CO"`/`"CL"` literal appears only in `src/app/shared/country-visuals.ts`;
  `data-country-accent` selectors appear only in `src/styles/tokens.css`; the files under
  `src/app/shared/flags/` contain no text node and every root `svg` has `aria-hidden="true"` and
  `focusable="false"`.
- Unit test `country-visuals.spec.ts` (AC-03): `CO`, `co`, `CL` resolve; `PE` and `''` resolve to
  `{ flag: null, accent: null }`.
- Component tests (AC-03): chooser links' accessible names are exactly "Colombia" and "Chile"; a
  fixture country "Perú" (`PE`) shows the globe and no error; the header shows the Strapi name as
  text.
- `contrast.spec.ts` (AC-02): the accent rows above.

## Pros and Cons of the Options

### A. Presentation-only front-end map (chosen)

- Good, because no contract change, testable contrast, fallback for new countries.
- Bad, because flag and accent of a new country need a front-end change; ADR-0001 gains an exception.

### B. Strapi `country` attributes (`accentColor`, flag asset)

- Good, because visuals become content; no exception to ADR-0001.
- Bad, because it changes the Strapi schema, seed, boundary parser and possibly permissions and the
  proxy (uploads), against the story's frozen contract (D2).
- Bad, because editors can save an accent that fails AA on our dark surfaces; the front end must
  then override or compute contrast at runtime (D3).
- Bad, because an uploaded SVG is either rendered as markup (XSS risk, ADR-0009) or as an `<img>`
  from a new public route (ADR-0002 change).

### C. Flag emoji from the code, no accent

- Good, because there is no country list in code at all and ADR-0001 needs no exception.
- Bad, because Windows' system emoji font does not draw country flags and shows the two letters
  instead (widely documented; not re-verified in this session), so the "flag" fails on a large
  share of desktops; the story asks for SVG flags.
- Bad, because it gives no per-country accent, which the story requires.

## Spec impact (reported to the orchestrator; the spec is not edited here)

1. **US-04-Q-02**: the proposed default is the chosen option; §7.2 "Country visuals" row holds
   (value: flag component and accent key, not colour values).
2. **US-04-Q-03**: the accent is limited to the header chip ring and underline and the step
   indicator's progress line, as proposed; the Chile accent is `#F66E5E`, not `#FF6B7A`.
3. **US-04-Q-10**: own SVGs, as proposed; flag colours are published approximations (no law fixes
   them), so the spec's "official designs" should read "official constructions".

## More Information

- **Amends:** [ADR-0001](0001-multi-country-content-strategy.md) (Accepted 2026-11-20), the rule "No
  country code, name or list exists in front-end code" and its review grep, as stated in *What is
  decided*. If this ADR is accepted, the `adr/README.md` row of ADR-0001 reads "Accepted (amended by
  ADR-0006, ADR-0011)".
- **Sources:** Wikipedia, "Flag of Colombia" (2:3; bands 2:1:1; colours "not yet officially
  established by law", FIAV / London 2012 values) and "Flag of Chile" (3:2; canton the height of
  the white band; star on a circle of half the canton side; Supreme Decree No. 1,534 of 1967; law
  names the colours without values), both read 2026-11-21.
- **Related ADRs:** ADR-0010 (tokens, flags as components, contrast test), ADR-0002 (no new route),
  ADR-0009 (no markup from content).
- **Revisit when:** a third country goes live and the business wants its own visuals without a
  release, or the Strapi contract is opened by a later story.
