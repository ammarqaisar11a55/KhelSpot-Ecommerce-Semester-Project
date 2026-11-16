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
import { Waitlist } from "@/components/landing/Waitlist";

export default function LandingPage() {
  return (
    <>
      <SiteHeader />
      <main id="top">
        <Hero />
        <Problem />
        <HowItWorks />
        <Sports />
        <Demand />
        <Promises />
        <Venues />
        <Faq />
        <Waitlist />
      </main>
      <SiteFooter />
    </>
  );
}
