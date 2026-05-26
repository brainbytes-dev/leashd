import { redirect } from "next/navigation";
import { getDb, eq, desc, users, workspaceMembers } from "@repo/db";
import { getActiveContext } from "@/lib/leash/server";
import { getMemberRole } from "@/lib/leash/api";
import { TeamClient, type Member } from "./team-client";

export const dynamic = "force-dynamic";

export default async function TeamPage() {
  const ctx = await getActiveContext();
  if (!ctx) redirect("/login");

  let members: Member[] = [];
  let canManage = false;
  if (ctx.workspace) {
    const role = await getMemberRole(ctx.userId, ctx.workspace.id);
    canManage = role === "owner" || role === "admin";
    const db = getDb();
    members = await db
      .select({
        id: workspaceMembers.id,
        userId: workspaceMembers.userId,
        role: workspaceMembers.role,
        email: users.email,
        name: users.name,
      })
      .from(workspaceMembers)
      .innerJoin(users, eq(workspaceMembers.userId, users.id))
      .where(eq(workspaceMembers.workspaceId, ctx.workspace.id))
      .orderBy(desc(workspaceMembers.createdAt));
  }

  return (
    <main className="flex flex-col gap-6 p-6">
      <header className="flex flex-col gap-1">
        <h1 className="font-mono text-2xl font-semibold tracking-tight">Team</h1>
        <p className="font-sans text-sm text-muted-foreground">
          Members share this workspace&apos;s policies and audit. Roles control
          who can change them.
        </p>
      </header>

      {!ctx.workspace ? (
        <p className="font-sans text-sm text-muted-foreground">
          Create a workspace first.
        </p>
      ) : (
        <TeamClient
          workspaceId={ctx.workspace.id}
          currentUserId={ctx.userId}
          canManage={canManage}
          members={members}
        />
      )}
    </main>
  );
}
