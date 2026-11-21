"use client";

import Link from "next/link";
import { useState } from "react";
import { Select } from "@/components/ui/Select";
import ui from "@/components/ui/ui.module.css";
import { cx } from "@/lib/format";
import { CITIES, SPORTS, SPORT_LABEL, type Sport } from "@/lib/domain/types";
import o from "./owners.module.css";
import { CodeStep, PhoneField, formatMobile, normalizeMobile } from "./phone";

const STEPS = ["You", "Your venue", "Verify your number"] as const;
const FREE_DAYS = 30;

interface Details {
  name: string;
  phone: string;
  venue: string;
  area: string;
  city: string;
  sports: Sport[];
  courts: string;
}

type Field = keyof Details;

function Steps({ current }: { current: number }) {
  return (
    <ol className={o.steps} aria-label="Sign up steps">
      {STEPS.map((label, index) => (
        <li
          key={label}
          className={cx(o.step, index === current && o.stepNow, index < current && o.stepDone)}
          aria-current={index === current ? "step" : undefined}
        >
          <span className={o.stepNumber}>{index + 1}</span>
          {label}
        </li>
      ))}
    </ol>
  );
}

function firstCharge(): string {
  const date = new Date();
  date.setDate(date.getDate() + FREE_DAYS);
  return date.toLocaleDateString("en-PK", { day: "numeric", month: "long", year: "numeric" });
}

export function OwnerSignup() {
  const [step, setStep] = useState(0);
  const [done, setDone] = useState(false);
  const [details, setDetails] = useState<Details>({
    name: "",
    phone: "",
    venue: "",
    area: "",
    city: CITIES[0],
    sports: [],
    courts: "2",
  });
  const [invalid, setInvalid] = useState<Set<Field>>(new Set());
  const [error, setError] = useState<string | null>(null);

  const set = <K extends Field>(field: K, value: Details[K]) => {
    setDetails((current) => ({ ...current, [field]: value }));
    setInvalid((current) => {
      const next = new Set(current);
      next.delete(field);
      return next;
    });
    setError(null);
  };

  const fail = (fields: Field[], message: string) => {
    setInvalid(new Set(fields));
    setError(message);
  };

  const mobile = normalizeMobile(details.phone);

  if (done) {
    const sports = details.sports.map((sport) => SPORT_LABEL[sport].toLowerCase());
    const sportList = sports.length > 1 ? `${sports.slice(0, -1).join(", ")} and ${sports.at(-1)}` : sports[0];
    return (
      <div className={o.done}>
        <h2 className={o.formTitle}>Your free month has started</h2>
        <p className={o.formIntro}>
          {details.venue} is set up with {details.courts} {details.courts === "1" ? "court" : "courts"} for{" "}
          {sportList}. We&apos;ll call {details.name.split(" ")[0]} on{" "}
          <span className={o.mono}>{formatMobile(mobile ?? "")}</span> to help add your rates and photos.
        </p>
        <dl className={o.receipt}>
          <div>
            <dt>Free until</dt>
            <dd>{firstCharge()}</dd>
          </div>
          <div>
            <dt>Then</dt>
            <dd>
              <span className={o.mono}>Rs 999</span> a month, cancel any time
            </dd>
          </div>
          <div>
            <dt>Commission</dt>
            <dd>None on any booking</dd>
          </div>
        </dl>
        <Link className={`${ui.btnDark} ${o.submit}`} href="/dashboard">
          Open the dashboard
        </Link>
        <p className={ui.hint}>
          In this demo the dashboard shows Night Owl Arena&apos;s sample bookings, not your venue.
        </p>
      </div>
    );
  }

  return (
    <>
      <h2 className={o.formTitle}>List your courts on KhelSpot</h2>
      <p className={o.formIntro}>
        Already on KhelSpot? <Link href="/owners/login">Sign in</Link>.
      </p>
      <Steps current={step} />

      {step === 0 && (
        <form
          className={o.form}
          noValidate
          onSubmit={(event) => {
            event.preventDefault();
            const missing: Field[] = [];
            if (!details.name.trim()) missing.push("name");
            if (!mobile) missing.push("phone");
            if (missing.length) {
              fail(
                missing,
                missing.length === 2
                  ? "Enter your name and a Pakistani mobile number."
                  : missing[0] === "name"
                    ? "Enter your name."
                    : "Enter a Pakistani mobile number, like 300 1234567.",
              );
              return;
            }
            setStep(1);
          }}
        >
          <label className={ui.field}>
            <span>Your name</span>
            <input
              className={ui.input}
              name="name"
              autoComplete="name"
              value={details.name}
              aria-invalid={invalid.has("name") || undefined}
              autoFocus
              onChange={(event) => set("name", event.target.value)}
            />
          </label>
          <PhoneField value={details.phone} invalid={invalid.has("phone")} onChange={(value) => set("phone", value)} />
          {error && (
            <p className={ui.error} role="alert">
              {error}
            </p>
          )}
          <button type="submit" className={`${ui.btnDark} ${o.submit}`}>
            Continue
          </button>
        </form>
      )}

      {step === 1 && (
        <form
          className={o.form}
          noValidate
          onSubmit={(event) => {
            event.preventDefault();
            const missing: Field[] = [];
            const courts = Number(details.courts);
            if (!details.venue.trim()) missing.push("venue");
            if (!details.area.trim()) missing.push("area");
            if (details.sports.length === 0) missing.push("sports");
            if (!Number.isInteger(courts) || courts < 1 || courts > 30) missing.push("courts");
            if (missing.length) {
              const words: Record<string, string> = {
                venue: "the venue's name",
                area: "its area",
                sports: "at least one sport",
                courts: "a number of courts from 1 to 30",
              };
              const list = missing.map((field) => words[field]);
              fail(missing, `Add ${list.length > 1 ? `${list.slice(0, -1).join(", ")} and ${list.at(-1)}` : list[0]}.`);
              return;
            }
            setStep(2);
          }}
        >
          <label className={ui.field}>
            <span>Venue name</span>
            <input
              className={ui.input}
              name="venue"
              autoComplete="organization"
              placeholder="Night Owl Arena"
              value={details.venue}
              aria-invalid={invalid.has("venue") || undefined}
              autoFocus
              onChange={(event) => set("venue", event.target.value)}
            />
          </label>
          <div className={o.pair}>
            <label className={ui.field}>
              <span>Area</span>
              <input
                className={ui.input}
                name="area"
                placeholder="Johar Town"
                value={details.area}
                aria-invalid={invalid.has("area") || undefined}
                onChange={(event) => set("area", event.target.value)}
              />
            </label>
            <div className={ui.field}>
              <span>City</span>
              <Select
                label="City"
                name="city"
                value={details.city}
                onChange={(city) => set("city", city)}
                options={CITIES.map((city) => ({ value: city, label: city }))}
              />
            </div>
          </div>
          <p className={ui.hint} style={{ marginTop: -8 }}>
            KhelSpot is taking bookings in Lahore first.
          </p>

          <fieldset className={o.sports} aria-invalid={invalid.has("sports") || undefined}>
            <legend>Sports you host</legend>
            <div className={o.sportChoices}>
              {SPORTS.map((sport) => {
                const chosen = details.sports.includes(sport);
                return (
                  <label key={sport} className={cx(o.sportChoice, chosen && o.sportOn)}>
                    <input
                      type="checkbox"
                      checked={chosen}
                      onChange={() =>
                        set("sports", chosen ? details.sports.filter((s) => s !== sport) : [...details.sports, sport])
                      }
                    />
                    {SPORT_LABEL[sport]}
                  </label>
                );
              })}
            </div>
          </fieldset>

          <label className={ui.field}>
            <span>Number of courts</span>
            <input
              className={`${ui.input} ${o.courts}`}
              name="courts"
              type="number"
              inputMode="numeric"
              min={1}
              max={30}
              value={details.courts}
              aria-invalid={invalid.has("courts") || undefined}
              onChange={(event) => set("courts", event.target.value)}
            />
          </label>

          {error && (
            <p className={ui.error} role="alert">
              {error}
            </p>
          )}
          <div className={o.formActions}>
            <button type="button" className={ui.btnLight} onClick={() => setStep(0)}>
              Back
            </button>
            <button type="submit" className={`${ui.btnDark} ${o.submit}`}>
              Send me a code
            </button>
          </div>
        </form>
      )}

      {step === 2 && mobile && (
        <CodeStep
          mobile={mobile}
          actionLabel="Start the free month"
          busyLabel="Setting up…"
          onBack={() => setStep(0)}
          onVerified={() => setDone(true)}
        />
      )}
    </>
  );
}
