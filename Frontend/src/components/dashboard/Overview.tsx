"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { StatusBadge } from "@/components/player/StatusBadge";
import ui from "@/components/ui/ui.module.css";
import { formatRupees } from "@/lib/domain/pricing";
import { addDays, dateRange, formatDay, formatHour, operatingNow, parseISODate, relativeDay, toISODate } from "@/lib/domain/time";
import type { Booking } from "@/lib/domain/types";
import { bookingsFor, isActive, isFinished } from "@/lib/store/queries";
import { AddBookingDialog, type AddBookingPreset } from "./AddBookingDialog";
import { BookingDialog } from "./BookingDialog";
import d from "./dashboard.module.css";
import { RevenueChart } from "./RevenueChart";
import { TonightBoard } from "./TonightBoard";
import { useOwnerVenue } from "./useOwnerVenue";

export function Overview() {
  const { state, now, base, venue, today } = useOwnerVenue();
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [adding, setAdding] = useState<AddBookingPreset | null>(null);

  const stats = useMemo(() => {
    const byDay = (date: string) => bookingsFor(state, base, date);
    const todays = byDay(today).filter(isActive);
    const monthStart = toISODate(new Date(parseISODate(today).getFullYear(), parseISODate(today).getMonth(), 1));
    const monthRevenue = dateRange(monthStart, today)
      .flatMap(byDay)
      .filter(isActive)
      .reduce((s, b) => s + b.price, 0);

    const week = dateRange(addDays(today, -6), today);
    const openHours = (venue.closeHour - venue.openHour) * venue.courts.length * week.length;
    const bookedHours = week.flatMap(byDay).filter(isActive).reduce((s, b) => s + b.hours, 0);

    const chart = dateRange(addDays(today, -13), today).map((date) => {
      const list = byDay(date).filter(isActive);
      return { date, revenue: list.reduce((s, b) => s + b.price, 0), bookings: list.length };
    });

    const upcoming = [today, addDays(today, 1)]
      .flatMap(byDay)
      .filter((b) => isActive(b) && !isFinished(b, now))
      .sort((a, b) => a.date.localeCompare(b.date) || a.start - b.start);

    const unpaid = upcoming.filter((b) => !b.paid);

    return {
      todays,
      monthRevenue,
      occupancy: openHours ? Math.round((bookedHours / openHours) * 100) : 0,
      chart,
      upcoming: upcoming.slice(0, 8),
      unpaidCount: unpaid.length,
      unpaidTotal: unpaid.reduce((s, b) => s + b.price, 0),
      all: [...byDay(today), ...byDay(addDays(today, 1))],
    };
  }, [state, base, venue, today, now]);

  const selected: Booking | null = stats.all.find((b) => b.id === selectedId) ?? null;
  const hour = now.getHours();
  const greeting = hour < 5 || hour >= 17 ? "Good evening" : hour < 12 ? "Good morning" : "Good afternoon";
  const operating = operatingNow(now);
  const nowHour = operating.date === today ? operating.hour : null;

  return (
    <>
      <div className={ui.pageHead}>
        <div>
          <h1 className={ui.title}>{greeting}</h1>
          <p className={ui.subtitle}>
            {formatDay(today)} at {venue.name}
          </p>
        </div>
        <div className={ui.buttonRow}>
          <button type="button" className={ui.btnDark} onClick={() => setAdding({ date: today })}>
            Add a booking
          </button>
          <Link className={ui.btnLight} href="/dashboard/calendar">
            Open calendar
          </Link>
        </div>
      </div>

      <TonightBoard
        venue={venue}
        today={today}
        bookings={stats.todays}
        now={now}
        nowHour={nowHour}
        onSelect={setSelectedId}
        onAdd={setAdding}
      />

      <div className={d.ledger}>
        <div className={d.ledgerItem}>
          <span className={d.ledgerLabel}>Revenue this month</span>
          <span className={d.ledgerValue}>{formatRupees(stats.monthRevenue)}</span>
          <span className={d.ledgerNote}>From confirmed bookings since the 1st</span>
        </div>
        <div className={d.ledgerItem}>
          <span className={d.ledgerLabel}>Courts booked, last 7 days</span>
          <span className={d.ledgerValue}>{stats.occupancy}%</span>
          <span className={d.meter} aria-hidden="true">
            <span style={{ width: `${Math.min(stats.occupancy, 100)}%` }} />
          </span>
          <span className={d.ledgerNote}>Of the hours your courts were open</span>
        </div>
        <div className={d.ledgerItem}>
          <span className={d.ledgerLabel}>
            <i className={d.keyBoardCollect} aria-hidden="true" />
            To collect at the counter
          </span>
          <span className={d.ledgerValue}>{formatRupees(stats.unpaidTotal)}</span>
          <span className={d.ledgerNote}>
            {stats.unpaidCount === 0
              ? "Every upcoming booking is paid"
              : `${stats.unpaidCount} upcoming ${stats.unpaidCount === 1 ? "booking is" : "bookings are"} unpaid`}
          </span>
        </div>
      </div>

      <div className={d.grid2}>
        <RevenueChart days={stats.chart} today={today} />

        <section className={ui.card} aria-labelledby="next-title">
          <div className={d.cardHead}>
            <h2 id="next-title" className={ui.cardTitle}>
              Up next
            </h2>
            <Link className={ui.small} href="/dashboard/bookings">
              All bookings
            </Link>
          </div>
          {stats.upcoming.length ? (
            <ul className={d.list}>
              {stats.upcoming.map((b) => {
                const court = venue.courts.find((c) => c.id === b.courtId);
                return (
                  <li key={b.id}>
                    <button type="button" className={`${d.rowBtn} ${d.listItem}`} onClick={() => setSelectedId(b.id)}>
                      <span className={d.listTime}>
                        {formatHour(b.start)}
                        {b.date !== today && (
                          <>
                            <br />
                            <span className={d.listSub}>{relativeDay(b.date, today)}</span>
                          </>
                        )}
                      </span>
                      <span className={d.listMain}>
                        <span className={d.listName} style={{ display: "block" }}>
                          {b.customer.name}
                        </span>
                        <span className={d.listSub}>
                          {court?.name}, {b.hours} {b.hours === 1 ? "hour" : "hours"}
                        </span>
                      </span>
                      <span className={d.listEnd}>
                        {formatRupees(b.price)}
                        {!b.paid && <StatusBadge booking={b} now={now} owner />}
                      </span>
                    </button>
                  </li>
                );
              })}
            </ul>
          ) : (
            <p className={ui.muted}>Nothing else booked for today or tomorrow.</p>
          )}
        </section>
      </div>

      <BookingDialog booking={selected} venue={venue} now={now} onClose={() => setSelectedId(null)} />
      <AddBookingDialog preset={adding} venue={venue} onClose={() => setAdding(null)} />
    </>
  );
}
