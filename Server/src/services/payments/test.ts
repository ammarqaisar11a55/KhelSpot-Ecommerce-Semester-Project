// Test payments: a page with Pay and Cancel buttons. No money moves.
// Routes live in src/routes/pay-test.ts.

import type { FastifyRequest } from "fastify";
import type { PaymentProvider } from "./provider.ts";

export const testProvider: PaymentProvider = {
  name: "test",
  async startCheckout(booking, { baseUrl }) {
    return { url: `${baseUrl}/pay/test/${encodeURIComponent(booking.ref)}` };
  },
  async handleCallback(req: FastifyRequest) {
    const { ref, action } = req.params as { ref: string; action: string };
    return { bookingRef: ref, ok: action === "pay" };
  },
};
