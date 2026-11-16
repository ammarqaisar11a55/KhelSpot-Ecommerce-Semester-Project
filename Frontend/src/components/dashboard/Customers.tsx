"use client";

import { useMemo, useState } from "react";
import ui from "@/components/ui/ui.module.css";
import { formatPhone } from "@/lib/format";
import { formatRupees } from "@/lib/domain/pricing";
import { addDays, formatDay } from "@/lib/domain/time";
import { SPORT_LABEL, type Sport } from "@/lib/domain/types";
import { bookingsInRange, isActive, isFinished } from "@/lib/store/queries";
import d from "./dashboard.module.css";
import { useOwnerVenue } from "./useOwnerVenue";

type SortKey = "bookings" | "spent" | "recent";

interface Row {
  phone: string;
  name: string;
  bookings: number;
  hours: number;
  spent: number;
  lastVisit: string | null;
  nextVisit: string | null;
  sports: Map<Sport, number>;
}

const WINDOW_DAYS = 90;

export function Customers() {
  const { state, now, base, venue, today } = useOwnerVenue();
  const [q, setQ] = useState("");
  const [sort, setSort] = useState<SortKey>("bookings");

  const rows = useMemo(() => {
    const map = new Map<string, Row>();
    for (const b of bookingsInRange(state, base, addDays(today, -(WINDOW_DAYS - 1)), addDays(today, 14)).filter(isActive)) {
      const row =
        map.get(b.customer.phone) ??
        ({ phone: b.customer.phone, name: b.customer.name, bookings: 0, hours: 0, spent: 0, lastVisit: null, nextVisit: null, sports: new Map() } as Row);
      const sport = venue.courts.find((c) => c.id === b.courtId)?.sport;
      if (isFinished(b, now)) {
        row.bookings += 1;
        row.hours += b.hours;
        row.spent += b.price;
        if (!row.lastVisit || b.date > row.lastVisit) row.lastVisit = b.date;
        if (sport) row.sports.set(sport, (row.sports.get(sport) ?? 0) + 1);
      } else if (!row.nextVisit || b.date < row.nextVisit) {
        row.nextVisit = b.date;
      }
      map.set(b.customer.phone, row);
    }
    const needle = q.trim().toLowerCase();
    const list = [...map.values()].filter(
      (r) => !needle || r.name.toLowerCase().includes(needle) || r.phone.includes(needle.replace(/\D/g, "") || "\u0000"),
    );
    const by: Record<SortKey, (a: Row, b: Row) => number> = {
      bookings: (a, b) => b.bookings - a.bookings || b.spent - a.spent,
      spent: (a, b) => b.spent - a.spent,
      recent: (a, b) => (b.lastVisit ?? "").localeCompare(a.lastVisit ?? ""),
    };
    return list.sort(by[sort]);
  }, [state, base, venue, today, now, q, sort]);

  const regulars = rows.filter((r) => r.bookings >= 5).length;

  return (
    <>
      <div className={ui.pageHead}>
        <div>
          <h1 className={ui.title}>Customers</h1>
          <p className={ui.subtitle}>
            {rows.length} players in the last {WINDOW_DAYS} days · {regulars} came 5 or more times
          </p>
        </div>
      </div>

      <div className={d.toolbar}>
        <label className={ui.field} style={{ flex: "1 1 240px" }}>
          <span>Search</span>
          <input className={ui.input} type="search" value={q} onChange={(e) => setQ(e.target.value)} placeholder="Name or phone" />
        </label>
        <label className={ui.field}>
          <span>Sort by</span>
          <select className={ui.select} value={sort} onChange={(e) => setSort(e.target.value as SortKey)}>
            <option value="bookings">Most games</option>
            <option value="spent">Most spent</option>
            <option value="recent">Most recent visit</option>
          </select>
        </label>
      </div>

      {rows.length ? (
        <div className={d.tableWrap}>
          <table className={d.table}>
            <thead>
              <tr>
                <th scope="col">Player</th>
                <th scope="col">Phone</th>
                <th scope="col" className={d.num}>Games</th>
                <th scope="col" className={d.num}>Hours</th>
                <th scope="col" className={d.num}>Spent</th>
                <th scope="col">Plays</th>
                <th scope="col">Last visit</th>
                <th scope="col">Next booking</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => {
                const fav = [...r.sports.entries()].sort((a, b) => b[1] - a[1])[0]?.[0];
                return (
                  <tr key={r.phone}>
                    <td>
                      {r.name}
                      {r.bookings >= 5 && (
                        <>
                          {" "}
                          <span className={`${ui.badge} ${ui.badgeGreen}`}>Regular</span>
                        </>
                      )}
                    </td>
                    <td style={{ whiteSpace: "nowrap" }}>{formatPhone(r.phone)}</td>
                    <td className={d.num}>{r.bookings}</td>
                    <td className={d.num}>{r.hours}</td>
                    <td className={d.num}>{formatRupees(r.spent)}</td>
                    <td>{fav ? SPORT_LABEL[fav] : "–"}</td>
                    <td>{r.lastVisit ? formatDay(r.lastVisit) : "–"}</td>
                    <td>{r.nextVisit ? formatDay(r.nextVisit) : "–"}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      ) : (
        <div className={ui.empty}>No customers match that search.</div>
      )}
      <p className={d.totals}>Phone numbers here are sample data for the demo.</p>
    </>
  );
}
