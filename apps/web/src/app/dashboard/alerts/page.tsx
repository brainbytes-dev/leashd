import { redirect } from "next/navigation";
import { getDb, eq, desc, alertRules, type AlertRule } from "@repo/db";
import { getActiveContext } from "@/lib/leash/server";
import { getMemberRole } from "@/lib/leash/api";
import { AlertsClient } from "./alerts-client";

export const dynamic = "force-dynamic";

export default async function AlertsPage() {
  const ctx = await getActiveContext();
  if (!ctx) redirect("/login");

  let rules: AlertRule[] = [];
  let canManage = false;
  if (ctx.workspace) {
    const role = await getMemberRole(ctx.userId, ctx.workspace.id);
    canManage = role === "owner" || role === "admin";
    const db = getDb();
    rules = await db
      .select()
      .from(alertRules)
      .where(eq(alertRules.workspaceId, ctx.workspace.id))
      .orderBy(desc(alertRules.createdAt));
  }

  return (
    <main className="flex flex-col gap-6 p-6">
      <header className="flex flex-col gap-1">
        <h1 className="font-mono text-2xl font-semibold tracking-tight">Alerts</h1>
        <p className="font-sans text-sm text-muted-foreground">
          Get notified when a policy decision matches. Email or webhook, fired
          the moment leashd records the event.
        </p>
      </header>

      {!ctx.workspace ? (
        <p className="font-sans text-sm text-muted-foreground">
          Create a workspace on the Overview page first.
        </p>
      ) : (
        <AlertsClient
          workspaceId={ctx.workspace.id}
          canManage={canManage}
          rules={rules}
        />
      )}
    </main>
  );
}
