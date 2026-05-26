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
    "Non-custodial spend governance for autonomous AI agents. Budget caps, scoped credentials, allowlists, immutable audit, and a graded kill-switch over Bitcoin Lightning and Cashu ecash. Bitcoin-only.",
  openGraph: {
    title: `${BRAND}: ${TAGLINE}`,
    description:
      "Non-custodial spend governance for autonomous AI agents. You hold the keys. leashd holds the policy.",
    type: "website",
  },
};

const BASE_URL = process.env.NEXT_PUBLIC_APP_URL || "https://leashd.dev";

const JSON_LD = {
  "@context": "https://schema.org",
  "@type": "SoftwareApplication",
  name: "leashd",
  applicationCategory: "DeveloperApplication",
  operatingSystem: "Cross-platform",
  description:
    "Non-custodial spend-governance layer for autonomous AI agents. A deterministic policy gate (budget caps, allowlists, rate limits, kill-switch, signed audit) between an AI agent and its Bitcoin payment rail. MCP-native, open-source.",
  url: BASE_URL,
  license: "https://www.gnu.org/licenses/agpl-3.0.html",
  codeRepository: "https://github.com/brainbytes-dev/leashd",
  offers: { "@type": "Offer", price: "0", priceCurrency: "USD" },
  author: { "@type": "Organization", name: "BrainBytes Studio" },
};

export default function LandingPage() {
  return (
    <div className="flex min-h-screen flex-col bg-background text-foreground">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(JSON_LD) }}
      />
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
