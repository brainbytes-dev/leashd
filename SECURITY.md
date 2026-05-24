# Security Policy

leashd guards money. We take security seriously and appreciate responsible disclosure.

## Reporting a vulnerability

Email **security@leashd.dev** with the details and, if possible, a proof of concept. Please do not open a public issue for security problems.

We aim to acknowledge within 72 hours and to keep you updated as we investigate. There is no paid bug bounty yet, but we credit reporters (with your permission) once a fix ships.

## Threat model

leashd is non-custodial by design. The strongest guarantee follows from that:

- Keys, seeds, and rail secrets never leave the user's machine. The control plane stores policy and audit metadata only.
- A full compromise of the control plane cannot move funds, because it never holds the keys that can.
- The policy engine is deterministic and fail-closed: anything not explicitly permitted is denied, and any evaluation error denies.
- Audit events are signed by leashd on your machine so tampering is detectable.

We are especially interested in reports about: policy-bypass paths, signature or verification flaws, credential handling in leashd, audit-log tampering, and any path that could let an agent spend outside its policy.

## Scope

In scope: `packages/leash-core`, `packages/leashd`, `apps/web`, and the hosted control plane at leashd.dev. Out of scope: third-party rails, wallets, and nodes you connect (report those to their maintainers).

Operated by HR Online Consulting LLC (DBA BrainBytes Studio).
