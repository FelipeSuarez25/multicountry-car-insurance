import { TestBed } from '@angular/core/testing';
import { CLOCK } from '../core/clock';
import { FieldConfig } from '../core/field-config';
import { hydrate, toOutput } from '../core/form-values';
import { parseFieldConfigs } from '../core/parse-field-configs';
import { ageOn, parseIsoDate, validateField } from '../core/validate-field';
import { fixtureConfigs, TODAY } from './harness';

const cfg = (key: string) => fixtureConfigs().find((c) => c.key === key)!;

describe('core (library-agnostic)', () => {
  it('parseFieldConfigs sorts by sortOrder and sorts select options', () => {
    const c = fixtureConfigs();
    expect(c.map((f) => f.key)).toEqual(['birthDate', 'make', 'vehicleYear', 'licenseIssueDate', 'plate', 'acceptsOffers']);
    expect(c[1].options!.map((o) => o.value)).toEqual(['marca-a', 'marca-b', 'marca-c']);
  });

  it('parseFieldConfigs drops malformed fields with a warning and keeps the rest', () => {
    const warn = vi.fn();
    const out = parseFieldConfigs({ data: [
      { key: 'ok', type: 'text', label: 'Ok', isRequired: false, sortOrder: 1, errorMessage: 'x', rules: [] },
      { key: 'Bad Key', type: 'text', label: 'x', isRequired: false, sortOrder: 2, rules: [] },
      { key: 'ruleOnWrongType', type: 'text', label: 'x', isRequired: false, sortOrder: 3, errorMessage: 'x', rules: [{ kind: 'minAge', years: 18 }] },
      { key: 'badRegex', type: 'text', label: 'x', isRequired: false, sortOrder: 4, errorMessage: 'x', rules: [{ kind: 'pattern', value: '(' }] },
      { key: 'noOptions', type: 'select', label: 'x', isRequired: true, sortOrder: 5, errorMessage: 'x', rules: [] },
      { key: 'noMsg', type: 'text', label: 'x', isRequired: false, sortOrder: 6, rules: [] },
    ] }, warn);
    expect(out.map((f) => f.key)).toEqual(['ok', 'noMsg']);
    expect(out[1].errorMessage).toBe('Revisa este campo.');
    expect(warn).toHaveBeenCalledTimes(5);
  });

  it('number: integer only, 0 is a value, yearRange limits are inclusive (today 2026)', () => {
    const y = cfg('vehicleYear');
    expect(validateField(y, '', TODAY)).toBe(y.requiredMessage);
    expect(validateField(y, '0', TODAY)).toBe(y.rules[0].message); // present, so not "required"
    expect(validateField(y, '2020.5', TODAY)).toBe(y.errorMessage);
    expect(validateField(y, '2006', TODAY)).toBeNull();
    expect(validateField(y, '2005', TODAY)).not.toBeNull();
    expect(validateField(y, '2027', TODAY)).toBeNull();
    expect(validateField(y, '2028', TODAY)).not.toBeNull();
  });

  it('date: invalid calendar date, optional empty skips rules, minAge boundaries', () => {
    const b = cfg('birthDate'), o = cfg('licenseIssueDate');
    expect(parseIsoDate('2026-02-31')).toBeNull();
    expect(validateField(b, '2026-02-31', TODAY)).toBe(b.errorMessage);
    expect(validateField(o, '', TODAY)).toBeNull();
    expect(validateField(b, '2008-11-20', TODAY)).toBeNull();
    expect(validateField(b, '2008-11-21', TODAY)).not.toBeNull();
    expect(ageOn({ y: 2008, m: 2, d: 29 }, new Date(2026, 1, 28))).toBe(17);
    expect(ageOn({ y: 2008, m: 2, d: 29 }, new Date(2026, 2, 1))).toBe(18);
  });

  it('optional pattern: empty and whitespace-only are valid, pattern is anchored', () => {
    const p = cfg('plate');
    expect(validateField(p, '', TODAY)).toBeNull();
    expect(validateField(p, '   ', TODAY)).toBeNull();
    expect(validateField(p, 'ABCD12', TODAY)).toBeNull();
    expect(validateField(p, 'xABCD12', TODAY)).toBe(p.errorMessage);
    expect(validateField(p, 'ABCD123', TODAY)).toBe(p.errorMessage);
  });

  it('select: must be one of the options', () => {
    const m = cfg('make');
    expect(validateField(m, '', TODAY)).toBe(m.errorMessage);
    expect(validateField(m, 'nope', TODAY)).toBe(m.errorMessage);
    expect(validateField(m, 'marca-a', TODAY)).toBeNull();
  });

  it('hydrate drops unknown keys and coerces numbers; toOutput maps empty optionals to null', () => {
    const c = fixtureConfigs() as FieldConfig[];
    const h = hydrate(c, { vehicleYear: 2020, gone: 'x', acceptsOffers: true });
    expect(h).toEqual({ birthDate: '', make: '', vehicleYear: '2020', licenseIssueDate: '', plate: '', acceptsOffers: true });
    expect(toOutput(c, h)).toEqual({ birthDate: null, make: null, vehicleYear: 2020, licenseIssueDate: null, plate: null, acceptsOffers: true });
  });

  it('CLOCK token is injectable and overridable', () => {
    TestBed.configureTestingModule({ providers: [{ provide: CLOCK, useValue: () => TODAY }] });
    expect(TestBed.inject(CLOCK)()).toBe(TODAY);
  });
});
