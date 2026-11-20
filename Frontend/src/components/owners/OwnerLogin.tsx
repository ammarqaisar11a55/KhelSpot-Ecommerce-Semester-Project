"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import ui from "@/components/ui/ui.module.css";
import o from "./owners.module.css";
import { CodeStep, PhoneField, normalizeMobile } from "./phone";

export function OwnerLogin() {
  const router = useRouter();
  const [phone, setPhone] = useState("");
  const [mobile, setMobile] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  return (
    <>
      <h2 className={o.formTitle}>Sign in to your venue</h2>
      <p className={o.formIntro}>
        New to KhelSpot? <Link href="/owners/signup">List your courts</Link> and get the first month free.
      </p>

      {mobile === null ? (
        <form
          className={o.form}
          noValidate
          onSubmit={(event) => {
            event.preventDefault();
            const normalized = normalizeMobile(phone);
            if (!normalized) {
              setError("Enter a Pakistani mobile number, like 300 1234567.");
              return;
            }
            setError(null);
            setMobile(normalized);
          }}
        >
          <PhoneField
            value={phone}
            invalid={Boolean(error)}
            autoFocus
            onChange={(value) => {
              setPhone(value);
              setError(null);
            }}
          />
          {error && (
            <p className={ui.error} role="alert">
              {error}
            </p>
          )}
          <button type="submit" className={`${ui.btnDark} ${o.submit}`}>
            Send me a code
          </button>
        </form>
      ) : (
        <CodeStep
          mobile={mobile}
          actionLabel="Sign in"
          busyLabel="Signing in…"
          onBack={() => setMobile(null)}
          onVerified={() => router.push("/dashboard")}
        />
      )}
    </>
  );
}
