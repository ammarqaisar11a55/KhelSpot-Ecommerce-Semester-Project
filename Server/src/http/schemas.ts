import { z } from "zod";
import { PAYMENT_METHODS, SPORTS } from "../domain/types.ts";

/** "+92 300-1234567" and "0300 1234567" both become "03001234567". */
export const phone = z
  .string()
  .trim()
  .transform((raw) => {
    const compact = raw.replace(/[\s-]/g, "");
    return compact.startsWith("+92") ? `0${compact.slice(3)}` : compact;
  })
  .pipe(z.string().regex(/^03\d{9}$/, "Use a Pakistani mobile number, like 0300 1234567."));

export const isoDate = z.iso.date();
export const sport = z.enum(SPORTS);
export const payment = z.enum(PAYMENT_METHODS);

export const customer = z.object({
  name: z.string().trim().min(1, "Add a name.").max(80),
  phone,
});

export const newBooking = z.object({
  venueId: z.string().min(1),
  courtId: z.string().min(1),
  date: isoDate,
  start: z.number().int().min(0).max(29),
  hours: z.number().int().min(1).max(3),
  customer,
  payment,
  /** Online payment: where the payment page sends the player back. Ignored unless allow-listed. */
  returnUrl: z.string().trim().max(500).optional(),
});

export const walkInBooking = newBooking.omit({ returnUrl: true }).extend({
  /** Cash already taken at the counter. */
  paid: z.boolean().optional(),
});

export const rateBand = z.object({
  from: z.number().int().min(0).max(30),
  to: z.number().int().min(1).max(30),
  price: z.number().int().positive(),
  label: z.string().trim().min(1).max(40),
});

export const venueSettings = z.object({
  openHour: z.number().int().min(6).max(29),
  closeHour: z.number().int().min(7).max(30),
  pricing: z.partialRecord(sport, z.array(rateBand)),
  cancellation: z.object({
    freeUntilHours: z.number().int().min(0).max(72),
    lateRefundPercent: z.number().int().min(0).max(100),
  }),
  payAtVenue: z.boolean(),
});

export const bookingQuery = z.object({
  from: isoDate,
  to: isoDate,
  status: z.enum(["pending_payment", "confirmed", "cancelled"]).optional(),
});

export const otpRequest = z.object({ phone });

export const otpVerify = z.object({
  phone,
  code: z.string().trim().regex(/^\d{6}$/, "Enter the 6-digit code."),
});

export const profileUpdate = z.object({
  name: z.string().trim().min(1, "Add a name.").max(80),
});
