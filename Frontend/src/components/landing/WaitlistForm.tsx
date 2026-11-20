"use client";

import { useEffect, useState, type FormEvent } from "react";
import { WAITLIST_ROLE_EVENT, type WaitlistRole } from "./waitlist-role";

const CITIES = ["Lahore", "Karachi", "Islamabad", "Another city"];
const PK_MOBILE = /^(\+92|0)3\d{9}$/;

type Field = "name" | "phone" | "city";
type Status = { kind: "idle" } | { kind: "error"; message: string } | { kind: "ok"; message: string };

function joinList(items: string[]) {
  return items.length > 1 ? `${items.slice(0, -1).join(", ")} and ${items.at(-1)}` : items[0];
}

export function WaitlistForm() {
  const [role, setRole] = useState<WaitlistRole>("player");
  const [invalid, setInvalid] = useState<Set<Field>>(new Set());
  const [status, setStatus] = useState<Status>({ kind: "idle" });

  useEffect(() => {
    const onRole = (e: Event) => setRole((e as CustomEvent<WaitlistRole>).detail);
    window.addEventListener(WAITLIST_ROLE_EVENT, onRole);
    return () => window.removeEventListener(WAITLIST_ROLE_EVENT, onRole);
  }, []);

  function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = e.currentTarget;
    const data = new FormData(form);
    const name = String(data.get("name") ?? "").trim();
    const phone = String(data.get("phone") ?? "").replace(/[\s-]/g, "");
    const city = String(data.get("city") ?? "");

    const bad = new Set<Field>();
    const missing: string[] = [];
    if (!name) {
      bad.add("name");
      missing.push("your name");
    }
    if (!PK_MOBILE.test(phone)) {
      bad.add("phone");
      missing.push("a Pakistani mobile number like 0300 1234567");
    }
    if (!city) {
      bad.add("city");
      missing.push("your city");
    }
    setInvalid(bad);

    if (missing.length) {
      setStatus({ kind: "error", message: `Please add ${joinList(missing)}.` });
      return;
    }

    // TODO(server): POST to the waitlist endpoint once Server/ exists.
    setStatus({
      kind: "ok",
      message:
        role === "owner"
          ? `Thanks, ${name}. We'll message you on WhatsApp to set up your free month.`
          : `Thanks, ${name}. You're on the list for ${city}. We'll message you on WhatsApp when booking opens.`,
    });
    form.reset();
  }

  return (
    <form className="form" noValidate onSubmit={onSubmit}>
      <fieldset className="form__role">
        <legend className="sr-only">I am a</legend>
        <label>
          <input
            type="radio"
            name="role"
            value="player"
            checked={role === "player"}
            onChange={() => setRole("player")}
          />{" "}
          I play
        </label>
        <label>
          <input
            type="radio"
            name="role"
            value="owner"
            checked={role === "owner"}
            onChange={() => setRole("owner")}
          />{" "}
          I run a venue
        </label>
      </fieldset>

      <label className="field">
        <span>Name</span>
        <input type="text" name="name" autoComplete="name" required aria-invalid={invalid.has("name") || undefined} />
      </label>
      <label className="field">
        <span>WhatsApp number</span>
        <input
          type="tel"
          name="phone"
          autoComplete="tel"
          inputMode="tel"
          placeholder="03XX XXXXXXX"
          required
          aria-invalid={invalid.has("phone") || undefined}
        />
      </label>
      <label className="field">
        <span>City</span>
        <select name="city" required defaultValue="" aria-invalid={invalid.has("city") || undefined}>
          <option value="">Choose a city</option>
          {CITIES.map((c) => (
            <option key={c}>{c}</option>
          ))}
        </select>
      </label>
      {role === "owner" && (
        <label className="field">
          <span>Venue name</span>
          <input type="text" name="venue" autoComplete="organization" />
        </label>
      )}

      <button className="btn btn--accent btn--block" type="submit">
        Join the waitlist
      </button>
      <p className={`form__msg${status.kind === "idle" ? "" : ` is-${status.kind}`}`} role="status" aria-live="polite">
        {status.kind === "idle" ? "" : status.message}
      </p>
    </form>
  );
}
