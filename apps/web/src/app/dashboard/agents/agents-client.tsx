"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Plus, Copy, Check, Pause, Play, Ban } from "lucide-react";
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
  Sheet,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { AgentStatusPill } from "./status-pill";

export type AgentRow = {
  id: string;
  name: string;
  label: string | null;
  status: string;
  createdAt: string | Date;
};

export function AgentsClient({
  workspaceId,
  agents,
}: {
  workspaceId: string;
  agents: AgentRow[];
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [label, setLabel] = useState("");
  const [busy, setBusy] = useState(false);
  const [token, setToken] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function create() {
    if (busy || !name.trim()) return;
    setBusy(true);
    setError(null);
    const res = await fetch("/api/leash/agents", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ workspaceId, name, label: label || undefined }),
    });
    setBusy(false);
    if (!res.ok) {
      setError("Could not create agent.");
      return;
    }
    const data = (await res.json()) as { token: string };
    setToken(data.token);
    router.refresh();
  }

  async function setStatus(id: string, status: "active" | "paused" | "revoked") {
    const res = await fetch(`/api/leash/agents/${id}`, {
      method: "PATCH",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ status }),
    });
    if (res.ok) router.refresh();
  }

  function reset() {
    setName("");
    setLabel("");
    setToken(null);
    setCopied(false);
    setError(null);
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <p className="font-sans text-sm text-muted-foreground">
          Governed agent identities. Each agent enrolls leashd with a one-time
          token.
        </p>
        <Sheet
          open={open}
          onOpenChange={(o) => {
            setOpen(o);
            if (!o) reset();
          }}
        >
          <SheetTrigger asChild>
            <Button className="cursor-pointer">
              <Plus className="size-4" aria-hidden />
              New agent
            </Button>
          </SheetTrigger>
          <SheetContent className="font-sans">
            <SheetHeader>
              <SheetTitle className="font-mono">New agent</SheetTitle>
              <SheetDescription>
                {token
                  ? "Copy this enrollment token now — it is shown only once."
                  : "Create a governed agent. We store only a hash of its token."}
              </SheetDescription>
            </SheetHeader>

            {token ? (
              <div className="flex flex-col gap-3 px-4">
                <div className="flex items-center gap-2 rounded-md border border-allow/40 bg-secondary/40 p-3">
                  <code className="flex-1 break-all font-mono text-xs text-allow">
                    {token}
                  </code>
                  <Button
                    type="button"
                    size="icon-sm"
                    variant="secondary"
                    aria-label="Copy token"
                    className="cursor-pointer"
                    onClick={() => {
                      void navigator.clipboard.writeText(token);
                      setCopied(true);
                    }}
                  >
                    {copied ? (
                      <Check className="size-4 text-allow" aria-hidden />
                    ) : (
                      <Copy className="size-4" aria-hidden />
                    )}
                  </Button>
                </div>
                <p className="font-mono text-xs text-capped">
                  leashd auth: Authorization: Bearer &lt;token&gt;
                </p>
              </div>
            ) : (
              <div className="flex flex-col gap-4 px-4">
                <div className="flex flex-col gap-2">
                  <Label htmlFor="agent-name">Name</Label>
                  <Input
                    id="agent-name"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="research-swarm-01"
                    className="font-mono"
                  />
                </div>
                <div className="flex flex-col gap-2">
                  <Label htmlFor="agent-label">Label (optional)</Label>
                  <Input
                    id="agent-label"
                    value={label}
                    onChange={(e) => setLabel(e.target.value)}
                    placeholder="Claude Code orchestrator"
                  />
                </div>
                {error && <p className="text-sm text-deny">{error}</p>}
              </div>
            )}

            <SheetFooter>
              {token ? (
                <Button
                  className="cursor-pointer"
                  onClick={() => {
                    setOpen(false);
                    reset();
                  }}
                >
                  Done
                </Button>
              ) : (
                <Button
                  className="cursor-pointer"
                  disabled={busy || !name.trim()}
                  onClick={create}
                >
                  {busy ? "Creating…" : "Create agent"}
                </Button>
              )}
            </SheetFooter>
          </SheetContent>
        </Sheet>
      </div>

      <div className="rounded-lg border border-border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="font-sans">Agent</TableHead>
              <TableHead className="font-sans">ID</TableHead>
              <TableHead className="font-sans">Status</TableHead>
              <TableHead className="text-right font-sans">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {agents.length === 0 ? (
              <TableRow>
                <TableCell
                  colSpan={4}
                  className="py-8 text-center font-sans text-sm text-muted-foreground"
                >
                  No agents yet. Create one to enroll leashd.
                </TableCell>
              </TableRow>
            ) : (
              agents.map((a) => (
                <TableRow key={a.id}>
                  <TableCell>
                    <div className="font-mono text-sm">{a.name}</div>
                    {a.label && (
                      <div className="font-sans text-xs text-muted-foreground">
                        {a.label}
                      </div>
                    )}
                  </TableCell>
                  <TableCell className="font-mono text-xs text-muted-foreground">
                    {a.id.slice(0, 8)}
                  </TableCell>
                  <TableCell>
                    <AgentStatusPill status={a.status} />
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="inline-flex gap-2">
                      {a.status === "active" ? (
                        <Button
                          size="icon-sm"
                          variant="secondary"
                          aria-label="Pause agent"
                          className="cursor-pointer"
                          onClick={() => setStatus(a.id, "paused")}
                        >
                          <Pause className="size-4 text-capped" aria-hidden />
                        </Button>
                      ) : a.status === "paused" ? (
                        <Button
                          size="icon-sm"
                          variant="secondary"
                          aria-label="Resume agent"
                          className="cursor-pointer"
                          onClick={() => setStatus(a.id, "active")}
                        >
                          <Play className="size-4 text-allow" aria-hidden />
                        </Button>
                      ) : null}
                      {a.status !== "revoked" && (
                        <Button
                          size="icon-sm"
                          variant="secondary"
                          aria-label="Revoke agent"
                          className="cursor-pointer"
                          onClick={() => setStatus(a.id, "revoked")}
                        >
                          <Ban className="size-4 text-deny" aria-hidden />
                        </Button>
                      )}
                    </div>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
