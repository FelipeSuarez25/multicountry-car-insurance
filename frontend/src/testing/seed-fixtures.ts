/**
 * Fictitious fixtures derived from specs/US-01/seed-fields.md (annex of spec section 7.2).
 *
 * `seedFieldConfigs` returns the typed contract (spec section 7.1, FieldConfig) of the *published* seed
 * fields. The `toStrapi*` builders turn the same data into what Strapi 5 answers over REST
 * (flattened attributes, `documentId`, nullable optional attributes, components with `id` and
 * `__component`, the v0.4 wire shapes of spec 7.5), so that tests exercise the real boundary.
 */
import type { FieldConfig, SelectOption, ValidationRule } from '../app/shared/field-config.model';

export type SeedCountry = 'CO' | 'CL';

/** A Strapi REST item or response body: deliberately untyped, it is what the boundary receives. */
export type StrapiItem = Record<string, unknown>;

const REQUIRED_CONSENT_CO = 'Autorizo el tratamiento de mis datos personales.';
const REQUIRED_CONSENT_CL = 'Acepto el tratamiento de mis datos personales.';

function options(...pairs: [string, string][]): FieldConfig['options'] {
  return pairs.map(([value, label], i) => ({ value, label, sortOrder: (i + 1) * 10 }));
}

function seedCo(): FieldConfig[] {
  return [
    {
      key: 'documentType',
      type: 'select',
      label: 'Tipo de documento',
      isRequired: true,
      sortOrder: 10,
      errorMessage: 'Selecciona el tipo de documento.',
      options: options(['CC', 'Cédula de ciudadanía'], ['CE', 'Cédula de extranjería']),
      rules: [],
    },
    {
      key: 'documentNumber',
      type: 'text',
      label: 'Número de documento',
      isRequired: true,
      sortOrder: 20,
      helpText: 'Sin puntos ni espacios.',
      errorMessage: 'Ingresa un número de documento válido (solo números, de 6 a 10 dígitos).',
      requiredMessage: 'Ingresa tu número de documento.',
      rules: [{ kind: 'pattern', value: '^[0-9]{6,10}$' }],
    },
    {
      key: 'fullName',
      type: 'text',
      label: 'Nombre completo',
      isRequired: true,
      sortOrder: 30,
      errorMessage: 'Ingresa tu nombre completo (entre 3 y 80 caracteres).',
      rules: [
        { kind: 'minLength', value: 3 },
        { kind: 'maxLength', value: 80 },
      ],
    },
    {
      key: 'birthDate',
      type: 'date',
      label: 'Fecha de nacimiento',
      isRequired: true,
      sortOrder: 40,
      errorMessage: 'Debes ser mayor de edad (18 años o más) para cotizar.',
      requiredMessage: 'Ingresa tu fecha de nacimiento.',
      rules: [{ kind: 'minAge', years: 18 }],
    },
    {
      key: 'city',
      type: 'select',
      label: 'Ciudad',
      isRequired: true,
      sortOrder: 50,
      errorMessage: 'Selecciona tu ciudad.',
      options: options(['BOG', 'Bogotá'], ['MDE', 'Medellín'], ['CLO', 'Cali'], ['BAQ', 'Barranquilla']),
      rules: [],
    },
    {
      key: 'plate',
      type: 'text',
      label: 'Placa',
      isRequired: true,
      sortOrder: 60,
      helpText: 'Ejemplo: ABC123.',
      errorMessage: 'Ingresa una placa válida: 3 letras y 3 números (por ejemplo, ABC123).',
      rules: [{ kind: 'pattern', value: '^[A-Za-z]{3}[0-9]{3}$' }],
    },
    {
      key: 'make',
      type: 'select',
      label: 'Marca',
      isRequired: true,
      sortOrder: 70,
      errorMessage: 'Selecciona la marca de tu vehículo.',
      options: options(
        ['chevrolet', 'Chevrolet'],
        ['renault', 'Renault'],
        ['mazda', 'Mazda'],
        ['kia', 'Kia'],
        ['toyota', 'Toyota'],
      ),
      rules: [],
    },
    {
      key: 'model',
      type: 'text',
      label: 'Línea',
      isRequired: true,
      sortOrder: 80,
      helpText: 'Por ejemplo: Spark GT.',
      errorMessage: 'Ingresa la línea de tu vehículo.',
      rules: [{ kind: 'maxLength', value: 40 }],
    },
    {
      key: 'vehicleYear',
      type: 'number',
      label: 'Modelo (año)',
      isRequired: true,
      sortOrder: 90,
      helpText: 'Año del modelo que aparece en la licencia de tránsito.',
      errorMessage: 'El modelo debe estar entre los últimos 20 años y el próximo año.',
      rules: [{ kind: 'yearRange', maxYearsOld: 20, maxYearsAhead: 1 }],
    },
    {
      key: 'dataConsent',
      type: 'checkbox',
      label: REQUIRED_CONSENT_CO,
      isRequired: true,
      sortOrder: 100,
      errorMessage: 'Debes autorizar el tratamiento de tus datos para continuar.',
      rules: [],
    },
  ];
}

function seedCl(): FieldConfig[] {
  return [
    {
      key: 'documentNumber',
      type: 'text',
      label: 'RUT',
      isRequired: true,
      sortOrder: 10,
      helpText: 'Con o sin puntos y guion. Ejemplo: 12.345.678-5.',
      errorMessage: 'Ingresa un RUT válido (por ejemplo, 12.345.678-5).',
      requiredMessage: 'Ingresa tu RUT.',
      rules: [
        { kind: 'pattern', value: '^[0-9]{1,2}\\.?[0-9]{3}\\.?[0-9]{3}-?[0-9kK]$' },
        { kind: 'rutCheckDigit' },
      ],
    },
    {
      key: 'fullName',
      type: 'text',
      label: 'Nombre completo',
      isRequired: true,
      sortOrder: 20,
      errorMessage: 'Ingresa tu nombre completo (entre 3 y 80 caracteres).',
      rules: [
        { kind: 'minLength', value: 3 },
        { kind: 'maxLength', value: 80 },
      ],
    },
    {
      key: 'birthDate',
      type: 'date',
      label: 'Fecha de nacimiento',
      isRequired: true,
      sortOrder: 30,
      errorMessage: 'Debes ser mayor de edad (18 años o más) para cotizar.',
      requiredMessage: 'Ingresa tu fecha de nacimiento.',
      rules: [{ kind: 'minAge', years: 18 }],
    },
    {
      key: 'city',
      type: 'select',
      label: 'Ciudad',
      isRequired: true,
      sortOrder: 40,
      errorMessage: 'Selecciona tu ciudad.',
      options: options(
        ['SCL', 'Santiago'],
        ['VAP', 'Valparaíso'],
        ['CCP', 'Concepción'],
        ['ANF', 'Antofagasta'],
      ),
      rules: [],
    },
    {
      key: 'plate',
      type: 'text',
      label: 'Patente',
      isRequired: true,
      sortOrder: 50,
      helpText: 'Ejemplo: BCDF12 o AB1234.',
      errorMessage: 'Ingresa una patente válida (por ejemplo, BCDF12 o AB1234).',
      rules: [{ kind: 'pattern', value: '^([A-Za-z]{2}[0-9]{4}|[A-Za-z]{4}[0-9]{2})$' }],
    },
    {
      key: 'make',
      type: 'select',
      label: 'Marca',
      isRequired: true,
      sortOrder: 60,
      errorMessage: 'Selecciona la marca de tu vehículo.',
      options: options(
        ['chevrolet', 'Chevrolet'],
        ['suzuki', 'Suzuki'],
        ['hyundai', 'Hyundai'],
        ['kia', 'Kia'],
        ['toyota', 'Toyota'],
      ),
      rules: [],
    },
    {
      key: 'model',
      type: 'text',
      label: 'Modelo',
      isRequired: true,
      sortOrder: 70,
      helpText: 'Por ejemplo: Swift GLX.',
      errorMessage: 'Ingresa el modelo de tu vehículo.',
      rules: [{ kind: 'maxLength', value: 40 }],
    },
    {
      key: 'vehicleYear',
      type: 'number',
      label: 'Año',
      isRequired: true,
      sortOrder: 80,
      helpText: 'Año que aparece en el padrón del vehículo.',
      errorMessage: 'El año debe estar entre los últimos 20 años y el próximo año.',
      rules: [{ kind: 'yearRange', maxYearsOld: 20, maxYearsAhead: 1 }],
    },
    {
      key: 'dataConsent',
      type: 'checkbox',
      label: REQUIRED_CONSENT_CL,
      isRequired: true,
      sortOrder: 90,
      errorMessage: 'Debes aceptar el tratamiento de tus datos para continuar.',
      rules: [],
    },
  ];
}

/** The published seed fields of a country, in sortOrder (a fresh deep copy on every call). */
export function seedFieldConfigs(country: SeedCountry): FieldConfig[] {
  return country === 'CO' ? seedCo() : seedCl();
}

export function seedField(country: SeedCountry, key: string): FieldConfig {
  const found = seedFieldConfigs(country).find((f) => f.key === key);
  if (!found) throw new Error(`No seed field "${key}" for ${country}`);
  return found;
}

/** Labels of the published seed fields, in the order the spec (AC-01) lists them. */
export function seedLabels(country: SeedCountry): string[] {
  return seedFieldConfigs(country).map((f) => f.label);
}

// ---------------------------------------------------------------------------------------------
// Strapi 5 wire format
// ---------------------------------------------------------------------------------------------

function ruleComponent(rule: ValidationRule, id: number): StrapiItem {
  const r = rule as unknown as Record<string, unknown>;
  return {
    id,
    __component: 'form.validation-rule',
    kind: r['kind'],
    // Spec 7.5.1: a pattern rule carries its regex in `pattern` (the logical rule keeps it in `value`);
    // `value` is a number (or null) and every unused attribute is null.
    value: r['kind'] === 'pattern' ? null : (r['value'] ?? null),
    pattern: r['kind'] === 'pattern' ? (r['value'] ?? null) : null,
    years: r['years'] ?? null,
    maxYearsOld: r['maxYearsOld'] ?? null,
    maxYearsAhead: r['maxYearsAhead'] ?? null,
    message: r['message'] ?? null,
  };
}

/** One form-field item as Strapi 5 returns it (flattened, with documentId, nulls for empty optionals). */
export function toStrapiFieldItem(config: FieldConfig, index = 0): StrapiItem {
  return {
    id: index + 1,
    documentId: `fixturedoc${String(index + 1).padStart(4, '0')}`,
    key: config.key,
    label: config.label,
    type: config.type,
    isRequired: config.isRequired,
    helpText: config.helpText ?? null,
    placeholder: config.placeholder ?? null,
    errorMessage: config.errorMessage,
    requiredMessage: config.requiredMessage ?? null,
    sortOrder: config.sortOrder,
    options: (config.options ?? []).map((o: SelectOption, i: number) => ({ id: i + 1, value: o.value, label: o.label, sortOrder: o.sortOrder })),
    rules: config.rules.map((rule: ValidationRule, i: number) => ruleComponent(rule, i + 1)),
    createdAt: '2026-11-20T12:00:00.000Z',
    updatedAt: '2026-11-20T12:00:00.000Z',
    publishedAt: '2026-11-20T12:00:00.000Z',
  };
}

/** The published seed fields of a country as Strapi items, in a deliberately shuffled order. */
export function seedStrapiItems(country: SeedCountry): StrapiItem[] {
  const items = seedFieldConfigs(country).map((c, i) => toStrapiFieldItem(c, i));
  // Reverse: the front end, not Strapi, must apply sortOrder.
  return items.reverse();
}

export function strapiListResponse(items: StrapiItem[]): StrapiItem {
  return {
    data: items,
    meta: { pagination: { page: 1, pageSize: 100, pageCount: 1, total: items.length } },
  };
}

export function strapiCountryItem(code: string, name: string, currencyCode: string, locale: string, sortOrder: number, index = 0): StrapiItem {
  return {
    id: index + 1,
    documentId: `fixturecountry${String(index + 1).padStart(3, '0')}`,
    code,
    name,
    currencyCode,
    // Spec 7.5.2: the wire attribute is `localeTag` (Strapi reserves `locale`); the parser maps it to `locale`.
    localeTag: locale,
    sortOrder,
    publishedAt: '2026-11-20T12:00:00.000Z',
  };
}

/** The two seeded countries, in a shuffled order (the front end sorts by sortOrder or trusts the request). */
export function seedCountryItems(): StrapiItem[] {
  return [
    strapiCountryItem('CO', 'Colombia', 'COP', 'es-CO', 10, 0),
    strapiCountryItem('CL', 'Chile', 'CLP', 'es-CL', 20, 1),
  ];
}

// ---------------------------------------------------------------------------------------------
// Values a person types (labels and visible option texts, as a user sees them)
// ---------------------------------------------------------------------------------------------

/**
 * AC-04 / AC-18 values for Colombia, keyed by the visible label. Selects use the option text; the
 * date is what a person types and sees, dd/mm/aaaa (US-04-Q-05), and is stored as 1990-05-15.
 */
export const CO_VALID_INPUT: Record<string, string | boolean> = {
  'Tipo de documento': 'Cédula de ciudadanía',
  'Número de documento': '1012345678',
  'Nombre completo': 'Ana Prueba Ficticia',
  'Fecha de nacimiento': '15/05/1990',
  Ciudad: 'Medellín',
  Placa: 'ABC123',
  Marca: 'Mazda',
  Línea: '3 Touring',
  'Modelo (año)': '2022',
  [REQUIRED_CONSENT_CO]: true,
};

/** The raw editing values of the same input (what the store keeps and writes to sessionStorage). */
export const CO_VALID_RAW: Record<string, string | boolean> = {
  documentType: 'CC',
  documentNumber: '1012345678',
  fullName: 'Ana Prueba Ficticia',
  birthDate: '1990-05-15',
  city: 'MDE',
  plate: 'ABC123',
  make: 'mazda',
  model: '3 Touring',
  vehicleYear: '2022',
  dataConsent: true,
};

/** The typed step 1 output of US-01-AC-18 (spec section 7.3). */
export const CO_EXPECTED_OUTPUT = {
  country: 'CO',
  values: {
    documentType: 'CC',
    documentNumber: '1012345678',
    fullName: 'Ana Prueba Ficticia',
    birthDate: '1990-05-15',
    city: 'MDE',
    plate: 'ABC123',
    make: 'mazda',
    model: '3 Touring',
    vehicleYear: 2022,
    dataConsent: true,
  },
};

export const CL_VALID_INPUT: Record<string, string | boolean> = {
  RUT: '12.345.678-5',
  'Nombre completo': 'Pedro Prueba Ficticio',
  'Fecha de nacimiento': '20/03/1985',
  Ciudad: 'Santiago',
  Patente: 'BCDF12',
  Marca: 'Suzuki',
  Modelo: 'Swift GLX',
  Año: '2021',
  [REQUIRED_CONSENT_CL]: true,
};

export const CL_VALID_RAW: Record<string, string | boolean> = {
  documentNumber: '12.345.678-5',
  fullName: 'Pedro Prueba Ficticio',
  birthDate: '1985-03-20',
  city: 'SCL',
  plate: 'BCDF12',
  make: 'suzuki',
  model: 'Swift GLX',
  vehicleYear: '2021',
  dataConsent: true,
};

export const CONSENT_LABEL_CO = REQUIRED_CONSENT_CO;
export const CONSENT_LABEL_CL = REQUIRED_CONSENT_CL;

/** The sessionStorage entry of ADR-0003: key `quote-wizard`, version 1, one country. */
export const WIZARD_STORAGE_KEY = 'quote-wizard';

export function wizardEntry(country: string, values: Record<string, unknown>): string {
  return JSON.stringify({ version: 1, country, step1: { values } });
}
