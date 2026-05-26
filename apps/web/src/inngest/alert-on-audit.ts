import { inngest } from "@/lib/inngest";
import { getDb, eq, alertRules } from "@repo/db";
import { sendAlertEmail, type AlertPayload } from "@/lib/email";

interface AuditRecorded {
  workspaceId: string;
  decision: string;
  agentName?: string | null;
  rail?: string | null;
  endpoint?: string | null;
  amount?: string | null;
  reason?: string | null;
  occurredAt: string;
}

/**
 * Fan out an alert when a noteworthy policy decision is recorded. Matches the
 * workspace's enabled alert rules against the decision and delivers over each
 * configured channel (email via Resend, or a webhook POST). Inngest retries.
 */
export const alertOnAuditFn = inngest.createFunction(
  { id: "alert-on-audit", retries: 3 },
  { event: "leash/audit.recorded" },
  async ({ event, step }) => {
    const data = event.data as AuditRecorded;
    const db = getDb();

    const rules = await db
      .select()
      .from(alertRules)
      .where(eq(alertRules.workspaceId, data.workspaceId));

    const matching = rules.filter(
      (r) =>
        r.enabled &&
        Array.isArray(r.decisions) &&
        (r.decisions as string[]).includes(data.decision)
    );
    if (matching.length === 0) return { sent: 0 };

    const payload: AlertPayload = {
      decision: data.decision,
      agentName: data.agentName,
      rail: data.rail,
      endpoint: data.endpoint,
      amount: data.amount,
      reason: data.reason,
      occurredAt: data.occurredAt,
    };

    let sent = 0;
    for (const rule of matching) {
      if (rule.channel === "email") {
        await step.run(`email-${rule.id}`, () =>
          sendAlertEmail(rule.destination, payload)
        );
        sent++;
      } else if (rule.channel === "webhook") {
        await step.run(`webhook-${rule.id}`, async () => {
          const res = await fetch(rule.destination, {
            method: "POST",
            headers: { "content-type": "application/json" },
            body: JSON.stringify({ type: "leash.alert", ...payload }),
          });
          if (!res.ok) throw new Error(`webhook returned ${res.status}`);
          return { ok: true };
        });
        sent++;
      }
    }
    return { sent };
  }
);
