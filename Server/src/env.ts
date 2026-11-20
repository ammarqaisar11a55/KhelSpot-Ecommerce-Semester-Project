// Imported first by every entry point: loads .env and pins the clock to
// Lahore time, because operating days, "now" and after-midnight slots are
// all venue-local.
import "dotenv/config";

process.env.TZ = process.env.TZ || "Asia/Karachi";

function required(name: string): string {
  const v = process.env[name];
  if (!v) throw new Error(`Missing environment variable ${name}. Copy .env.example to .env.`);
  return v;
}

const list = (raw: string | undefined, fallback: string) =>
  (raw ?? fallback)
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);

const isProduction = process.env.NODE_ENV === "production";

export const config = {
  get databaseUrl() {
    return required("DATABASE_URL");
  },
  port: Number(process.env.PORT ?? 4000),
  host: process.env.HOST ?? "0.0.0.0",
  corsOrigins: list(process.env.CORS_ORIGINS, "http://localhost:3000"),
  isProduction,

  /** Base URL clients reach the API on, for payment links. Defaults to the request's own host. */
  publicBaseUrl: process.env.PUBLIC_BASE_URL?.replace(/\/$/, "") || undefined,

  /** Secret mixed into stored OTP hashes. Required in production. */
  get otpSecret() {
    if (process.env.OTP_SECRET) return process.env.OTP_SECRET;
    if (isProduction) throw new Error("Set OTP_SECRET in production.");
    return "khelspot-dev-otp-secret";
  },
  /** Return { devCode } from POST /auth/otp. Never in production. */
  otpDevEcho: !isProduction && process.env.OTP_DEV_ECHO === "1",
  smsProvider: process.env.SMS_PROVIDER ?? "console",

  /** "test" outside production; production needs a real provider (or the explicit demo flag below). */
  paymentProvider: process.env.PAYMENT_PROVIDER ?? (isProduction ? undefined : "test"),
  /** Demo deployments only: let PAYMENT_PROVIDER=test run with NODE_ENV=production. */
  allowTestPaymentsInProduction: process.env.ALLOW_TEST_PAYMENTS === "1",
  paymentReturnAllow: list(process.env.PAYMENT_RETURN_ALLOW, "khelspot://,http://localhost:3000,http://localhost:8081"),

  /** "v-baseline:03001112233,v-crease:03002223344": seeded into venue_owners. */
  ownerPhones: process.env.OWNER_PHONES ?? "",
};
