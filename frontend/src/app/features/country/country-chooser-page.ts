import { Component, inject } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { CountryStore } from '../../core/country-store';
import { LucideChevronRight } from '@lucide/angular';
import { CountryFlag } from '../../shared/country-flag';
import { countryVisuals } from '../../shared/country-visuals';
import { LoadError } from '../../shared/load-error';
import { SiteHeader } from '../../shared/site-header';
import { StepIcon } from '../../shared/step-icon';
import { WIZARD_STEPS } from '../../shared/step-indicator';

/** What each wizard step is about (spec 8.1, US-04-AC-29); the names come from the step indicator. */
const STEP_DESCRIPTIONS = ['Cuéntanos sobre ti y tu vehículo.', 'Compara coberturas y precios.', 'Revisa, acepta los términos y paga.'];

/**
 * Root address `/`: the app header, one link per published country (ADR-0001) and a short "how it
 * works" list of the three steps (US-04-BR-20). No detection from IP or locale.
 */
@Component({
  selector: 'app-country-chooser-page',
  imports: [RouterLink, LoadError, CountryFlag, SiteHeader, LucideChevronRight, StepIcon],
  templateUrl: './country-chooser-page.html',
  styleUrl: './country-page.css',
})
export class CountryChooserPage {
  protected readonly countries = inject(CountryStore);
  private readonly router = inject(Router);
  protected readonly steps = WIZARD_STEPS.map((step, i) => ({ ...step, description: STEP_DESCRIPTIONS[i] }));

  constructor() {
    void this.countries.ensureLoaded();
  }

  /** The accent key of a country link (a key of `[data-choice-accent]` in `tokens.css`), or null. */
  protected accentOf(code: string): string | null {
    return countryVisuals(code).accent;
  }

  protected async retry(): Promise<void> {
    await this.countries.reload();
    await this.router.navigateByUrl(this.router.url, { onSameUrlNavigation: 'reload' });
  }
}
