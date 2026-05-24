import type { Metadata } from "next";
import {
  LegalPage,
  H2,
  P,
  UL,
  LI,
  Strong,
  OperatorBlock,
} from "@/components/marketing/legal-page";

export const metadata: Metadata = {
  title: "Terms of Service: leashd",
  description: "The terms that govern your use of leashd.",
  robots: { index: false, follow: false },
};

export default function TermsPage() {
  return (
    <LegalPage title="Terms of Service" updated="May 23, 2026">
      <P>
        These Terms govern your use of leashd (the &ldquo;Services&rdquo;),
        operated by HR Online Consulting LLC (DBA BrainBytes Studio) (&ldquo;we,&rdquo;
        &ldquo;us,&rdquo; &ldquo;our&rdquo;). By creating an account or using the
        Services you agree to these Terms.
      </P>

      <H2>1. The Services</H2>
      <P>
        leashd is <Strong>non-custodial spend-governance software for autonomous
        AI agents.</Strong> It lets you define spending policies (budget caps,
        per-agent and per-period limits, allowed endpoints and mints, time
        windows, kill-switches), enforce those policies when your agents attempt
        payments over rails you connect (e.g. Bitcoin Lightning / L402, Cashu
        ecash, NWC, x402), and keep a verifiable audit trail of what each agent
        did.
      </P>
      <P>
        leashd authorises or denies payment requests according to your policy.
        The actual settlement happens on <Strong>your</Strong> connected rail,
        between <Strong>your</Strong> wallet/node/mint and the counterparty.
      </P>

      <H2>2. Non-Custodial; No Money Transmission (read this)</H2>
      <UL>
        <LI>
          leashd <Strong>never</Strong> takes custody of your funds, bitcoin,
          sats, stablecoins, or any balance, and <Strong>never</Strong> holds or
          controls your private keys, seed phrases, or equivalent security
          elements.
        </LI>
        <LI>
          leashd is <Strong>not</Strong> a bank, money transmitter, money services
          business (MSB), exchange, custodian, broker, or financial
          intermediary. We do not move, hold, or transmit money or value on your
          behalf. We provide software that evaluates your own policies against
          your own connected rails.
        </LI>
        <LI>
          <Strong>You are solely responsible</Strong> for the funds, wallets,
          nodes, mints, keys, and credentials you connect, for the policies you
          configure, and for the payments your agents make. Misconfiguring a
          policy, connecting an over-permissioned credential, or authorising an
          agent to spend is your responsibility.
        </LI>
        <LI>
          We strongly recommend connecting only <Strong>scoped, spend-limited</Strong>{" "}
          credentials (e.g. restricted macaroons, NWC budgets) so the
          credential&apos;s own limits reinforce your leashd policy.
        </LI>
      </UL>

      <H2>3. License Grant</H2>
      <P>
        We grant you a non-exclusive, non-transferable, revocable license to use
        the Services for your lawful purposes during your subscription. The
        leashd name, design, documentation, and codebase remain ours. Audit logs
        and policies you create are yours; you can export them anytime.
      </P>

      <H2>4. Acceptable Use</H2>
      <P>You must not, and must not configure an agent to:</P>
      <UL>
        <LI>
          Use the Services to facilitate, conceal, or process payments connected
          to money laundering, terrorism financing, sanctions evasion, fraud,
          ransomware, or any unlawful activity.
        </LI>
        <LI>
          Use the Services if you or your end users are subject to U.S. sanctions
          (OFAC), are located in a comprehensively sanctioned jurisdiction, or
          are on any applicable denied-party list.
        </LI>
        <LI>Route payments for unlawful goods or services.</LI>
        <LI>
          Abuse, overload, reverse-engineer for competitive cloning, or attempt
          to circumvent the security or rate limits of the Services.
        </LI>
        <LI>Resell or redistribute leashd itself as a competing service.</LI>
      </UL>
      <P>
        We may suspend or terminate access for violations, with notice where
        lawful and practical.
      </P>

      <H2>5. Your Compliance Responsibility</H2>
      <P>
        Depending on what your agents pay for and where you operate, you may have
        your own regulatory, tax, and AML obligations. leashd is a tool; using it
        does not transfer those obligations to us and does not constitute legal,
        tax, or financial advice. You are responsible for your own compliance.
      </P>

      <H2>6. Subscription, Billing, Refunds</H2>
      <P>
        Subscriptions are billed via Stripe in USD. We offer a 30-day
        no-questions-asked refund on a first purchase. You may cancel anytime via
        the Stripe customer portal; access continues until the end of the period
        you paid for. Fees are exclusive of taxes you may owe.
      </P>

      <H2>7. Availability; No Guarantee of Enforcement Outcomes</H2>
      <P>
        We work to keep the Services available and accurate, but we do not
        guarantee uninterrupted operation. <Strong>leashd is one layer of
        defence, not a guarantee.</Strong> A policy decision depends on correct
        configuration, the behaviour of your connected rail, and network
        conditions outside our control. You remain responsible for using scoped
        credentials and reasonable limits so that no single failure (including a
        failure of leashd) can cause loss beyond those limits.
      </P>

      <H2>8. Governing Law</H2>
      <P>
        These Terms are governed by the laws of North Carolina, United States.
        Before any formal proceeding, contact{" "}
        <a
          href="mailto:support@leashd.dev"
          className="text-primary hover:underline"
        >
          support@leashd.dev
        </a>{" "}
        to resolve the matter informally. If unresolved within 60 days, either
        party may pursue legal remedies in the appropriate forum.
      </P>

      <H2>9. Warranty Disclaimer + Limitation of Liability</H2>
      <P>
        THE SERVICES ARE PROVIDED &ldquo;AS IS&rdquo; AND &ldquo;AS
        AVAILABLE,&rdquo; WITHOUT WARRANTIES OF ANY KIND, EXPRESS OR IMPLIED,
        INCLUDING MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE, AND
        NON-INFRINGEMENT.
      </P>
      <P>
        WE DO NOT WARRANT THAT EVERY PAYMENT WILL BE CORRECTLY AUTHORISED OR
        DENIED, THAT POLICIES WILL ENFORCE PERFECTLY UNDER ALL RAIL AND NETWORK
        CONDITIONS, OR THAT THE SERVICES WILL BE ERROR-FREE. BECAUSE leashd IS
        NON-CUSTODIAL, WE HAVE NO ACCESS TO AND NO RESPONSIBILITY FOR YOUR FUNDS.
      </P>
      <P>
        TO THE MAXIMUM EXTENT PERMITTED BY LAW, HR ONLINE CONSULTING LLC&apos;S
        TOTAL LIABILITY FOR ANY CLAIM SHALL NOT EXCEED THE AMOUNT YOU PAID US IN
        THE LAST 12 MONTHS, OR ONE HUNDRED U.S. DOLLARS ($100), WHICHEVER IS
        GREATER. WE ARE NOT LIABLE FOR INDIRECT, INCIDENTAL, CONSEQUENTIAL, OR
        LOSS-OF-FUNDS DAMAGES ARISING FROM YOUR CONFIGURATION, YOUR CONNECTED
        RAILS, OR YOUR AGENTS&apos; BEHAVIOUR.
      </P>

      <H2>10. Changes</H2>
      <P>
        We may update these Terms as the Services evolve. The &ldquo;Last
        updated&rdquo; date reflects the most recent change. For material changes
        we will notify registered users by email and surface an in-product
        notice. Continued use after the effective date constitutes acceptance.
      </P>

      <H2>11. Contact</H2>
      <OperatorBlock />
    </LegalPage>
  );
}
