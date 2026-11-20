// Online payment providers. Chosen with PAYMENT_PROVIDER.
//
// Flow: POST /bookings with an online method creates a pending_payment hold,
// then startCheckout() gives the URL the player pays on. The provider later
// reports the result through its callback route, which calls
// confirmPayment() or failPayment() in services/bookings.ts.

import type { FastifyRequest } from "fastify";
import type { Booking } from "../../domain/types.ts";
import { testProvider } from "./test.ts";

export interface CheckoutContext {
  /** Public base URL of this API, e.g. https://api.khelspot.pk */
  baseUrl: string;
}

export interface PaymentProvider {
  readonly name: string;
  startCheckout(booking: Booking, ctx: CheckoutContext): Promise<{ url: string }>;
  /** Reads a provider callback and says which booking it was for and whether it was paid. */
  handleCallback(req: FastifyRequest): Promise<{ bookingRef: string; ok: boolean }>;
}

export interface ProviderSettings {
  name: string | undefined;
  isProduction: boolean;
  allowTestPaymentsInProduction: boolean;
}

/** Throws at startup rather than taking real bookings without a way to pay. */
export function createPaymentProvider(s: ProviderSettings): PaymentProvider {
  if (!s.name) {
    throw new Error("Set PAYMENT_PROVIDER. Production needs a real payment provider.");
  }
  switch (s.name) {
    case "test":
      if (s.isProduction && !s.allowTestPaymentsInProduction) {
        throw new Error(
          "PAYMENT_PROVIDER=test can't run in production. Wire up a real provider, or set ALLOW_TEST_PAYMENTS=1 for a demo deployment.",
        );
      }
      return testProvider;
    // TODO(payments): wire these in once merchant accounts exist; see jazzcash.ts and easypaisa.ts.
    case "jazzcash":
    case "easypaisa":
      throw new Error(`PAYMENT_PROVIDER "${s.name}" is only a stub so far. See src/services/payments/${s.name}.ts.`);
    default:
      throw new Error(`Unknown PAYMENT_PROVIDER "${s.name}".`);
  }
}
