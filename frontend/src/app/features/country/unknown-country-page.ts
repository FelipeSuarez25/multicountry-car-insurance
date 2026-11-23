import { Component, inject } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { CountryStore } from '../../core/country-store';
import { LucideChevronRight } from '@lucide/angular';
import { CountryFlag } from '../../shared/country-flag';
import { LoadError } from '../../shared/load-error';

/**
 * Fallback of the routes (ADR-0001): a code that is not in the published list, or a list that
 * could not be loaded. The address is kept as typed. No field configuration is requested.
 */
@Component({
  selector: 'app-unknown-country-page',
  imports: [RouterLink, LoadError, CountryFlag, LucideChevronRight],
  templateUrl: './unknown-country-page.html',
  styleUrl: './country-page.css',
})
export class UnknownCountryPage {
  protected readonly countries = inject(CountryStore);
  private readonly router = inject(Router);

  constructor() {
    void this.countries.ensureLoaded();
  }

  protected async retry(): Promise<void> {
    await this.countries.reload();
    await this.router.navigateByUrl(this.router.url, { onSameUrlNavigation: 'reload' });
  }
}
