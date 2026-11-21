/**
 * Seed of the step 1 form fields (specs/US-01/seed-fields.md, spec 7.2). Spanish, fictitious.
 * Natural key: country code + field `key`.
 */
export type RuleSeed =
  | { kind: 'minLength' | 'maxLength' | 'min' | 'max'; value: number; message?: string }
  | { kind: 'pattern'; pattern: string; message?: string }
  | { kind: 'minAge'; years: number; message?: string }
  | { kind: 'yearRange'; maxYearsOld: number; maxYearsAhead: number; message?: string }
  | { kind: 'rutCheckDigit'; message?: string };

export interface FieldSeed {
  key: string;
  type: 'text' | 'number' | 'select' | 'date' | 'checkbox';
  label: string;
  isRequired: boolean;
  sortOrder: number;
  helpText?: string;
  placeholder?: string;
  errorMessage: string;
  requiredMessage?: string;
  /** [value, label] pairs; sortOrder is 10, 20, 30... in this order. */
  options?: [string, string][];
  rules?: RuleSeed[];
  /** Draft-only entries are created unpublished (US-01-AC-13). */
  draftOnly?: boolean;
}

const lengths = (min: number, max: number): RuleSeed[] => [
  { kind: 'minLength', value: min },
  { kind: 'maxLength', value: max },
];

const yearRange: RuleSeed = { kind: 'yearRange', maxYearsOld: 20, maxYearsAhead: 1 };
const minAge: RuleSeed = { kind: 'minAge', years: 18 };

const COLOMBIA: FieldSeed[] = [
  { key: 'documentType', type: 'select', label: 'Tipo de documento', isRequired: true, sortOrder: 10, errorMessage: 'Selecciona el tipo de documento.', options: [['CC', 'Cédula de ciudadanía'], ['CE', 'Cédula de extranjería']] },
  { key: 'documentNumber', type: 'text', label: 'Número de documento', isRequired: true, sortOrder: 20, helpText: 'Sin puntos ni espacios.', errorMessage: 'Ingresa un número de documento válido (solo números, de 6 a 10 dígitos).', requiredMessage: 'Ingresa tu número de documento.', rules: [{ kind: 'pattern', pattern: '^[0-9]{6,10}$' }] },
  { key: 'fullName', type: 'text', label: 'Nombre completo', isRequired: true, sortOrder: 30, errorMessage: 'Ingresa tu nombre completo (entre 3 y 80 caracteres).', rules: lengths(3, 80) },
  { key: 'birthDate', type: 'date', label: 'Fecha de nacimiento', isRequired: true, sortOrder: 40, errorMessage: 'Debes ser mayor de edad (18 años o más) para cotizar.', requiredMessage: 'Ingresa tu fecha de nacimiento.', rules: [minAge] },
  { key: 'email', type: 'text', label: 'Correo electrónico', isRequired: false, sortOrder: 45, errorMessage: 'Ingresa un correo válido.', draftOnly: true },
  { key: 'city', type: 'select', label: 'Ciudad', isRequired: true, sortOrder: 50, errorMessage: 'Selecciona tu ciudad.', options: [['BOG', 'Bogotá'], ['MDE', 'Medellín'], ['CLO', 'Cali'], ['BAQ', 'Barranquilla']] },
  { key: 'plate', type: 'text', label: 'Placa', isRequired: true, sortOrder: 60, helpText: 'Ejemplo: ABC123.', errorMessage: 'Ingresa una placa válida: 3 letras y 3 números (por ejemplo, ABC123).', rules: [{ kind: 'pattern', pattern: '^[A-Za-z]{3}[0-9]{3}$' }] },
  { key: 'make', type: 'select', label: 'Marca', isRequired: true, sortOrder: 70, errorMessage: 'Selecciona la marca de tu vehículo.', options: [['chevrolet', 'Chevrolet'], ['renault', 'Renault'], ['mazda', 'Mazda'], ['kia', 'Kia'], ['toyota', 'Toyota']] },
  { key: 'model', type: 'text', label: 'Línea', isRequired: true, sortOrder: 80, helpText: 'Por ejemplo: Spark GT.', errorMessage: 'Ingresa la línea de tu vehículo.', rules: [{ kind: 'maxLength', value: 40 }] },
  { key: 'vehicleYear', type: 'number', label: 'Modelo (año)', isRequired: true, sortOrder: 90, helpText: 'Año del modelo que aparece en la licencia de tránsito.', errorMessage: 'El modelo debe estar entre los últimos 20 años y el próximo año.', rules: [yearRange] },
  { key: 'dataConsent', type: 'checkbox', label: 'Autorizo el tratamiento de mis datos personales.', isRequired: true, sortOrder: 100, errorMessage: 'Debes autorizar el tratamiento de tus datos para continuar.' },
];

const CHILE: FieldSeed[] = [
  { key: 'documentNumber', type: 'text', label: 'RUT', isRequired: true, sortOrder: 10, helpText: 'Con o sin puntos y guion. Ejemplo: 12.345.678-5.', errorMessage: 'Ingresa un RUT válido (por ejemplo, 12.345.678-5).', requiredMessage: 'Ingresa tu RUT.', rules: [{ kind: 'pattern', pattern: '^[0-9]{1,2}\\.?[0-9]{3}\\.?[0-9]{3}-?[0-9kK]$' }, { kind: 'rutCheckDigit' }] },
  { key: 'fullName', type: 'text', label: 'Nombre completo', isRequired: true, sortOrder: 20, errorMessage: 'Ingresa tu nombre completo (entre 3 y 80 caracteres).', rules: lengths(3, 80) },
  { key: 'birthDate', type: 'date', label: 'Fecha de nacimiento', isRequired: true, sortOrder: 30, errorMessage: 'Debes ser mayor de edad (18 años o más) para cotizar.', requiredMessage: 'Ingresa tu fecha de nacimiento.', rules: [minAge] },
  { key: 'email', type: 'text', label: 'Correo electrónico', isRequired: false, sortOrder: 35, errorMessage: 'Ingresa un correo válido.', draftOnly: true },
  { key: 'city', type: 'select', label: 'Ciudad', isRequired: true, sortOrder: 40, errorMessage: 'Selecciona tu ciudad.', options: [['SCL', 'Santiago'], ['VAP', 'Valparaíso'], ['CCP', 'Concepción'], ['ANF', 'Antofagasta']] },
  { key: 'plate', type: 'text', label: 'Patente', isRequired: true, sortOrder: 50, helpText: 'Ejemplo: BCDF12 o AB1234.', errorMessage: 'Ingresa una patente válida (por ejemplo, BCDF12 o AB1234).', rules: [{ kind: 'pattern', pattern: '^([A-Za-z]{2}[0-9]{4}|[A-Za-z]{4}[0-9]{2})$' }] },
  { key: 'make', type: 'select', label: 'Marca', isRequired: true, sortOrder: 60, errorMessage: 'Selecciona la marca de tu vehículo.', options: [['chevrolet', 'Chevrolet'], ['suzuki', 'Suzuki'], ['hyundai', 'Hyundai'], ['kia', 'Kia'], ['toyota', 'Toyota']] },
  { key: 'model', type: 'text', label: 'Modelo', isRequired: true, sortOrder: 70, helpText: 'Por ejemplo: Swift GLX.', errorMessage: 'Ingresa el modelo de tu vehículo.', rules: [{ kind: 'maxLength', value: 40 }] },
  { key: 'vehicleYear', type: 'number', label: 'Año', isRequired: true, sortOrder: 80, helpText: 'Año que aparece en el padrón del vehículo.', errorMessage: 'El año debe estar entre los últimos 20 años y el próximo año.', rules: [yearRange] },
  { key: 'dataConsent', type: 'checkbox', label: 'Acepto el tratamiento de mis datos personales.', isRequired: true, sortOrder: 90, errorMessage: 'Debes aceptar el tratamiento de tus datos para continuar.' },
];

export const SEED_FORM_FIELDS: Record<string, FieldSeed[]> = { CO: COLOMBIA, CL: CHILE };
