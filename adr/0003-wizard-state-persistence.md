---
status: Accepted
date: 2026-11-20
decision-makers: Felipe Sabogal (accepted at HC2, 2026-11-20), architect subagent (proposal)
consulted: specs/US-01/spec.md v0.2 (Approved), specs/US-02/story.md, specs/US-03/story.md, MDN Web Docs (Window.sessionStorage)
informed: all agents via CLAUDE.md precedence
---

# ADR-0003: Front-end persistence of the wizard state

## Context and Problem Statement

The wizard keeps the step 1 values (US-01), later the chosen plan (US-02), between steps and must
not send them to any server. The person must find their data when going back (US-01-AC-04,
US-01-AC-20) and, after a rejected payment, "try again without losing my information" (US-03
story). The values include personal data: the document number and the birth date. We must decide
where the state lives, what is stored, how it is scoped per country, and when it is cleared
(US-01-Q-15, answered "decided by the ADR; sessionStorage is the starting point", and
US-01-Q-02, default accepted).

## Decision Drivers

- D1. "Use a front-end strategy to persist the data; a database is not required." (source: Assessment; US-01-BR-08)
- D2. Data kept when going back, in-app and with browser back (US-01-AC-04, US-01-AC-20) and across a reload in the same tab, proposed by US-01-Q-15 (US-01-AC-21).
- D3. Data never crosses countries; opening another country's context discards the previous one (US-01-BR-07, US-01-AC-22, US-01-Q-02).
- D4. Privacy: document number and birth date are personal data (US-01-Q-15; spec §9 security/privacy). Step 1 values are never sent to a server or written to logs (US-01-AC-27, CLAUDE.md §3). Masking in the summary (US-03 story: "The document number is shown partially masked").
- D5. A changed configuration must not resurrect values of removed fields or options (US-01-Q-16, US-01-AC-23).
- D6. Retry after a failed payment keeps the data; a successful payment ends the quote (US-03 story: "Rejected payment", "Successful payment").
- D7. "Use fictitious data only." (source: Assessment). Tests and fixtures use only seed values.

## Considered Options

1. **In memory only** (a signal store, lost on reload).
2. **`sessionStorage`**, one versioned entry, scoped to one country, cleared on country change,
   tab close and successful payment.
3. **`localStorage` with an expiry** (for example 30 minutes), same shape.
4. **Hybrid**: `sessionStorage` for non-sensitive values, document number and birth date in
   memory only.

## Decision Outcome

Chosen option: **"2. sessionStorage"**, because it is the only option that survives a reload in
the same tab (D2) while being deleted by the browser when the tab closes, and its per-tab
partitioning keeps a CO tab and a CL tab from overwriting each other (D3). The privacy cost
(personal data in clear text in the tab's storage) is bounded by the tab lifetime and the
clearing rules below (D4).

### What is decided

**Store and storage key**

- A root-provided `QuoteStore` (signals) is the single owner of the wizard state. Components and
  guards never touch `sessionStorage` directly.
- One `sessionStorage` entry, key `quote-wizard`, value JSON:
  `{ "version": 1, "country": "<code>", "step1": { "values": { "<key>": <value> } }, "plan": … }`.
  `values` holds the **raw editing values** of the form model: strings for `text`, `number`,
  `select` and `date`, booleans for `checkbox`, and `''` for an empty field. An in-progress
  invalid value such as `'2015.5'` is stored as typed. The spec §7.3 typed output (`text` →
  trimmed string, `number` → integer, `select` → option value, `date` → `YYYY-MM-DD`, `checkbox`
  → boolean, unchecked optional checkbox → `false`, empty optional → `null`) is produced only on a
  valid "Continuar"; that typed output is what US-02 and US-03 consume. `plan` is added by US-02
  (an identifier of the chosen plan only, defined in its spec).
- **Not stored**: the field configuration, labels, option labels, plans, prices or terms. They are
  fetched once per full page load (US-01-Q-16, ADR-0001) and later steps read labels from that
  in-memory configuration. This settles the open point in spec §7.3 ("Whether it is stored or
  refetched is a persistence ADR detail"): refetched.
- **Never written to storage**: payment data (US-03), if the simulated payment asks for any. It
  lives only in the payment component's memory.
- No cookies, no `localStorage`, no IndexedDB for wizard data.

**When it is written**

- On every change of a step 1 value, the raw editing values are written (the store writes
  synchronously after updating its signal), so a reload restores exactly what the person typed,
  valid or not. The values are revalidated when shown and on "Continuar" (US-01-Q-16); only a
  valid "Continuar" produces the §7.3 typed output.

**When it is read**

- Once, when the store is created (each full page load). The JSON is validated at the boundary:
  wrong `version`, invalid JSON, a `country` that is not an alpha-2 code, or values of an
  unexpected type → the entry is discarded and a `console.warn` without any value is logged.
- When step 1 renders with the configuration of this page load: values whose key is no longer
  configured are dropped from the state, and a `select` value whose option no longer exists is
  cleared (US-01-AC-23). The pruned state is written back.

**Scope per country (US-01-Q-02)**

- The entry holds at most **one** country. When a supported country's context is entered
  (ADR-0001, `/:country` route) and the stored `country` differs, the entry is deleted before
  step 1 renders. Visiting `/` or an unknown country does not delete it.
- `sessionStorage` is partitioned by origin and by tab (MDN: "partitioned by both origin and
  browser tabs (top-level browsing contexts)"), so two tabs with different countries have
  independent state.

**When it is cleared**

| Event | Effect | Owner |
|---|---|---|
| Tab or window closed | Browser deletes it (MDN: "Closing the tab/window ends the session and clears the data in `sessionStorage`.") | Browser |
| Another supported country's context entered | Entry deleted | US-01 (`QuoteStore`, called from the `/:country` route) |
| Successful payment | Entry deleted before the confirmation is shown; the confirmation keeps only the simulated quote number in memory | US-03 |
| Rejected payment | **Nothing** cleared: the person retries with the same data | US-03 |
| Unreadable or wrong-version entry | Entry deleted | US-01 |

**Privacy rules**

- Values are never logged (no `console.*` with values, warnings name keys only), never sent in a
  request (US-01-AC-27), never put in the URL, and never in the document title.
- The full document number is stored, because US-03 masks it **at display time**; the masked form
  is never stored separately.
- No client-side encryption: the key would live in the same JavaScript as the data, so it would
  add complexity without protecting against the realistic threat (script injection in the page).
  The protection is the tab lifetime, the clearing rules and the absence of third-party scripts.
- If `sessionStorage` is unavailable (blocked by the browser, quota exceeded), the store keeps the
  state in memory only and logs one `console.warn`; the wizard still works except across reloads.

### Consequences

- Good, because the person keeps their data across steps, browser back and a reload (D2), and
  after a rejected payment (D6).
- Good, because the data disappears with the tab, with a country switch and after payment (D3, D4).
- Good, because one entry with a version number and boundary validation makes later stories'
  additions (plan) and format changes safe.
- Bad, because the document number and birth date sit in clear text in the tab's storage while
  the tab is open, readable by any script running on the origin and by anyone using the same
  browser tab — mitigation: no third-party scripts, values never logged, cleared on payment and
  country switch; the residual risk is accepted for a quote flow without accounts.
- Bad, because MDN notes the page session "survives over page reloads and restores", so a browser
  that restores a crashed or reopened session may bring the data back — mitigation: accepted;
  the data stays on the same device and profile.
- Bad, because a tab opened from the wizard tab may start with a copy of its storage (MDN: with an
  `opener`, "the `sessionStorage` is initially a copy of the opener's") — mitigation: the app opens
  no new windows; copies are independent afterwards.
- Bad, because writing on every change stores invalid intermediate values — mitigation: they are
  revalidated on display and on "Continuar"; the AC-19 guard validates before step 2.
- Neutral: spec US-01-AC-21 ("Data survives a reload") stays as written; the "memory only"
  rewrite foreseen in the spec does not apply.

### Strongest argument against

The document number and birth date stay in clear text in the tab's storage for as long as the
tab is open, readable by any script running on the origin. MDN states that the page session
"survives over page reloads and restores", so a browser that restores a crashed or reopened
session can bring that personal data back. Option 1 (memory only) avoids all of this: nothing
personal is ever written to the device. Its only cost is that a reload loses the data.

**Why we accept it:** losing everything on a reload, which users do on mobile and after errors,
fails the reload behaviour approved for AC-21 (D2), and the AC-19 guard would send the person
back to an empty step 1. The exposure is limited: no third-party scripts, values are never
logged, the entry is cleared on payment and on country switch, and the data stays on the same
device and browser profile. The residual risk is accepted for a quote flow without accounts.

### Confirmation

- Unit tests `quote-store.spec.ts`: the raw editing values (including an in-progress invalid
  value such as `'2015.5'`) are persisted on every change, and a new store instance restores them
  exactly from `sessionStorage` (AC-21); the §7.3 typed output (AC-18) is produced only on a valid
  "Continuar", never on an invalid one; entering another country deletes the entry and the original
  country is empty afterwards (AC-22); removed keys and options are pruned (AC-23); a corrupted or
  wrong-version entry is discarded with a warning that contains no value; storage unavailable →
  memory fallback.
- E2E `us-01-country-context.spec.ts` (AC-22) and `us-01-security.spec.ts` (AC-27, no value in any
  request).
- Review checklist: only `QuoteStore` references `sessionStorage`; no `localStorage`, cookies or
  IndexedDB for wizard data; no `console.*` call receives a value; US-03 clears the entry on
  successful payment and not on a rejected one.

## Pros and Cons of the Options

### 1. In memory only

- Good, because nothing is written to the device; the strongest privacy option.
- Good, because it is the simplest to implement and test.
- Bad, because a reload, which users do on mobile and after errors, loses everything (fails the
  reload behaviour proposed in US-01-Q-15; AC-21 would be rewritten).
- Bad, because a reload on step 2 or 3 sends the person back to an empty step 1 through the AC-19
  guard.

### 2. `sessionStorage` (chosen)

- Good, because it survives reloads and is cleared by the browser when the tab closes.
- Good, because it is partitioned per tab, so different countries in different tabs do not clash.
- Bad, because personal data is in clear text while the tab is open.
- Bad, because browser session restore can bring it back.

### 3. `localStorage` with an expiry

- Good, because the person could close the tab and come back within the expiry.
- Bad, because the data outlives the tab, so on a shared computer the next person can see it; the
  expiry is only enforced when the app runs again.
- Bad, because `localStorage` is shared by all tabs of the origin: a CO tab and a CL tab would
  overwrite each other's state.

### 4. Hybrid (sensitive values in memory only)

- Good, because the document number and birth date never touch storage.
- Bad, because after a reload the person must re-enter exactly the most tedious fields, and the
  AC-19 guard sends them back to step 1 with a partially filled form; AC-21 would hold only for
  some fields.
- Bad, because which keys are sensitive is decided in code, while editors can add new fields
  (for example a phone number) that would silently be stored.

## More Information

- MDN Web Docs, `Window.sessionStorage`
  (https://developer.mozilla.org/en-US/docs/Web/API/Window/sessionStorage), read on 2026-11-20:
  lifetime ("survives over page reloads and restores"; "Closing the tab/window ends the session
  and clears the data"), partitioning by origin and tab, copy from an opener.
- Related ADRs: ADR-0001 (country context and the `/:country` route that triggers the switch),
  ADR-0002 (step 1 values never sent; AC-27), ADR-0004 (forms library, reserved: how the form is
  hydrated from the store).
- Revisit when: the product needs to resume a quote on another day or device (that needs a
  server, out of scope), or real personal data is processed (a privacy review would then be
  required).
- Clarified at HC2 (Felipe Sabogal, 2026-11-20): raw editing values in storage; §7.3 typed output
  only on a valid Continuar.
