# US-02 — Plan seed (annex to spec.md)

Annex to [spec.md](spec.md) §7.3. The spec holds the summary and every ID; this annex holds the
full seed copy. All values are **fictitious**; end-user copy is Spanish (CLAUDE.md §2). Prices are
annual base prices in whole pesos of the country's currency (spec §7.1, US-02-Q-06). The seed is
idempotent: natural key = country code + plan `key` (spec US-02-Q-05).

Status column: **published** = created with `status: 'published'`; **draft only** = created as a
draft and never published. Coverages and benefits are listed in their configured (array) order.

## Colombia (CO) — currency COP, `localeTag` es-CO

| sortOrder | key | name | basePrice | isRecommended | isActive | Status |
|---|---|---|---|---|---|---|
| 10 | `basico` | Plan Básico | 850000 | false | true | published |
| 20 | `clasico` | Plan Clásico | 1400000 | **true** | true | published |
| 25 | `joven` | Plan Joven | 990000 | false | true | **draft only** (proves US-02-AC-08) |
| 30 | `total` | Plan Total | 2100000 | false | true | published |
| 40 | `total-plus` | Plan Total Plus | 2900000 | false | **false** | published (proves US-02-AC-08) |

| key | shortDescription | coverages | benefits |
|---|---|---|---|
| `basico` | Protección esencial frente a los daños que causes a terceros. | Responsabilidad civil extracontractual hasta $ 500.000.000; Asistencia jurídica en proceso penal | Asistencia en carretera (grúa hasta 50 km) |
| `clasico` | Cubre los daños a terceros y la pérdida total de tu vehículo. | Responsabilidad civil extracontractual hasta $ 1.000.000.000; Pérdida total por daños; Pérdida total por hurto; Asistencia jurídica en proceso penal | Asistencia en carretera 24/7; Conductor elegido (2 servicios al año) |
| `joven` | Pensado para conductores que recién empiezan. | Responsabilidad civil extracontractual hasta $ 500.000.000; Pérdida total por daños | Curso de manejo defensivo |
| `total` | Protección completa, también para daños parciales. | Responsabilidad civil extracontractual hasta $ 2.000.000.000; Pérdida total y parcial por daños; Pérdida total y parcial por hurto; Accidentes personales del conductor; Asistencia jurídica en proceso penal | Asistencia en carretera 24/7; Vehículo de reemplazo hasta 10 días; Conductor elegido (5 servicios al año) |
| `total-plus` | Todo lo del Plan Total, sin deducible. | Responsabilidad civil extracontractual hasta $ 3.000.000.000; Pérdida total y parcial por daños sin deducible; Pérdida total y parcial por hurto sin deducible; Accidentes personales del conductor y los pasajeros | Asistencia en carretera 24/7; Vehículo de reemplazo hasta 20 días |

Shown in `/co/planes`, in order: Plan Básico, Plan Clásico (recommended), Plan Total.

## Chile (CL) — currency CLP, `localeTag` es-CL

| sortOrder | key | name | basePrice | isRecommended | isActive | Status |
|---|---|---|---|---|---|---|
| 10 | `esencial` | Plan Esencial | 290000 | false | true | published |
| 15 | `flex` | Plan Flex | 350000 | false | true | **draft only** (proves US-02-AC-08) |
| 20 | `protegido` | Plan Protegido | 480000 | **true** | true | published |
| 30 | `premium` | Plan Premium | 720000 | false | true | published |
| 40 | `premium-plus` | Plan Premium Plus | 950000 | false | **false** | published (proves US-02-AC-08) |

| key | shortDescription | coverages | benefits |
|---|---|---|---|
| `esencial` | Cubre los daños que causes a terceros. | Responsabilidad civil hasta UF 500; Defensa penal | Asistencia en ruta (grúa hasta 50 km) |
| `flex` | Paga según los kilómetros que recorres. | Responsabilidad civil hasta UF 500; Pérdida total por daño | Asistencia en ruta (grúa hasta 50 km) |
| `protegido` | Daños a terceros y pérdida total de tu auto. | Responsabilidad civil hasta UF 1.000; Pérdida total por daño; Robo total; Defensa penal | Asistencia en ruta 24/7; Auto de reemplazo hasta 7 días |
| `premium` | Cobertura completa con deducible bajo. | Responsabilidad civil hasta UF 2.000; Daños propios (pérdida parcial y total); Robo, hurto o uso no autorizado; Accidentes personales; Defensa penal | Asistencia en ruta 24/7; Auto de reemplazo hasta 15 días; Deducible de UF 3 |
| `premium-plus` | Todo lo del Plan Premium, sin deducible. | Responsabilidad civil hasta UF 3.000; Daños propios sin deducible; Robo, hurto o uso no autorizado; Accidentes personales del conductor y los pasajeros | Asistencia en ruta 24/7; Auto de reemplazo hasta 30 días |

Shown in `/cl/planes`, in order: Plan Esencial, Plan Protegido (recommended), Plan Premium.
