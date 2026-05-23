import { CheckCircle2, PauseCircle, XCircle } from "lucide-react";

const map = {
  active: { color: "text-allow", Icon: CheckCircle2, label: "ACTIVE" },
  paused: { color: "text-capped", Icon: PauseCircle, label: "PAUSED" },
  revoked: { color: "text-deny", Icon: XCircle, label: "REVOKED" },
} as const;

export function AgentStatusPill({ status }: { status: string }) {
  const s = map[status as keyof typeof map] ?? map.revoked;
  const { Icon } = s;
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full border border-border bg-secondary/40 px-2 py-0.5 font-mono text-xs ${s.color}`}
    >
      <Icon className="size-3" aria-hidden />
      {s.label}
    </span>
  );
}
