import { createHash, randomBytes } from "node:crypto";
import { NextResponse } from "next/server";
import {
  getDb,
  eq,
  and,
  agents,
  workspaceMembers,
  type Agent,
} from "@repo/db";
import type { Amount } from "@repo/leash-core";
import { auth } from "@/lib/auth";

/** Standard JSON error. */
export function err(status: number, message: string) {
  return NextResponse.json({ error: message }, { status });
}

/** Resolve the Better-Auth session user, or null. Session-protected routes 401 on null. */
export async function getSessionUser(
  headers: Headers
): Promise<{ id: string } | null> {
  if (!auth) return null;
  const session = await auth.api.getSession({ headers });
  const user = session?.user as { id: string } | undefined;
  return user ? { id: user.id } : null;
}

/** True if the user belongs to the workspace. Scopes every session query. */
export async function isMember(
  userId: string,
  workspaceId: string
): Promise<boolean> {
  const db = getDb();
  const rows = await db
    .select({ id: workspaceMembers.id })
    .from(workspaceMembers)
    .where(
      and(
        eq(workspaceMembers.userId, userId),
        eq(workspaceMembers.workspaceId, workspaceId)
      )
    )
    .limit(1);
  return rows.length > 0;
}

/** The acting user's role in a workspace, or null if not a member. */
export async function getMemberRole(
  userId: string,
  workspaceId: string
): Promise<string | null> {
  const db = getDb();
  const rows = await db
    .select({ role: workspaceMembers.role })
    .from(workspaceMembers)
    .where(
      and(
        eq(workspaceMembers.userId, userId),
        eq(workspaceMembers.workspaceId, workspaceId)
      )
    )
    .limit(1);
  return rows[0]?.role ?? null;
}

/** Member management requires owner or admin. */
export async function canManageTeam(
  userId: string,
  workspaceId: string
): Promise<boolean> {
  const role = await getMemberRole(userId, workspaceId);
  return role === "owner" || role === "admin";
}

/** SHA-256 hex of an enrollment token — only the hash is ever stored. */
export function hashToken(token: string): string {
  return createHash("sha256").update(token).digest("hex");
}

/** Generate a one-time agent enrollment token (returned to the user once). */
export function generateAgentToken(): string {
  return `leash_agent_${randomBytes(24).toString("base64url")}`;
}

/**
 * Authenticate a leashd request via `Authorization: Bearer <agent-token>`.
 * Fail-closed: any missing/invalid token or non-active agent → null.
 */
export async function authAgent(headers: Headers): Promise<Agent | null> {
  const header = headers.get("authorization") ?? "";
  const match = /^Bearer\s+(.+)$/i.exec(header.trim());
  if (!match) return null;

  const db = getDb();
  const rows = await db
    .select()
    .from(agents)
    .where(eq(agents.tokenHash, hashToken(match[1])))
    .limit(1);

  const agent = rows[0];
  if (!agent || agent.status !== "active") return null;
  return agent;
}

/** Map a leash-core Amount onto the audit_events columns. */
export function amountToAuditColumns(amount: Amount | undefined): {
  amountMsat: number | null;
  amountMinor: number | null;
  currency: string | null;
} {
  if (!amount) return { amountMsat: null, amountMinor: null, currency: null };
  if (amount.unit === "sat") {
    return { amountMsat: amount.value, amountMinor: null, currency: "sat" };
  }
  return { amountMsat: null, amountMinor: amount.value, currency: "usd_cent" };
}

/** Reverse mapping for the dashboard audit feed. */
export function auditColumnsToAmount(row: {
  amountMsat: number | null;
  amountMinor: number | null;
  currency: string | null;
}): Amount | null {
  if (row.amountMsat != null)
    return { unit: "sat", value: row.amountMsat };
  if (row.amountMinor != null)
    return { unit: "usd_cent", value: row.amountMinor };
  return null;
}

/** Slugify a workspace name. */
export function slugify(name: string): string {
  return (
    name
      .toLowerCase()
      .trim()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "")
      .slice(0, 48) || "workspace"
  );
}
