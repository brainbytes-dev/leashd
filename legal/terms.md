# Terms of Service

_Last updated: May 23, 2026_

These Terms govern your use of leashd (the "Services"), operated by HR Online Consulting LLC (DBA BrainBytes Studio) ("we," "us," "our"). By creating an account or using the Services you agree to these Terms.

## 1. The Services

leashd is **non-custodial spend-governance software for autonomous AI agents.** It lets you define spending policies (budget caps, per-agent and per-period limits, allowed endpoints and mints, time windows, kill-switches), enforce those policies when your agents attempt payments over rails you connect (e.g. Bitcoin Lightning / L402 / NWC, Cashu ecash), and keep a verifiable audit trail of what each agent did.

leashd authorises or denies payment requests according to your policy. The actual settlement happens on **your** connected rail, between **your** wallet/node/mint and the counterparty.

## 2. Non-Custodial; No Money Transmission (read this)

- leashd **never** takes custody of your funds, bitcoin, sats, or any balance, and **never** holds or controls your private keys, seed phrases, or equivalent security elements.
- leashd is **not** a bank, money transmitter, money services business (MSB), exchange, custodian, broker, or financial intermediary. We do not move, hold, or transmit money or value on your behalf. We provide software that evaluates your own policies against your own connected rails.
- **You are solely responsible** for the funds, wallets, nodes, mints, keys, and credentials you connect, for the policies you configure, and for the payments your agents make. Misconfiguring a policy, connecting an over-permissioned credential, or authorising an agent to spend is your responsibility.
- We strongly recommend connecting only **scoped, spend-limited** credentials (e.g. restricted macaroons, NWC budgets) so the credential's own limits reinforce your leashd policy.

## 3. License Grant

We grant you a non-exclusive, non-transferable, revocable license to use the Services for your lawful purposes during your subscription. The leashd name, design, documentation, and codebase remain ours. Audit logs and policies you create are yours; you can export them anytime.

## 4. Acceptable Use

You must not, and must not configure an agent to:

- Use the Services to facilitate, conceal, or process payments connected to money laundering, terrorism financing, sanctions evasion, fraud, ransomware, or any unlawful activity.
- Use the Services if you or your end users are subject to U.S. sanctions (OFAC), are located in a comprehensively sanctioned jurisdiction, or are on any applicable denied-party list.
- Route payments for unlawful goods or services.
- Abuse, overload, reverse-engineer for competitive cloning, or attempt to circumvent the security or rate limits of the Services.
- Resell or redistribute leashd itself as a competing service.

We may suspend or terminate access for violations, with notice where lawful and practical.

## 5. Your Compliance Responsibility

Depending on what your agents pay for and where you operate, you may have your own regulatory, tax, and AML obligations. leashd is a tool; using it does not transfer those obligations to us and does not constitute legal, tax, or financial advice. You are responsible for your own compliance.

## 6. Subscription, Billing, Refunds

Subscriptions are billed via Stripe in USD. We offer a 30-day no-questions-asked refund on a first purchase. You may cancel anytime via the Stripe customer portal; access continues until the end of the period you paid for. Fees are exclusive of taxes you may owe.

## 7. Availability; No Guarantee of Enforcement Outcomes

We work to keep the Services available and accurate, but we do not guarantee uninterrupted operation. **leashd is one layer of defence, not a guarantee.** A policy decision depends on correct configuration, the behaviour of your connected rail, and network conditions outside our control. You remain responsible for using scoped credentials and reasonable limits so that no single failure (including a failure of leashd) can cause loss beyond those limits.

## 8. Governing Law

These Terms are governed by the laws of North Carolina, United States. Before any formal proceeding, contact support@leashd.dev to resolve the matter informally. If unresolved within 60 days, either party may pursue legal remedies in the appropriate forum.

## 9. Warranty Disclaimer + Limitation of Liability

THE SERVICES ARE PROVIDED "AS IS" AND "AS AVAILABLE," WITHOUT WARRANTIES OF ANY KIND, EXPRESS OR IMPLIED, INCLUDING MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE, AND NON-INFRINGEMENT.

WE DO NOT WARRANT THAT EVERY PAYMENT WILL BE CORRECTLY AUTHORISED OR DENIED, THAT POLICIES WILL ENFORCE PERFECTLY UNDER ALL RAIL AND NETWORK CONDITIONS, OR THAT THE SERVICES WILL BE ERROR-FREE. BECAUSE leashd IS NON-CUSTODIAL, WE HAVE NO ACCESS TO AND NO RESPONSIBILITY FOR YOUR FUNDS.

TO THE MAXIMUM EXTENT PERMITTED BY LAW, HR ONLINE CONSULTING LLC'S TOTAL LIABILITY FOR ANY CLAIM SHALL NOT EXCEED THE AMOUNT YOU PAID US IN THE LAST 12 MONTHS, OR ONE HUNDRED U.S. DOLLARS ($100), WHICHEVER IS GREATER. WE ARE NOT LIABLE FOR INDIRECT, INCIDENTAL, CONSEQUENTIAL, OR LOSS-OF-FUNDS DAMAGES ARISING FROM YOUR CONFIGURATION, YOUR CONNECTED RAILS, OR YOUR AGENTS' BEHAVIOUR.

## 10. Changes

We may update these Terms as the Services evolve. The "Last updated" date reflects the most recent change. For material changes we will notify registered users by email and surface an in-product notice. Continued use after the effective date constitutes acceptance.

## 11. Contact

HR Online Consulting LLC (DBA BrainBytes Studio)
550 Kings Mountain
Kings Mountain, NC 28086, United States
Email: support@leashd.dev
