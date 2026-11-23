import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';
import { LucideCheck } from '@lucide/angular';
import { StepIcon } from './step-icon';

export interface Step {
  n: 1 | 2 | 3;
  label: string;
}

/** The three wizard steps, in order (also listed on the country chooser). */
export const WIZARD_STEPS: readonly Step[] = [
  { n: 1, label: 'Tus datos' },
  { n: 2, label: 'Plan' },
  { n: 3, label: 'Resumen y pago' },
];

/**
 * The progress of the three wizard steps (US-04-Q-17): not interactive, no heading, no tab stop.
 * The current step carries `aria-current="step"`; every step says "Paso n de 3" and completed
 * steps say "completado" in visually hidden text. On the confirmation every step is completed.
 */
@Component({
  selector: 'app-step-indicator',
  imports: [LucideCheck, StepIcon],
  changeDetection: ChangeDetectionStrategy.OnPush,
  styleUrl: './step-indicator.css',
  templateUrl: './step-indicator.html',
})
export class StepIndicator {
  /** The step the page is on (1 to 3), or null when it is not one of them. */
  readonly current = input<number | null>(null);
  /** True once the payment is confirmed: every step is completed and none is current. */
  readonly confirmed = input(false);

  protected readonly steps = computed(() =>
    WIZARD_STEPS.map((step) => {
      const done = this.confirmed() || (this.current() ?? 0) > step.n;
      return { ...step, done, isCurrent: !this.confirmed() && this.current() === step.n };
    }),
  );
  /** How much of the progress line is filled, in whole steps (0, 1 or 2 of 2). */
  protected readonly progress = computed(() => (this.confirmed() ? 2 : Math.max(0, Math.min(2, (this.current() ?? 1) - 1))));
}
