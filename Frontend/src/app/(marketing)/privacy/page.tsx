import type { Metadata } from "next";
import { SiteFooter } from "@/components/landing/SiteFooter";
import { SiteHeader } from "@/components/landing/SiteHeader";
import styles from "./privacy.module.css";

export const metadata: Metadata = {
  title: "Privacy",
  description: "What KhelSpot collects when you book a court or run a venue, why, and how to have it removed.",
};

// Set NEXT_PUBLIC_CONTACT_EMAIL before publishing; app stores require a working contact.
const CONTACT = process.env.NEXT_PUBLIC_CONTACT_EMAIL;

export default function PrivacyPage() {
  return (
    <>
      <SiteHeader />
      <main id="top" className={styles.page}>
        <div className={`wrap ${styles.body}`}>
          <p className={styles.kicker}>Updated 20 November 2026</p>
          <h1 className={styles.title}>Privacy</h1>
          <p className={styles.lead}>
            KhelSpot lets players book indoor courts in Lahore and lets venues manage those bookings. This page covers the
            website and the KhelSpot app for Android and iPhone.
          </p>

          <h2>What we collect</h2>
          <ul>
            <li>
              <strong>Your name and mobile number</strong>, when you book or sign in. The venue sees them so they know who is
              coming and can reach you.
            </li>
            <li>
              <strong>Your bookings</strong>: venue, court, date, time, price, payment method, and whether it was paid,
              cancelled or refunded.
            </li>
            <li>
              <strong>Sign-in codes</strong>: we text a 6-digit code to your number. We keep only a scrambled copy, and only for
              a few minutes.
            </li>
            <li>
              <strong>Venue details</strong> from venue owners: address, hours, rates, photos and the owner&apos;s mobile
              number.
            </li>
          </ul>
          <p>
            We don&apos;t collect your location, contacts or photos, and the app has no advertising or tracking SDKs. Card,
            JazzCash and Easypaisa payments happen on the payment provider&apos;s own page; we never see or store your card or
            wallet details.
          </p>

          <h2>On your phone</h2>
          <p>
            The app keeps your sign-in session in the phone&apos;s secure storage, and schedules a &ldquo;Game in 2
            hours&rdquo; reminder on the phone itself if you allow notifications. Test builds of the app check this
            project&apos;s GitHub releases for updates; that request carries no personal data.
          </p>

          <h2>Why we use it</h2>
          <ul>
            <li>To hold your court, take payment, confirm the booking and process refunds.</li>
            <li>To let the venue see who booked, collect cash on arrival, and contact you about your booking.</li>
            <li>
              To send booking confirmations and reminders on WhatsApp, only if you ticked the box at checkout. Reply STOP to
              stop them.
            </li>
          </ul>
          <p>We don&apos;t sell your data or share it with anyone except the venue you booked and the payment provider.</p>

          <h2>How long we keep it</h2>
          <p>
            Bookings are kept for 2 years for refunds, disputes and the venue&apos;s records, then deleted. Sign-in sessions
            end after 90 days without use.
          </p>

          <h2>Your choices</h2>
          <p>
            You can ask us to show you, correct or delete what we hold about you. We delete your name and number from past
            bookings; the booking amounts stay in the venue&apos;s records without your details.
            {CONTACT ? (
              <>
                {" "}
                Write to <a href={`mailto:${CONTACT}`}>{CONTACT}</a> from the number&apos;s owner or mention it in your message,
                and we&apos;ll reply within 7 days.
              </>
            ) : null}
          </p>
        </div>
      </main>
      <SiteFooter />
    </>
  );
}
