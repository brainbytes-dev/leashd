"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { UserPlus, Trash2, Check, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

export type Member = {
  id: string;
  userId: string;
  role: string;
  email: string;
  name: string | null;
};

export function TeamClient({
  workspaceId,
  currentUserId,
  canManage,
  members,
}: {
  workspaceId: string;
  currentUserId: string;
  canManage: boolean;
  members: Member[];
}) {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [role, setRole] = useState<"admin" | "member">("member");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  async function add() {
    if (busy || !email.trim()) return;
    setBusy(true);
    setError(null);
    const res = await fetch("/api/leash/team", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ workspaceId, email: email.trim(), role }),
    });
    setBusy(false);
    if (!res.ok) {
      const data = (await res.json().catch(() => null)) as { error?: string } | null;
      setError(data?.error ?? "Could not add member.");
      return;
    }
    setEmail("");
    router.refresh();
  }

  async function changeRole(id: string, next: "admin" | "member") {
    const res = await fetch(`/api/leash/team/${id}`, {
      method: "PATCH",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ role: next }),
    });
    if (res.ok) router.refresh();
  }

  async function remove(id: string) {
    const res = await fetch(`/api/leash/team/${id}`, { method: "DELETE" });
    if (res.ok) {
      setDeletingId(null);
      router.refresh();
    }
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="rounded-lg border border-border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="font-sans">Member</TableHead>
              <TableHead className="font-sans">Role</TableHead>
              {canManage && (
                <TableHead className="text-right font-sans">Actions</TableHead>
              )}
            </TableRow>
          </TableHeader>
          <TableBody>
            {members.map((m) => {
              const isOwner = m.role === "owner";
              const isSelf = m.userId === currentUserId;
              return (
                <TableRow key={m.id}>
                  <TableCell>
                    <div className="font-mono text-sm">
                      {m.email}
                      {isSelf && (
                        <span className="ml-2 font-sans text-xs text-muted-foreground">
                          (you)
                        </span>
                      )}
                    </div>
                    {m.name && (
                      <div className="font-sans text-xs text-muted-foreground">
                        {m.name}
                      </div>
                    )}
                  </TableCell>
                  <TableCell>
                    {canManage && !isOwner ? (
                      <Select
                        value={m.role === "admin" ? "admin" : "member"}
                        onValueChange={(v) => changeRole(m.id, v as "admin" | "member")}
                      >
                        <SelectTrigger className="h-8 w-32 font-mono text-xs">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="member">member</SelectItem>
                          <SelectItem value="admin">admin</SelectItem>
                        </SelectContent>
                      </Select>
                    ) : (
                      <span className="inline-flex items-center rounded-full border border-border bg-secondary/40 px-2 py-0.5 font-mono text-xs text-muted-foreground">
                        {m.role}
                      </span>
                    )}
                  </TableCell>
                  {canManage && (
                    <TableCell className="text-right">
                      {isOwner ? (
                        <span className="font-sans text-xs text-muted-foreground">
                          owner
                        </span>
                      ) : deletingId === m.id ? (
                        <div className="inline-flex items-center gap-2">
                          <span className="font-sans text-xs text-muted-foreground">
                            Remove?
                          </span>
                          <Button
                            size="icon-sm"
                            variant="secondary"
                            aria-label="Confirm remove member"
                            className="cursor-pointer"
                            onClick={() => remove(m.id)}
                          >
                            <Check className="size-4 text-deny" aria-hidden />
                          </Button>
                          <Button
                            size="icon-sm"
                            variant="secondary"
                            aria-label="Cancel"
                            className="cursor-pointer"
                            onClick={() => setDeletingId(null)}
                          >
                            <X className="size-4" aria-hidden />
                          </Button>
                        </div>
                      ) : (
                        <Button
                          size="icon-sm"
                          variant="secondary"
                          aria-label="Remove member"
                          className="cursor-pointer"
                          onClick={() => setDeletingId(m.id)}
                        >
                          <Trash2 className="size-4 text-deny" aria-hidden />
                        </Button>
                      )}
                    </TableCell>
                  )}
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </div>

      {canManage && (
        <div className="flex flex-wrap items-end gap-4 rounded-lg border border-border p-4">
          <div className="flex flex-col gap-2">
            <Label htmlFor="team-email">Add member by email</Label>
            <Input
              id="team-email"
              type="email"
              className="w-64 font-mono"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="dev@example.com"
            />
          </div>
          <div className="flex flex-col gap-2">
            <Label htmlFor="team-role">Role</Label>
            <Select value={role} onValueChange={(v) => setRole(v as "admin" | "member")}>
              <SelectTrigger id="team-role" className="w-32">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="member">member</SelectItem>
                <SelectItem value="admin">admin</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <Button className="cursor-pointer" disabled={busy || !email.trim()} onClick={add}>
            <UserPlus className="size-4" aria-hidden />
            {busy ? "Adding…" : "Add member"}
          </Button>
          {error && <span className="font-mono text-sm text-deny">{error}</span>}
        </div>
      )}
      <p className="font-sans text-xs text-muted-foreground">
        Members must already have a leashd account. They sign in and the
        workspace appears for them. A full email-invite flow is on the roadmap.
      </p>
    </div>
  );
}
