import { Booked } from "@/components/landing/Booked";
import { Demand } from "@/components/landing/Demand";
import { Faq } from "@/components/landing/Faq";
import { Hero } from "@/components/landing/Hero";
import { HowItWorks } from "@/components/landing/HowItWorks";
import { Problem } from "@/components/landing/Problem";
import { Promises } from "@/components/landing/Promises";
import { SiteFooter } from "@/components/landing/SiteFooter";
import { SiteHeader } from "@/components/landing/SiteHeader";
import { Sports } from "@/components/landing/Sports";
import { Venues } from "@/components/landing/Venues";

export default function LandingPage() {
  return (
    <>
      <SiteHeader />
      <main id="top">
        <Hero />
        <Problem />
        <Booked />
        <HowItWorks />
        <Sports />
        <Demand />
        <Promises />
        <Venues />
        <Faq />
      </main>
      <SiteFooter />
    </>
  );
}
