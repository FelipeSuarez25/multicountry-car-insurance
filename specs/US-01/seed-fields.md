# US-01 — Seed fields (annex to [spec.md](spec.md) §7.2)

Complete seed for the step 1 form fields: rules, help texts, error messages and options. The
**spec is authoritative**: this annex defines no IDs, and §7.1 (contract), §7.2 (summary) and
§7.3 (reserved keys) of the spec govern it. Values are fictitious; end-user copy is Spanish.

### Colombia (CO)

| sortOrder | key | type | label | req. | rules | helpText | errorMessage (and overrides) | options (value → label) |
|---|---|---|---|---|---|---|---|---|
| 10 | documentType | select | Tipo de documento | yes | — | — | Selecciona el tipo de documento. | CC → Cédula de ciudadanía; CE → Cédula de extranjería |
| 20 | documentNumber | text | Número de documento | yes | pattern `^[0-9]{6,10}$` | Sin puntos ni espacios. | Ingresa un número de documento válido (solo números, de 6 a 10 dígitos). · required: Ingresa tu número de documento. | — |
| 30 | fullName | text | Nombre completo | yes | minLength 3, maxLength 80 | — | Ingresa tu nombre completo (entre 3 y 80 caracteres). | — |
| 40 | birthDate | date | Fecha de nacimiento | yes | minAge 18 | — | Debes ser mayor de edad (18 años o más) para cotizar. · required: Ingresa tu fecha de nacimiento. | — |
| 50 | city | select | Ciudad | yes | — | — | Selecciona tu ciudad. | BOG → Bogotá; MDE → Medellín; CLO → Cali; BAQ → Barranquilla |
| 60 | plate | text | Placa | yes | pattern `^[A-Za-z]{3}[0-9]{3}$` | Ejemplo: ABC123. | Ingresa una placa válida: 3 letras y 3 números (por ejemplo, ABC123). | — |
| 70 | make | select | Marca | yes | — | — | Selecciona la marca de tu vehículo. | chevrolet → Chevrolet; renault → Renault; mazda → Mazda; kia → Kia; toyota → Toyota |
| 80 | model | text | Línea | yes | maxLength 40 | Por ejemplo: Spark GT. | Ingresa la línea de tu vehículo. | — |
| 90 | vehicleYear | number | Modelo (año) | yes | yearRange 20 / 1 | Año del modelo que aparece en la licencia de tránsito. | El modelo debe estar entre los últimos 20 años y el próximo año. | — |
| 100 | dataConsent | checkbox | Autorizo el tratamiento de mis datos personales. | yes | — | — | Debes autorizar el tratamiento de tus datos para continuar. | — |
| 45 | email | text | Correo electrónico | no | — | — | Ingresa un correo válido. | — · **draft only** (AC-13) |

### Chile (CL)

| sortOrder | key | type | label | req. | rules | helpText | errorMessage (and overrides) | options (value → label) |
|---|---|---|---|---|---|---|---|---|
| 10 | documentNumber | text | RUT | yes | pattern `^[0-9]{1,2}\.?[0-9]{3}\.?[0-9]{3}-?[0-9kK]$`, rutCheckDigit | Con o sin puntos y guion. Ejemplo: 12.345.678-5. | Ingresa un RUT válido (por ejemplo, 12.345.678-5). · required: Ingresa tu RUT. | — |
| 20 | fullName | text | Nombre completo | yes | minLength 3, maxLength 80 | — | Ingresa tu nombre completo (entre 3 y 80 caracteres). | — |
| 30 | birthDate | date | Fecha de nacimiento | yes | minAge 18 | — | Debes ser mayor de edad (18 años o más) para cotizar. · required: Ingresa tu fecha de nacimiento. | — |
| 40 | city | select | Ciudad | yes | — | — | Selecciona tu ciudad. | SCL → Santiago; VAP → Valparaíso; CCP → Concepción; ANF → Antofagasta |
| 50 | plate | text | Patente | yes | pattern `^([A-Za-z]{2}[0-9]{4}\|[A-Za-z]{4}[0-9]{2})$` | Ejemplo: BCDF12 o AB1234. | Ingresa una patente válida (por ejemplo, BCDF12 o AB1234). | — |
| 60 | make | select | Marca | yes | — | — | Selecciona la marca de tu vehículo. | chevrolet → Chevrolet; suzuki → Suzuki; hyundai → Hyundai; kia → Kia; toyota → Toyota |
| 70 | model | text | Modelo | yes | maxLength 40 | Por ejemplo: Swift GLX. | Ingresa el modelo de tu vehículo. | — |
| 80 | vehicleYear | number | Año | yes | yearRange 20 / 1 | Año que aparece en el padrón del vehículo. | El año debe estar entre los últimos 20 años y el próximo año. | — |
| 90 | dataConsent | checkbox | Acepto el tratamiento de mis datos personales. | yes | — | — | Debes aceptar el tratamiento de tus datos para continuar. | — |
| 35 | email | text | Correo electrónico | no | — | — | Ingresa un correo válido. | — · **draft only** |

The seed is idempotent (natural key: country code + field `key`).
