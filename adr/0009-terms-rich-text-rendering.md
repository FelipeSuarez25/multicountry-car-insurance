---
status: Accepted
date: 2026-11-21
decision-makers: Felipe Sabogal (accepted at HC2, 2026-11-21), architect subagent (proposal)
consulted: specs/US-03/spec.md v0.1 (Approved; §4 BR-07, §5 AC-02, AC-12, AC-13, AC-14, AC-17, §6 US-03-Q-02, §7), specs/US-03/seed-terms.md, ADR-0001, ADR-0002, ADR-0005, ADR-0006, reviews of US-01 and US-02, `review-checklist` and `strapi-content-modeling` skills, installed packages @strapi/types, @strapi/core, @strapi/database, @strapi/utils, @strapi/content-manager 5.63.0 and @angular/core, @angular/common, @angular/platform-browser 22.3.0, npm registry (marked 18.2.1, markdown-it 15.0.3, ngx-markdown 22.1.1, @strapi/blocks-react-renderer 1.0.2, blocks-html-renderer 1.0.7), angular.dev security guide
informed: all agents via CLAUDE.md precedence; future stories with editor-formatted text (help texts)
---

# ADR-0009: Terms rich text: Strapi `blocks` rendered by a whitelist component through template bindings

## Context and Problem Statement

The summary shows the terms and conditions of the person's country. Their text is managed by the
business team in Strapi, keeps its formatting (headings, paragraphs, lists, bold, italic), and
must be rendered "without executing anything an editor typed" (US-03-BR-07, US-03-AC-13). We
must decide the Strapi attribute type of the terms `body`, the wire format the front end accepts,
how it becomes DOM without an XSS path, what happens to formatting the app does not support and to
malformed content, and whether a new dependency is needed. The human accepted the spec's proposal
at HC1 (US-03-Q-02: "OK", Felipe Sabogal, 2026-11-21) and asked for it to be weighed against real
alternatives. The same choice is likely to be reused for other editor-formatted text (help texts).
Story: US-03 (`specs/US-03/spec.md` §4 BR-07, §6 US-03-Q-02, §7.1, §7.2).

## Decision Drivers

- D1. Editor content is never executed: no script, element or attribute an editor typed is added
  to the page (source: US-03-AC-13; Assessment, security; `review-checklist`: "Rich text from
  Strapi … is rendered safely: no `bypassSecurityTrust*`, and `[innerHTML]` only with Angular
  sanitisation").
- D2. Formatting is kept: headings, paragraphs, ordered and unordered lists, bold, italic
  (source: US-03-BR-07, US-03-AC-13 "Formatting is kept"; seed annex).
- D3. "The business team, which is not technical, must be able to change … from Strapi without
  requesting a deployment" (source: Assessment); editors use the admin, not a markup language.
- D4. Editors must not be able to save something the front end cannot parse; no free JSON
  (source: ADR-0006; `strapi-content-modeling` skill).
- D5. Malformed or unsupported content is dropped at the boundary with a warning that names the
  problem, never the text, and the page keeps working (source: US-01-Q-18, US-02-Q-18, spec §7.2;
  CLAUDE.md §3).
- D6. No new dependency unless needed; every dependency is pinned exactly (source: CLAUDE.md §4).
- D7. Accessibility: the terms are a named region with a correct heading hierarchy under the
  section heading (source: Assessment, accessibility; US-03-AC-17).
- D8. Requests stay on the read-only content path; nothing else is fetched to show the terms
  (source: ADR-0002; US-03-AC-19).

## Considered Options

1. **A. Plain text**: `body` is a Strapi `text` attribute; the front end splits it into paragraphs
   on blank lines and interpolates each one.
2. **B. Markdown**: `body` is a Strapi `richtext` attribute (Markdown); a Markdown library
   (`marked`, `markdown-it`, or `ngx-markdown`) produces an HTML string, bound with `[innerHTML]`
   and cleaned by Angular's sanitiser.
3. **C. `blocks` to HTML string**: `body` is a Strapi `blocks` attribute; the front end serialises
   the JSON to an HTML string (own code or a library such as `blocks-html-renderer`) and binds it
   with `[innerHTML]` through Angular's sanitiser.
4. **D. `blocks` with a whitelist renderer**: `body` is a Strapi `blocks` attribute; a boundary
   parser turns the JSON into a small typed tree of supported nodes, and an Angular component
   renders that tree with template control flow and text interpolation only.

A variant of B, parsing Markdown into tokens and rendering them through templates (no
`[innerHTML]`), is folded into B's assessment: it still needs a dependency and still has to decide
what to do with raw HTML inside the Markdown.

## Decision Outcome

Chosen option: **"D. `blocks` with a whitelist renderer"**, because it is the only option with no
HTML string anywhere in the path, so there is nothing to sanitise and nothing to bypass (D1); it
keeps every formatting the spec requires (D2); editors use Strapi's visual rich-text editor and
the server validates the node structure before saving (D3, D4); and it needs no new dependency
(D6). Unsupported nodes degrade to text or are dropped, with a value-free warning (D5).

### What is decided

**Strapi attribute (strapi-developer)**

- `body`: `{ "type": "blocks", "required": true }` on the terms content type (`api::term.term`,
  spec §7.1, US-03-Q-03). `blocks` is a scalar attribute (`@strapi/utils@5.63.0`
  `dist/content-types.js:258-265`: scalar means not media, component, relation or dynamic zone), so
  it is selected with `fields[1]=body` and needs no `populate` (spec §7.2 request unchanged). It
  is stored as JSON (`@strapi/database@5.63.0` `dist/fields/index.js:33`, `blocks: json`).
- Strapi validates the structure on save (`@strapi/core@5.63.0`
  `dist/services/entity-validator/blocks-validator.js`): root nodes must be `paragraph`, `heading`
  (`level` 1–6), `quote`, `code`, `list` (`format` `ordered` | `unordered`) or `image`; inline
  nodes `text` or `link`; link URLs limited to `http:`, `https:`, `ftp:`, `mailto:`, `tel:`
  (lines 18–32). `required` only rejects `null`/missing and is not applied to drafts
  (`dist/services/entity-validator/index.js:46-58`, 290-300): **an empty array passes**, so the
  front end still checks for text.
- The seed (`specs/US-03/seed-terms.md`) is written in this JSON shape; for example CO block 1:
  `{ "type": "paragraph", "children": [ { "type": "text", "text": "Este documento es " },
  { "type": "text", "text": "ficticio", "bold": true }, { "type": "text", "text": " y se usa …" } ] }`,
  block 3 `{ "type": "heading", "level": 2, "children": [ … ] }`, block 4
  `{ "type": "list", "format": "unordered", "children": [ { "type": "list-item", "children": [ … ] }, … ] }`.

**Wire type (front end, matches Strapi 5.63.0)**

The front end does not depend on `@strapi/types` (that would be a new dependency, D6). It declares
a wire type that mirrors `@strapi/types@5.63.0`
`dist/schema/attribute/definitions/blocks.d.ts` exactly, and treats the received value as
`unknown` until the parser has checked it:

| Node | Shape in Strapi 5.63.0 (`blocks.d.ts`) |
|---|---|
| root value | `RootNode[]` |
| `paragraph`, `quote` | `{ type, children: (TextInlineNode \| LinkInlineNode)[] }` |
| `heading` | `{ type: 'heading', level: 1 \| 2 \| 3 \| 4 \| 5 \| 6, children: … }` |
| `code` | `{ type: 'code', language?: string, children: … }` |
| `list` | `{ type: 'list', format: 'ordered' \| 'unordered', children: (ListItemInlineNode \| ListBlockNode)[], indentLevel?: number }` (a nested list is a **sibling** of the list items) |
| `list-item` | `{ type: 'list-item', children: (TextInlineNode \| LinkInlineNode)[] }` |
| `image` | `{ type: 'image', image: MediaValue, children: [{ type: 'text', text: '' }] }` |
| `text` | `{ type: 'text', text: string, bold?, italic?, underline?, strikethrough?, code?: boolean }` |
| `link` | `{ type: 'link', url: string, rel: string, target: string, children: TextInlineNode[] }` |

**Boundary parser (pure function, no Angular import)**

`parseRichTextBlocks(value: unknown): RichTextBlock[] | null` in
`frontend/src/app/shared/rich-text-blocks.ts` (types in `rich-text-blocks.model.ts`), used by the
terms parser in `shared/terms.ts`. It returns only the logical, whitelisted tree:

```
RichTextSpan  = { text: string; bold: boolean; italic: boolean; underline: boolean; strikethrough: boolean }
RichTextList  = { ordered: boolean; items: RichTextListItem[] }
RichTextListItem = { spans: RichTextSpan[]; lists: RichTextList[] }
RichTextBlock = { kind: 'paragraph'; spans: RichTextSpan[] }
              | { kind: 'heading'; depth: number; spans: RichTextSpan[] }   // depth 0 = top level in this document
              | { kind: 'list'; list: RichTextList }
```

| Wire input | Result | Warning |
|---|---|---|
| `paragraph` | paragraph | — |
| `heading`, level 1–6 | heading; `depth` = level − the smallest heading level in the document | — |
| `list` | list, `ordered` from `format` | — |
| `list-item` | item | — |
| nested `list` inside a `list` | attached to the **preceding** item's `lists` (to a new empty item if it comes first), so the output is valid `ul > li > ul` | — |
| `text` | span with `bold`, `italic`, `underline`, `strikethrough`; the `code` mark is ignored (text kept) | — |
| `link` | its text children become spans; `url`, `rel`, `target` are dropped | `link` |
| `quote` | paragraph | `quote` |
| `code` block | paragraph (text kept) | `code` |
| `image` | dropped | `image` |
| unknown `type`, or a node of the wrong shape (missing `children`, non-string `text`, heading level outside 1–6, list `format` not in the two values) | dropped | the node type if it is a short identifier (`/^[a-z-]{1,32}$/`), else `unknown` |
| a list nested more than 6 levels deep | the deeper lists are dropped | `list-depth` |
| a paragraph, heading or item whose spans are all blank | dropped silently (the editor leaves empty paragraphs) | — |
| `value` not an array, or no non-blank text left after the rules above | `null`: the terms entry is malformed and skipped (spec §7.2) | `body` |

- Warnings use `console.warn` and name the node type or problem only, never text, URL or file
  name (US-01 boundary pattern; CLAUDE.md §3). One warning per fallen-back node.
- The parser never returns wire objects: the renderer receives only `RichTextBlock[]`.

**Renderer component**

`frontend/src/app/shared/rich-text.ts` → `RichText`, selector `app-rich-text`, inputs
`blocks: readonly RichTextBlock[]` (required) and `headingLevel: 2 | 3 | 4 | 5 | 6` (the level of
`depth` 0). Template rules:

- Element names come only from fixed template branches: `@switch` on `kind` → `p`, a heading
  `@switch` on `min(6, headingLevel + depth)` → `h2`…`h6`, `@if (list.ordered)` → `ol` / `ul`,
  `li`; marks → `strong` (bold), `em` (italic), `u` (underline), `s` (strikethrough), nested in that
  fixed order. Nested lists use a recursive `ng-template` with `ngTemplateOutlet`
  (`@angular/common@22.3.0`).
- Content reaches the DOM **only** as text interpolation `{{ span.text }}`. In
  `@angular/core@22.3.0`, a text binding calls `updateTextNode` → `renderer.setValue`
  (`fesm2022/_debug_node-chunk.mjs:3306-3308`, 17855-17861), which the DOM renderer implements as
  `node.nodeValue = value` (`@angular/platform-browser@22.3.0`
  `fesm2022/_dom_renderer-chunk.mjs:679-681`): a text node, never parsed as HTML. angular.dev:
  "Interpolated content is always escaped".
- No content value is bound to any property or attribute (no `[innerHTML]`, `[href]`, `[src]`,
  `[style]`, `[attr.*]`, `[class]` from content); no `DomSanitizer`, `bypassSecurityTrust*`,
  `ElementRef.nativeElement` writes, `Renderer2.setProperty`, `insertAdjacentHTML` or
  `outerHTML`. Link URLs and image URLs never reach the component, so no request to `/uploads` or a
  third-party host is possible (D8).
- Line breaks inside a text (`\n`) are kept with CSS `white-space: pre-line`; no `<br>` is built.
- The component has no logging; it trusts the typed tree it is given.
- Heading hierarchy (D7): the summary page passes the level directly below the terms title
  heading. With "Términos y condiciones" as `h2` (US-03-AC-17) and the terms title as `h3`, body
  headings start at `h4`; relative depths are preserved and clamped at `h6`.

### Consequences

- Good, because there is no HTML string path: the AC-13 rows (`<img src=x onerror=alert(1)>`,
  `<script>…`, `<b>negrita</b>`) can only ever be text, and the review-checklist item is met more
  strictly than it asks (no `[innerHTML]` at all) (D1).
- Good, because editors use Strapi's visual editor; they need no Markdown, and the server rejects
  structurally invalid content (D3, D4).
- Good, because the renderer is data-driven and reusable for help texts and future rich content.
- Good, because no dependency is added (D6), and the output has the semantic elements the tests
  and assistive technology need (`h*`, `ul`/`ol`/`li`, `strong`, `em`) (D2, D7).
- Bad, because we own a parser for a Strapi-defined format with no Angular renderer upstream (only
  React, Vue and Nuxt renderers exist on npm) — mitigation: the parser is small, pure and
  exhaustively unit-tested; unknown nodes are dropped, never rendered raw; Strapi is pinned
  (CLAUDE.md §4), and an upgrade re-checks `blocks.d.ts` and `blocks-validator.js` against the
  wire type.
- Bad, because links, images, quotes and code blocks entered in the admin are lost or flattened,
  silently for the editor — mitigation: a warning in the console; the supported formatting is
  documented for editors in the README by the developers (this ADR does not rely on the admin
  being able to hide toolbar buttons per field, which was not verified); a link node can be added
  later as a whitelisted node with an `https:` check.
- Bad, because the `blocks` JSON is verbose to write by hand in the seed — mitigation: the seed is
  code written once; editors never see the JSON.
- Neutral: the inline `code` mark is shown as plain text.

### Strongest argument against

Option B uses the defence the framework documents and maintains: Angular's built-in HTML
sanitiser (maintained by the Angular team, with its own mutation-XSS loop) on the output of a
mature, widely used Markdown parser. Option D instead puts **our own code** on the security
boundary: a hand-written parser of a JSON format that Strapi defines, for which Strapi ships only a
React renderer, and which can change on any Strapi upgrade without a compile error on our side.
It also takes away links, which legal texts commonly need (a regulator's page, the full policy),
and an editor who adds one sees it work in the admin and disappear on the site, with no feedback.

**Why we accept it:** our code emits typed objects, never markup; the only DOM writes are fixed
element names and `nodeValue`, so a parser bug can drop or misplace text but cannot inject an
element. Option B, by contrast, cannot pass US-03-AC-13 as written with a stock configuration:
`marked` 18.2.1 passes raw HTML through (its renderer returns the `html` token's text unchanged,
and its README warns "Marked does not sanitize the output HTML"), and Angular's sanitiser then
keeps `<b>` and keeps `<img src="x">` without the handler (`img` and `src` are on its allow-list,
`@angular/core@22.3.0` `_debug_node-chunk.mjs:3164-3175`), so an element is added and
`<b>negrita</b>` renders bold. Making B pass needs extra configuration (`markdown-it`'s
`html: false`), a pinned dependency, and still leaves an `[innerHTML]` sink to review on every
change. Drift is contained by the pinned Strapi version and the boundary parser; links are a
deliberate, reversible scope cut for a checkout page.

### Confirmation

- Unit (`terms.spec.ts`, or `rich-text-blocks.spec.ts` next to the parser; the test-engineer
  chooses, spec §11): every row of the parser table; the CO and CL seed bodies parse to the
  expected tree; nested lists attach to the preceding item; heading depths are relative; every
  warning names the type and its arguments contain none of the input text or URLs; an empty array
  and an all-blank body return `null`.
- Component (`rich-text.spec.ts`, US-03-AC-13): the CO seed renders "Condiciones principales" as a
  heading, one `ul` with three `li`, and "ficticio" inside `strong`; the CL seed renders an `ol`;
  for each XSS row the element's `textContent` contains the literal string and the component
  contains no `img`, `script` or `b` element; a nested list renders as `ul > li > ul`; heading
  levels follow `headingLevel`.
- E2E (`full-flow-co`, `summary-payment-cl`): the seeded terms of each country are visible with
  their heading (US-03-AC-02, AC-14).
- Review: `grep -rnE "innerHTML|outerHTML|insertAdjacentHTML|bypassSecurityTrust|DomSanitizer"
  frontend/src` returns no match; `RichText` binds content only through `{{ }}`; no new entry in
  `frontend/package.json`.

## Pros and Cons of the Options

### A. Plain text

- Good, because it is the safest and simplest: interpolated text, no parser, no dependency.
- Good, because editors cannot produce anything unsupported.
- Bad, because headings, lists and bold are lost: US-03-BR-07 ("keeps its formatting") and the
  first scenario of US-03-AC-13 fail, and the seed annex cannot be represented.
- Bad, because editors would fake structure with dashes and capitals, which assistive technology
  reads as plain paragraphs (D7).

### B. Markdown (`richtext`) with a library and `[innerHTML]`

- Good, because Markdown is a known format, and the HTML is cleaned by Angular's maintained
  sanitiser, which the review checklist allows.
- Good, because links and the rest of Markdown come for free.
- Bad, because it adds a pinned dependency (`marked` 18.2.1, or `markdown-it` 15.0.3 with six
  dependencies of its own, or `ngx-markdown` 22.1.1, which needs `marked` as a peer) (D6).
- Bad, because raw HTML in the Markdown is rendered as elements by default with `marked` (README:
  "Marked does not sanitize the output HTML"), and the sanitiser keeps safe-looking elements such
  as `img` with `src` and `b`: US-03-AC-13 fails unless HTML is disabled in the parser
  (`markdown-it`'s default preset sets `html: false`).
- Bad, because Strapi stores `richtext` as a plain string (`@strapi/database@5.63.0`
  `dist/fields/index.js:20`) with no structural validation, so editors can save anything (D4), and
  the admin's Markdown editor exposes syntax to non-technical users (D3).
- Bad, because the sanitiser keeps `img` with a remote `src`, so content could make the page fetch
  third-party URLs (D8), and it keeps attributes such as `tabindex` and `role` that can break the
  page's keyboard and screen-reader behaviour (D7).

### C. `blocks` serialised to an HTML string, bound with `[innerHTML]`

- Good, because editors get the visual editor and server-side structure validation (D3, D4).
- Good, because Angular's sanitiser is a second line of defence.
- Bad, because it builds an HTML string from editor text: one missed escape turns text into markup,
  and the sanitiser would then keep `b` or `img` (AC-13 fails rather than an exploit, but the
  defence depends on the escaping being right everywhere).
- Bad, because a library (`blocks-html-renderer` 1.0.7) is a new dependency (D6); writing the
  serialiser ourselves is the same work as option D with a worse sink.
- Bad, because it keeps an `[innerHTML]` sink that every later change must re-review.

### D. `blocks` with a whitelist renderer (chosen)

- Good, because no HTML string exists; only fixed element names and text nodes reach the DOM (D1).
- Good, because it keeps all the required formatting with semantic elements (D2, D7).
- Good, because editors use the visual editor and the server validates structure (D3, D4).
- Good, because it adds no dependency (D6) and fetches nothing else (D8).
- Bad, because we maintain a parser of a Strapi-defined format, with no upstream Angular renderer.
- Bad, because links, images, quotes and code blocks are flattened or dropped.

## Spec impact

None that changes an AC. The approved spec v0.1 describes this option (US-03-Q-02, AC-13, §7.2).
Precisions for the developers and the test-engineer:

- Heading level: the spec says "shown one level below the section heading" (US-03-Q-02). This ADR
  reads it as one level below the **terms title heading** (`h4` when the title is `h3` under the
  `h2` "Términos y condiciones"). If the page renders the title as a non-heading label, the input
  is `3`. US-03-AC-13 only asks for "a heading inside the terms"; the page spec or the developer
  fixes the title's element, and the component takes the level as an input either way.
- The parser lives in `shared/rich-text-blocks.ts` (reusable), called from `shared/terms.ts`; the
  whitelist tests may live in either spec file (§11 allows the test-engineer to adjust paths).
- The inline `code` mark and nested lists, which the spec does not mention, are handled as above.

## More Information

- Verified on 2026-11-21 in the installed packages (versions read from each `package.json`):
  - `@strapi/types` 5.63.0, `dist/schema/attribute/definitions/blocks.d.ts` (the node shapes in
    the wire-type table).
  - `@strapi/core` 5.63.0, `dist/services/entity-validator/blocks-validator.js` (accepted node
    types and link protocols), `dist/services/entity-validator/index.js:46-58` and 290-300
    (`required` semantics, skipped for drafts), `dist/services/entity-validator/validators.js:369`
    (`blocks` uses that validator).
  - `@strapi/database` 5.63.0, `dist/fields/index.js:20,33` (`richtext` is a string, `blocks` is
    JSON).
  - `@strapi/utils` 5.63.0, `dist/content-types.js:258-265` (`blocks` is scalar).
  - `@strapi/content-manager` 5.63.0, `dist/admin/pages/EditView/components/FormInputs/BlocksInput/`
    (the admin editor offers paragraph, heading, list, quote, code, image and link blocks and the
    bold, italic, underline, strikethrough and inline-code modifiers, `Modifiers.mjs`).
  - `@angular/core` 22.3.0, `fesm2022/_debug_node-chunk.mjs` (sanitiser allow-lists at 3164-3175,
    `script`/`style`/`template` content skipped at 3176, text bindings at 3303-3308 and
    17855-17861); `@angular/platform-browser` 22.3.0 `fesm2022/_dom_renderer-chunk.mjs:679-681`
    (`nodeValue`); `@angular/common` 22.3.0 (`NgTemplateOutlet`).
- npm registry, read 2026-11-21 with `npm view` and `npm pack` into a scratch directory:
  `marked` 18.2.1 (README warning; renderer `html()` returns the raw text), `markdown-it` 15.0.3
  (dependencies; `html: false` in its default preset), `ngx-markdown` 22.1.1 (peer
  `marked ^17 || ^18`, `@angular/core ^22`), `@strapi/blocks-react-renderer` 1.0.2 (peer React
  only), `blocks-html-renderer` 1.0.7 (HTML string output). No Angular renderer for Strapi blocks
  was found.
- angular.dev, "Security" (https://angular.dev/best-practices/security, read 2026-11-21): "Angular
  treats all values as untrusted by default"; "Interpolated content is always escaped"; on
  `[innerHTML]`, Angular "automatically sanitizes it, which removes the `script` element"; on
  `bypassSecurityTrust*`, "If you trust a value that might be malicious, you are introducing a
  security vulnerability into your application."
- Related ADRs: ADR-0001 (terms per country), ADR-0002 and ADR-0005 (read path and permissions,
  unchanged), ADR-0006 (no free JSON: `blocks` is structured and server-validated).
- Revisit when: editors need links (add a `link` node with an `https:`-only check and
  `rel="noopener noreferrer"`), images (needs `/uploads` on the proxy allow-list, ADR-0002), or a
  Strapi upgrade changes `blocks.d.ts` or `blocks-validator.js`.
