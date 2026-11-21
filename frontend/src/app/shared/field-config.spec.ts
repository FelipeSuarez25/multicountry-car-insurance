import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { parseFieldConfigs as parseUntyped } from './field-config';
import type { FieldConfig, SelectOption, ValidationRule } from './field-config.model';
import {
  seedFieldConfigs,
  seedLabels,
  seedStrapiItems,
  strapiListResponse,
  toStrapiFieldItem,
  type StrapiItem,
} from '../../testing/seed-fixtures';

/** The parser under test, with its result typed by the planned contract. */
const parseFieldConfigs = (body: unknown): FieldConfig[] => parseUntyped(body);

/** `options` is ignored on non-select fields (spec 7.1): compare without it. */
function comparable(configs: FieldConfig[]): unknown[] {
  return configs.map((c) => {
    const copy: Record<string, unknown> = { ...c };
    if (c.type !== 'select') delete copy['options'];
    return copy;
  });
}

function item(overrides: Record<string, unknown>, base?: FieldConfig): StrapiItem {
  const config: FieldConfig = base ?? {
    key: 'extraField',
    type: 'text',
    label: 'Campo extra',
    isRequired: false,
    sortOrder: 999,
    errorMessage: 'Revisa el campo extra.',
    rules: [],
  };
  return { ...toStrapiFieldItem(config, 50), ...overrides };
}

function rule(overrides: Record<string, unknown>): StrapiItem {
  return { id: 1, __component: 'form.validation-rule', value: null, years: null, maxYearsOld: null, maxYearsAhead: null, message: null, ...overrides };
}

describe('US-01-BR-01 / US-01-AC-01 sorting of the field configuration', () => {
  let warn: ReturnType<typeof vi.spyOn>;
  beforeEach(() => {
    warn = vi.spyOn(console, 'warn').mockImplementation(() => undefined);
  });
  afterEach(() => vi.restoreAllMocks());

  it('US-01-AC-01 turns the Colombia seed (sent in reverse order) into the 10 fields in sortOrder', () => {
    const parsed = parseFieldConfigs(strapiListResponse(seedStrapiItems('CO')));
    expect(parsed.map((f) => f.label)).toEqual(seedLabels('CO'));
    expect(parsed.map((f) => f.key)).toEqual([
      'documentType', 'documentNumber', 'fullName', 'birthDate', 'city',
      'plate', 'make', 'model', 'vehicleYear', 'dataConsent',
    ]);
    expect(warn).not.toHaveBeenCalled();
  });

  it('US-01-AC-01 turns the Chile seed into the 9 fields in sortOrder, with no Colombia-only field', () => {
    const parsed = parseFieldConfigs(strapiListResponse(seedStrapiItems('CL')));
    expect(parsed.map((f) => f.label)).toEqual(seedLabels('CL'));
    expect(parsed.map((f) => f.key)).not.toContain('documentType');
    expect(warn).not.toHaveBeenCalled();
  });

  it('US-01-BR-01 maps every attribute of the Strapi item to the typed contract (7.1)', () => {
    for (const country of ['CO', 'CL'] as const) {
      const parsed = parseFieldConfigs(strapiListResponse(seedStrapiItems(country)));
      expect(comparable(parsed)).toEqual(comparable(seedFieldConfigs(country)));
    }
  });

  it('US-01-BR-01 breaks sortOrder ties by key ascending', () => {
    const base = (key: string): FieldConfig => ({
      key, type: 'text', label: `Campo ${key}`, isRequired: false, sortOrder: 10, errorMessage: 'Revisa este campo.', rules: [],
    });
    const parsed = parseFieldConfigs(
      strapiListResponse([toStrapiFieldItem(base('gamma')), toStrapiFieldItem(base('alpha')), toStrapiFieldItem(base('beta'))]),
    );
    expect(parsed.map((f) => f.key)).toEqual(['alpha', 'beta', 'gamma']);
  });

  it('US-01-BR-02 sorts the options of a select by their sortOrder and keeps value and label', () => {
    const city = seedFieldConfigs('CO').find((f) => f.key === 'city')!;
    const scrambled = toStrapiFieldItem(city);
    scrambled['options'] = [
      { id: 3, value: 'CLO', label: 'Cali', sortOrder: 30 },
      { id: 1, value: 'BOG', label: 'Bogotá', sortOrder: 10 },
      { id: 4, value: 'BAQ', label: 'Barranquilla', sortOrder: 40 },
      { id: 2, value: 'MDE', label: 'Medellín', sortOrder: 20 },
    ];
    const [parsed] = parseFieldConfigs(strapiListResponse([scrambled]));
    expect(parsed.options?.map((o: SelectOption) => [o.value, o.label])).toEqual([
      ['BOG', 'Bogotá'], ['MDE', 'Medellín'], ['CLO', 'Cali'], ['BAQ', 'Barranquilla'],
    ]);
  });

  it('US-01-BR-01 treats Strapi nulls for optional attributes as absent and ignores attributes it does not know', () => {
    const [parsed] = parseFieldConfigs(
      strapiListResponse([item({ helpText: null, placeholder: null, requiredMessage: null, someFutureAttribute: { a: 1 }, country: { code: 'CO' } })]),
    );
    expect(parsed.helpText).toBeUndefined();
    expect(parsed.placeholder).toBeUndefined();
    expect(parsed.requiredMessage).toBeUndefined();
    expect(parsed).not.toHaveProperty('documentId');
  });

  it('US-01-BR-01 keeps requiredMessage and the rule-specific message (they override the field message)', () => {
    const [parsed] = parseFieldConfigs(
      strapiListResponse([
        item({
          requiredMessage: 'Ingresa el dato.',
          rules: [rule({ kind: 'minLength', value: 3, message: 'Muy corto.' })],
        }),
      ]),
    );
    expect(parsed.requiredMessage).toBe('Ingresa el dato.');
    expect(parsed.rules).toEqual([{ kind: 'minLength', value: 3, message: 'Muy corto.' }]);
  });

  it('US-01-BR-01 keeps the rules in the configured order', () => {
    const [parsed] = parseFieldConfigs(
      strapiListResponse([
        item({ rules: [rule({ kind: 'maxLength', value: 20 }), rule({ kind: 'minLength', value: 2 }), rule({ kind: 'pattern', value: '^[a-z]+$' })] }),
      ]),
    );
    expect(parsed.rules.map((r: ValidationRule) => r.kind)).toEqual(['maxLength', 'minLength', 'pattern']);
  });
});

describe('US-01-AC-14 malformed field configuration is skipped', () => {
  let warn: ReturnType<typeof vi.spyOn>;
  beforeEach(() => {
    warn = vi.spyOn(console, 'warn').mockImplementation(() => undefined);
  });
  afterEach(() => vi.restoreAllMocks());

  const valid = (): StrapiItem[] => seedStrapiItems('CO');
  const warnedText = (): string => warn.mock.calls.map((args: unknown[]) => args.map(String).join(' ')).join('\n');

  const problems: { problem: string; key: string; extra: StrapiItem }[] = [
    { problem: 'its type is "slider"', key: 'sliderField', extra: item({ key: 'sliderField', type: 'slider' }) },
    {
      problem: 'it is a select with zero options',
      key: 'emptySelect',
      extra: item({ key: 'emptySelect', type: 'select', options: [] }),
    },
    {
      problem: 'its pattern "[A-Z" does not compile',
      key: 'brokenPattern',
      extra: item({ key: 'brokenPattern', rules: [rule({ kind: 'pattern', value: '[A-Z' })] }),
    },
    { problem: 'its label is empty', key: 'noLabel', extra: item({ key: 'noLabel', label: '' }) },
    {
      problem: 'its minAge rule has no number of years',
      key: 'noYears',
      extra: item({ key: 'noYears', type: 'date', rules: [rule({ kind: 'minAge', years: null })] }),
    },
    // Further malformed shapes named by spec 7.1 / US-01-Q-18 and the dynamic-form-fields skill.
    { problem: 'its key has an invalid format', key: 'Bad-Key', extra: item({ key: 'Bad-Key' }) },
    { problem: 'its key starts with a digit', key: '1stField', extra: item({ key: '1stField' }) },
    {
      problem: 'a select repeats an option value',
      key: 'dupOptions',
      extra: item({
        key: 'dupOptions',
        type: 'select',
        options: [
          { id: 1, value: 'A', label: 'Uno', sortOrder: 10 },
          { id: 2, value: 'A', label: 'Dos', sortOrder: 20 },
        ],
      }),
    },
    { problem: 'a rule has an unknown kind', key: 'unknownRule', extra: item({ key: 'unknownRule', rules: [rule({ kind: 'maxWords', value: 3 })] }) },
    {
      problem: 'a pattern rule is attached to a number field (rule does not apply to the type)',
      key: 'wrongApplicability',
      extra: item({ key: 'wrongApplicability', type: 'number', rules: [rule({ kind: 'pattern', value: '^[0-9]+$' })] }),
    },
    {
      problem: 'a minAge rule is attached to a text field',
      key: 'minAgeOnText',
      extra: item({ key: 'minAgeOnText', type: 'text', rules: [rule({ kind: 'minAge', years: 18 })] }),
    },
    {
      problem: 'a minLength rule has no value',
      key: 'noMinLength',
      extra: item({ key: 'noMinLength', rules: [rule({ kind: 'minLength', value: null })] }),
    },
    {
      problem: 'a minLength rule has a negative value',
      key: 'negativeLength',
      extra: item({ key: 'negativeLength', rules: [rule({ kind: 'minLength', value: -1 })] }),
    },
    {
      problem: 'a minAge rule has zero years (must be greater than 0)',
      key: 'zeroYears',
      extra: item({ key: 'zeroYears', type: 'date', rules: [rule({ kind: 'minAge', years: 0 })] }),
    },
    {
      problem: 'a yearRange rule lacks maxYearsAhead',
      key: 'noAhead',
      extra: item({ key: 'noAhead', type: 'number', rules: [rule({ kind: 'yearRange', maxYearsOld: 20, maxYearsAhead: null })] }),
    },
  ];

  it.each(problems)('US-01-AC-14 skips a field when $problem, keeps the 10 valid fields and warns with its key', ({ key, extra }) => {
    const parsed = parseFieldConfigs(strapiListResponse([...valid(), extra]));
    expect(parsed.map((f) => f.label)).toEqual(seedLabels('CO'));
    expect(parsed.map((f) => f.key)).not.toContain(key);
    expect(warn).toHaveBeenCalled();
    expect(warnedText()).toContain(key);
  });

  it('US-01-AC-14 keeps the earlier field when a later field repeats its key ("plate")', () => {
    const duplicate = item({ key: 'plate', label: 'Placa duplicada', sortOrder: 65 });
    const parsed = parseFieldConfigs(strapiListResponse([...valid(), duplicate]));
    expect(parsed.map((f) => f.label)).toEqual(seedLabels('CO'));
    expect(parsed.filter((f) => f.key === 'plate')).toHaveLength(1);
    expect(parsed.find((f) => f.key === 'plate')?.label).toBe('Placa');
    expect(warn).toHaveBeenCalled();
    expect(warnedText()).toContain('plate');
  });

  it('US-01-AC-14 keeps the earlier field when the duplicate is the one that comes first in the response', () => {
    const duplicate = item({ key: 'plate', label: 'Placa duplicada', sortOrder: 65 });
    const parsed = parseFieldConfigs(strapiListResponse([duplicate, ...valid()]));
    expect(parsed.find((f) => f.key === 'plate')?.label).toBe('Placa');
  });

  it('US-01-AC-14 does not put anything but keys and problems in the warning (no label, help text or message copy)', () => {
    parseFieldConfigs(strapiListResponse([...valid(), item({ key: 'sliderField', type: 'slider', label: 'Etiqueta secreta de prueba', helpText: 'Ayuda secreta de prueba' })]));
    expect(warnedText()).not.toContain('Etiqueta secreta de prueba');
    expect(warnedText()).not.toContain('Ayuda secreta de prueba');
  });

  it('US-01-AC-14 several malformed fields at once: every valid field survives and each malformed key is named', () => {
    const parsed = parseFieldConfigs(strapiListResponse([...valid(), ...problems.map((p) => p.extra)]));
    expect(parsed.map((f) => f.label)).toEqual(seedLabels('CO'));
    for (const p of problems) expect(warnedText()).toContain(p.key);
  });

  it('US-01-AC-14 a missing error message does not drop the field: the fallback "Revisa este campo." is used and a warning is logged', () => {
    const [parsed] = parseFieldConfigs(strapiListResponse([item({ key: 'noMessage', errorMessage: null })]));
    expect(parsed.key).toBe('noMessage');
    expect(parsed.errorMessage).toBe('Revisa este campo.');
    expect(warnedText()).toContain('noMessage');
  });
});

describe('US-01-AC-16 content without any usable field', () => {
  beforeEach(() => {
    vi.spyOn(console, 'warn').mockImplementation(() => undefined);
  });
  afterEach(() => vi.restoreAllMocks());

  it('US-01-AC-16 returns an empty list for an empty response', () => {
    expect(parseFieldConfigs(strapiListResponse([]))).toEqual([]);
  });

  it('US-01-AC-16 returns an empty list when every field is malformed', () => {
    const parsed = parseFieldConfigs(
      strapiListResponse([item({ key: 'a1', type: 'slider' }), item({ key: 'b2', label: '' }), item({ key: 'c3', type: 'select', options: [] })]),
    );
    expect(parsed).toEqual([]);
  });

  it.each([
    ['null', null],
    ['undefined', undefined],
    ['a string', 'not json'],
    ['an object without data', {}],
    ['a response whose data is not a list', { data: 'oops' }],
    ['a list with non-object items', { data: [1, null, 'x'] }],
  ])('US-01-AC-16 returns an empty list, without throwing, for %s', (_name, body) => {
    expect(() => parseFieldConfigs(body)).not.toThrow();
    expect(parseFieldConfigs(body)).toEqual([]);
  });
});
