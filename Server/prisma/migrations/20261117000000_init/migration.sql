-- CreateSchema
CREATE SCHEMA IF NOT EXISTS "public";

-- CreateEnum
CREATE TYPE "Sport" AS ENUM ('padel', 'futsal', 'cricket', 'badminton');

-- CreateEnum
CREATE TYPE "PaymentMethod" AS ENUM ('jazzcash', 'easypaisa', 'card', 'cash');

-- CreateEnum
CREATE TYPE "BookingStatus" AS ENUM ('confirmed', 'cancelled');

-- CreateEnum
CREATE TYPE "BookingSource" AS ENUM ('online', 'walk_in');

-- CreateTable
CREATE TABLE "venues" (
    "id" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "city" TEXT NOT NULL,
    "area" TEXT NOT NULL,
    "address" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "amenities" TEXT[],
    "open_hour" INTEGER NOT NULL,
    "close_hour" INTEGER NOT NULL,
    "free_cancel_hours" INTEGER NOT NULL,
    "late_refund_percent" INTEGER NOT NULL,
    "pay_at_venue" BOOLEAN NOT NULL,
    "photo_src" TEXT,
    "photo_alt" TEXT,
    "photo_credit" TEXT,
    "photo_credit_url" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "venues_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "courts" (
    "id" TEXT NOT NULL,
    "venue_id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "sport" "Sport" NOT NULL,

    CONSTRAINT "courts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "rate_bands" (
    "id" SERIAL NOT NULL,
    "venue_id" TEXT NOT NULL,
    "sport" "Sport" NOT NULL,
    "from_hour" INTEGER NOT NULL,
    "to_hour" INTEGER NOT NULL,
    "price" INTEGER NOT NULL,
    "label" TEXT NOT NULL,

    CONSTRAINT "rate_bands_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "customers" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "phone" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "customers_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "bookings" (
    "id" TEXT NOT NULL,
    "ref" TEXT NOT NULL,
    "venue_id" TEXT NOT NULL,
    "court_id" TEXT NOT NULL,
    "customer_id" TEXT NOT NULL,
    "date" DATE NOT NULL,
    "start_hour" INTEGER NOT NULL,
    "hours" INTEGER NOT NULL,
    "price" INTEGER NOT NULL,
    "payment" "PaymentMethod" NOT NULL,
    "paid" BOOLEAN NOT NULL,
    "status" "BookingStatus" NOT NULL DEFAULT 'confirmed',
    "source" "BookingSource" NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "cancelled_at" TIMESTAMP(3),
    "refund" INTEGER,

    CONSTRAINT "bookings_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "venues_slug_key" ON "venues"("slug");

-- CreateIndex
CREATE INDEX "venues_city_area_idx" ON "venues"("city", "area");

-- CreateIndex
CREATE INDEX "courts_venue_id_idx" ON "courts"("venue_id");

-- CreateIndex
CREATE INDEX "rate_bands_venue_id_sport_idx" ON "rate_bands"("venue_id", "sport");

-- CreateIndex
CREATE UNIQUE INDEX "customers_phone_key" ON "customers"("phone");

-- CreateIndex
CREATE UNIQUE INDEX "bookings_ref_key" ON "bookings"("ref");

-- CreateIndex
CREATE INDEX "bookings_venue_id_date_idx" ON "bookings"("venue_id", "date");

-- CreateIndex
CREATE INDEX "bookings_court_id_date_idx" ON "bookings"("court_id", "date");

-- CreateIndex
CREATE INDEX "bookings_customer_id_idx" ON "bookings"("customer_id");

-- AddForeignKey
ALTER TABLE "courts" ADD CONSTRAINT "courts_venue_id_fkey" FOREIGN KEY ("venue_id") REFERENCES "venues"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "rate_bands" ADD CONSTRAINT "rate_bands_venue_id_fkey" FOREIGN KEY ("venue_id") REFERENCES "venues"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "bookings" ADD CONSTRAINT "bookings_venue_id_fkey" FOREIGN KEY ("venue_id") REFERENCES "venues"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "bookings" ADD CONSTRAINT "bookings_court_id_fkey" FOREIGN KEY ("court_id") REFERENCES "courts"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "bookings" ADD CONSTRAINT "bookings_customer_id_fkey" FOREIGN KEY ("customer_id") REFERENCES "customers"("id") ON DELETE RESTRICT ON UPDATE CASCADE;


-- ---------------------------------------------------------------------------
-- Hand-written: data rules Prisma's schema language can't express.
-- ---------------------------------------------------------------------------

-- btree_gist lets an exclusion constraint compare court_id with "=".
CREATE EXTENSION IF NOT EXISTS btree_gist;

-- No double booking: two confirmed bookings on the same court may not overlap.
-- Each booking becomes an hour range on one continuous scale (hours since
-- 2000-01-01 plus start_hour), so overlaps across midnight are caught too.
ALTER TABLE "bookings" ADD CONSTRAINT "booking_no_overlap" EXCLUDE USING gist (
  "court_id" WITH =,
  int4range(
    ("date" - DATE '2000-01-01') * 24 + "start_hour",
    ("date" - DATE '2000-01-01') * 24 + "start_hour" + "hours"
  ) WITH &&
) WHERE ("status" = 'confirmed');

ALTER TABLE "bookings" ADD CONSTRAINT "booking_hours_valid"
  CHECK ("start_hour" >= 0 AND "start_hour" < 30 AND "hours" BETWEEN 1 AND 3);

ALTER TABLE "bookings" ADD CONSTRAINT "booking_price_valid"
  CHECK ("price" >= 0 AND ("refund" IS NULL OR ("refund" >= 0 AND "refund" <= "price")));

ALTER TABLE "venues" ADD CONSTRAINT "venue_hours_valid"
  CHECK ("open_hour" >= 0 AND "close_hour" > "open_hour" AND "close_hour" <= 30);

ALTER TABLE "venues" ADD CONSTRAINT "venue_policy_valid"
  CHECK ("free_cancel_hours" >= 0 AND "late_refund_percent" BETWEEN 0 AND 100);

ALTER TABLE "rate_bands" ADD CONSTRAINT "rate_band_valid"
  CHECK ("to_hour" > "from_hour" AND "price" > 0);
