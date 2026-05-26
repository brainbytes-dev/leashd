"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Plus, Trash2, Check, X, Mail, Webhook } from "lucide-react";
import type { AlertRule } from "@repo/db";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

const DECISIONS = [
  { value: "denied", label: "denied" },
  { value: "capped", label: "capped" },
  { value: "approval_required", label: "approval" },
  { value: "allowed", label: "allowed" },
];

export function AlertsClient({
  workspaceId,
  canManage,
  rules,
}: {
  workspaceId: string;
  canManage: boolean;
  rules: AlertRule[];
}) {
  const router = useRouter();
  const [channel, setChannel] = useState<"email" | "webhook">("email");
  const [destination, setDestination] = useState("");
  const [decisions, setDecisions] = useState<string[]>([
    "denied",
    "capped",
    "approval_required",
  ]);
  const [busy, setBusy] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  function toggleDecision(d: string) {
    setDecisions((prev) =>
      prev.includes(d) ? prev.filter((x) => x !== d) : [...prev, d]
    );
  }

  async function add() {
    if (busy || !destination.trim() || decisions.length === 0) return;
    setBusy(true);
    const res = await fetch("/api/leash/alerts", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ workspaceId, channel, destination: destination.trim(), decisions }),
    });
    setBusy(false);
    if (!res.ok) {
      const data = (await res.json().catch(() => null)) as { error?: string } | null;
      toast.error(data?.error ?? "Could not create alert.");
      return;
    }
    setDestination("");
    toast.success("Alert created.");
    router.refresh();
  }

  async function toggle(rule: AlertRule) {
    const res = await fetch(`/api/leash/alerts/${rule.id}`, {
      method: "PATCH",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ enabled: !rule.enabled }),
    });
    if (res.ok) {
      toast.success(rule.enabled ? "Alert paused." : "Alert enabled.");
      router.refresh();
    } else {
      toast.error("Could not update alert.");
    }
  }

  async function remove(id: string) {
    const res = await fetch(`/api/leash/alerts/${id}`, { method: "DELETE" });
    if (res.ok) {
      setDeletingId(null);
      toast.success("Alert deleted.");
      router.refresh();
    } else {
      toast.error("Could not delete alert.");
    }
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="rounded-lg border border-border">
        {rules.length === 0 ? (
          <p className="px-4 py-8 text-center font-sans text-sm text-muted-foreground">
            No alerts yet. Add one to get notified on policy events.
          </p>
        ) : (
          <ul className="divide-y divide-border">
            {rules.map((r) => {
              const Icon = r.channel === "email" ? Mail : Webhook;
              const decs = (r.decisions as string[]) ?? [];
              return (
                <li key={r.id} className="flex items-center justify-between gap-3 px-4 py-3">
                  <div className="flex min-w-0 items-center gap-3">
                    <Icon className="size-5 shrink-0 text-foreground" aria-hidden />
                    <div className="min-w-0">
                      <div className="truncate font-mono text-sm">{r.destination}</div>
                      <div className="font-mono text-xs text-muted-foreground">
                        {decs.join(", ")}
                      </div>
                    </div>
                  </div>
                  <div className="flex shrink-0 items-center gap-2">
                    <span
                      className={`font-mono text-xs ${r.enabled ? "text-allow" : "text-muted-foreground"}`}
                    >
                      {r.enabled ? "on" : "paused"}
                    </span>
                    {canManage &&
                      (deletingId === r.id ? (
                        <>
                          <Button
                            size="icon-sm"
                            variant="secondary"
                            aria-label="Confirm delete alert"
                            className="cursor-pointer"
                            onClick={() => remove(r.id)}
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
                        </>
                      ) : (
                        <>
                          <Button
                            size="sm"
                            variant="outline"
                            className="cursor-pointer"
                            onClick={() => toggle(r)}
                          >
                            {r.enabled ? "Pause" : "Enable"}
                          </Button>
                          <Button
                            size="icon-sm"
                            variant="secondary"
                            aria-label="Delete alert"
                            className="cursor-pointer"
                            onClick={() => setDeletingId(r.id)}
                          >
                            <Trash2 className="size-4 text-deny" aria-hidden />
                          </Button>
                        </>
                      ))}
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </div>

      {canManage && (
        <Card>
          <CardHeader>
            <CardTitle className="font-mono text-base">Add alert</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col gap-4">
            <div className="flex flex-wrap items-end gap-4">
              <div className="flex flex-col gap-2">
                <Label htmlFor="alert-channel">Channel</Label>
                <Select value={channel} onValueChange={(v) => setChannel(v as "email" | "webhook")}>
                  <SelectTrigger id="alert-channel" className="w-40">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="email">Email</SelectItem>
                    <SelectItem value="webhook">Webhook</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="flex flex-1 flex-col gap-2">
                <Label htmlFor="alert-dest">
                  {channel === "email" ? "Email address" : "Webhook URL"}
                </Label>
                <Input
                  id="alert-dest"
                  className="font-mono"
                  value={destination}
                  onChange={(e) => setDestination(e.target.value)}
                  placeholder={channel === "email" ? "you@example.com" : "https://hooks.example.com/leash"}
                />
              </div>
            </div>
            <div className="flex flex-col gap-2">
              <span className="font-sans text-sm">Trigger on</span>
              <div className="flex flex-wrap gap-4">
                {DECISIONS.map((d) => (
                  <label
                    key={d.value}
                    className="inline-flex cursor-pointer items-center gap-2 font-mono text-sm"
                  >
                    <Checkbox
                      checked={decisions.includes(d.value)}
                      onCheckedChange={() => toggleDecision(d.value)}
                    />
                    {d.label}
                  </label>
                ))}
              </div>
            </div>
            <Button
              className="w-fit cursor-pointer"
              disabled={busy || !destination.trim() || decisions.length === 0}
              onClick={add}
            >
              <Plus className="size-4" aria-hidden />
              {busy ? "Adding…" : "Add alert"}
            </Button>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
