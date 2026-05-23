import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import {
  getDb,
  eq,
  desc,
  workspaces,
  workspaceMembers,
} from "@repo/db";
import { err, getSessionUser, slugify } from "@/lib/leash/api";

export async function GET(request: NextRequest) {
  const user = await getSessionUser(request.headers);
  if (!user) return err(401, "Unauthorized");

  const db = getDb();
  const rows = await db
    .select({
      id: workspaces.id,
      name: workspaces.name,
      slug: workspaces.slug,
      plan: workspaces.plan,
      role: workspaceMembers.role,
      createdAt: workspaces.createdAt,
    })
    .from(workspaceMembers)
    .innerJoin(workspaces, eq(workspaceMembers.workspaceId, workspaces.id))
    .where(eq(workspaceMembers.userId, user.id))
    .orderBy(desc(workspaces.createdAt));

  return NextResponse.json({ workspaces: rows });
}

const CreateBody = z.object({ name: z.string().min(1).max(80) });

export async function POST(request: NextRequest) {
  const user = await getSessionUser(request.headers);
  if (!user) return err(401, "Unauthorized");

  const parsed = CreateBody.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return err(400, "Invalid body");

  const db = getDb();
  // Unique slug: append a short suffix on collision rather than failing the user.
  const base = slugify(parsed.data.name);
  let slug = base;
  for (let i = 0; i < 5; i++) {
    const clash = await db
      .select({ id: workspaces.id })
      .from(workspaces)
      .where(eq(workspaces.slug, slug))
      .limit(1);
    if (clash.length === 0) break;
    slug = `${base}-${Math.random().toString(36).slice(2, 6)}`;
  }

  const [ws] = await db
    .insert(workspaces)
    .values({ ownerId: user.id, name: parsed.data.name, slug })
    .returning();

  await db
    .insert(workspaceMembers)
    .values({ workspaceId: ws.id, userId: user.id, role: "owner" });

  return NextResponse.json({ workspace: ws }, { status: 201 });
}
