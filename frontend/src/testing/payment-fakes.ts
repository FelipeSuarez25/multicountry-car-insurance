/**
 * A scripted payment gateway for the summary page tests (ADR-0008). It records every `pay` call
 * with its signal and leaves the outcome pending until the test settles it, so a test can check
 * what the page does while an attempt is in flight. It is a plain object, provided with
 * `{ provide: PaymentGateway, useValue: gateway }` (the page injects the abstract class).
 *
 * Like the real gateway, it rejects with an `AbortError` when the signal is aborted.
 */
export type SimulatedOutcome = 'approved' | 'rejected';
export type PaymentOutcome = { status: 'approved' } | { status: 'rejected' };

export interface PaymentCall {
  request: { simulatedOutcome: SimulatedOutcome };
  signal: AbortSignal;
}

export interface ControlledGateway {
  readonly calls: PaymentCall[];
  pay(request: { simulatedOutcome: SimulatedOutcome }, signal: AbortSignal): Promise<PaymentOutcome>;
  /** Settles the oldest pending attempt with the given outcome. */
  settle(outcome: PaymentOutcome): void;
}

export function controlledGateway(): ControlledGateway {
  const calls: PaymentCall[] = [];
  const pending: { resolve(outcome: PaymentOutcome): void; reject(error: unknown): void }[] = [];
  return {
    calls,
    pay(request, signal) {
      calls.push({ request, signal });
      return new Promise<PaymentOutcome>((resolve, reject) => {
        pending.push({ resolve, reject });
        signal.addEventListener('abort', () => reject(new DOMException('The payment was aborted', 'AbortError')), { once: true });
      });
    },
    settle(outcome) {
      const next = pending.shift();
      if (!next) throw new Error('No payment attempt is pending');
      next.resolve(outcome);
    },
  };
}
