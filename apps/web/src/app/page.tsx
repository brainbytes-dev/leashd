import type { Metadata } from "next";
import { SiteHeader } from "@/components/marketing/site-header";
import { Hero } from "@/components/marketing/hero";
import { Problem } from "@/components/marketing/problem";
import { Explainer } from "@/components/marketing/explainer";
import { HowItWorks } from "@/components/marketing/how-it-works";
import { Capabilities } from "@/components/marketing/capabilities";
import { TrustBand } from "@/components/marketing/trust-band";
import { PricingTeaser } from "@/components/marketing/pricing-teaser";
import { GetStarted } from "@/components/marketing/get-started";
import { SiteFooter } from "@/components/marketing/site-footer";
import { BRAND, TAGLINE } from "@/components/marketing/brand";

export const metadata: Metadata = {
  title: `${BRAND}: Spend governance for AI agents`,
  description:
    "Non-custodial spend governance for autonomous AI agents. Budget caps, scoped credentials, allowlists, immutable audit, and a graded kill-switch over Bitcoin Lightning and stablecoin rails.",
  openGraph: {
    title: `${BRAND}: ${TAGLINE}`,
    description:
      "Non-custodial spend governance for autonomous AI agents. You hold the keys. leashd holds the policy.",
    type: "website",
  },
};

export default function LandingPage() {
  return (
    <div className="flex min-h-screen flex-col bg-background text-foreground">
      <SiteHeader />
      <main className="flex-1">
        <Hero />
        <Problem />
        <Explainer />
        <HowItWorks />
        <Capabilities />
        <TrustBand />
        <PricingTeaser />
        <GetStarted />
      </main>
      <SiteFooter />
    </div>
  );
}
