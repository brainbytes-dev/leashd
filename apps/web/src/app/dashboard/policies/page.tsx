import { redirect } from "next/navigation";
import { getDb, eq, desc, agents, policies, type Policy } from "@repo/db";
import { getActiveContext } from "@/lib/leash/server";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { PolicyEditor } from "./policy-editor";

export const dynamic = "force-dynamic";

export default async function PoliciesPage() {
  const ctx = await getActiveContext();
  if (!ctx) redirect("/login");

  let agentOptions: { id: string; name: string }[] = [];
  let existing: Policy[] = [];
  if (ctx.workspace) {
    const db = getDb();
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
        <>
          {existing.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="font-mono text-base">
                  Active policies
                </CardTitle>
              </CardHeader>
              <CardContent className="flex flex-col gap-2">
                {existing.map((p) => (
                  <div
                    key={p.id}
                    className="flex items-center justify-between border-b border-border py-2 last:border-0"
                  >
                    <span className="font-mono text-sm">{p.name}</span>
                    <span className="flex items-center gap-3 font-mono text-xs text-muted-foreground">
                      <span>{p.agentId ? "agent" : "workspace"}</span>
                      <span>v{p.version}</span>
                      <span className={p.signature ? "text-allow" : "text-capped"}>
                        {p.signature ? "signed" : "unsigned"}
                      </span>
                    </span>
                  </div>
                ))}
              </CardContent>
            </Card>
          )}
          <PolicyEditor workspaceId={ctx.workspace.id} agents={agentOptions} />
        </>
      ) : (
        <p className="font-sans text-sm text-muted-foreground">
          Create a workspace first.
        </p>
      )}
    </main>
  );
}
