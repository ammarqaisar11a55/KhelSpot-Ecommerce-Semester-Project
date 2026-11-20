-- AlterEnum
ALTER TYPE "BookingStatus" ADD VALUE 'pending_payment';

-- AlterTable
ALTER TABLE "bookings" ADD COLUMN     "hold_expires_at" TIMESTAMP(3),
ADD COLUMN     "payment_provider" TEXT,
ADD COLUMN     "return_url" TEXT;

-- CreateTable
CREATE TABLE "users" (
    "phone" TEXT NOT NULL,
    "name" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "users_pkey" PRIMARY KEY ("phone")
);

-- CreateTable
CREATE TABLE "sessions" (
    "id" TEXT NOT NULL,
    "token_hash" TEXT NOT NULL,
    "phone" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "expires_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "sessions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "otp_codes" (
    "id" TEXT NOT NULL,
    "phone" TEXT NOT NULL,
    "code_hash" TEXT NOT NULL,
    "attempts" INTEGER NOT NULL DEFAULT 0,
    "created_at" TIMESTAMP(3) NOT NULL,
    "expires_at" TIMESTAMP(3) NOT NULL,
    "used_at" TIMESTAMP(3),

    CONSTRAINT "otp_codes_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "venue_owners" (
    "phone" TEXT NOT NULL,
    "venue_id" TEXT NOT NULL,

    CONSTRAINT "venue_owners_pkey" PRIMARY KEY ("phone","venue_id")
);

-- CreateIndex
CREATE UNIQUE INDEX "sessions_token_hash_key" ON "sessions"("token_hash");

-- CreateIndex
CREATE INDEX "sessions_phone_idx" ON "sessions"("phone");

-- CreateIndex
CREATE INDEX "otp_codes_phone_created_at_idx" ON "otp_codes"("phone", "created_at");

-- CreateIndex
CREATE INDEX "venue_owners_venue_id_idx" ON "venue_owners"("venue_id");

-- CreateIndex
CREATE INDEX "bookings_status_hold_expires_at_idx" ON "bookings"("status", "hold_expires_at");

-- AddForeignKey
ALTER TABLE "sessions" ADD CONSTRAINT "sessions_phone_fkey" FOREIGN KEY ("phone") REFERENCES "users"("phone") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "venue_owners" ADD CONSTRAINT "venue_owners_venue_id_fkey" FOREIGN KEY ("venue_id") REFERENCES "venues"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- ---------------------------------------------------------------------------
-- Hand-written: payment holds block a slot like confirmed bookings.
-- Written as "not cancelled" rather than naming 'pending_payment', because
-- Postgres can't use an enum value added in the same transaction. Expired
-- holds are cancelled by the API (sweepExpiredHolds) before every
-- availability check and booking, which frees their slots.
-- ---------------------------------------------------------------------------
ALTER TABLE "bookings" DROP CONSTRAINT "booking_no_overlap";

ALTER TABLE "bookings" ADD CONSTRAINT "booking_no_overlap" EXCLUDE USING gist (
  "court_id" WITH =,
  int4range(
    ("date" - DATE '2000-01-01') * 24 + "start_hour",
    ("date" - DATE '2000-01-01') * 24 + "start_hour" + "hours"
  ) WITH &&
) WHERE ("status" <> 'cancelled');
