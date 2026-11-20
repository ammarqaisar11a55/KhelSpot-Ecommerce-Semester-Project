"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { use, useState } from "react";
import ui from "@/components/ui/ui.module.css";
import { formatPhone } from "@/lib/format";
import { useBrowserOnly, useNow } from "@/lib/hooks";
import { directionsUrl } from "@/lib/domain/maps";
import { cancelDeadline, deadlineText, formatRupees } from "@/lib/domain/pricing";
import { formatDateTime, formatDay, formatRange, formatWhen, realDate } from "@/lib/domain/time";
import { PAYMENT_LABEL, SPORT_LABEL } from "@/lib/domain/types";
import { courtOf, findMyBooking, venueOf } from "@/lib/store/queries";
import { useStore } from "@/lib/store/store";
import { CancelDialog } from "./CancelDialog";
import s from "./player.module.css";
import { StatusBadge, bookingState } from "./StatusBadge";

export function BookingDetail({ params }: { params: Promise<{ ref: string }> }) {
  useBrowserOnly();
  const { ref } = use(params);
  const isNew = useSearchParams().get("new") === "1";
  const state = useStore();
  const now = useNow();
  const [cancelOpen, setCancelOpen] = useState(false);

  const booking = findMyBooking(state, decodeURIComponent(ref));
  if (!booking) {
    return (
      <div className={ui.empty}>
        <p>We couldn&apos;t find booking {ref} on this device.</p>
        <Link className="btn btn--accent" href="/bookings">
          See my bookings
        </Link>
      </div>
    );
  }

  const venue = venueOf(state, booking)!;
  const court = courtOf(venue, booking.courtId)!;
  const st = bookingState(booking, now);
  const message =
    // Kit anatomy: status first; where and when; what was paid and how; the
    // cancellation deadline as a clock time; one link.
    `Booked: ${venue.name}, ${court.name}\n` +
    `${formatWhen(booking.date, booking.start, booking.hours)}\n` +
    `${SPORT_LABEL[court.sport]} · ${formatRupees(booking.price)} ${booking.paid ? `paid via ${PAYMENT_LABEL[booking.payment]}` : "to pay at the counter"}\n` +
    `Booking ID ${booking.ref}\n` +
    `Free cancellation until ${cancelDeadline(booking.date, booking.start, venue.cancellation)}. Full refund in 3–5 working days.\n` +
    `Directions: ${directionsUrl(venue)}`;

  return (
    <>
      {isNew && st !== "cancelled" && (
        <div className={s.confirmHead}>
          <div className={s.tick} aria-hidden="true">
            <svg width="28" height="28" viewBox="0 0 24 24">
              <path d="M5 12.5l4.5 4.5L19 7.5" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </div>
          <div>
            <h2 className={ui.title} style={{ fontSize: 28 }}>You&apos;re booked.</h2>
            <p className={ui.muted}>The slot is yours. Show the reference at the gate.</p>
          </div>
        </div>
      )}

      <div className={s.twoCol}>
        <div className={ui.card}>
          <div style={{ display: "flex", justifyContent: "space-between", gap: 12, marginBottom: 14 }}>
            <h2 className={ui.cardTitle} style={{ margin: 0 }}>{venue.name}</h2>
            <StatusBadge booking={booking} now={now} />
          </div>
          <dl className={ui.details}>
            <dt>Reference</dt>
            <dd className={ui.mono}>{booking.ref}</dd>
            <dt>Court</dt>
            <dd>
              {court.name} · {SPORT_LABEL[court.sport]}
            </dd>
            <dt>Day</dt>
            <dd>{formatDay(realDate(booking.date, booking.start))}</dd>
            <dt>Time</dt>
            <dd>{formatRange(booking.start, booking.hours)}</dd>
            <dt>Address</dt>
            <dd>
              {venue.address}
              <br />
              <a href={directionsUrl(venue)} target="_blank" rel="noopener noreferrer">
                Get directions
              </a>
            </dd>
            <dt>Payment</dt>
            <dd>
              {formatRupees(booking.price)} · {PAYMENT_LABEL[booking.payment]}
              {booking.paid ? "" : " (not paid yet)"}
            </dd>
            <dt>Booked by</dt>
            <dd>
              {booking.customer.name}, {formatPhone(booking.customer.phone)}
            </dd>
            <dt>Booked on</dt>
            <dd>{formatDateTime(booking.createdAt)}</dd>
            {booking.status === "cancelled" && (
              <>
                <dt>Cancelled</dt>
                <dd>
                  {booking.cancelledAt && formatDateTime(booking.cancelledAt)}
                  {booking.refund ? ` · ${formatRupees(booking.refund)} refunded` : ""}
                </dd>
              </>
            )}
          </dl>
          {(st === "confirmed" || st === "unpaid") && (
            <>
              <p className={s.policy} style={{ marginTop: 16 }}>{deadlineText(booking.date, booking.start, venue.cancellation)}</p>
              <div className={ui.buttonRow} style={{ marginTop: 16 }}>
                <button type="button" className={ui.btnDanger} onClick={() => setCancelOpen(true)}>
                  Cancel booking
                </button>
                <Link className={ui.btnLight} href={`/venues/${venue.slug}`}>
                  Book another slot
                </Link>
              </div>
            </>
          )}
        </div>

        <div className={s.whatsapp}>
          <p className={ui.small} style={{ marginBottom: 10, fontWeight: 600 }}>
            Sent to {formatPhone(booking.customer.phone)} on WhatsApp
          </p>
          <div className={s.whatsappMsg}>
            <p className={s.whatsappFrom}>KhelSpot</p>
            {message}
          </div>
        </div>
      </div>

      <p style={{ marginTop: 24 }}>
        <Link href="/bookings">All my bookings</Link>
      </p>

      <CancelDialog booking={cancelOpen ? booking : null} venue={venue} by="player" onClose={() => setCancelOpen(false)} />
    </>
  );
}
