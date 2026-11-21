import { ChangeDetectionStrategy, Component, computed, inject } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { ActivatedRoute, NavigationEnd, Router, RouterOutlet } from '@angular/router';
import { filter, map } from 'rxjs';
import { CountryStore } from '../../core/country-store';
import { WizardProgressStore } from '../../core/wizard-progress-store';
import { CountryFlag } from '../../shared/country-flag';
import { countryVisuals } from '../../shared/country-visuals';
import { StepIndicator } from '../../shared/step-indicator';

/**
 * The frame of the wizard pages (`/:country/...`): the header with the product name and the
 * country chip, the step indicator, and the page. It sets the country accent key from the
 * presentation map (ADR-0011); the colour itself lives in `tokens.css`. Not shown on the country
 * chooser or the unknown-country page.
 */
@Component({
  selector: 'app-wizard-shell',
  imports: [RouterOutlet, CountryFlag, StepIndicator],
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { '[attr.data-country-accent]': 'accent()' },
  styleUrl: './wizard-shell.css',
  templateUrl: './wizard-shell.html',
})
export class WizardShell {
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly countries = inject(CountryStore);
  protected readonly progress = inject(WizardProgressStore);

  protected readonly country = this.countries.find(this.route.snapshot.paramMap.get('country') ?? '');
  protected readonly accent = computed(() => (this.country ? countryVisuals(this.country.code).accent : null));

  private readonly stepOf = (): number | null => {
    const step: unknown = this.route.snapshot.firstChild?.data['step'];
    return typeof step === 'number' ? step : null;
  };
  protected readonly step = toSignal(
    this.router.events.pipe(
      filter((event) => event instanceof NavigationEnd),
      map(() => this.stepOf()),
    ),
    { initialValue: this.stepOf() },
  );
}
