import { Component, inject } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { CountryStore } from '../../core/country-store';
import { LucideChevronRight } from '@lucide/angular';
import { CountryFlag } from '../../shared/country-flag';
import { LoadError } from '../../shared/load-error';

/** Root address `/`: one link per published country (ADR-0001). No detection from IP or locale. */
@Component({
  selector: 'app-country-chooser-page',
  imports: [RouterLink, LoadError, CountryFlag, LucideChevronRight],
  templateUrl: './country-chooser-page.html',
  styleUrl: './country-page.css',
})
export class CountryChooserPage {
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
