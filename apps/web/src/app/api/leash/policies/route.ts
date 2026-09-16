import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getDb, eq, and, desc, isNull, policies, railBindings } from "@repo/db";
import { PolicySpec } from "@repo/leash-core";
import { err, getSessionUser, isMember } from "@/lib/leash/api";
import { signSpec } from "@/lib/leash/signing";
import { x402CapViolations } from "./x402-caps";

export async function GET(request: NextRequest) {
  const user = await getSessionUser(request.headers);
  if (!user) return err(401, "Unauthorized");

  const workspaceId = request.nextUrl.searchParams.get("workspaceId");
  const agentId = request.nextUrl.searchParams.get("agentId");
  if (!workspaceId) return err(400, "workspaceId required");
  if (!(await isMember(user.id, workspaceId))) return err(403, "Forbidden");

  const db = getDb();
  const where = agentId
    ? and(eq(policies.workspaceId, workspaceId), eq(policies.agentId, agentId))
    : eq(policies.workspaceId, workspaceId);

  const rows = await db
    .select()
    .from(policies)
    .where(where)
    .orderBy(desc(policies.updatedAt));

  return NextResponse.json({ policies: rows });
}

const CreateBody = z.object({
  workspaceId: z.string().uuid(),
  agentId: z.string().uuid().nullable().optional(),
  name: z.string().min(1).max(80),
  spec: PolicySpec,
});

export async function POST(request: NextRequest) {
  const user = await getSessionUser(request.headers);
  if (!user) return err(401, "Unauthorized");

  const parsed = CreateBody.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return err(400, "Invalid policy spec");
  const { workspaceId, name, spec } = parsed.data;
  const agentId = parsed.data.agentId ?? null;
  if (!(await isMember(user.id, workspaceId))) return err(403, "Forbidden");

  const db = getDb();

  // One active policy per (workspace, agent) scope. Bump version on update.
  const scope = agentId
    ? and(eq(policies.workspaceId, workspaceId), eq(policies.agentId, agentId))
    : and(eq(policies.workspaceId, workspaceId), isNull(policies.agentId));
  const existing = await db
    .select()
    .from(policies)
    .where(and(scope, eq(policies.active, true)))
    .orderBy(desc(policies.version))
    .limit(1);

  const prev = existing[0];
  const version = (prev?.version ?? 0) + 1;

  // Persist the version inside the spec too — leashd compares spec.version.
  const finalSpec = { ...spec, version };

  const bindings = await db
    .select({ rail: railBindings.rail, meta: railBindings.meta })
    .from(railBindings)
    .where(eq(railBindings.workspaceId, workspaceId));
  const violations = x402CapViolations(finalSpec, bindings as { rail: string; meta: Record<string, unknown> | null }[]);
  if (violations.length > 0) return err(400, `Policy exceeds the on-chain x402 allowance: ${violations.join("; ")}`);

  const signature = signSpec(finalSpec);

  if (prev) {
    const [updated] = await db
      .update(policies)
      .set({ name, spec: finalSpec, version, signature, updatedAt: new Date() })
      .where(eq(policies.id, prev.id))
      .returning();
    return NextResponse.json({ policy: updated });
  }

  const [created] = await db
    .insert(policies)
    .values({ workspaceId, agentId, name, version, spec: finalSpec, signature })
    .returning();
  return NextResponse.json({ policy: created }, { status: 201 });
}
