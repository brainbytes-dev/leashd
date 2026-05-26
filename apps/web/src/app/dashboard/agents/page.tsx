import Link from "next/link";
import { redirect } from "next/navigation";
import { getDb, eq, desc, agents } from "@repo/db";
import { getActiveContext } from "@/lib/leash/server";
import { AgentsClient, type AgentRow } from "./agents-client";

export const dynamic = "force-dynamic";

export default async function AgentsPage() {
  const ctx = await getActiveContext();
  if (!ctx) redirect("/login");

  let rows: AgentRow[] = [];
  if (ctx.workspace) {
    const db = getDb();
    rows = await db
      .select({
        id: agents.id,
        name: agents.name,
        label: agents.label,
        status: agents.status,
        createdAt: agents.createdAt,
      })
      .from(agents)
      .where(eq(agents.workspaceId, ctx.workspace.id))
      .orderBy(desc(agents.createdAt));
  }

  return (
    <main className="flex flex-col gap-6 p-6">
      <header className="flex flex-col gap-1">
        <h1 className="font-mono text-2xl font-semibold tracking-tight">
          Agents
        </h1>
        <p className="font-sans text-sm text-muted-foreground">
          {ctx.workspace
            ? `Workspace ${ctx.workspace.name}`
            : "No workspace yet — create one first."}
        </p>
      </header>
      {ctx.workspace ? (
        <AgentsClient workspaceId={ctx.workspace.id} agents={rows} />
      ) : (
        <EmptyWorkspace />
      )}
    </main>
  );
}

function EmptyWorkspace() {
  return (
    <p className="font-sans text-sm text-muted-foreground">
      Create a workspace on the{" "}
      <Link
        href="/dashboard"
        className="rounded text-primary underline-offset-2 outline-none hover:underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
      >
        Overview
      </Link>{" "}
      to begin.
    </p>
  );
}
