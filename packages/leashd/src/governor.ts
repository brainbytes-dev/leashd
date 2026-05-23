import {
  evaluatePolicy,
  PaymentRequest,
  type PolicyDecision,
  type PolicySpec,
} from "@repo/leash-core";
import type { LeashConfig } from "./config";
import type { Store } from "./store";
import type { RailAdapter, RailResult } from "./rails/types";
import type { AuditWriter } from "./audit";
import { loadAgentPolicy } from "./policy";

export interface GovernorResult {
  decision: PolicyDecision;
  policyVersion?: number;
  settled?: RailResult;
}

export interface Governor {
  /** Two-phase commit: propose -> validate -> settle -> commit, always audit. */
  requestPayment(req: PaymentRequest, opts?: { taskRef?: string }): Promise<GovernorResult>;
  /** Validate only (dry-run). No settlement, no spend, but still audited as the decision. */
  checkPolicy(req: PaymentRequest): GovernorResult;
}

const DEFAULT_RATE_WINDOW_S = 60;

export function createGovernor(deps: {
  store: Store;
  config: LeashConfig;
  audit: AuditWriter;
  rails: Map<PaymentRequest["rail"], RailAdapter>;
  /** Override policy resolution (tests). */
  resolvePolicy?: (agentId: string) => PolicySpec | undefined;
}): Governor {
  const { store, config, audit, rails } = deps;
  const resolvePolicy =
    deps.resolvePolicy ?? ((agentId: string) => loadAgentPolicy(store, config, agentId));

  function evaluate(req: PaymentRequest): { decision: PolicyDecision; spec?: PolicySpec } {
    const spec = resolvePolicy(req.agentId);
    // Fail-closed: no verified policy means no authority to spend.
    if (!spec) {
      return {
        decision: { decision: "denied", reasons: ["no verified policy available"], matched: "policy" },
      };
    }

    const rateWindow = spec.rateLimit?.windowSeconds ?? DEFAULT_RATE_WINDOW_S;
    const state = store.computeEvalState(
      req.agentId,
      req.amount.unit,
      req.ts,
      rateWindow
    );

    try {
      return { decision: evaluatePolicy(spec, req, state), spec };
    } catch (err) {
      return {
        decision: {
          decision: "denied",
          reasons: [`policy evaluation error: ${err instanceof Error ? err.message : "unknown"}`],
          matched: "error",
        },
        spec,
      };
    }
  }

  return {
    checkPolicy(rawReq) {
      const req = PaymentRequest.parse(rawReq);
      const { decision, spec } = evaluate(req);
      // Dry-run is still recorded for a complete audit trail.
      audit.emit({
        agentId: req.agentId,
        decision: decision.decision,
        rail: req.rail,
        endpoint: req.endpoint,
        amount: req.amount,
        reason: req.reason,
        policyVersion: spec?.version,
        occurredAt: req.ts,
      });
      return { decision, policyVersion: spec?.version };
    },

    async requestPayment(rawReq, opts) {
      const req = PaymentRequest.parse(rawReq);
      const { decision, spec } = evaluate(req);

      if (decision.decision !== "allowed") {
        audit.emit({
          agentId: req.agentId,
          decision: decision.decision,
          rail: req.rail,
          endpoint: req.endpoint,
          amount: req.amount,
          reason: req.reason,
          policyVersion: spec?.version,
          occurredAt: req.ts,
        });
        return { decision, policyVersion: spec?.version };
      }

      const adapter = rails.get(req.rail);
      if (!adapter) {
        const denied: PolicyDecision = {
          decision: "denied",
          reasons: [`no adapter for rail ${req.rail}`],
          matched: "rail",
        };
        audit.emit({
          agentId: req.agentId,
          decision: "denied",
          rail: req.rail,
          endpoint: req.endpoint,
          amount: req.amount,
          reason: req.reason,
          policyVersion: spec?.version,
          occurredAt: req.ts,
        });
        return { decision: denied, policyVersion: spec?.version };
      }

      // Settle on the user's rail. On failure, record a denial (no spend).
      const settled = await adapter.pay(req);
      if (!settled.ok) {
        const denied: PolicyDecision = {
          decision: "denied",
          reasons: [`settlement failed: ${settled.error ?? "unknown"}`],
          matched: "settlement",
        };
        audit.emit({
          agentId: req.agentId,
          decision: "denied",
          rail: req.rail,
          endpoint: req.endpoint,
          amount: req.amount,
          reason: req.reason,
          policyVersion: spec?.version,
          occurredAt: req.ts,
        });
        return { decision: denied, policyVersion: spec?.version, settled };
      }

      // Commit: record spend + signed audit atomically, then return success.
      audit.emit(
        {
          agentId: req.agentId,
          decision: "allowed",
          rail: req.rail,
          endpoint: req.endpoint,
          amount: settled.settledAmount ?? req.amount,
          reason: req.reason,
          policyVersion: spec?.version,
          occurredAt: req.ts,
        },
        { taskRef: opts?.taskRef }
      );

      return { decision, policyVersion: spec?.version, settled };
    },
  };
}
