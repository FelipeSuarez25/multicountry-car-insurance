---
status: Accepted
date: 2026-11-21
decision-makers: Felipe Sabogal (accepted at HC2, 2026-11-21), architect subagent (proposal)
consulted: specs/US-03/spec.md v0.1 (Approved; §4 BR-05, BR-06, BR-08, §5 AC-03, AC-04, AC-09, AC-10, AC-11, AC-15, AC-17, AC-19, §6 US-03-Q-01, Q-07..Q-10, Q-13, Q-17), ADR-0001..0003, ADR-0007, reviews of US-01 and US-02, `review-checklist` skill, installed packages @angular/core 22.3.0, vitest 5.1.1, @playwright/test 1.65.1 (playwright-core 1.65.1), MDN (Crypto.getRandomValues, aria-busy, disabled attribute)
informed: all agents via CLAUDE.md precedence
---

# ADR-0008: Simulated payment: a visible outcome choice, a front-end gateway boundary, no card data

## Context and Problem Statement

US-03 ends the wizard with a payment. The assessment says: "Payment is simulated: a button that
leads to a confirmation screen or a mock gateway. Do not integrate real payment gateways or use
real card data." The story has a "Rejected payment" scenario ("Given … the simulated payment
fails, When I click pay"), and the same build serves users and tests, so the rejected path must be
reachable in the production build without a test-only switch. We must decide where the outcome
comes from, how long processing takes and how tests control it, which boundary a real gateway
would later replace, how double submission is prevented, what the quote number is, what is cleared,
how the processing state is announced, and how "no real card data" is guaranteed and checked. The
human accepted the spec's proposal at HC1 (US-03-Q-01: "OK", Felipe Sabogal, 2026-11-21) and asked
for it to be weighed against real alternatives. Story: US-03 (`specs/US-03/spec.md` §4 BR-05,
BR-06, BR-08; §6 US-03-Q-01).

## Decision Drivers

- D1. "Payment is simulated … Do not integrate real payment gateways or use real card data."
  (source: Assessment; US-03-BR-08).
- D2. The rejected path is testable with the same build, end to end, and deterministically
  (source: story "Rejected payment"; US-03-AC-04, US-03-BR-08; Assessment: "the same application
  and the same build serve Colombia and Chile").
- D3. "The payment cannot be submitted twice." (source: story; US-03-BR-05, US-03-AC-09).
- D4. Success deletes the wizard state before the confirmation; rejection clears nothing; payment
  data is never stored (source: ADR-0003; US-03-BR-06, BR-08, Q-10).
- D5. No personal data leaves the browser; reads only, through the GET-only proxy; no write path
  for anonymous callers (source: ADR-0002 as amended by ADR-0005; US-03-AC-19).
- D6. Keyboard-only use and perceivable states: the disabled pay button explains why, the
  processing and rejection states are announced once (source: Assessment, accessibility;
  US-03-AC-16, AC-17, Q-17; `review-checklist`: "Disabled pay button: its state is perceivable").
- D7. Unit tests control time and randomness; "today" comes from the injectable `CLOCK`
  (source: Assessment, testing; US-01-Q-06; ADR-0007 D8; US-03-Q-07).
- D8. Smallest change: no new route, guard, dependency or backend code (source: human decisions
  recorded as D3 in ADR-0005, D4 in ADR-0006, D12 in ADR-0007; US-03-Q-06 keeps the
  confirmation on `/:country/resumen`).
- D9. A real gateway can later replace the simulation in one place (source: US-03-Q-01, "It is a
  design that a real gateway would later replace").

## Considered Options

1. **A. Visible outcome choice on the summary**: a code-owned radio group "Simulación de pago (no
   se realiza ningún cobro)" with "Pago aprobado" (default) and "Pago rechazado", read when
   "Pagar" is activated, passed to a front-end simulated gateway that waits a fixed time and
   resolves; no card fields; no request.
2. **B. Mock gateway screen**: "Pagar" opens a gateway stand-in (a route such as
   `/:country/pago`, or a dialog) that shows the amount and two buttons, "Aprobar pago" and
   "Rechazar pago"; the outcome is chosen there.
3. **C. Deterministic rule on the input** ("magic values"): the outcome follows from the person's
   data, for example a document number or plate ending in a reserved value means "rejected"
   (variant: a hidden URL parameter such as `?pago=rechazado`).
4. **D. Random outcome**: a fixed share of attempts (for example 20 %) is rejected.
5. **E. Fictitious test card form**: card number, expiry and security code fields; reserved test
   numbers decide the outcome, as in real gateway sandboxes.

**Excluded, because it contradicts accepted ADRs: a backend mock endpoint** (for example
`POST /api/payments` in Strapi that answers approved or rejected). ADR-0002 makes the content API
read-only for the browser: the proxy forwards only `GET`/`HEAD` on an allow-list and answers `405`
to anything else, and the public role holds only `find` permissions. A payment endpoint needs a
write-like route open to anonymous callers, a new public permission or custom route, a proxy
exception for `POST`, and a request body carrying at least the plan and amount (US-03-AC-19
requires that no request contains the plan key or any step 1 value). It would also add bespoke
backend code for a simulation (against D8). Choosing it would need an ADR superseding ADR-0002.

## Decision Outcome

Chosen option: **"A. Visible outcome choice on the summary"**, because it is the only option that
is deterministic for both outcomes with the same build and no hidden behaviour (D2), asks for no
card data at all (D1), sends no request (D5), needs no new route, guard or dependency (D8), and
lets the story's scenario read as written: the outcome is set ("Given … fails") before the
activation ("When I click pay"). The gateway boundary (below) is what a real integration would
replace (D9).

### What is decided

**Outcome choice (code-owned copy, spec §8.1)**

- A `fieldset` with the `legend` "Simulación de pago (no se realiza ningún cobro)" and two native
  radio inputs, "Pago aprobado" (value `approved`, checked on arrival) and "Pago rechazado" (value
  `rejected`). Native radios give the radio group role, its accessible name from the legend, and
  arrow-key selection (US-03-AC-17).
- The choice lives in the page's memory only. It is never written to `sessionStorage`, the URL or
  a log (ADR-0003, US-03-Q-10). It is kept after a rejection and reset when the page is left or
  reloaded (US-03-BR-03, BR-08).
- The value is read **once**, when an attempt starts, and passed to the gateway. The group is
  disabled during the attempt, so it cannot change mid-attempt.

**Gateway boundary (the part a real gateway replaces, D9)**

- `frontend/src/app/core/payment-gateway.ts`: an abstract class `PaymentGateway` used as the DI
  token, with
  `pay(request: PaymentRequest, signal: AbortSignal): Promise<PaymentResult>`, where
  `PaymentRequest = { simulatedOutcome: 'approved' | 'rejected' }` and
  `PaymentResult = { status: 'approved' } | { status: 'rejected' }`. No amount, plan, country or
  personal value is passed: nothing that is not needed exists at the boundary.
- `frontend/src/app/core/simulated-payment-gateway.ts`: `SimulatedPaymentGateway`, provided as
  `{ provide: PaymentGateway, useClass: SimulatedPaymentGateway }`. It injects **no** `HttpClient`
  and no storage; it waits `SIMULATED_PROCESSING_MS = 1500` through the injected delay, then
  resolves to `{ status: request.simulatedOutcome }`. File names follow CLAUDE.md §6 (intent-
  revealing, no role suffix); the spec's `payment.spec.ts` is
  `simulated-payment-gateway.spec.ts`.
- A real gateway would replace `SimulatedPaymentGateway` and `PaymentRequest` (it would carry a
  payment token from the provider's own hosted fields, never card data in this app), and remove
  the outcome choice. The page's states (processing, rejected, confirmed) stay.

**Injectable delay and clock (D7)**

- `PAYMENT_DELAY`: `InjectionToken<(ms: number, signal: AbortSignal) => Promise<void>>`, in
  `simulated-payment-gateway.ts`, default factory based on `setTimeout` and cleared on abort
  (the promise rejects with an `AbortError`). It must be timer-based, never a loop on `Date.now()`:
  the e2e tests pin the page clock with `page.clock.setFixedTime`, which (verified, playwright-core
  1.65.1 `types/types.d.ts`) "Makes `Date.now` and `new Date()` return fixed fake time at all
  times, keeps all the timers running", so a timer completes in 1.5 s while a `Date.now()` loop
  would never end.
- Unit and component tests either use Vitest fake timers (`vi.useFakeTimers()`,
  `vi.advanceTimersByTimeAsync(1500)`, verified in vitest 5.1.1 `dist/index.d.ts`) or provide a
  controllable `PAYMENT_DELAY`.
- E2E tests keep the real 1.5 s (US-03-AC-15 measures it from the Node side, not with the page's
  pinned `Date`). They must not use `page.clock.install()` without `runFor`, because that also
  freezes timers.
- "Today" for the quote number comes from `CLOCK` (`frontend/src/app/core/clock.ts`,
  `InjectionToken<() => Date>`), read when the approved result arrives; the date is the browser's
  local date (US-01-Q-06).

**Double-submit prevention (D3, US-03-BR-05)**

Three layers, each sufficient on its own for its case:

1. **Synchronous page guard.** The pay handler is bound to `(click)` only (a native `button`
   turns Enter and Space into one `click`; no extra key handlers). It returns at once unless
   `canPay()` holds (terms shown, accepted, state `idle` or `rejected`), and it sets the page state
   to `processing` **before** any `await`. A second click in the same task finds `processing`.
2. **Gateway in-flight flag.** `SimulatedPaymentGateway` holds a private `inFlight` flag; a `pay`
   call while it is set starts no timer and rejects with a `PaymentInProgressError` that the page
   ignores. This protects any future caller, not only this page.
3. **Perceivable lock.** During `processing`: "Pagar" keeps focus and reads "Procesando pago…",
   with `aria-disabled="true"` (not native `disabled`: MDN, "disabled controls cannot receive
   focus", which would drop the keyboard user's focus to the page body); the outcome `fieldset` and
   the terms checkbox are natively disabled; "Editar mis datos" and "Cambiar plan" are
   `aria-disabled="true"` and their handlers return early. `aria-disabled` does not block clicks by
   itself, so every handler checks the state.

After `approved`, the page state is `confirmed` and no handler starts another attempt. After
`rejected`, a new attempt is possible.

**Leaving during processing**

- The page owns an `AbortController`; `DestroyRef.onDestroy` aborts it. Browser back during an
  attempt destroys the page, the delay rejects, and **nothing** is cleared or shown (an attempt
  never completes on a page that is gone). A reload abandons the attempt the same way (US-03-Q-08).

**Simulated quote number (US-03-Q-07, AC-10)**

- Format `COT-<country code>-<YYYYMMDD>-<6 digits>`, for example `COT-CO-20261121-482913`.
  `COT` stands for *cotización*; the number is fictitious, not unique across sessions (one in a
  million per country and day), and the confirmation says the payment is simulated.
- `frontend/src/app/shared/quote-number.ts`: a pure `formatQuoteNumber(countryCode, today,
  digits)` (upper-case code, local `YYYYMMDD`, `digits` zero-padded to 6).
- `frontend/src/app/core/random-digits.ts`: `RANDOM_DIGITS`, `InjectionToken<() => number>`
  returning an integer in `[0, 999 999]`. The default uses `crypto.getRandomValues` on a
  `Uint32Array(1)` with rejection sampling (discard values ≥ 4 294 000 000, then `% 1 000 000`),
  so every value is equally likely. MDN: `getRandomValues()` "is the only member of the `Crypto`
  interface which can be used from an insecure context", so it works on the plain-HTTP
  `docker compose` stack. Tests provide a fixed source.
- The number is kept only in the page's memory: never stored, sent, logged, or put in the URL or
  the document title (US-03-AC-10).

**What is cleared and kept (ADR-0003, D4)**

| Outcome | Wizard state (`quote-wizard` entry and `QuoteStore` memory) | Page memory | Shown |
|---|---|---|---|
| Approved | **Deleted** through a new `QuoteStore` method (for example `clearQuote()`), which removes the entry and resets the in-memory step 1 values and plan, **before** the confirmation state is set | Quote number kept; terms acceptance and outcome choice discarded with the summary view | Confirmation (US-03-Q-13) |
| Rejected | **Nothing** cleared | Terms acceptance and outcome choice kept | Rejection message; "Pagar" enabled again |
| Abandoned (back, reload during processing) | Nothing cleared | Lost with the page | Whatever the navigation shows |

Order on approval: result → quote number (`CLOCK`, `RANDOM_DIGITS`) → `clearQuote()` → page
state `confirmed` → document title "Pago confirmado | Cotizador de seguro de auto" → focus on the
"Pago confirmado" heading after render (`afterNextRender`). Only `QuoteStore` touches
`sessionStorage` (ADR-0003). The confirmation is rendered by the same component, **not** in a
`@defer` block or a lazy chunk, so no request (not even a JavaScript chunk) is sent between the
activation and the confirmation (US-03-AC-15).

**Accessibility of the processing state (D6, US-03-AC-17)**

- The summary content gets `aria-busy="true"` during `processing`. MDN: `aria-busy="true"` tells
  assistive technology "to wait until the modifications or changes are complete before exposing
  the content". Therefore the status and alert regions are placed **outside** the busy subtree,
  or they would be held back.
- A polite `role="status"` region, outside the busy subtree and present from the start (empty),
  receives "Procesando pago…" once when the attempt starts and is emptied when it ends.
- On rejection: `aria-busy` is removed first, then the rejection message is rendered in a
  `role="alert"` region next to "Pagar" (outside the busy subtree); focus stays on "Pagar"
  (US-03-Q-09). The message is removed when a new attempt starts.
- On approval: focus moves to the confirmation heading and the title changes (US-03-AC-16).
- No animation is needed; if a spinner is added, it respects `prefers-reduced-motion`.

**How "no real card data" is guaranteed (D1) and how a reviewer verifies it**

Guarantees by construction:

- The summary and confirmation contain exactly three form controls: the terms checkbox and the two
  outcome radios. No `input`, `select` or `textarea` exists for card, expiry, security code, bank
  or any personal data, and no element carries an `autocomplete` token starting with `cc-` (which
  would invite the browser to autofill a saved real card).
- `PaymentGateway`'s request type has no field that could hold card data; `SimulatedPaymentGateway`
  injects no `HttpClient`.
- No payment SDK or third-party script is added: `frontend/package.json` dependencies are
  unchanged by US-03.
- The proxy and Strapi are unchanged except for the terms read path (spec §7.4).

Checks:

- Component test (`summary-page.spec.ts`, US-03-AC-15): the page's `input`, `select` and
  `textarea` elements are exactly one checkbox and two radios; no `autocomplete^="cc-"`.
- Unit test (`simulated-payment-gateway.spec.ts`): with `provideHttpClientTesting()`,
  `HttpTestingController.verify()` passes after an approved and a rejected attempt; the result
  arrives at 1500 ms and not before; a second `pay` during an attempt starts no timer; abort
  rejects and starts nothing.
- E2E (`full-flow-co`, US-03-AC-15, AC-19): `page.on('request')` records **zero** requests between
  the activation of "Pagar" and the confirmation heading.
- Review: `grep -rniE "cc-(number|exp|csc)|card|tarjeta|cvv|cvc|iban" frontend/src` returns no
  match outside copy that says no charge is made; `git diff main -- frontend/package.json` shows no
  new dependency.

### Consequences

- Good, because both outcomes are reachable deterministically, by users and tests, with the same
  build and no hidden switch (D2).
- Good, because no card data can be entered: there is nowhere to type it, and no browser autofill
  target exists (D1).
- Good, because nothing is sent: the payment adds no request, permission, route or backend code
  (D5, D8).
- Good, because the story's "Given the simulated payment fails, When I click pay" maps directly to
  "choose Pago rechazado, then Pagar".
- Good, because a real gateway replaces one provider and one request type; the page's states and
  the clearing rules stay (D9).
- Bad, because a test control sits in front of every user: a real checkout never lets the buyer
  choose the outcome — mitigation: the legend says "Simulación de pago (no se realiza ningún
  cobro)", the confirmation repeats that no real charge was made, and the group disappears when a
  real gateway is integrated.
- Bad, because the fixed 1.5 s adds 1.5 s to every payment attempt in the e2e runs — mitigation:
  accepted; it is the time AC-15 checks, and the planned e2e files make only a few attempts.
- Bad, because quote numbers can repeat across sessions — mitigation: they are fictitious, never
  stored or looked up, and only shown once.
- Neutral: the abstract-class boundary is a small indirection for a single implementation; it is
  the seam the spec asked for (D9) and the place tests substitute.

### Strongest argument against

Option B, the mock gateway screen, is what the assessment literally names ("a confirmation screen
or a mock gateway"), and it keeps the product honest: the summary looks like a real checkout, and
the decision about the outcome is made where a real gateway would make it, on a separate screen
after "Pagar". Option A instead puts a test harness control ("Pago aprobado / Pago rechazado")
on the production summary, in front of every user, next to the button that is supposed to take
their money. An evaluator may read that as leaking test concerns into the user interface, and a
user may wonder why they are asked whether they want their payment to fail.

**Why we accept it:** B costs a new route and guard (an ADR-0001 note) or a modal dialog with its
own focus trap, splits the double-submit lock across two screens, and moves the choice after the
click, so the story's "Given … fails, When I click pay" no longer reads as written (US-03-Q-01).
Both options are equally simulated and equally deterministic; A gets there with one native radio
group, no new route and one fewer step for keyboard users. The legend and the confirmation notice
make the simulation explicit, and the gateway boundary means the control disappears with a real
integration. The human accepted this direction at HC1.

### Confirmation

- Unit: `simulated-payment-gateway.spec.ts` (fake timers: approved and rejected at 1500 ms, not
  at 1499 ms; in-flight rejection; abort; no HTTP), `quote-number.spec.ts` (every US-03-AC-10 row
  with a pinned `CLOCK` and a fixed `RANDOM_DIGITS`; the default source's range),
  `quote-store-clear.spec.ts` (entry and in-memory state deleted by `clearQuote()`; nothing
  removed on rejection).
- Component: `summary-page.spec.ts`: default "Pago aprobado"; exactly three form controls; three
  activations within 200 ms start one attempt (US-03-AC-09); during processing every action is
  unavailable and "Pagar" keeps focus; `aria-busy` and the status region outside it; rejection in
  `role="alert"`, state kept, focus on "Pagar"; on approval the store is cleared before the
  confirmation renders, focus and title per US-03-AC-16.
- E2E: `full-flow-co` (approved path, zero requests during payment, storage cleared, reload and
  back lead to an empty step 1, double activation) and `summary-payment-cl` (rejected, then
  approved).
- Review checklist: "Disabled pay button: its state is perceivable"; the grep and dependency checks
  above; `sessionStorage` referenced only in `QuoteStore`; no `@defer` around the confirmation.

## Pros and Cons of the Options

### A. Visible outcome choice on the summary (chosen)

- Good, because it is deterministic for both outcomes with the same build, and discoverable by
  testers and evaluators without documentation (D2).
- Good, because it asks for no card or personal data (D1) and sends nothing (D5).
- Good, because it needs no route, guard, dialog or dependency (D8).
- Good, because the outcome is set before the click, as the story's scenario is written.
- Bad, because a simulation control is visible to every user of the production build.
- Bad, because it adds a control to the keyboard path (one more Tab stop, US-03-AC-16).

### B. Mock gateway screen

- Good, because it is the assessment's own example and mirrors a real hosted-gateway redirect.
- Good, because the summary stays free of simulation controls.
- Good, because the outcome is still deterministic and testable with the same build.
- Bad, because a route needs a guard and an ADR-0001 note (US-03-Q-06 kept the confirmation on
  `/resumen` to avoid this); a dialog needs a focus trap, `Escape` handling and focus return.
- Bad, because the double-submit lock spans "Pagar" and the gateway screen, and "cancel" on the
  gateway is a third outcome to specify.
- Bad, because the outcome is chosen after "Pagar", so AC-03, AC-04 and AC-15 would be rewritten.

### C. Deterministic rule on the input (magic values)

- Good, because there is no extra UI; real gateway sandboxes work this way.
- Good, because it is deterministic.
- Bad, because it is hidden: production code contains behaviour only testers know about, which is
  test-only logic in the shipped build.
- Bad, because it reads personal data (document number or plate) in the payment path, and the
  key may not exist: editors can remove or rename fields (US-01; ADR-0001).
- Bad, because the CL e2e must use different, "magic" step 1 data instead of the shared fictitious
  seed values; the URL-parameter variant is equally hidden and can be shared by link.

### D. Random outcome

- Good, because there is no extra UI and it feels like a real, occasionally failing gateway.
- Bad, because it is not deterministic (against BR-08): a user or a demo fails at random, and the
  e2e must patch `Math.random` or the crypto source through an init script, a test-only
  manipulation of the build.
- Bad, because a flaky outcome makes manual QA at HC3 non-repeatable.

### E. Fictitious test card form

- Good, because it looks like a real checkout and exercises form validation.
- Bad, because it invites real card entry: browsers offer to autofill saved real cards into fields
  marked as card fields, and nothing stops a person from typing their own card (against D1, the
  assessment's "do not use real card data").
- Bad, because card-shaped data would sit in the page's memory and in any error log by accident,
  which a real system would handle under PCI DSS; avoiding it entirely is simpler and safer.
- Bad, because it adds fields, validation and copy for no requirement.

## Spec impact

None that changes an AC. The approved spec v0.1 describes this option (US-03-Q-01, AC-15, §8.1).
Precisions this ADR adds, for the test-engineer and the developers:

- The spec's `payment.spec.ts` is named `simulated-payment-gateway.spec.ts` (§11 left the name to
  this ADR).
- "Disabled" during processing (US-03-BR-05, AC-03) is `aria-disabled="true"` on "Pagar" so it
  keeps focus (consistent with US-03-Q-17); Playwright's `toBeDisabled()` accepts `aria-disabled`
  (verified, `playwright/types/test.d.ts` 1.65.1: "Element is disabled if it has 'disabled'
  attribute or is disabled via 'aria-disabled'").
- US-03-AC-15's "1.5 seconds after the activation" is measured from the test process with a
  tolerance, because the page clock is pinned.

## More Information

- Verified on 2026-11-21 in the installed packages: `@angular/core` 22.3.0, `vitest` 5.1.1,
  `@playwright/test` and `playwright-core` 1.65.1 (versions read from each `package.json` under
  `frontend/node_modules`):
  - `page.clock.setFixedTime` keeps timers running; `page.clock.install` fakes timers until
    `runFor`/`fastForward` (`playwright-core/types/types.d.ts`, `Clock` interface).
  - `toBeDisabled()` covers `aria-disabled` (`playwright/types/test.d.ts`).
  - `vi.useFakeTimers` and `vi.advanceTimersByTimeAsync` (`vitest/dist/index.d.ts`, lines 437 and
    473).
  - `CLOCK` is `InjectionToken<() => Date>` in `frontend/src/app/core/clock.ts`.
  - The nginx allow-list (`frontend/nginx/default.conf.template`) answers `405` to any method other
    than `GET`/`HEAD`, which is why the backend mock endpoint is excluded.
- MDN, `Crypto.getRandomValues()`
  (https://developer.mozilla.org/en-US/docs/Web/API/Crypto/getRandomValues, read 2026-11-21):
  fills the array with cryptographically random numbers; usable from an insecure context.
- MDN, `aria-busy`
  (https://developer.mozilla.org/en-US/docs/Web/Accessibility/ARIA/Reference/Attributes/aria-busy,
  read 2026-11-21).
- MDN, HTML `disabled` attribute
  (https://developer.mozilla.org/en-US/docs/Web/HTML/Reference/Attributes/disabled, read
  2026-11-21): "disabled controls cannot receive focus".
- Related ADRs: ADR-0001 (route and guards unchanged), ADR-0002 and ADR-0005 (read-only access;
  why a backend mock is excluded), ADR-0003 (clearing rules), ADR-0007 (price shown, not passed to
  the gateway).
- Revisit when: a real payment provider is integrated (replace `SimulatedPaymentGateway`, remove
  the outcome choice, use the provider's hosted fields so card data never touches this app), or
  the product needs a stored quote or receipt (needs a server; out of scope).
