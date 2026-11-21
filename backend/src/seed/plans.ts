/**
 * Seed of the plans (specs/US-02/seed-plans.md, spec 7.3). Spanish, fictitious.
 * Natural key: country code + plan `key`.
 */
export interface PlanSeed {
  key: string;
  name: string;
  shortDescription: string;
  basePrice: number;
  sortOrder: number;
  isRecommended: boolean;
  isActive: boolean;
  coverages: string[];
  benefits: string[];
  /** Draft-only entries are created unpublished (US-02-AC-08). */
  draftOnly?: boolean;
}

export const SEED_PLANS: Record<string, PlanSeed[]> = {
  CO: [
    {
      key: 'basico', name: 'Plan Básico', basePrice: 850000, sortOrder: 10, isRecommended: false, isActive: true,
      shortDescription: 'Protección esencial frente a los daños que causes a terceros.',
      coverages: ['Responsabilidad civil extracontractual hasta $ 500.000.000', 'Asistencia jurídica en proceso penal'],
      benefits: ['Asistencia en carretera (grúa hasta 50 km)'],
    },
    {
      key: 'clasico', name: 'Plan Clásico', basePrice: 1400000, sortOrder: 20, isRecommended: true, isActive: true,
      shortDescription: 'Cubre los daños a terceros y la pérdida total de tu vehículo.',
      coverages: [
        'Responsabilidad civil extracontractual hasta $ 1.000.000.000',
        'Pérdida total por daños',
        'Pérdida total por hurto',
        'Asistencia jurídica en proceso penal',
      ],
      benefits: ['Asistencia en carretera 24/7', 'Conductor elegido (2 servicios al año)'],
    },
    {
      key: 'joven', name: 'Plan Joven', basePrice: 990000, sortOrder: 25, isRecommended: false, isActive: true, draftOnly: true,
      shortDescription: 'Pensado para conductores que recién empiezan.',
      coverages: ['Responsabilidad civil extracontractual hasta $ 500.000.000', 'Pérdida total por daños'],
      benefits: ['Curso de manejo defensivo'],
    },
    {
      key: 'total', name: 'Plan Total', basePrice: 2100000, sortOrder: 30, isRecommended: false, isActive: true,
      shortDescription: 'Protección completa, también para daños parciales.',
      coverages: [
        'Responsabilidad civil extracontractual hasta $ 2.000.000.000',
        'Pérdida total y parcial por daños',
        'Pérdida total y parcial por hurto',
        'Accidentes personales del conductor',
        'Asistencia jurídica en proceso penal',
      ],
      benefits: ['Asistencia en carretera 24/7', 'Vehículo de reemplazo hasta 10 días', 'Conductor elegido (5 servicios al año)'],
    },
    {
      key: 'total-plus', name: 'Plan Total Plus', basePrice: 2900000, sortOrder: 40, isRecommended: false, isActive: false,
      shortDescription: 'Todo lo del Plan Total, sin deducible.',
      coverages: [
        'Responsabilidad civil extracontractual hasta $ 3.000.000.000',
        'Pérdida total y parcial por daños sin deducible',
        'Pérdida total y parcial por hurto sin deducible',
        'Accidentes personales del conductor y los pasajeros',
      ],
      benefits: ['Asistencia en carretera 24/7', 'Vehículo de reemplazo hasta 20 días'],
    },
  ],
  CL: [
    {
      key: 'esencial', name: 'Plan Esencial', basePrice: 290000, sortOrder: 10, isRecommended: false, isActive: true,
      shortDescription: 'Cubre los daños que causes a terceros.',
      coverages: ['Responsabilidad civil hasta UF 500', 'Defensa penal'],
      benefits: ['Asistencia en ruta (grúa hasta 50 km)'],
    },
    {
      key: 'flex', name: 'Plan Flex', basePrice: 350000, sortOrder: 15, isRecommended: false, isActive: true, draftOnly: true,
      shortDescription: 'Paga según los kilómetros que recorres.',
      coverages: ['Responsabilidad civil hasta UF 500', 'Pérdida total por daño'],
      benefits: ['Asistencia en ruta (grúa hasta 50 km)'],
    },
    {
      key: 'protegido', name: 'Plan Protegido', basePrice: 480000, sortOrder: 20, isRecommended: true, isActive: true,
      shortDescription: 'Daños a terceros y pérdida total de tu auto.',
      coverages: ['Responsabilidad civil hasta UF 1.000', 'Pérdida total por daño', 'Robo total', 'Defensa penal'],
      benefits: ['Asistencia en ruta 24/7', 'Auto de reemplazo hasta 7 días'],
    },
    {
      key: 'premium', name: 'Plan Premium', basePrice: 720000, sortOrder: 30, isRecommended: false, isActive: true,
      shortDescription: 'Cobertura completa con deducible bajo.',
      coverages: [
        'Responsabilidad civil hasta UF 2.000',
        'Daños propios (pérdida parcial y total)',
        'Robo, hurto o uso no autorizado',
        'Accidentes personales',
        'Defensa penal',
      ],
      benefits: ['Asistencia en ruta 24/7', 'Auto de reemplazo hasta 15 días', 'Deducible de UF 3'],
    },
    {
      key: 'premium-plus', name: 'Plan Premium Plus', basePrice: 950000, sortOrder: 40, isRecommended: false, isActive: false,
      shortDescription: 'Todo lo del Plan Premium, sin deducible.',
      coverages: [
        'Responsabilidad civil hasta UF 3.000',
        'Daños propios sin deducible',
        'Robo, hurto o uso no autorizado',
        'Accidentes personales del conductor y los pasajeros',
      ],
      benefits: ['Asistencia en ruta 24/7', 'Auto de reemplazo hasta 30 días'],
    },
  ],
};
