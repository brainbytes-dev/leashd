import { CheckCircle2, XCircle, AlertTriangle } from "lucide-react";
import type { LucideIcon } from "lucide-react";

type Decision = "allow" | "deny" | "capped";

interface LogLine {
  agent: string;
  endpoint: string;
  amount: string;
  decision: Decision;
  detail: string;
}

const DECISION_META: Record<
  Decision,
  { label: string; icon: LucideIcon; className: string }
> = {
  allow: { label: "ALLOW", icon: CheckCircle2, className: "text-allow" },
  deny: { label: "DENIED", icon: XCircle, className: "text-deny" },
  capped: { label: "CAPPED", icon: AlertTriangle, className: "text-capped" },
};

const LINES: LogLine[] = [
  {
    agent: "research-bot",
    endpoint: "api.foo.com",
    amount: "2,000 sat",
    decision: "allow",
    detail: "within daily cap",
  },
  {
    agent: "research-bot",
    endpoint: "api.foo.com",
    amount: "50,000 sat",
    decision: "deny",
    detail: "daily cap 20,000 sat exceeded",
  },
  {
    agent: "scraper-7",
    endpoint: "mint.cashu.space",
    amount: "8,500 sat",
    decision: "capped",
    detail: "rate limit, queued",
  },
];

export function TerminalCard() {
  return (
    <div className="overflow-hidden rounded-lg border border-border bg-card font-mono text-sm">
      <div className="flex items-center gap-2 border-b border-border bg-muted/40 px-4 py-3">
        <span className="size-3 rounded-full bg-deny/70" aria-hidden />
        <span className="size-3 rounded-full bg-capped/70" aria-hidden />
        <span className="size-3 rounded-full bg-allow/70" aria-hidden />
        <span className="ml-2 text-xs text-muted-foreground">
          leashd · audit feed
        </span>
      </div>
      <ul className="divide-y divide-border">
        {LINES.map((line) => {
          const meta = DECISION_META[line.decision];
          const Icon = meta.icon;
          return (
            <li
              key={`${line.agent}-${line.amount}-${line.decision}`}
              className="flex flex-col gap-1 px-4 py-3"
            >
              <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
                <span className="text-muted-foreground">
                  agent:{line.agent}
                </span>
                <span className="text-foreground">
                  pay <span className="tabular-nums">{line.amount}</span>
                </span>
                <span className="text-muted-foreground">
                  → {line.endpoint}
                </span>
              </div>
              <div className="flex items-center gap-2">
                <Icon className={`size-4 ${meta.className}`} aria-hidden />
                <span className={`font-semibold ${meta.className}`}>
                  {meta.label}
                </span>
                <span className="text-xs text-muted-foreground">
                  {line.detail}
                </span>
              </div>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
