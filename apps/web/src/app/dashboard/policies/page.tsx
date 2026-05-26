import { redirect } from "next/navigation";
import { getDb, eq, desc, agents, policies, users, type Policy } from "@repo/db";
import { getActiveContext } from "@/lib/leash/server";
import { PolicyEditor, type ExistingPolicy } from "./policy-editor";

export const dynamic = "force-dynamic";

export default async function PoliciesPage() {
  const ctx = await getActiveContext();
  if (!ctx) redirect("/login");

  let agentOptions: { id: string; name: string }[] = [];
  let existing: Policy[] = [];
  let defaultTimezone = "UTC";
  if (ctx.workspace) {
    const db = getDb();
    const [me] = await db
      .select({ timezone: users.timezone })
      .from(users)
      .where(eq(users.id, ctx.userId))
      .limit(1);
    defaultTimezone = me?.timezone || "UTC";
    agentOptions = await db
      .select({ id: agents.id, name: agents.name })
      .from(agents)
      .where(eq(agents.workspaceId, ctx.workspace.id))
      .orderBy(desc(agents.createdAt));
    existing = await db
      .select()
      .from(policies)
      .where(eq(policies.workspaceId, ctx.workspace.id))
      .orderBy(desc(policies.updatedAt));
  }

  return (
    <main className="flex flex-col gap-6 p-6">
      <header className="flex flex-col gap-1">
        <h1 className="font-mono text-2xl font-semibold tracking-tight">Policies</h1>
        <p className="font-sans text-sm text-muted-foreground">
          Author a signed spend policy. leashd pulls and verifies it before
          enforcing locally.
        </p>
      </header>

      {ctx.workspace ? (
        <PolicyEditor
          workspaceId={ctx.workspace.id}
          agents={agentOptions}
          defaultTimezone={defaultTimezone}
          existing={existing.map(
            (p): ExistingPolicy => ({
              id: p.id,
              name: p.name,
              agentId: p.agentId,
              version: p.version,
              signed: Boolean(p.signature),
              spec: p.spec,
            })
          )}
        />
      ) : (
        <p className="font-sans text-sm text-muted-foreground">
          Create a workspace on the Overview page first.
        </p>
      )}
    </main>
  );
}
