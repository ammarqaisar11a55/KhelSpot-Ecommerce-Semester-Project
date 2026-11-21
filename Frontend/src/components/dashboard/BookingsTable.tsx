"use client";

import { useMemo, useState } from "react";
import { StatusBadge, bookingState } from "@/components/player/StatusBadge";
import { Select } from "@/components/ui/Select";
import ui from "@/components/ui/ui.module.css";
import { formatPhone } from "@/lib/format";
import { formatRupees } from "@/lib/domain/pricing";
import { addDays, formatDay, formatRange, realDate } from "@/lib/domain/time";
import { PAYMENT_LABEL, type Booking } from "@/lib/domain/types";
import { bookingsInRange } from "@/lib/store/queries";
import { BookingDialog } from "./BookingDialog";
import d from "./dashboard.module.css";
import { useOwnerVenue } from "./useOwnerVenue";

const RANGES = {
  today: { label: "Today", from: 0, to: 0 },
  next7: { label: "Next 7 days", from: 0, to: 6 },
  last7: { label: "Last 7 days", from: -6, to: 0 },
  last30: { label: "Last 30 days", from: -29, to: 0 },
} as const;
type RangeKey = keyof typeof RANGES;

const STATUSES = {
  all: "All statuses",
  confirmed: "Booked",
  unpaid: "Unpaid",
  played: "Played",
  cancelled: "Cancelled",
} as const;
type StatusKey = keyof typeof STATUSES;

export function BookingsTable() {
  const { state, now, base, venue, today } = useOwnerVenue();
  const [range, setRange] = useState<RangeKey>("next7");
  const [status, setStatus] = useState<StatusKey>("all");
  const [q, setQ] = useState("");
  const [selectedId, setSelectedId] = useState<string | null>(null);

  const rows = useMemo(() => {
    const r = RANGES[range];
    const needle = q.trim().toLowerCase();
    const list = bookingsInRange(state, base, addDays(today, r.from), addDays(today, r.to))
      .filter((b) => status === "all" || bookingState(b, now) === status)
      .filter(
        (b) =>
          !needle ||
          b.customer.name.toLowerCase().includes(needle) ||
          b.ref.toLowerCase().includes(needle) ||
          b.customer.phone.includes(needle.replace(/\D/g, "") || "\u0000"),
      );
    return range === "last7" || range === "last30"
      ? list.sort((a, b) => b.date.localeCompare(a.date) || b.start - a.start)
      : list.sort((a, b) => a.date.localeCompare(b.date) || a.start - b.start);
  }, [state, base, today, now, range, status, q]);

  const selected: Booking | null = rows.find((b) => b.id === selectedId) ?? null;
  const revenue = rows.filter((b) => b.status === "confirmed").reduce((s, b) => s + b.price, 0);

  return (
    <>
      <div className={ui.pageHead}>
        <div>
          <h1 className={ui.title}>Bookings</h1>
          <p className={ui.subtitle}>Every booking at {venue.name}, from KhelSpot and added by you.</p>
        </div>
      </div>

      <div className={d.toolbar}>
        <div className={ui.field}>
          <span>Period</span>
          <Select<RangeKey>
            label="Period"
            value={range}
            onChange={setRange}
            options={(Object.keys(RANGES) as RangeKey[]).map((k) => ({ value: k, label: RANGES[k].label }))}
          />
        </div>
        <div className={ui.field}>
          <span>Status</span>
          <Select<StatusKey>
            label="Status"
            value={status}
            onChange={setStatus}
            options={(Object.keys(STATUSES) as StatusKey[]).map((k) => ({ value: k, label: STATUSES[k] }))}
          />
        </div>
        <label className={ui.field} style={{ flex: "1 1 220px" }}>
          <span>Search</span>
          <input
            className={ui.input}
            type="search"
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Name, phone or reference"
          />
        </label>
      </div>

      {rows.length ? (
        <div className={d.tableWrap}>
          <table className={d.table}>
            <thead>
              <tr>
                <th scope="col">Reference</th>
                <th scope="col">Day</th>
                <th scope="col">Time</th>
                <th scope="col">Court</th>
                <th scope="col">Player</th>
                <th scope="col" className={d.num}>Amount</th>
                <th scope="col">Payment</th>
                <th scope="col">Status</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((b) => (
                <tr key={b.id}>
                  <td>
                    <button type="button" className={d.linkBtn} onClick={() => setSelectedId(b.id)}>
                      {b.ref}
                    </button>
                  </td>
                  <td>{formatDay(realDate(b.date, b.start))}</td>
                  <td style={{ whiteSpace: "nowrap" }}>{formatRange(b.start, b.hours)}</td>
                  <td>{venue.courts.find((c) => c.id === b.courtId)?.name}</td>
                  <td>
                    {b.customer.name}
                    <br />
                    <span className={ui.muted}>{formatPhone(b.customer.phone)}</span>
                  </td>
                  <td className={d.num}>{formatRupees(b.price)}</td>
                  <td>{PAYMENT_LABEL[b.payment]}</td>
                  <td>
                    <StatusBadge booking={b} now={now} owner />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <div className={ui.empty}>No bookings match those filters.</div>
      )}
      <p className={d.totals} role="status">
        {rows.length} bookings · {formatRupees(revenue)} from confirmed bookings
      </p>

      <BookingDialog booking={selected} venue={venue} now={now} onClose={() => setSelectedId(null)} />
    </>
  );
}
