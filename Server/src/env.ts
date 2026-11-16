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

export const config = {
  get databaseUrl() {
    return required("DATABASE_URL");
  },
  port: Number(process.env.PORT ?? 4000),
  host: process.env.HOST ?? "0.0.0.0",
  corsOrigins: (process.env.CORS_ORIGINS ?? "http://localhost:3000")
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean),
};
