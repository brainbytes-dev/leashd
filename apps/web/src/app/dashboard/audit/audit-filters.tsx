"use client";

import { useRouter, useSearchParams, usePathname } from "next/navigation";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";

type AgentOption = { id: string; name: string };

export function AuditFilters({ agents }: { agents: AgentOption[] }) {
  const router = useRouter();
  const pathname = usePathname();
  const params = useSearchParams();

  function update(key: string, value: string) {
    const next = new URLSearchParams(params.toString());
    if (value === "__all__") next.delete(key);
    else next.set(key, value);
    router.replace(`${pathname}?${next.toString()}`);
  }

  return (
    <div className="flex flex-wrap items-end gap-4">
      <div className="flex flex-col gap-2">
        <Label htmlFor="f-agent">Agent</Label>
        <Select
          value={params.get("agentId") ?? "__all__"}
          onValueChange={(v) => update("agentId", v)}
        >
          <SelectTrigger id="f-agent" className="w-56">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="__all__">All agents</SelectItem>
            {agents.map((a) => (
              <SelectItem key={a.id} value={a.id} className="font-mono">
                {a.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      <div className="flex flex-col gap-2">
        <Label htmlFor="f-decision">Decision</Label>
        <Select
          value={params.get("decision") ?? "__all__"}
          onValueChange={(v) => update("decision", v)}
        >
          <SelectTrigger id="f-decision" className="w-48">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="__all__">All decisions</SelectItem>
            <SelectItem value="allowed">allowed</SelectItem>
            <SelectItem value="denied">denied</SelectItem>
            <SelectItem value="capped">capped</SelectItem>
            <SelectItem value="approval_required">approval_required</SelectItem>
          </SelectContent>
        </Select>
      </div>
    </div>
  );
}
