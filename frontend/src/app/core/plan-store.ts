import { Injectable, inject } from '@angular/core';
import { firstValueFrom } from 'rxjs';
import type { Plan } from '../shared/plan.model';
import { PlanApi } from './plan-api';

/**
 * Offered plans per country, kept in memory for this page load only (one plans request per page
 * load, spec 7.2), shared by the plan list and the summary guard. A failed or empty answer is
 * never kept, so "Reintentar" always asks again. Rejects when the request fails or times out.
 */
@Injectable({ providedIn: 'root' })
export class PlanStore {
  private readonly api = inject(PlanApi);
  private readonly cache = new Map<string, Plan[]>();
  private readonly inFlight = new Map<string, Promise<Plan[]>>();

  load(countryCode: string): Promise<Plan[]> {
    const cached = this.cache.get(countryCode);
    if (cached) return Promise.resolve(cached);
    const running = this.inFlight.get(countryCode);
    if (running) return running;
    const request = firstValueFrom(this.api.list(countryCode))
      .then((plans) => {
        if (plans.length > 0) this.cache.set(countryCode, plans);
        return plans;
      })
      .finally(() => this.inFlight.delete(countryCode));
    this.inFlight.set(countryCode, request);
    return request;
  }
}
