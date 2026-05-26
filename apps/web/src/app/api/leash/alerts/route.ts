import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getDb, eq, desc, alertRules } from "@repo/db";
import {
  err,
  getSessionUser,
  isMember,
  canManageTeam,
} from "@/lib/leash/api";

const DECISIONS = ["allowed", "denied", "capped", "approval_required"] as const;

export async function GET(request: NextRequest) {
  const user = await getSessionUser(request.headers);
  if (!user) return err(401, "Unauthorized");

  const workspaceId = request.nextUrl.searchParams.get("workspaceId");
  if (!workspaceId) return err(400, "workspaceId required");
  if (!(await isMember(user.id, workspaceId))) return err(403, "Forbidden");

  const db = getDb();
  const rows = await db
    .select()
    .from(alertRules)
    .where(eq(alertRules.workspaceId, workspaceId))
    .orderBy(desc(alertRules.createdAt));

  return NextResponse.json({ rules: rows });
}

const CreateBody = z
  .object({
    workspaceId: z.string().uuid(),
    channel: z.enum(["email", "webhook"]),
    destination: z.string().min(1).max(500),
    decisions: z.array(z.enum(DECISIONS)).min(1),
  })
  .refine(
    (b) =>
      b.channel === "email"
        ? z.string().email().safeParse(b.destination).success
        : z.string().url().safeParse(b.destination).success,
    { message: "destination must match the channel (email or URL)" }
  );

export async function POST(request: NextRequest) {
  const user = await getSessionUser(request.headers);
  if (!user) return err(401, "Unauthorized");

  const parsed = CreateBody.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return err(400, parsed.error.issues[0]?.message ?? "Invalid body");
  const { workspaceId, channel, destination, decisions } = parsed.data;
  if (!(await canManageTeam(user.id, workspaceId)))
    return err(403, "Only an owner or admin can manage alerts");

  const db = getDb();
  const [rule] = await db
    .insert(alertRules)
    .values({ workspaceId, channel, destination, decisions })
    .returning();

  return NextResponse.json({ rule }, { status: 201 });
}
