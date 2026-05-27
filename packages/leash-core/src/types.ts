import { z } from "zod";

/**
 * Shared contract between leashd (OSS sidecar) and the Leash control plane.
 * Money is represented as an integer in a rail-appropriate minor unit so the
 * policy engine stays exact (no floats).
 */

// Bitcoin-only: sats are the single unit of account.
export const MoneyUnit = z.enum(["sat"]);
export type MoneyUnit = z.infer<typeof MoneyUnit>;

export const Amount = z.object({
  unit: MoneyUnit,
  value: z.number().int().nonnegative(),
});
export type Amount = z.infer<typeof Amount>;

// Bitcoin-only by design: Lightning (NWC / L402) and Cashu ecash. No EVM/altcoin rails.
export const Rail = z.enum(["lightning_nwc", "cashu"]);
export type Rail = z.infer<typeof Rail>;

export const BudgetWindow = z.enum(["task", "hour", "day", "month"]);
export type BudgetWindow = z.infer<typeof BudgetWindow>;

export const GradedState = z.enum(["normal", "read_only", "restricted"]);
export type GradedState = z.infer<typeof GradedState>;

export const PolicySpec = z
  .object({
    /** Bumped by the control plane on every change; leashd applies the highest it has. */
    version: z.number().int().positive(),
    /** Fallback when no rule matches. Defaults to deny (fail-closed). */
    defaultDecision: z.enum(["allow", "deny"]).default("deny"),
    /** Maximum value of a single transaction. */
    perTxMax: Amount.optional(),
    /** Rolling spend caps per window. */
    budgets: z
      .array(z.object({ window: BudgetWindow, cap: Amount }))
      .default([]),
    /** If present, ONLY these recipients are allowed (allowlist). */
    allow: z
      .object({
        endpoints: z.array(z.string()).optional(),
        domains: z.array(z.string()).optional(),
        lightningAddresses: z.array(z.string()).optional(),
        mints: z.array(z.string()).optional(),
      })
      .optional(),
    /** Always-reject recipients (takes precedence over allow). */
    deny: z
      .object({
        endpoints: z.array(z.string()).optional(),
        domains: z.array(z.string()).optional(),
        lightningAddresses: z.array(z.string()).optional(),
        mints: z.array(z.string()).optional(),
      })
      .optional(),
    /** Token-bucket style rate limit. */
    rateLimit: z
      .object({ maxPerWindow: z.number().int().positive(), windowSeconds: z.number().int().positive() })
      .optional(),
    /**
     * IANA timezone the time windows are expressed in (e.g. "Europe/Zurich").
     * Days and minutes below are wall-clock in THIS zone. Default UTC.
     */
    timezone: z.string().default("UTC"),
    /** Allowed time windows (wall-clock in `timezone`); empty = always allowed. */
    timeWindows: z
      .array(
        z.object({
          days: z.array(z.number().int().min(0).max(6)), // 0 = Sunday
          startMinute: z.number().int().min(0).max(1440),
          endMinute: z.number().int().min(0).max(1440),
        })
      )
      .default([]),
    /** Above this value, require human approval instead of auto-allow. */
    approvalThreshold: Amount.optional(),
    /** Hard global stop. */
    killSwitch: z.boolean().default(false),
    /** Graded containment ("dimmer"): read_only/restricted block payments. */
    gradedState: GradedState.default("normal"),
    /** Allowed rails in priority order; empty = all. */
    rails: z.array(Rail).default([]),
  })
  .strict();
export type PolicySpec = z.infer<typeof PolicySpec>;

export const PaymentRequest = z.object({
  agentId: z.string(),
  rail: Rail,
  amount: Amount,
  endpoint: z.string().optional(),
  domain: z.string().optional(),
  lightningAddress: z.string().optional(),
  mint: z.string().optional(),
  reason: z.string().optional(),
  /** Signed delegation / human-intent reference (authorization chain). */
  intentRef: z.string().optional(),
  /** Unix ms. */
  ts: z.number().int(),
});
export type PaymentRequest = z.infer<typeof PaymentRequest>;

/** Aggregated state the caller (leashd) supplies; engine stays pure. */
export const EvalState = z.object({
  /** Spend already recorded in each window, in the SAME unit as the request. */
  spend: z.object({
    task: z.number().int().nonnegative().default(0),
    hour: z.number().int().nonnegative().default(0),
    day: z.number().int().nonnegative().default(0),
    month: z.number().int().nonnegative().default(0),
  }),
  /** Transactions in the current rate-limit window. */
  recentCount: z.number().int().nonnegative().default(0),
});
export type EvalState = z.infer<typeof EvalState>;

export const Decision = z.enum([
  "allowed",
  "denied",
  "capped",
  "approval_required",
]);
export type Decision = z.infer<typeof Decision>;

export const PolicyDecision = z.object({
  decision: Decision,
  reasons: z.array(z.string()),
  /** Which control produced the decision. */
  matched: z.string().optional(),
});
export type PolicyDecision = z.infer<typeof PolicyDecision>;

export const AuditEvent = z.object({
  agentId: z.string(),
  workspaceId: z.string(),
  seq: z.number().int().nonnegative(),
  decision: Decision,
  rail: Rail.optional(),
  endpoint: z.string().optional(),
  amount: Amount.optional(),
  reason: z.string().optional(),
  policyVersion: z.number().int().optional(),
  occurredAt: z.number().int(), // unix ms
});
export type AuditEvent = z.infer<typeof AuditEvent>;
