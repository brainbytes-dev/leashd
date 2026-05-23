import { redirect } from "next/navigation";
import { getDb, eq, desc, railBindings } from "@repo/db";
import { getActiveContext } from "@/lib/leash/server";
import { NavLeash } from "../nav-leash";
import { RailsClient, type RailRow } from "./rails-client";

export const dynamic = "force-dynamic";

export default async function RailsPage() {
  const ctx = await getActiveContext();
  if (!ctx) redirect("/login");

  let rows: RailRow[] = [];
  if (ctx.workspace) {
    const db = getDb();
    const data = await db
      .select({
        id: railBindings.id,
        rail: railBindings.rail,
        label: railBindings.label,
        status: railBindings.status,
        meta: railBindings.meta,
      })
      .from(railBindings)
      .where(eq(railBindings.workspaceId, ctx.workspace.id))
      .orderBy(desc(railBindings.createdAt));
    rows = data.map((r) => ({
      ...r,
      meta: (r.meta as Record<string, unknown> | null) ?? null,
    }));
  }

  return (
    <main className="flex flex-col gap-6 p-6">
      <header className="flex flex-col gap-1">
        <h1 className="font-mono text-2xl font-semibold tracking-tight">Rails</h1>
        <p className="font-sans text-sm text-muted-foreground">
          Connected payment rails. Multi-rail, BTC-first.
        </p>
      </header>
      <NavLeash />
      {ctx.workspace ? (
        <RailsClient workspaceId={ctx.workspace.id} rails={rows} />
      ) : (
        <p className="font-sans text-sm text-muted-foreground">
          Create a workspace first.
        </p>
      )}
    </main>
  );
}
