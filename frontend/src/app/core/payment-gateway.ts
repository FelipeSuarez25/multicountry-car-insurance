/** What the page hands to the gateway: nothing but the simulated outcome (ADR-0008). */
export interface PaymentRequest {
  simulatedOutcome: 'approved' | 'rejected';
}

/** The result of an attempt; it carries its status and nothing else. */
export type PaymentResult = { status: 'approved' } | { status: 'rejected' };

/**
 * The boundary a real payment provider would replace (ADR-0008). Also the DI token. `pay` rejects
 * with an `AbortError` when the signal is aborted, and with `PaymentInProgressError` when an
 * attempt is already in flight.
 */
export abstract class PaymentGateway {
  abstract pay(request: PaymentRequest, signal: AbortSignal): Promise<PaymentResult>;
}

/** A second `pay` was called while an attempt was still in flight. */
export class PaymentInProgressError extends Error {
  constructor() {
    super('A payment attempt is already in progress');
    this.name = 'PaymentInProgressError';
  }
}
