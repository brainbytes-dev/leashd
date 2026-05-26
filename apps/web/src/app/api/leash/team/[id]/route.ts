import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getDb, eq, workspaceMembers } from "@repo/db";
import { err, getSessionUser, canManageTeam } from "@/lib/leash/api";

type Ctx = { params: Promise<{ id: string }> };

async function loadMember(memberId: string) {
  const db = getDb();
  const rows = await db
    .select()
    .from(workspaceMembers)
    .where(eq(workspaceMembers.id, memberId))
    .limit(1);
  return rows[0] ?? null;
}

const PatchBody = z.object({ role: z.enum(["admin", "member"]) });

export async function PATCH(request: NextRequest, ctx: Ctx) {
  const user = await getSessionUser(request.headers);
  if (!user) return err(401, "Unauthorized");

  const { id } = await ctx.params;
  const parsed = PatchBody.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return err(400, "Invalid body");

  const member = await loadMember(id);
  if (!member) return err(404, "Not found");
  if (!(await canManageTeam(user.id, member.workspaceId)))
    return err(403, "Only an owner or admin can change roles");
  if (member.role === "owner") return err(409, "Cannot change the owner's role");

  const db = getDb();
  const [updated] = await db
    .update(workspaceMembers)
    .set({ role: parsed.data.role })
    .where(eq(workspaceMembers.id, id))
    .returning();
  return NextResponse.json({ member: updated });
}

export async function DELETE(request: NextRequest, ctx: Ctx) {
  const user = await getSessionUser(request.headers);
  if (!user) return err(401, "Unauthorized");

  const { id } = await ctx.params;
  const member = await loadMember(id);
  if (!member) return err(404, "Not found");
  if (!(await canManageTeam(user.id, member.workspaceId)))
    return err(403, "Only an owner or admin can remove members");
  if (member.role === "owner") return err(409, "Cannot remove the workspace owner");

  const db = getDb();
  await db.delete(workspaceMembers).where(eq(workspaceMembers.id, id));
  return NextResponse.json({ success: true });
}
