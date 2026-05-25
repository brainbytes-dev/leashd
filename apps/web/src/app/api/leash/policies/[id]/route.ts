import { NextRequest, NextResponse } from "next/server";
import { getDb, eq, policies } from "@repo/db";
import { err, getSessionUser, isMember } from "@/lib/leash/api";

type Ctx = { params: Promise<{ id: string }> };

async function loadPolicyForUser(policyId: string, userId: string) {
  const db = getDb();
  const rows = await db
    .select({ id: policies.id, workspaceId: policies.workspaceId })
    .from(policies)
    .where(eq(policies.id, policyId))
    .limit(1);
  const policy = rows[0];
  if (!policy) return { error: err(404, "Not found"), policy: null };
  if (!(await isMember(userId, policy.workspaceId)))
    return { error: err(403, "Forbidden"), policy: null };
  return { policy, error: null };
}

export async function DELETE(request: NextRequest, ctx: Ctx) {
  const user = await getSessionUser(request.headers);
  if (!user) return err(401, "Unauthorized");

  const { id } = await ctx.params;
  const found = await loadPolicyForUser(id, user.id);
  if (found.error) return found.error;

  const db = getDb();
  await db.delete(policies).where(eq(policies.id, id));
  return NextResponse.json({ success: true });
}
