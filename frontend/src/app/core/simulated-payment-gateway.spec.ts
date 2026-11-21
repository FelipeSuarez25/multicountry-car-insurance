import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { PaymentGateway } from './payment-gateway';
import { PAYMENT_DELAY, SIMULATED_PROCESSING_MS, SimulatedPaymentGateway } from './simulated-payment-gateway';

/**
 * ADR-0008: the gateway boundary and its simulation.
 *
 * Expected API:
 *   `frontend/src/app/core/payment-gateway.ts`:
 *     abstract class PaymentGateway { abstract pay(request: PaymentRequest, signal: AbortSignal): Promise<PaymentResult> }
 *     PaymentRequest = { simulatedOutcome: 'approved' | 'rejected' }
 *     PaymentResult  = { status: 'approved' } | { status: 'rejected' }
 *   `frontend/src/app/core/simulated-payment-gateway.ts`:
 *     SIMULATED_PROCESSING_MS = 1500
 *     PAYMENT_DELAY: InjectionToken<(ms: number, signal: AbortSignal) => Promise<void>>   (timer based, cleared on abort)
 *     class SimulatedPaymentGateway extends PaymentGateway   (injects no HttpClient and no storage)
 *   A second `pay` while one is in flight rejects with a `PaymentInProgressError` and starts no timer.
 *   An aborted `pay` rejects with an `AbortError`.
 */

type Outcome = 'approved' | 'rejected';
type PaymentResult = { status: 'approved' } | { status: 'rejected' };
/** The contract (ADR-0008), typed here. */
interface Gateway {
  pay(request: { simulatedOutcome: Outcome }, signal: AbortSignal): Promise<PaymentResult>;
}
type Delay = (ms: number, signal: AbortSignal) => Promise<void>;

describe('ADR-0008 SimulatedPaymentGateway (US-03-BR-08: no request, deterministic outcome; US-03-AC-03, AC-04, AC-09, AC-15)', () => {
  let gateway: Gateway;
  let http: HttpTestingController;

  function configure(extra: unknown[] = []): void {
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting(), { provide: PaymentGateway, useClass: SimulatedPaymentGateway }, ...(extra as never[])],
    });
    gateway = TestBed.inject(PaymentGateway) as Gateway;
    http = TestBed.inject(HttpTestingController);
  }

  /** Starts a payment and records how it ended. */
  function start(outcome: Outcome, signal: AbortSignal = new AbortController().signal) {
    const state: { result?: PaymentResult; error?: unknown; settled: boolean } = { settled: false };
    const promise = gateway.pay({ simulatedOutcome: outcome }, signal).then(
      (result) => {
        state.result = result;
        state.settled = true;
      },
      (error: unknown) => {
        state.error = error;
        state.settled = true;
      },
    );
    return { state, promise };
  }
  const nameOf = (error: unknown): string => (error as { constructor?: { name?: string } })?.constructor?.name ?? '';

  beforeEach(() => {
    vi.useFakeTimers();
    configure();
  });
  afterEach(() => {
    vi.useRealTimers();
    vi.restoreAllMocks();
  });

  describe('US-03-AC-15 the simulated processing time is 1.5 seconds', () => {
    it('US-03-AC-15 SIMULATED_PROCESSING_MS is 1500', () => {
      expect(SIMULATED_PROCESSING_MS).toBe(1500);
    });

    for (const outcome of ['approved', 'rejected'] as const) {
      it(`US-03-AC-15 "${outcome}" is still pending at 1499 ms and resolves at 1500 ms`, async () => {
        const attempt = start(outcome);
        await vi.advanceTimersByTimeAsync(1_499);
        expect(attempt.state.settled).toBe(false);
        await vi.advanceTimersByTimeAsync(1);
        await attempt.promise;
        expect(attempt.state.result).toEqual({ status: outcome });
        expect(attempt.state.error).toBeUndefined();
      });
    }
  });

  describe('US-03-AC-04 the outcome is the one asked for, deterministically', () => {
    it('US-03-AC-04 an "approved" request is approved every time (20 attempts)', async () => {
      for (let i = 0; i < 20; i++) {
        const attempt = start('approved');
        await vi.advanceTimersByTimeAsync(1_500);
        await attempt.promise;
        expect(attempt.state.result).toEqual({ status: 'approved' });
      }
    });

    it('US-03-AC-04 a "rejected" request is rejected every time (20 attempts), as a result and not as an exception', async () => {
      for (let i = 0; i < 20; i++) {
        const attempt = start('rejected');
        await vi.advanceTimersByTimeAsync(1_500);
        await attempt.promise;
        expect(attempt.state.result).toEqual({ status: 'rejected' });
        expect(attempt.state.error).toBeUndefined();
      }
    });

    it('US-03-AC-04 after a rejection a new attempt is possible, and it can be approved', async () => {
      const first = start('rejected');
      await vi.advanceTimersByTimeAsync(1_500);
      await first.promise;
      const second = start('approved');
      await vi.advanceTimersByTimeAsync(1_500);
      await second.promise;
      expect(first.state.result).toEqual({ status: 'rejected' });
      expect(second.state.result).toEqual({ status: 'approved' });
    });

    it('US-03-AC-04 the result carries nothing but its status (no amount, plan, country, personal value or card data)', async () => {
      const attempt = start('approved');
      await vi.advanceTimersByTimeAsync(1_500);
      await attempt.promise;
      expect(Object.keys(attempt.state.result as object)).toEqual(['status']);
    });
  });

  describe('US-03-AC-15 the delay goes through the PAYMENT_DELAY token (injectable for tests)', () => {
    it('US-03-AC-15 the gateway waits for the injected delay with 1500 ms, and resolves only when it resolves', async () => {
      TestBed.resetTestingModule();
      let release: () => void = () => undefined;
      const delay = vi.fn<Delay>(() => new Promise<void>((resolve) => (release = resolve)));
      configure([{ provide: PAYMENT_DELAY, useValue: delay }]);
      const attempt = start('approved');
      await vi.advanceTimersByTimeAsync(60_000); // real time passing does not matter: the injected delay decides
      expect(delay).toHaveBeenCalledTimes(1);
      expect(delay.mock.calls[0][0]).toBe(1500);
      expect(attempt.state.settled).toBe(false);
      release();
      await attempt.promise;
      expect(attempt.state.result).toEqual({ status: 'approved' });
    });

    it('US-03-AC-15 an instant injected delay makes the payment instant, and no timer is created by the gateway itself', async () => {
      TestBed.resetTestingModule();
      configure([{ provide: PAYMENT_DELAY, useValue: () => Promise.resolve() }]);
      const attempt = start('rejected');
      await attempt.promise;
      expect(attempt.state.result).toEqual({ status: 'rejected' });
      expect(vi.getTimerCount()).toBe(0);
    });

    it('US-03-AC-15 the default delay is timer based: it resolves at 1500 ms of timers, not by reading the clock (a pinned Date does not stall it)', async () => {
      const delay = TestBed.inject(PAYMENT_DELAY) as Delay;
      vi.setSystemTime(new Date('2026-11-21T10:00:00')); // the e2e tests pin Date like this
      let done = false;
      void delay(1_500, new AbortController().signal).then(() => (done = true));
      await vi.advanceTimersByTimeAsync(1_499);
      expect(done).toBe(false);
      await vi.advanceTimersByTimeAsync(1);
      expect(done).toBe(true);
    });

    it('US-03-AC-15 the default delay clears its timer on abort and rejects with an AbortError', async () => {
      const delay = TestBed.inject(PAYMENT_DELAY) as Delay;
      const controller = new AbortController();
      const pending = delay(1_500, controller.signal);
      const caught = pending.then(
        () => null,
        (error: unknown) => error,
      );
      expect(vi.getTimerCount()).toBe(1);
      controller.abort();
      const error = (await caught) as { name?: string } | null;
      expect(error?.name).toBe('AbortError');
      expect(vi.getTimerCount()).toBe(0);
    });
  });

  describe('US-03-AC-09 a single attempt in flight (the gateway protects any caller)', () => {
    it('US-03-AC-09 a second pay while one is in flight rejects with a PaymentInProgressError and starts no timer', async () => {
      const first = start('approved');
      expect(vi.getTimerCount()).toBe(1);
      const second = start('approved');
      await second.promise;
      expect(nameOf(second.state.error)).toBe('PaymentInProgressError');
      expect(vi.getTimerCount()).toBe(1);
      expect(first.state.settled).toBe(false);
    });

    it('US-03-AC-09 the first attempt is not disturbed by the refused ones: it resolves once, at 1500 ms', async () => {
      const first = start('approved');
      start('rejected');
      start('approved');
      await vi.advanceTimersByTimeAsync(1_500);
      await first.promise;
      expect(first.state.result).toEqual({ status: 'approved' });
    });

    it('US-03-AC-09 three calls within 200 ms process exactly one attempt', async () => {
      const results: PaymentResult[] = [];
      const errors: unknown[] = [];
      const call = (): void => {
        void gateway.pay({ simulatedOutcome: 'approved' }, new AbortController().signal).then((r) => results.push(r), (e: unknown) => errors.push(e));
      };
      call();
      await vi.advanceTimersByTimeAsync(100);
      call();
      await vi.advanceTimersByTimeAsync(100);
      call();
      await vi.advanceTimersByTimeAsync(1_500);
      expect(results).toEqual([{ status: 'approved' }]);
      expect(errors.map(nameOf)).toEqual(['PaymentInProgressError', 'PaymentInProgressError']);
    });

    it('US-03-AC-09 once the attempt has ended the flag is free again: the next pay is accepted', async () => {
      const first = start('approved');
      await vi.advanceTimersByTimeAsync(1_500);
      await first.promise;
      const second = start('approved');
      expect(vi.getTimerCount()).toBe(1);
      await vi.advanceTimersByTimeAsync(1_500);
      await second.promise;
      expect(second.state.result).toEqual({ status: 'approved' });
    });
  });

  describe('ADR-0008 leaving during processing: abort', () => {
    it('ADR-0008 aborting rejects with an AbortError and the timer is cleared', async () => {
      const controller = new AbortController();
      const attempt = start('approved', controller.signal);
      expect(vi.getTimerCount()).toBe(1);
      controller.abort();
      await attempt.promise;
      expect((attempt.state.error as { name?: string }).name).toBe('AbortError');
      expect(attempt.state.result).toBeUndefined();
      expect(vi.getTimerCount()).toBe(0);
    });

    it('ADR-0008 an aborted attempt never resolves later, however long it waits', async () => {
      const controller = new AbortController();
      const attempt = start('approved', controller.signal);
      controller.abort();
      await vi.advanceTimersByTimeAsync(10_000);
      await attempt.promise;
      expect(attempt.state.result).toBeUndefined();
    });

    it('ADR-0008 a signal that is already aborted starts nothing and rejects with an AbortError', async () => {
      const controller = new AbortController();
      controller.abort();
      const attempt = start('approved', controller.signal);
      await attempt.promise;
      expect((attempt.state.error as { name?: string }).name).toBe('AbortError');
      expect(vi.getTimerCount()).toBe(0);
    });

    it('ADR-0008 after an abort the gateway is not stuck: a new attempt is accepted', async () => {
      const controller = new AbortController();
      const aborted = start('approved', controller.signal);
      controller.abort();
      await aborted.promise;
      const next = start('rejected');
      await vi.advanceTimersByTimeAsync(1_500);
      await next.promise;
      expect(next.state.result).toEqual({ status: 'rejected' });
    });
  });

  describe('US-03-AC-15 / US-03-AC-19 the simulation sends no request', () => {
    it('US-03-AC-15 after an approved and a rejected attempt the HTTP testing controller has nothing to verify', async () => {
      const approved = start('approved');
      await vi.advanceTimersByTimeAsync(1_500);
      await approved.promise;
      const rejected = start('rejected');
      await vi.advanceTimersByTimeAsync(1_500);
      await rejected.promise;
      http.verify();
      expect(http.match(() => true)).toEqual([]);
    });

    it('US-03-AC-15 an aborted attempt and a refused second call send no request either', async () => {
      const controller = new AbortController();
      const first = start('approved', controller.signal);
      const refused = start('approved');
      controller.abort();
      await Promise.all([first.promise, refused.promise]);
      http.verify();
    });
  });
});
