import { ChangeDetectionStrategy, Component, input } from '@angular/core';
import { LucideReceipt, LucideShieldCheck, LucideUserRound } from '@lucide/angular';

/** The icon of a wizard step (the single step-to-icon mapping, shared by the indicator and the chooser). */
@Component({
  selector: 'app-step-icon',
  imports: [LucideUserRound, LucideShieldCheck, LucideReceipt],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    @switch (step()) {
      @case (1) {
        <svg lucideUserRound [class.lucide-small]="small()"></svg>
      }
      @case (2) {
        <svg lucideShieldCheck [class.lucide-small]="small()"></svg>
      }
      @default {
        <svg lucideReceipt [class.lucide-small]="small()"></svg>
      }
    }
  `,
  styles: ':host { display: contents; }',
})
export class StepIcon {
  readonly step = input.required<number>();
  readonly small = input(false);
}
