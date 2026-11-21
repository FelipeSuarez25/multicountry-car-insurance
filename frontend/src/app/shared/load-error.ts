import { Component, ElementRef, afterNextRender, input, output, viewChild } from '@angular/core';
import { LucideCircleAlert } from '@lucide/angular';

/**
 * Error state of a remote load: the message in a `role="alert"` region and a "Reintentar" button
 * that takes focus when the state appears (spec section 8).
 */
@Component({
  selector: 'app-load-error',
  imports: [LucideCircleAlert],
  styleUrl: './load-error.css',
  template: `
    <p role="alert" class="message message--error load-error__message">
      <svg lucideCircleAlert></svg>
      <span>{{ message() }}</span>
    </p>
    <button type="button" #retryButton (click)="retry.emit()">Reintentar</button>
  `,
})
export class LoadError {
  readonly message = input.required<string>();
  readonly retry = output<void>();
  private readonly retryButton = viewChild.required<ElementRef<HTMLButtonElement>>('retryButton');

  constructor() {
    afterNextRender(() => this.retryButton().nativeElement.focus());
  }
}
