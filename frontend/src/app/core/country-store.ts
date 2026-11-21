import { Injectable, inject, signal } from '@angular/core';
import { firstValueFrom } from 'rxjs';
import type { Country } from '../shared/country.model';
import { CountryContentApi } from './country-content-api';

export type CountryListStatus = 'idle' | 'loading' | 'ready' | 'error';

/**
 * The published countries, loaded once per full page load (ADR-0001). A failed load stays failed
 * until `reload()` (no automatic retries); it never means "country not available".
 */
@Injectable({ providedIn: 'root' })
export class CountryStore {
  private readonly api = inject(CountryContentApi);
  private pending: Promise<void> | null = null;

  readonly status = signal<CountryListStatus>('idle');
  readonly countries = signal<Country[]>([]);

  /** Resolves when the list is loaded or has failed; starts the request only the first time. */
  ensureLoaded(): Promise<void> {
    if (this.pending) return this.pending;
    return this.status() === 'idle' ? this.load() : Promise.resolve();
  }

  /** Asks again after a failure ("Reintentar"). */
  reload(): Promise<void> {
    return this.pending ?? this.load();
  }

  /** The country whose code matches `code`, ignoring case. */
  find(code: string): Country | undefined {
    const wanted = code.toLowerCase();
    return this.countries().find((c) => c.code.toLowerCase() === wanted);
  }

  private load(): Promise<void> {
    this.status.set('loading');
    const request = firstValueFrom(this.api.list()).then(
      (countries) => {
        this.countries.set(countries);
        this.status.set('ready');
      },
      () => {
        this.status.set('error');
      },
    );
    this.pending = request.finally(() => {
      this.pending = null;
    });
    return this.pending;
  }
}
