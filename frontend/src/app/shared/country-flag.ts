import { NgComponentOutlet } from '@angular/common';
import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';
import { LucideEarth } from '@lucide/angular';
import { countryVisuals } from './country-visuals';

/**
 * The flag of a country next to its name, or the neutral globe when the front end has no flag for
 * it (ADR-0011). Decorative: hidden from assistive technology, no text, never the only indicator.
 */
@Component({
  selector: 'app-country-flag',
  imports: [NgComponentOutlet, LucideEarth],
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { '[class.flag--accent]': 'accentRing()', '[class.flag--large]': 'large()' },
  styleUrl: './country-flag.css',
  template: `
    @if (flag(); as component) {
      <ng-container *ngComponentOutlet="component" />
    } @else {
      <svg lucideEarth class="globe"></svg>
    }
  `,
})
export class CountryFlag {
  /** The ISO code of the country. */
  readonly code = input.required<string>();
  /** Draws the ring of the flag in the country accent (the header chip). */
  readonly accentRing = input(false);
  /** The larger flag of the country cards. */
  readonly large = input(false);
  protected readonly flag = computed(() => countryVisuals(this.code()).flag);
}
