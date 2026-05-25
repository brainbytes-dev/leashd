import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getDb, eq, railBindings } from "@repo/db";
import { err, getSessionUser, isMember } from "@/lib/leash/api";

type Ctx = { params: Promise<{ id: string }> };

// Metadata only — NEVER accept secrets (they live in leashd, not here).
const PatchBody = z
  .object({
    label: z.string().min(1).max(80).optional(),
    status: z.enum(["connected", "disabled"]).optional(),
  })
  .refine((b) => b.label !== undefined || b.status !== undefined, {
    message: "nothing to update",
  });

async function loadRailForUser(railId: string, userId: string) {
  const db = getDb();
  const rows = await db
    .select({ id: railBindings.id, workspaceId: railBindings.workspaceId })
    .from(railBindings)
    .where(eq(railBindings.id, railId))
    .limit(1);
  const rail = rows[0];
  if (!rail) return { error: err(404, "Not found"), rail: null };
  if (!(await isMember(userId, rail.workspaceId)))
    return { error: err(403, "Forbidden"), rail: null };
  return { rail, error: null };
}

export async function PATCH(request: NextRequest, ctx: Ctx) {
  const user = await getSessionUser(request.headers);
  if (!user) return err(401, "Unauthorized");

  const { id } = await ctx.params;
  const parsed = PatchBody.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return err(400, "Invalid body");

  const found = await loadRailForUser(id, user.id);
  if (found.error) return found.error;

  const db = getDb();
  const [updated] = await db
    .update(railBindings)
    .set({ ...parsed.data, updatedAt: new Date() })
    .where(eq(railBindings.id, id))
    .returning();

  return NextResponse.json({ rail: updated });
}

export async function DELETE(request: NextRequest, ctx: Ctx) {
  const user = await getSessionUser(request.headers);
  if (!user) return err(401, "Unauthorized");

  const { id } = await ctx.params;
  const found = await loadRailForUser(id, user.id);
  if (found.error) return found.error;

  const db = getDb();
  await db.delete(railBindings).where(eq(railBindings.id, id));
  return NextResponse.json({ success: true });
}
