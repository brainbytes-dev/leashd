import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getDb, eq, agents } from "@repo/db";
import { err, getSessionUser, isMember } from "@/lib/leash/api";

type Ctx = { params: Promise<{ id: string }> };

const PatchBody = z.object({
  status: z.enum(["active", "paused", "revoked"]),
});

async function loadAgentForUser(agentId: string, userId: string) {
  const db = getDb();
  const rows = await db
    .select({ id: agents.id, workspaceId: agents.workspaceId })
    .from(agents)
    .where(eq(agents.id, agentId))
    .limit(1);
  const agent = rows[0];
  if (!agent) return { error: err(404, "Not found"), agent: null };
  if (!(await isMember(userId, agent.workspaceId)))
    return { error: err(403, "Forbidden"), agent: null };
  return { agent, error: null };
}

export async function PATCH(request: NextRequest, ctx: Ctx) {
  const user = await getSessionUser(request.headers);
  if (!user) return err(401, "Unauthorized");

  const { id } = await ctx.params;
  const parsed = PatchBody.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return err(400, "Invalid body");

  const found = await loadAgentForUser(id, user.id);
  if (found.error) return found.error;

  const db = getDb();
  const [updated] = await db
    .update(agents)
    .set({ status: parsed.data.status, updatedAt: new Date() })
    .where(eq(agents.id, id))
    .returning({
      id: agents.id,
      name: agents.name,
      label: agents.label,
      status: agents.status,
    });

  return NextResponse.json({ agent: updated });
}

export async function DELETE(request: NextRequest, ctx: Ctx) {
  const user = await getSessionUser(request.headers);
  if (!user) return err(401, "Unauthorized");

  const { id } = await ctx.params;
  const found = await loadAgentForUser(id, user.id);
  if (found.error) return found.error;

  const db = getDb();
  await db.delete(agents).where(eq(agents.id, id));
  return NextResponse.json({ success: true });
}
