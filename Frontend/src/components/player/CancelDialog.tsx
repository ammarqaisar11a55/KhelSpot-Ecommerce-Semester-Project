"use client";

import { useState } from "react";
import { Modal } from "@/components/ui/Modal";
import ui from "@/components/ui/ui.module.css";
import { formatRupees, refundQuote } from "@/lib/domain/pricing";
import { formatWhen } from "@/lib/domain/time";
import type { Booking, Venue } from "@/lib/domain/types";
import { BookingError, cancelBooking } from "@/lib/store/store";

interface CancelDialogProps {
  booking: Booking | null;
  venue: Venue | undefined;
  by: "player" | "owner";
  onClose: () => void;
}

export function CancelDialog({ booking, venue, by, onClose }: CancelDialogProps) {
  const [error, setError] = useState("");
  if (!booking || !venue) return <Modal open={false} title="Cancel booking" onClose={onClose}>{null}</Modal>;

  const quote = refundQuote(booking, venue.cancellation);
  const refund = by === "owner" ? (booking.paid ? booking.price : 0) : quote.amount;

  return (
    <Modal open title="Cancel this booking?" onClose={onClose}>
      <p>
        {venue.courts.find((c) => c.id === booking.courtId)?.name}, {formatWhen(booking.date, booking.start, booking.hours)}
      </p>
      {by === "player" ? (
        <p className={ui.muted}>
          {quote.reason}{" "}
          {booking.paid
            ? `You'll get ${formatRupees(refund)} back to your ${booking.payment === "card" ? "card" : "account"}.`
            : "Nothing was paid, so there's nothing to refund."}
        </p>
      ) : (
        <p className={ui.muted}>
          Cancelling from the venue refunds the player in full
          {booking.paid ? ` (${formatRupees(refund)})` : ""} and sends them a WhatsApp message.
        </p>
      )}
      {error && <p className={ui.error} role="alert">{error}</p>}
      <div className={ui.buttonRow}>
        <button
          type="button"
          className={ui.btnDanger}
          disabled={!quote.canCancel}
          onClick={() => {
            try {
              cancelBooking(booking, by);
              onClose();
            } catch (e) {
              setError(e instanceof BookingError ? e.message : "Couldn't cancel. Please try again.");
            }
          }}
        >
          Cancel booking
        </button>
        <button type="button" className={ui.btnLight} onClick={onClose}>
          Keep it
        </button>
      </div>
    </Modal>
  );
}
