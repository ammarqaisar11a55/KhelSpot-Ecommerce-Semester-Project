"use client";

import { useState } from "react";
import { CancelDialog } from "@/components/player/CancelDialog";
import { StatusBadge, bookingState } from "@/components/player/StatusBadge";
import { Modal } from "@/components/ui/Modal";
import ui from "@/components/ui/ui.module.css";
import { formatPhone } from "@/lib/format";
import { formatRupees } from "@/lib/domain/pricing";
import { formatDateTime, formatWhen } from "@/lib/domain/time";
import { PAYMENT_LABEL, SPORT_LABEL, type Booking, type Venue } from "@/lib/domain/types";
import { markPaid } from "@/lib/store/store";

interface Props {
  booking: Booking | null;
  venue: Venue;
  now: Date;
  onClose: () => void;
}

export function BookingDialog({ booking, venue, now, onClose }: Props) {
  const [cancelling, setCancelling] = useState(false);
  if (!booking) return <Modal open={false} title="Booking" onClose={onClose}>{null}</Modal>;

  const court = venue.courts.find((c) => c.id === booking.courtId);
  const st = bookingState(booking, now);
  const open = st === "confirmed" || st === "unpaid";

  if (cancelling) {
    return (
      <CancelDialog
        booking={booking}
        venue={venue}
        by="owner"
        onClose={() => {
          setCancelling(false);
          onClose();
        }}
      />
    );
  }

  return (
    <Modal open title={`Booking ${booking.ref}`} onClose={onClose}>
      <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
        <StatusBadge booking={booking} now={now} owner />
        <span className={ui.badge}>{booking.source === "walk-in" ? "Added by venue" : "Booked on KhelSpot"}</span>
      </div>
      <dl className={ui.details}>
        <dt>Player</dt>
        <dd>{booking.customer.name}</dd>
        <dt>Phone</dt>
        <dd>{formatPhone(booking.customer.phone)}</dd>
        <dt>Court</dt>
        <dd>
          {court?.name} · {court && SPORT_LABEL[court.sport]}
        </dd>
        <dt>When</dt>
        <dd>
          {formatWhen(booking.date, booking.start, booking.hours)}
        </dd>
        <dt>Amount</dt>
        <dd>
          {formatRupees(booking.price)} · {PAYMENT_LABEL[booking.payment]}
          {booking.paid ? ", paid" : ", not paid yet"}
        </dd>
        <dt>Booked</dt>
        <dd>{formatDateTime(booking.createdAt)}</dd>
        {booking.status === "cancelled" && (
          <>
            <dt>Cancelled</dt>
            <dd>
              {booking.cancelledAt ? formatDateTime(booking.cancelledAt) : "Yes"}
              {booking.refund ? `, ${formatRupees(booking.refund)} refunded` : ""}
            </dd>
          </>
        )}
      </dl>
      <div className={ui.buttonRow}>
        {!booking.paid && booking.status === "confirmed" && (
          <button type="button" className={ui.btnDark} onClick={() => markPaid(booking)}>
            Mark as paid
          </button>
        )}
        {open && (
          <button type="button" className={ui.btnDanger} onClick={() => setCancelling(true)}>
            Cancel booking
          </button>
        )}
        <button type="button" className={ui.btnLight} onClick={onClose}>
          Close
        </button>
      </div>
    </Modal>
  );
}
