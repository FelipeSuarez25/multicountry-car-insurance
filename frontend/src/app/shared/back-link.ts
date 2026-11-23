import { ChangeDetectionStrategy, Component, input } from '@angular/core';
import { RouterLink } from '@angular/router';
import { LucideArrowLeft } from '@lucide/angular';

/**
 * The "back" link above the `h1` of a wizard step (US-04-BR-21): a real link with a left arrow,
 * a 44 px hit box and a visible focus ring. The label is code-owned copy (spec 8.1).
 */
@Component({
  selector: 'app-back-link',
  imports: [RouterLink, LucideArrowLeft],
  changeDetection: ChangeDetectionStrategy.OnPush,
  styleUrl: './back-link.css',
  template: `
    <a class="back" [routerLink]="link()">
      <svg lucideArrowLeft></svg>
      <span>{{ label() }}</span>
    </a>
  `,
})
export class BackLink {
  readonly link = input.required<string | readonly string[]>();
  readonly label = input.required<string>();
}
