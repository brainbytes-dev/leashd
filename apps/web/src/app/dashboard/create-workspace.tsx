"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export function CreateWorkspace() {
  const router = useRouter();
  const [name, setName] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function create() {
    if (busy || !name.trim()) return;
    setBusy(true);
    setError(null);
    const res = await fetch("/api/leash/workspaces", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ name: name.trim() }),
    });
    setBusy(false);
    if (!res.ok) {
      setError("Could not create workspace.");
      return;
    }
    router.refresh();
  }

  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-col gap-2">
        <Label htmlFor="ws-name">Workspace name</Label>
        <Input
          id="ws-name"
          value={name}
          onChange={(e) => setName(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") void create();
          }}
          placeholder="My agents"
          className="font-mono"
          autoFocus
        />
      </div>
      <Button
        className="w-fit cursor-pointer"
        disabled={busy || !name.trim()}
        onClick={create}
      >
        <Plus className="size-4" aria-hidden />
        {busy ? "Creating…" : "Create workspace"}
      </Button>
      {error && <p className="font-mono text-sm text-deny">{error}</p>}
    </div>
  );
}
