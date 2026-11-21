import { provideHttpClient } from '@angular/common/http';
import { ApplicationConfig, provideBrowserGlobalErrorListeners } from '@angular/core';
import { provideRouter } from '@angular/router';
import { routes } from './app.routes';
import { PaymentGateway } from './core/payment-gateway';
import { SimulatedPaymentGateway } from './core/simulated-payment-gateway';

export const appConfig: ApplicationConfig = {
  providers: [
    provideBrowserGlobalErrorListeners(),
    provideRouter(routes),
    provideHttpClient(),
    // The payment boundary (ADR-0008): a real provider replaces this one line.
    { provide: PaymentGateway, useClass: SimulatedPaymentGateway },
  ],
};
