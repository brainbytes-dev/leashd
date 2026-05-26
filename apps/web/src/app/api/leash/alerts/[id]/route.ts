import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getDb, eq, alertRules } from "@repo/db";
import { err, getSessionUser, canManageTeam } from "@/lib/leash/api";

type Ctx = { params: Promise<{ id: string }> };

async function loadRule(id: string) {
  const db = getDb();
  const rows = await db
    .select()
    .from(alertRules)
    .where(eq(alertRules.id, id))
    .limit(1);
  return rows[0] ?? null;
}

const PatchBody = z.object({ enabled: z.boolean() });

export async function PATCH(request: NextRequest, ctx: Ctx) {
  const user = await getSessionUser(request.headers);
  if (!user) return err(401, "Unauthorized");

  const { id } = await ctx.params;
  const parsed = PatchBody.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return err(400, "Invalid body");

  const rule = await loadRule(id);
  if (!rule) return err(404, "Not found");
  if (!(await canManageTeam(user.id, rule.workspaceId)))
    return err(403, "Forbidden");

  const db = getDb();
  const [updated] = await db
    .update(alertRules)
    .set({ enabled: parsed.data.enabled })
    .where(eq(alertRules.id, id))
    .returning();
  return NextResponse.json({ rule: updated });
}

export async function DELETE(request: NextRequest, ctx: Ctx) {
  const user = await getSessionUser(request.headers);
  if (!user) return err(401, "Unauthorized");

  const { id } = await ctx.params;
  const rule = await loadRule(id);
  if (!rule) return err(404, "Not found");
  if (!(await canManageTeam(user.id, rule.workspaceId)))
    return err(403, "Forbidden");

  const db = getDb();
  await db.delete(alertRules).where(eq(alertRules.id, id));
  return NextResponse.json({ success: true });
}
