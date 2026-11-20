"use client";

import { useEffect, useState } from "react";
import ui from "@/components/ui/ui.module.css";
import o from "./owners.module.css";

/** The demo has no SMS service, so every code it "sends" is this one. */
export const DEMO_CODE = "246810";
const RESEND_AFTER = 30;

/** A Pakistani mobile number as 3XXXXXXXXX, or null if it is not one. */
export function normalizeMobile(raw: string): string | null {
  const digits = raw.replace(/[\s-]/g, "").replace(/^\+92/, "").replace(/^0/, "");
  return /^3\d{9}$/.test(digits) ? digits : null;
}

export function formatMobile(mobile: string): string {
  return `+92 ${mobile.slice(0, 3)} ${mobile.slice(3)}`;
}

export function PhoneField({
  value,
  onChange,
  invalid,
  autoFocus,
}: {
  value: string;
  onChange: (value: string) => void;
  invalid?: boolean;
  autoFocus?: boolean;
}) {
  return (
    <label className={ui.field}>
      <span>Mobile number</span>
      <span className={o.phone}>
        <span className={o.phonePrefix} aria-hidden="true">
          +92
        </span>
        <input
          className={`${ui.input} ${o.phoneInput}`}
          name="phone"
          type="tel"
          inputMode="tel"
          autoComplete="tel-national"
          placeholder="300 1234567"
          value={value}
          aria-invalid={invalid || undefined}
          aria-describedby="phone-hint"
          autoFocus={autoFocus}
          onChange={(event) => onChange(event.target.value)}
        />
      </span>
      <span id="phone-hint" className={ui.hint}>
        We text a 6-digit code to this number. There is no password.
      </span>
    </label>
  );
}

/** The code step shared by sign in and sign up. */
export function CodeStep({
  mobile,
  busyLabel,
  actionLabel,
  onBack,
  onVerified,
}: {
  mobile: string;
  busyLabel: string;
  actionLabel: string;
  onBack: () => void;
  onVerified: () => void;
}) {
  const [code, setCode] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [wait, setWait] = useState(RESEND_AFTER);
  const [resent, setResent] = useState(false);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (wait <= 0) return;
    const timer = window.setTimeout(() => setWait((left) => left - 1), 1000);
    return () => window.clearTimeout(timer);
  }, [wait]);

  return (
    <form
      className={o.form}
      noValidate
      onSubmit={(event) => {
        event.preventDefault();
        if (code.length !== 6) {
          setError("Enter all 6 digits of the code.");
          return;
        }
        if (code !== DEMO_CODE) {
          setError("That code doesn't match. Check the text message and try again.");
          return;
        }
        setError(null);
        setBusy(true);
        onVerified();
      }}
    >
      <p className={o.sentTo}>
        We sent a code to <span className={o.mono}>{formatMobile(mobile)}</span>.{" "}
        <button type="button" className={o.textButton} onClick={onBack}>
          Change number
        </button>
      </p>

      <p className={o.demoCode} role="note">
        Demo: no text is sent. Your code is <span className={o.mono}>{DEMO_CODE.replace(/(\d{3})(\d{3})/, "$1 $2")}</span>.
      </p>

      <label className={ui.field}>
        <span>6-digit code</span>
        <input
          className={`${ui.input} ${o.codeInput}`}
          name="code"
          inputMode="numeric"
          autoComplete="one-time-code"
          pattern="[0-9]*"
          maxLength={6}
          value={code}
          autoFocus
          aria-invalid={error ? true : undefined}
          aria-describedby={error ? "code-error" : undefined}
          onChange={(event) => {
            setCode(event.target.value.replace(/\D/g, "").slice(0, 6));
            setError(null);
          }}
        />
      </label>
      {error && (
        <p id="code-error" className={ui.error} role="alert">
          {error}
        </p>
      )}

      <button type="submit" className={`${ui.btnDark} ${o.submit}`} disabled={busy}>
        {busy ? busyLabel : actionLabel}
      </button>

      <p className={ui.hint} aria-live="polite">
        {wait > 0 ? (
          `You can ask for a new code in ${wait} seconds.`
        ) : (
          <button
            type="button"
            className={o.textButton}
            onClick={() => {
              setWait(RESEND_AFTER);
              setResent(true);
            }}
          >
            Send a new code
          </button>
        )}
        {resent && wait > 0 ? " A new code is on its way." : ""}
      </p>
    </form>
  );
}
