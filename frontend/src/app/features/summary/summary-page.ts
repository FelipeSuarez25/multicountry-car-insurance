import { Component, DestroyRef, ElementRef, Injector, afterNextRender, computed, inject, signal, viewChild } from '@angular/core';
import { Title } from '@angular/platform-browser';
import { ActivatedRoute, Router } from '@angular/router';
import type { Subscription } from 'rxjs';
import { CLOCK } from '../../core/clock';
import { CountryStore } from '../../core/country-store';
import { FormFieldStore } from '../../core/form-field-store';
import { PaymentGateway, PaymentInProgressError } from '../../core/payment-gateway';
import { PlanStore } from '../../core/plan-store';
import { QuoteStore } from '../../core/quote-store';
import { RANDOM_DIGITS } from '../../core/random-digits';
import { TermsApi } from '../../core/terms-api';
import type { Country } from '../../shared/country.model';
import { LoadError } from '../../shared/load-error';
import { formatMoney } from '../../shared/money-format';
import type { Plan } from '../../shared/plan.model';
import { calculateFinalPrice } from '../../shared/price-rules';
import { formatQuoteNumber } from '../../shared/quote-number';
import { RichText } from '../../shared/rich-text';
import { buildSummaryRows, type SummaryRows } from '../../shared/summary-rows';
import type { Terms } from '../../shared/terms.model';

type DataStatus = 'loading' | 'error' | 'ready';
type TermsStatus = 'loading' | 'error' | 'none' | 'shown';
type PaymentState = 'idle' | 'processing' | 'rejected' | 'confirmed';

const APP_TITLE = 'Cotizador de seguro de auto';
const SUMMARY_HEADING = 'Resumen de tu cotización';
const CONFIRMED_HEADING = 'Pago confirmado';

/** The chosen plan with its final price, formatted for the country (US-03-BR-01). */
interface ChosenPlanView {
  plan: Plan;
  price: string;
}

/**
 * Step 3 (`/:country/resumen`): the summary, the terms, the simulated payment and the
 * confirmation, all on one address (US-03-Q-06). The data are re-derived from the wizard state
 * and this page load's configuration; the terms are one extra read-only request (ADR-0009); the
 * payment goes through the `PaymentGateway` boundary and sends nothing (ADR-0008).
 */
@Component({
  selector: 'app-summary-page',
  imports: [LoadError, RichText],
  templateUrl: './summary-page.html',
  styleUrl: './summary-page.css',
})
export class SummaryPage {
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly injector = inject(Injector);
  private readonly title = inject(Title);
  private readonly countries = inject(CountryStore);
  private readonly fields = inject(FormFieldStore);
  private readonly plans = inject(PlanStore);
  private readonly quote = inject(QuoteStore);
  private readonly termsApi = inject(TermsApi);
  private readonly gateway = inject(PaymentGateway);
  private readonly clock = inject(CLOCK);
  private readonly randomDigits = inject(RANDOM_DIGITS);
  private readonly abort = new AbortController();
  private readonly heading = viewChild.required<ElementRef<HTMLHeadingElement>>('heading');
  private readonly country: Country | undefined = this.countries.find(this.route.snapshot.paramMap.get('country') ?? '');
  private termsRequest: Subscription | null = null;

  protected readonly dataStatus = signal<DataStatus>('loading');
  protected readonly rows = signal<SummaryRows>({ holder: [], vehicle: [] });
  protected readonly chosen = signal<ChosenPlanView | null>(null);

  protected readonly termsStatus = signal<TermsStatus>('loading');
  protected readonly terms = signal<Terms | null>(null);
  protected readonly accepted = signal(false);

  protected readonly outcome = signal<'approved' | 'rejected'>('approved');
  protected readonly paymentState = signal<PaymentState>('idle');
  protected readonly quoteNumber = signal('');

  protected readonly processing = computed(() => this.paymentState() === 'processing');
  protected readonly confirmed = computed(() => this.paymentState() === 'confirmed');
  protected readonly canPay = computed(() => this.termsStatus() === 'shown' && this.accepted() && ['idle', 'rejected'].includes(this.paymentState()));
  /** The reason "Pagar" is unavailable, shown next to it and linked to it (US-03-BR-04). */
  protected readonly showHint = computed(() => this.termsStatus() === 'shown' && !this.accepted());

  constructor() {
    inject(DestroyRef).onDestroy(() => {
      // Leaving the page abandons any attempt: nothing is cleared and nothing is shown.
      this.abort.abort();
      this.termsRequest?.unsubscribe();
    });
    void this.load();
    this.loadTerms();
    // Arriving at the step puts focus on its heading. A terms failure is not caused by the person,
    // so the focus stays there too.
    afterNextRender(() => this.heading().nativeElement.focus());
  }

  protected async load(): Promise<void> {
    const country = this.country;
    if (!country) {
      this.dataStatus.set('error');
      return;
    }
    this.dataStatus.set('loading');
    try {
      const [configs, offered] = await Promise.all([this.fields.load(country.code), this.plans.load(country.code)]);
      // The typed step 1 output is re-derived with this page load's configuration (US-02-Q-17);
      // the step guards checked that it is valid.
      const step1 = this.quote.completeStep1(configs);
      const plan = offered.find((p) => p.key === this.quote.plan()?.key);
      if (step1 === null || !plan) throw new Error('the summary has no valid step 1 or plan');
      this.rows.set(buildSummaryRows(configs, step1, country.locale));
      this.chosen.set({ plan, price: formatMoney(calculateFinalPrice(plan.basePrice, step1, this.clock()), country.locale, country.currencyCode) });
      this.dataStatus.set('ready');
    } catch {
      this.dataStatus.set('error');
    }
  }

  /** One terms request per entry and per "Reintentar" (spec 7.2). */
  protected loadTerms(): void {
    const country = this.country;
    if (!country) {
      this.termsStatus.set('error');
      return;
    }
    this.termsRequest?.unsubscribe();
    this.termsStatus.set('loading');
    this.termsRequest = this.termsApi.load(country.code).subscribe({
      next: (terms) => {
        this.terms.set(terms);
        this.termsStatus.set(terms === null ? 'none' : 'shown');
      },
      error: () => this.termsStatus.set('error'),
    });
  }

  protected accept(event: Event): void {
    this.accepted.set((event.target as HTMLInputElement).checked);
  }

  protected chooseOutcome(value: 'approved' | 'rejected'): void {
    this.outcome.set(value);
  }

  protected editData(): void {
    this.leaveTo('datos');
  }

  protected changePlan(): void {
    this.leaveTo('planes');
  }

  protected newQuote(): void {
    this.leaveTo('datos');
  }

  /** Activation of "Pagar": exactly one attempt, locked synchronously before any await (US-03-BR-05). */
  protected async pay(): Promise<void> {
    if (!this.canPay() || !this.country) return;
    this.paymentState.set('processing');
    const country = this.country;
    try {
      const result = await this.gateway.pay({ simulatedOutcome: this.outcome() }, this.abort.signal);
      if (this.abort.signal.aborted) return;
      if (result.status === 'approved') {
        // Order of ADR-0008: number, then the state is deleted, then the confirmation.
        this.quoteNumber.set(formatQuoteNumber(country.code, this.clock(), this.randomDigits()));
        this.quote.clearQuote();
        this.paymentState.set('confirmed');
        this.title.setTitle(`${CONFIRMED_HEADING} | ${APP_TITLE}`);
        afterNextRender(() => this.heading().nativeElement.focus(), { injector: this.injector });
      } else {
        this.paymentState.set('rejected');
      }
    } catch (error) {
      if (this.abort.signal.aborted || error instanceof PaymentInProgressError) return;
      this.paymentState.set('rejected');
    }
  }

  protected headingText(): string {
    return this.confirmed() ? CONFIRMED_HEADING : SUMMARY_HEADING;
  }

  private leaveTo(step: 'datos' | 'planes'): void {
    if (this.processing()) return;
    void this.router.navigate(['/', (this.country?.code ?? '').toLowerCase(), step]);
  }
}
