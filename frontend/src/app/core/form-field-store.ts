import { Injectable, inject } from '@angular/core';
import { firstValueFrom } from 'rxjs';
import type { FieldConfig } from '../shared/field-config.model';
import { FormFieldApi } from './form-field-api';

/**
 * Field configuration per country, kept in memory for this page load only (US-01-Q-16): going
 * back to step 1 does not ask again. A failed or empty answer is never kept, so "Reintentar"
 * always asks again. Rejects when the request fails or times out.
 */
@Injectable({ providedIn: 'root' })
export class FormFieldStore {
  private readonly api = inject(FormFieldApi);
  private readonly cache = new Map<string, FieldConfig[]>();
  private readonly inFlight = new Map<string, Promise<FieldConfig[]>>();

  load(countryCode: string): Promise<FieldConfig[]> {
    const cached = this.cache.get(countryCode);
    if (cached) return Promise.resolve(cached);
    const running = this.inFlight.get(countryCode);
    if (running) return running;
    const request = firstValueFrom(this.api.list(countryCode))
      .then((configs) => {
        if (configs.length > 0) this.cache.set(countryCode, configs);
        return configs;
      })
      .finally(() => this.inFlight.delete(countryCode));
    this.inFlight.set(countryCode, request);
    return request;
  }
}
