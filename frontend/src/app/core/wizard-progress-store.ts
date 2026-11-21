import { Injectable, signal } from '@angular/core';

/**
 * What the step indicator cannot read from the route: the payment was confirmed, so every step is
 * completed. Presentation only (US-04-AC-13); the wizard state and the routes do not depend on it.
 */
@Injectable({ providedIn: 'root' })
export class WizardProgressStore {
  readonly confirmed = signal(false);
}
