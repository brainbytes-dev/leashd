import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getDb, eq, desc, railBindings } from "@repo/db";
import { Rail } from "@repo/leash-core";
import { err, getSessionUser, isMember } from "@/lib/leash/api";

export async function GET(request: NextRequest) {
  const user = await getSessionUser(request.headers);
  if (!user) return err(401, "Unauthorized");

  const workspaceId = request.nextUrl.searchParams.get("workspaceId");
  if (!workspaceId) return err(400, "workspaceId required");
  if (!(await isMember(user.id, workspaceId))) return err(403, "Forbidden");

  const db = getDb();
  const rows = await db
    .select()
    .from(railBindings)
    .where(eq(railBindings.workspaceId, workspaceId))
    .orderBy(desc(railBindings.createdAt));

  return NextResponse.json({ rails: rows });
}

// Metadata only — NEVER accept secrets (NWC strings, macaroons, keys live in leashd).
const CreateBody = z.object({
  workspaceId: z.string().uuid(),
  rail: Rail,
  label: z.string().min(1).max(80),
  meta: z.record(z.string(), z.string()).optional(),
});

export async function POST(request: NextRequest) {
  const user = await getSessionUser(request.headers);
  if (!user) return err(401, "Unauthorized");

  const parsed = CreateBody.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return err(400, "Invalid body");
  if (!(await isMember(user.id, parsed.data.workspaceId)))
    return err(403, "Forbidden");

  const db = getDb();
  const [binding] = await db
    .insert(railBindings)
    .values({
      workspaceId: parsed.data.workspaceId,
      rail: parsed.data.rail,
      label: parsed.data.label,
      meta: parsed.data.meta ?? null,
    })
    .returning();

  return NextResponse.json({ rail: binding }, { status: 201 });
}
