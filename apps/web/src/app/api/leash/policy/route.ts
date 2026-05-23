import { NextRequest, NextResponse } from "next/server";
import { getDb, eq, and, desc, isNull, policies } from "@repo/db";
import { err, authAgent } from "@/lib/leash/api";

/**
 * leashd pulls its signed policy here, authenticating with the agent's bearer
 * token (NOT a session). Resolution: agent-scoped active policy first, else the
 * workspace-default policy. Returns the spec, version, and signature so leashd
 * can verify against the control-plane public key before applying.
 */
export async function GET(request: NextRequest) {
  const agent = await authAgent(request.headers);
  if (!agent) return err(401, "Unauthorized");

  // The query param must match the authenticated agent — leashd sends its own id.
  const agentId = request.nextUrl.searchParams.get("agentId");
  if (agentId && agentId !== agent.id) return err(403, "Forbidden");

  const db = getDb();
  const pick = async (scope: ReturnType<typeof and>) =>
    (
      await db
        .select()
        .from(policies)
        .where(and(scope, eq(policies.active, true)))
        .orderBy(desc(policies.version))
        .limit(1)
    )[0];

  const policy =
    (await pick(
      and(
        eq(policies.workspaceId, agent.workspaceId),
        eq(policies.agentId, agent.id)
      )
    )) ??
    (await pick(
      and(
        eq(policies.workspaceId, agent.workspaceId),
        isNull(policies.agentId)
      )
    ));

  if (!policy) return err(404, "No policy assigned");

  return NextResponse.json({
    spec: policy.spec,
    version: policy.version,
    signature: policy.signature,
  });
}
