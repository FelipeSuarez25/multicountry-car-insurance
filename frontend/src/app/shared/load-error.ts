import { Component, ElementRef, afterNextRender, input, output, viewChild } from '@angular/core';

/**
 * Error state of a remote load: the message in a `role="alert"` region and a "Reintentar" button
 * that takes focus when the state appears (spec section 8).
 */
@Component({
  selector: 'app-load-error',
  template: `
    <p role="alert" class="load-error__message">{{ message() }}</p>
    <button type="button" #retryButton (click)="retry.emit()">Reintentar</button>
  `,
  styles: `
    :host {
      display: block;
    }
    .load-error__message {
      margin: 0 0 1rem;
      color: var(--color-error);
      font-weight: 600;
    }
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
