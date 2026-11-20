// The "test" payment provider's checkout page: Pay or Cancel, no money moves.
// Only registered when PAYMENT_PROVIDER=test.

import type { FastifyInstance, FastifyReply } from "fastify";
import { z } from "zod";
import type { Deps } from "../app.ts";
import { formatRupees } from "../domain/pricing.ts";
import { formatHour, formatWhen } from "../domain/time.ts";
import type { Booking } from "../domain/types.ts";
import { parse } from "../http/errors.ts";
import { withResult } from "../http/return-url.ts";
import { confirmPayment, failPayment, getBooking } from "../services/bookings.ts";

const esc = (s: string) =>
  s.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]!);

function page(title: string, body: string) {
  return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<meta name="robots" content="noindex">
<title>${esc(title)} · KhelSpot</title>
<style>
  :root { color-scheme: light; }
  body { margin: 0; font: 16px/1.5 system-ui, -apple-system, "Segoe UI", sans-serif; background: #f3f2ec; color: #111513; }
  main { max-width: 420px; margin: 0 auto; padding: 32px 16px; }
  .card { background: #fff; border: 1px solid #d9d6cb; border-radius: 16px; padding: 24px; }
  .tag { display: inline-block; font: 700 12px ui-monospace, monospace; letter-spacing: .06em; text-transform: uppercase; background: #fff1bf; color: #5c4600; padding: 4px 8px; border-radius: 6px; }
  h1 { font-size: 24px; margin: 12px 0 4px; }
  .muted { color: #4b5550; margin: 0; }
  .amount { font-size: 34px; font-weight: 800; margin: 18px 0 4px; }
  form { margin: 0; }
  .row { display: grid; gap: 10px; margin-top: 20px; }
  button { width: 100%; min-height: 48px; border-radius: 999px; font: 700 16px system-ui, sans-serif; cursor: pointer; border: 2px solid #111513; }
  .pay { background: #d4f53c; border-color: #d4f53c; color: #111513; }
  .cancel { background: #fff; color: #111513; }
  button:focus-visible { outline: 3px solid #111513; outline-offset: 2px; }
</style>
</head>
<body><main>${body}</main></body>
</html>`;
}

function resultPage(b: Booking, title: string, line: string) {
  return page(
    title,
    `<div class="card"><span class="tag">Test payment</span><h1>${esc(title)}</h1>
     <p class="muted">${esc(line)}</p><p class="muted">Booking ${esc(b.ref)}. You can close this page.</p></div>`,
  );
}

const html = (reply: FastifyReply, body: string, code = 200) => reply.code(code).type("text/html; charset=utf-8").send(body);

export async function testPaymentRoutes(app: FastifyInstance, deps: Deps) {
  const { db, now, payments } = deps;
  const refParams = z.object({ ref: z.string() });

  app.get("/pay/test/:ref", async (req, reply) => {
    const { ref } = parse(refParams, req.params);
    const booking = await getBooking(db, ref, now());
    if (booking.status === "confirmed") return html(reply, resultPage(booking, "Already paid", "This booking is confirmed."));
    if (booking.status === "cancelled") {
      return html(reply, resultPage(booking, "Payment closed", "This payment was cancelled or its time ran out."));
    }

    const venue = await db.venue.findUniqueOrThrow({ where: { id: booking.venueId }, select: { name: true } });
    const court = await db.court.findUniqueOrThrow({ where: { id: booking.courtId }, select: { name: true } });
    const expires = booking.holdExpiresAt ? new Date(booking.holdExpiresAt) : null;
    const expiresAt = expires ? formatHour(expires.getHours() + expires.getMinutes() / 60) : "";
    const action = (a: string) => `/pay/test/${encodeURIComponent(booking.ref)}/${a}`;

    return html(
      reply,
      page(
        "Test payment",
        `<div class="card">
          <span class="tag">Test payment, no money moves</span>
          <h1>${esc(venue.name)}</h1>
          <p class="muted">${esc(court.name)} · ${esc(formatWhen(booking.date, booking.start, booking.hours))}</p>
          <p class="amount">${esc(formatRupees(booking.price))}</p>
          <p class="muted">Booking ${esc(booking.ref)}${expiresAt ? `, held until ${esc(expiresAt)}` : ""}.</p>
          <div class="row">
            <form method="post" action="${action("pay")}"><button class="pay" type="submit">Pay ${esc(formatRupees(booking.price))}</button></form>
            <form method="post" action="${action("cancel")}"><button class="cancel" type="submit">Cancel</button></form>
          </div>
        </div>`,
      ),
    );
  });

  app.post("/pay/test/:ref/:action", async (req, reply) => {
    parse(z.object({ ref: z.string(), action: z.enum(["pay", "cancel"]) }), req.params);
    const result = await payments.handleCallback(req);
    const { booking, returnUrl } = result.ok
      ? await confirmPayment(db, result.bookingRef, now())
      : await failPayment(db, result.bookingRef, now());

    const status = booking.status === "confirmed" ? "paid" : "cancelled";
    if (returnUrl) return reply.redirect(withResult(returnUrl, booking.ref, status), 303);
    return status === "paid"
      ? html(reply, resultPage(booking, "Payment received", "Your booking is confirmed."))
      : html(reply, resultPage(booking, "Payment cancelled", "No money was taken and the slot was released."));
  });
}
