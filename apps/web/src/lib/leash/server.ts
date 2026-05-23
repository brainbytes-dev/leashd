import { headers } from "next/headers";
import {
  getDb,
  eq,
  desc,
  workspaces,
  workspaceMembers,
  type Workspace,
} from "@repo/db";
import { auth } from "@/lib/auth";

/**
 * Server-component helper: resolve the signed-in user and their active
 * workspace (most recent). Returns null when unauthenticated so pages can
 * redirect. Workspace selection is single-workspace for MVP; multi-workspace
 * switching is a post-MVP control-plane feature.
 */
export async function getActiveContext(): Promise<{
  userId: string;
  workspace: Workspace | null;
} | null> {
  if (!auth) return null;
  const session = await auth.api.getSession({ headers: await headers() });
  const user = session?.user as { id: string } | undefined;
  if (!user) return null;

  const db = getDb();
  const rows = await db
    .select({ ws: workspaces })
    .from(workspaceMembers)
    .innerJoin(workspaces, eq(workspaceMembers.workspaceId, workspaces.id))
    .where(eq(workspaceMembers.userId, user.id))
    .orderBy(desc(workspaces.createdAt))
    .limit(1);

  return { userId: user.id, workspace: rows[0]?.ws ?? null };
}
