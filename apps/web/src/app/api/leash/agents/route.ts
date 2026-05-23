import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getDb, eq, desc, agents } from "@repo/db";
import {
  err,
  getSessionUser,
  isMember,
  hashToken,
  generateAgentToken,
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
      id: agents.id,
      name: agents.name,
      label: agents.label,
      status: agents.status,
      createdAt: agents.createdAt,
    })
    .from(agents)
    .where(eq(agents.workspaceId, workspaceId))
    .orderBy(desc(agents.createdAt));

  return NextResponse.json({ agents: rows });
}

const CreateBody = z.object({
  workspaceId: z.string().uuid(),
  name: z.string().min(1).max(80),
  label: z.string().max(160).optional(),
});

export async function POST(request: NextRequest) {
  const user = await getSessionUser(request.headers);
  if (!user) return err(401, "Unauthorized");

  const parsed = CreateBody.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return err(400, "Invalid body");
  if (!(await isMember(user.id, parsed.data.workspaceId)))
    return err(403, "Forbidden");

  // Store only the hash; the plaintext token is returned exactly once.
  const token = generateAgentToken();
  const db = getDb();
  const [agent] = await db
    .insert(agents)
    .values({
      workspaceId: parsed.data.workspaceId,
      name: parsed.data.name,
      label: parsed.data.label ?? null,
      tokenHash: hashToken(token),
    })
    .returning({
      id: agents.id,
      name: agents.name,
      label: agents.label,
      status: agents.status,
      createdAt: agents.createdAt,
    });

  return NextResponse.json({ agent, token }, { status: 201 });
}
