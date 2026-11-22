import { Component, ElementRef, afterNextRender, computed, inject, signal, viewChild, viewChildren } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { CLOCK } from '../../core/clock';
import { CountryStore } from '../../core/country-store';
import { FormFieldStore } from '../../core/form-field-store';
import { PlanStore } from '../../core/plan-store';
import { QuoteStore } from '../../core/quote-store';
import type { Country } from '../../shared/country.model';
import { LucideCircleCheck } from '@lucide/angular';
import { BackLink } from '../../shared/back-link';
import { LoadError } from '../../shared/load-error';
import { formatMoney } from '../../shared/money-format';
import { recommendedPlanKey } from '../../shared/plan';
import type { Plan } from '../../shared/plan.model';
import { calculateFinalPrice } from '../../shared/price-rules';

type PageStatus = 'loading' | 'error' | 'empty' | 'ready';

/** One plan with its final price, already formatted for the country. */
interface PlanItem {
  plan: Plan;
  price: string;
}

/**
 * Step 2 (`/:country/planes`). Loads the offered plans of the route's country, computes each
 * final price from the typed step 1 output with the injectable clock, and lets the person choose
 * one plan (a native radio group). The choice lives in the wizard state as a key only.
 */
@Component({
  selector: 'app-plan-list-page',
  imports: [BackLink, LoadError, LucideCircleCheck],
  templateUrl: './plan-list-page.html',
  styleUrl: './plan-list-page.css',
})
export class PlanListPage {
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly countries = inject(CountryStore);
  private readonly fields = inject(FormFieldStore);
  private readonly plans = inject(PlanStore);
  private readonly quote = inject(QuoteStore);
  private readonly clock = inject(CLOCK);
  private readonly heading = viewChild.required<ElementRef<HTMLHeadingElement>>('heading');
  private readonly options = viewChildren<ElementRef<HTMLInputElement>>('option');

  protected readonly status = signal<PageStatus>('loading');
  protected readonly items = signal<PlanItem[]>([]);
  protected readonly showChoosePlan = signal(false);
  protected readonly chosenKey = computed(() => this.quote.plan()?.key ?? null);
  protected readonly recommendedKey = computed(() => recommendedPlanKey(this.items().map((i) => i.plan)));
  private readonly country: Country | undefined = this.countries.find(this.route.snapshot.paramMap.get('country') ?? '');
  /** The back link of step 2 (US-04-BR-21). */
  protected readonly toData = ['/', this.countryPath(), 'datos'];

  constructor() {
    void this.load();
    // Arriving at the step puts focus on its heading, unless the load already failed
    // (then focus goes to "Reintentar").
    afterNextRender(() => {
      if (this.status() !== 'error') this.heading().nativeElement.focus();
    });
  }

  protected async load(): Promise<void> {
    const country = this.country;
    if (!country) {
      this.status.set('error');
      return;
    }
    this.status.set('loading');
    this.showChoosePlan.set(false);
    try {
      const [offered, configs] = await Promise.all([this.plans.load(country.code), this.fields.load(country.code)]);
      this.quote.prunePlan(offered.map((p) => p.key));
      if (offered.length === 0) {
        this.status.set('empty');
        return;
      }
      // The typed step 1 output is re-derived from the stored values with this page load's
      // configuration (US-02-Q-17); step 1 is valid here because the step guard checked it.
      const step1 = this.quote.completeStep1(configs);
      if (step1 === null) throw new Error('step 1 is not valid');
      const today = this.clock();
      this.items.set(
        offered.map((plan) => ({
          plan,
          price: formatMoney(calculateFinalPrice(plan.basePrice, step1, today), country.locale, country.currencyCode),
        })),
      );
      this.status.set('ready');
    } catch {
      this.status.set('error');
    }
  }

  /** The description of an option: the highlight, then the short description, then the price. */
  protected describedBy(key: string): string {
    const recommended = key === this.recommendedKey() ? `plan-recommended-${key} ` : '';
    return `${recommended}plan-description-${key} plan-price-${key}`;
  }

  protected choose(key: string): void {
    this.quote.choosePlan(key);
    this.showChoosePlan.set(false);
  }

  protected back(): void {
    void this.router.navigate(['/', this.countryPath(), 'datos']);
  }

  protected next(): void {
    if (this.quote.plan() === null) {
      this.showChoosePlan.set(true);
      this.options()[0]?.nativeElement.focus();
      return;
    }
    void this.router.navigate(['/', this.countryPath(), 'resumen']);
  }

  private countryPath(): string {
    return (this.country?.code ?? this.route.snapshot.paramMap.get('country') ?? '').toLowerCase();
  }
}
