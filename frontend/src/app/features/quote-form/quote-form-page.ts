import { Component, ElementRef, afterNextRender, inject, signal, viewChild } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { CountryStore } from '../../core/country-store';
import { FormFieldStore } from '../../core/form-field-store';
import { QuoteStore } from '../../core/quote-store';
import type { Country } from '../../shared/country.model';
import type { FieldConfig } from '../../shared/field-config.model';
import { LoadError } from '../../shared/load-error';
import { QuoteForm } from './quote-form';

type PageStatus = 'loading' | 'error' | 'ready';

/**
 * Step 1 (`/:country/datos`). Resolves the country from the route, enters its wizard context,
 * loads the field configuration (loading, error and retry states) and hands it to the form.
 */
@Component({
  selector: 'app-quote-form-page',
  imports: [QuoteForm, LoadError],
  templateUrl: './quote-form-page.html',
  styleUrl: './quote-form-page.css',
})
export class QuoteFormPage {
  private readonly route = inject(ActivatedRoute);
  private readonly countries = inject(CountryStore);
  private readonly fields = inject(FormFieldStore);
  private readonly quote = inject(QuoteStore);
  private readonly heading = viewChild.required<ElementRef<HTMLHeadingElement>>('heading');

  protected readonly status = signal<PageStatus>('loading');
  protected readonly configs = signal<FieldConfig[]>([]);
  protected readonly country: Country | undefined = this.countries.find(this.route.snapshot.paramMap.get('country') ?? '');

  constructor() {
    if (this.country) this.quote.enterCountry(this.country.code);
    void this.load();
    // Arriving at the step puts focus on its heading, unless the load already failed
    // (then focus goes to "Reintentar").
    afterNextRender(() => {
      if (this.status() !== 'error') this.heading().nativeElement.focus();
    });
  }

  protected async load(): Promise<void> {
    if (!this.country) {
      this.status.set('error');
      return;
    }
    this.status.set('loading');
    try {
      const configs = await this.fields.load(this.country.code);
      if (configs.length === 0) {
        this.status.set('error');
        return;
      }
      this.quote.prune(configs);
      this.configs.set(configs);
      this.status.set('ready');
    } catch {
      this.status.set('error');
    }
  }
}
