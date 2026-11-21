import { Injectable, InjectionToken, inject } from '@angular/core';
import { PaymentGateway, PaymentInProgressError, type PaymentRequest, type PaymentResult } from './payment-gateway';

/** The fixed time a simulated payment takes (US-03-AC-15). */
export const SIMULATED_PROCESSING_MS = 1500;

type Delay = (ms: number, signal: AbortSignal) => Promise<void>;

const abortError = (): DOMException => new DOMException('The payment was aborted', 'AbortError');

/** Timer based, never a loop on `Date.now()`: the e2e tests pin the page clock. Cleared on abort. */
const timerDelay: Delay = (ms, signal) =>
  new Promise<void>((resolve, reject) => {
    if (signal.aborted) {
      reject(abortError());
      return;
    }
    const onAbort = (): void => {
      clearTimeout(timer);
      reject(abortError());
    };
    const timer = setTimeout(() => {
      signal.removeEventListener('abort', onAbort);
      resolve();
    }, ms);
    signal.addEventListener('abort', onAbort, { once: true });
  });

/** The wait of the simulation, injectable so tests control time. */
export const PAYMENT_DELAY = new InjectionToken<Delay>('PAYMENT_DELAY', { providedIn: 'root', factory: () => timerDelay });

/**
 * The simulated gateway (ADR-0008): waits a fixed time, then answers the outcome it was asked for.
 * No HTTP, no storage and no payment data. One attempt at a time.
 */
@Injectable()
export class SimulatedPaymentGateway extends PaymentGateway {
  private readonly delay = inject(PAYMENT_DELAY);
  private inFlight = false;

  async pay(request: PaymentRequest, signal: AbortSignal): Promise<PaymentResult> {
    if (this.inFlight) throw new PaymentInProgressError();
    if (signal.aborted) throw abortError();
    this.inFlight = true;
    try {
      await this.delay(SIMULATED_PROCESSING_MS, signal);
      return { status: request.simulatedOutcome };
    } finally {
      this.inFlight = false;
    }
  }
}
