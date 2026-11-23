import { ChangeDetectionStrategy, Component } from '@angular/core';

/** Colombia, 2:3, three horizontal bands 2:1:1 (ADR-0010 section 8). Decorative: hidden, no text. */
@Component({
  selector: 'app-flag-colombia',
  changeDetection: ChangeDetectionStrategy.OnPush,
  styleUrl: './flag.css',
  template: `
    <svg aria-hidden="true" focusable="false" viewBox="0 0 30 20">
      <rect class="co-yellow" width="30" height="10" />
      <rect class="co-blue" y="10" width="30" height="5" />
      <rect class="co-red" y="15" width="30" height="5" />
    </svg>
  `,
})
export class FlagColombia {}
