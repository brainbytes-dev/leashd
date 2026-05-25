"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Plus, Zap, Coins, CircleDollarSign, Lock, Pencil, Trash2, Check, X } from "lucide-react";
import type { Rail } from "@repo/leash-core";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

export type RailRow = {
  id: string;
  rail: string;
  label: string;
  status: string;
  meta: Record<string, unknown> | null;
};

const RAIL_META: Record<string, { label: string; Icon: typeof Zap }> = {
  lightning_nwc: { label: "Lightning / NWC", Icon: Zap },
  cashu: { label: "Cashu", Icon: Coins },
  x402: { label: "x402 / USDC", Icon: CircleDollarSign },
};

export function RailsClient({
  workspaceId,
  rails,
}: {
  workspaceId: string;
  rails: RailRow[];
}) {
  const router = useRouter();
  const [rail, setRail] = useState<Rail>("lightning_nwc");
  const [label, setLabel] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editLabel, setEditLabel] = useState("");
  const [deletingId, setDeletingId] = useState<string | null>(null);

  async function add() {
    if (busy || !label.trim()) return;
    setBusy(true);
    setError(null);
    const res = await fetch("/api/leash/rails", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ workspaceId, rail, label }),
    });
    setBusy(false);
    if (!res.ok) {
      setError("Could not add rail.");
      return;
    }
    setLabel("");
    router.refresh();
  }

  async function saveLabel(id: string) {
    if (!editLabel.trim()) return;
    const res = await fetch(`/api/leash/rails/${id}`, {
      method: "PATCH",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ label: editLabel.trim() }),
    });
    if (res.ok) {
      setEditingId(null);
      router.refresh();
    }
  }

  async function remove(id: string) {
    const res = await fetch(`/api/leash/rails/${id}`, { method: "DELETE" });
    if (res.ok) {
      setDeletingId(null);
      router.refresh();
    }
  }

  return (
    <div className="flex flex-col gap-4">
      <Card className="border-info/30">
        <CardContent className="flex items-start gap-3 pt-6">
          <Lock className="mt-0.5 size-4 shrink-0 text-info" aria-hidden />
          <p className="font-sans text-sm text-muted-foreground">
            Rail bindings store metadata only. Secrets — NWC strings, macaroons,
            session keys — never leave leashd on your own infrastructure.
          </p>
        </CardContent>
      </Card>

      <div className="rounded-lg border border-border">
        {rails.length === 0 ? (
          <p className="px-4 py-8 text-center font-sans text-sm text-muted-foreground">
            No rails connected yet.
          </p>
        ) : (
          <ul className="divide-y divide-border">
            {rails.map((r) => {
              const meta = RAIL_META[r.rail] ?? { label: r.rail, Icon: CircleDollarSign };
              const { Icon } = meta;
              return (
                <li key={r.id} className="flex items-center justify-between gap-3 px-4 py-3">
                  <div className="flex min-w-0 flex-1 items-center gap-3">
                    <Icon className="size-5 shrink-0 text-foreground" aria-hidden />
                    {editingId === r.id ? (
                      <Input
                        autoFocus
                        className="h-8 max-w-xs font-mono text-sm"
                        value={editLabel}
                        onChange={(e) => setEditLabel(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === "Enter") void saveLabel(r.id);
                          if (e.key === "Escape") setEditingId(null);
                        }}
                        aria-label="Rail label"
                      />
                    ) : (
                      <div className="min-w-0">
                        <div className="truncate font-mono text-sm">{r.label}</div>
                        <div className="font-sans text-xs text-muted-foreground">
                          {meta.label}
                        </div>
                      </div>
                    )}
                  </div>
                  <div className="flex shrink-0 items-center gap-2">
                    {editingId === r.id ? (
                      <>
                        <Button
                          size="icon-sm"
                          variant="secondary"
                          aria-label="Save label"
                          className="cursor-pointer"
                          onClick={() => saveLabel(r.id)}
                        >
                          <Check className="size-4 text-allow" aria-hidden />
                        </Button>
                        <Button
                          size="icon-sm"
                          variant="secondary"
                          aria-label="Cancel edit"
                          className="cursor-pointer"
                          onClick={() => setEditingId(null)}
                        >
                          <X className="size-4" aria-hidden />
                        </Button>
                      </>
                    ) : deletingId === r.id ? (
                      <>
                        <span className="font-sans text-xs text-muted-foreground">
                          Delete?
                        </span>
                        <Button
                          size="icon-sm"
                          variant="secondary"
                          aria-label="Confirm delete rail"
                          className="cursor-pointer"
                          onClick={() => remove(r.id)}
                        >
                          <Check className="size-4 text-deny" aria-hidden />
                        </Button>
                        <Button
                          size="icon-sm"
                          variant="secondary"
                          aria-label="Cancel delete"
                          className="cursor-pointer"
                          onClick={() => setDeletingId(null)}
                        >
                          <X className="size-4" aria-hidden />
                        </Button>
                      </>
                    ) : (
                      <>
                        <span className="inline-flex items-center gap-1.5 rounded-full border border-border bg-secondary/40 px-2 py-0.5 font-mono text-xs text-allow">
                          {r.status}
                        </span>
                        <Button
                          size="icon-sm"
                          variant="secondary"
                          aria-label="Edit rail label"
                          className="cursor-pointer"
                          onClick={() => {
                            setDeletingId(null);
                            setEditingId(r.id);
                            setEditLabel(r.label);
                          }}
                        >
                          <Pencil className="size-4" aria-hidden />
                        </Button>
                        <Button
                          size="icon-sm"
                          variant="secondary"
                          aria-label="Delete rail"
                          className="cursor-pointer"
                          onClick={() => {
                            setEditingId(null);
                            setDeletingId(r.id);
                          }}
                        >
                          <Trash2 className="size-4 text-deny" aria-hidden />
                        </Button>
                      </>
                    )}
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="font-mono text-base">Add rail</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-wrap items-end gap-4">
          <div className="flex flex-col gap-2">
            <Label htmlFor="rail-type">Rail</Label>
            <Select value={rail} onValueChange={(v) => setRail(v as Rail)}>
              <SelectTrigger id="rail-type" className="w-56">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="lightning_nwc">Lightning / NWC</SelectItem>
                <SelectItem value="cashu">Cashu</SelectItem>
                <SelectItem value="x402">x402 / USDC</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="flex flex-col gap-2">
            <Label htmlFor="rail-label">Label</Label>
            <Input
              id="rail-label"
              className="w-56 font-mono"
              value={label}
              onChange={(e) => setLabel(e.target.value)}
              placeholder="alby-hub-main"
            />
          </div>
          <Button className="cursor-pointer" disabled={busy || !label.trim()} onClick={add}>
            <Plus className="size-4" aria-hidden />
            {busy ? "Adding…" : "Add rail"}
          </Button>
          {error && <span className="font-mono text-sm text-deny">{error}</span>}
        </CardContent>
      </Card>
    </div>
  );
}
