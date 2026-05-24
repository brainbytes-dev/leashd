# Contributing to leashd

Thanks for helping build leashd. Contributions of all sizes are welcome: bug reports, docs, rail adapters, tests, and features.

## The one invariant

**leashd stays non-custodial.** leashd must never transmit a user's keys, seeds, or rail secrets off the user's machine, and the control plane must never hold funds or keys. Any change that weakens this will be rejected. The control plane receives policy and audit metadata only.

## Development setup

Requires Node >= 22.5 and pnpm.

```bash
git clone https://github.com/brainbytes-dev/leashd
cd leashd
pnpm install
pnpm dev          # turbo: runs the apps
pnpm typecheck    # tsc across the workspace
pnpm lint
pnpm build
pnpm test         # vitest (leash-core + leashd)
```

Monorepo (Turborepo + pnpm workspaces):

- `packages/leash-core` deterministic policy engine and shared zod contract.
- `packages/leashd` runs on your machine: MCP server, governor (two-phase commit), rail adapters, signed audit, node:sqlite store.
- `apps/web` the control plane.

## Coding standards

- Strict TypeScript. No `any`: use `unknown` and narrow, or type it properly.
- Functional and pragmatic. Keep files focused.
- The policy engine is deterministic and fail-closed. Add a test for every decision path.
- Comments explain the why, not the what.
- No em-dashes in user-facing copy.

## Pull requests

1. Fork and branch from `master`.
2. Keep the diff focused. One concern per PR.
3. `pnpm typecheck && pnpm lint && pnpm build` must pass. Add or update tests.
4. Describe the change and why. Link any issue.

## Discuss

Open an issue, or join the conversation via [leashd.dev/community](https://leashd.dev/community).

By contributing you agree your contributions are licensed under the project's [AGPL-3.0](./LICENSE).
