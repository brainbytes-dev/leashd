import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getDb, eq, and, desc, users, workspaceMembers } from "@repo/db";
import {
  err,
  getSessionUser,
  isMember,
  canManageTeam,
} from "@/lib/leash/api";

export async function GET(request: NextRequest) {
  const user = await getSessionUser(request.headers);
  if (!user) return err(401, "Unauthorized");

  const workspaceId = request.nextUrl.searchParams.get("workspaceId");
  if (!workspaceId) return err(400, "workspaceId required");
  if (!(await isMember(user.id, workspaceId))) return err(403, "Forbidden");

  const db = getDb();
  const rows = await db
    .select({
      id: workspaceMembers.id,
      userId: workspaceMembers.userId,
      role: workspaceMembers.role,
      email: users.email,
      name: users.name,
      createdAt: workspaceMembers.createdAt,
    })
    .from(workspaceMembers)
    .innerJoin(users, eq(workspaceMembers.userId, users.id))
    .where(eq(workspaceMembers.workspaceId, workspaceId))
    .orderBy(desc(workspaceMembers.createdAt));

  return NextResponse.json({ members: rows });
}

const AddBody = z.object({
  workspaceId: z.string().uuid(),
  email: z.string().email(),
  role: z.enum(["admin", "member"]).default("member"),
});

export async function POST(request: NextRequest) {
  const user = await getSessionUser(request.headers);
  if (!user) return err(401, "Unauthorized");

  const parsed = AddBody.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return err(400, "Invalid body");
  const { workspaceId, email, role } = parsed.data;
  if (!(await canManageTeam(user.id, workspaceId)))
    return err(403, "Only an owner or admin can add members");

  const db = getDb();
  const found = await db
    .select({ id: users.id })
    .from(users)
    .where(eq(users.email, email.toLowerCase()))
    .limit(1);
  const target = found[0];
  if (!target)
    return err(404, "No leashd account with that email. They must sign up first.");

  const existing = await db
    .select({ id: workspaceMembers.id })
    .from(workspaceMembers)
    .where(
      and(
        eq(workspaceMembers.workspaceId, workspaceId),
        eq(workspaceMembers.userId, target.id)
      )
    )
    .limit(1);
  if (existing[0]) return err(409, "Already a member");

  const [member] = await db
    .insert(workspaceMembers)
    .values({ workspaceId, userId: target.id, role })
    .returning();

  return NextResponse.json({ member }, { status: 201 });
}
