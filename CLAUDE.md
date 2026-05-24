# CLAUDE.md

## Project Overview

leashd is a payment-governance control plane: a Next.js 16 web app plus a CLI sidecar (`leashd`) that enforces signed policies on connected payment rails. Turborepo for orchestration, pnpm workspaces. Payments are Stripe-only; there is no mobile app.

## Monorepo Structure

```
apps/
  web/          Next.js 16 — shadcn/ui, Better-Auth, Stripe, Inngest, Leash API
packages/
  db/           @repo/db — Drizzle ORM + PostgreSQL schema
  email/        @repo/email — React Email templates (Resend)
  shadcn-ui/    @repo/shadcn-ui — Web UI components (Radix + Tailwind v4)
  leash-core/   @repo/leash-core — PolicySpec zod schemas + signing helpers
  leashd/       @repo/leashd — CLI sidecar that enforces policies locally
  typescript-config/  Shared tsconfig presets
  eslint-config/      Shared ESLint rules
```

## Commands

```bash
pnpm dev              # Start all apps (Turbo)
pnpm build            # Build all packages + apps
pnpm lint             # Lint everything
pnpm typecheck        # TypeScript check
pnpm test             # Run vitest (web)

# Database (from root or packages/db)
pnpm db:generate      # Generate Drizzle migrations
pnpm db:migrate       # Run migrations
pnpm db:push          # Push schema directly (dev)
pnpm db:studio        # Open Drizzle Studio
```

## Tech Stack

| Layer | Web |
|-------|-----|
| Framework | Next.js 16 (App Router) |
| UI | shadcn/ui (Radix + Tailwind v4) |
| Auth | Better-Auth (cookies, admin plugin) |
| Payments | Stripe (checkout, portal, webhooks) |
| Database | Drizzle ORM + PostgreSQL |
| Email | Resend + React Email templates |
| Jobs | Inngest (event-driven + cron) |
| Rate Limit | Upstash Redis (sliding window, 10/min) |
| Analytics | PostHog (posthog-js) |
| Errors | Sentry (@sentry/nextjs) |
| Tracing | OpenTelemetry (OTLP export) |
| Feature Flags | PostHog (server + client) |
| Canary/Rollout | Vercel Edge Config |
| Testing | Vitest + happy-dom |
| CI/CD | GitHub Actions → Turbo |

## Authentication

- **Web**: Better-Auth with PostgreSQL, `admin()` plugin for RBAC
  - Config: `apps/web/src/lib/auth.ts`
  - Client: `apps/web/src/lib/auth-client.ts` — exports `useSession`, `signIn`, `signUp`, `signOut`
  - Middleware: `apps/web/src/middleware.ts` — protects `/dashboard/**` and `/admin/**`
  - Admin guard: `apps/web/src/app/admin/layout.tsx` — client-side role check

## Database Schema (packages/db)

Tables in `packages/db/src/schema.ts`:
- `users` — id, email, name, role (user|admin)
- `sessions` / `accounts` / `verifications` — Better-Auth
- `user_subscriptions` — Stripe subscription tracking
- `payments` — Stripe payment records
- Leash: `workspaces`, `workspace_members`, `agents`, `policies`, `rail_bindings`, `audit_events`

Client: `getDb()` in `packages/db/src/index.ts` — lazy-initialized, max 10 connections.

## API Routes (apps/web)

| Route | Method | Purpose |
|-------|--------|---------|
| `/api/auth/[...auth]` | * | Better-Auth handler |
| `/api/auth/update-profile` | POST | Update user profile |
| `/api/auth/change-password` | POST | Change password |
| `/api/checkout` | POST | Create Stripe checkout session |
| `/api/portal` | POST | Create Stripe billing portal session |
| `/api/webhooks/stripe` | POST | Stripe webhook events |
| `/api/leash/*` | * | Leash control-plane API (agents, policies, audit) |
| `/api/inngest` | GET/POST/PUT | Inngest function handler |
| `/api/admin/users` | GET/PATCH | Admin user management |
| `/api/email/welcome` | POST | Send welcome email |
| `/api/health` | GET | Health check (DB connectivity) |
| `/api/docs` | GET | OpenAPI spec |

## Inngest Jobs (apps/web/src/inngest/)

- `send-welcome-email` — event: `user/signup`, 3 retries
- `payment-failed-reminder` — event: `stripe/payment.failed`, 3 retries
- `subscription-canceled` — event: `stripe/subscription.canceled`, 3 retries
- `cleanup-sessions` — cron: daily 3 AM UTC

## Environment Variables

See `.env.example` for all required vars. Key groups:
- `BETTER_AUTH_*` — Auth secret + URL
- `STRIPE_*` / `NEXT_PUBLIC_STRIPE_*` — Payment processing
- `SUPABASE_*` / `NEXT_PUBLIC_SUPABASE_*` — Database (legacy, migrating to Drizzle)
- `DATABASE_URL` — PostgreSQL connection (for Drizzle)
- `RESEND_*` — Email service
- `UPSTASH_*` — Rate limiting (Redis)
- `SENTRY_*` — Error tracking
- `POSTHOG_*` — Analytics
- `OTEL_EXPORTER_OTLP_ENDPOINT` — OpenTelemetry trace export
- `EDGE_CONFIG` — Vercel Edge Config (auto-set on Vercel)
- `LEASH_*` — Control-plane signing key + leashd sidecar config (see `.env.example`)

## Observability & Rollout

- **OpenTelemetry**: `src/instrumentation.ts` — auto-instruments HTTP, fetch, DB. Exports traces via OTLP. Sentry integrated as span processor. Sample rate: 10% prod, 100% dev.
- **Feature Flags**: PostHog-powered. Server: `isFeatureEnabled(flag, userId)` in `src/lib/feature-flags.ts`. Client: `useFeatureFlag(flag)` hook in `src/hooks/use-feature-flag.ts`. Define flags in PostHog dashboard.
- **Canary Rollouts**: Vercel Edge Config in `src/lib/edge-config.ts`. `isInCanaryRollout(key, userId)` for percentage-based rollouts. `isMaintenanceMode()` for kill switches. <1ms reads at the edge.
- **Error Boundaries**: `error.tsx` + `global-error.tsx` auto-report to Sentry. Custom `not-found.tsx` 404 page.

## Key Patterns

- **Lazy initialization**: Stripe, Resend, PostHog, and DB clients are all lazy-initialized to avoid build-time crashes when env vars are missing
- **Fail-open**: Rate limiting and feature flags return safe defaults on service errors
- **Event-driven**: Webhooks emit Inngest events; Inngest functions handle email/cleanup async

## CI/CD

- **Web**: `.github/workflows/ci.yml` — lint → typecheck → test → build on push/PR
