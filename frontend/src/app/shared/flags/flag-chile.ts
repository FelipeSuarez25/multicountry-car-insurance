import { ChangeDetectionStrategy, Component } from '@angular/core';

/**
 * Chile, 2:3, white over red, a blue square canton as high as the white band with a white
 * five-pointed star (ADR-0010 section 8). Decorative: hidden, no text.
 */
@Component({
  selector: 'app-flag-chile',
  changeDetection: ChangeDetectionStrategy.OnPush,
  styleUrl: './flag.css',
  template: `
    <svg aria-hidden="true" focusable="false" viewBox="0 0 30 20">
      <rect class="cl-white" width="30" height="10" />
      <rect class="cl-red" y="10" width="30" height="10" />
      <rect class="cl-blue" width="10" height="10" />
      <polygon class="cl-white" points="5,2.5 5.56,4.23 7.38,4.23 5.91,5.3 6.47,7.02 5,5.96 3.53,7.02 4.09,5.3 2.62,4.23 4.44,4.23" />
    </svg>
  `,
})
export class FlagChile {}
