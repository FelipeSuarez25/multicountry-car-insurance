import { ChangeDetectionStrategy, Component, input } from '@angular/core';
import { RouterLink } from '@angular/router';
import { CountryFlag } from './country-flag';
import type { Country } from './country.model';

/**
 * The app header, shared by the country chooser (no country) and the wizard shell (US-04-BR-20,
 * BR-21, ADR-0014 section 5): the brand mark (an original, decorative inline SVG: a rounded square
 * filled with the brand gradient, a shield and a check, hidden from assistive technology), the
 * product name and, for a resolved country, the country chip as a link to the chooser. The chip's accessible name contains the visible country name (WCAG 2.5.3);
 * the flag is decorative.
 */
@Component({
  selector: 'app-site-header',
  imports: [RouterLink, CountryFlag],
  changeDetection: ChangeDetectionStrategy.OnPush,
  styleUrl: './site-header.css',
  templateUrl: './site-header.html',
})
export class SiteHeader {
  /** The country of the wizard page, or null on the chooser. */
  readonly country = input<Country | null>(null);
}
