"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Save, ShieldAlert } from "lucide-react";
import {
  PolicySpec,
  type BudgetWindow,
  type GradedState,
  type MoneyUnit,
  type Rail,
} from "@repo/leash-core";
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

const WINDOWS: BudgetWindow[] = ["task", "hour", "day", "month"];
const RAILS: { value: Rail; label: string }[] = [
  { value: "lightning_nwc", label: "Lightning / NWC" },
  { value: "cashu", label: "Cashu" },
  { value: "x402", label: "x402 / USDC" },
];

type AgentOption = { id: string; name: string };

// Parse a comma/newline list into a trimmed, de-duped array (or undefined).
function parseList(raw: string): string[] | undefined {
  const items = raw
    .split(/[\n,]/)
    .map((s) => s.trim())
    .filter(Boolean);
  return items.length ? Array.from(new Set(items)) : undefined;
}

function amount(value: string, unit: MoneyUnit) {
  const n = Number(value);
  if (!value || Number.isNaN(n) || n < 0) return undefined;
  return { unit, value: Math.round(n) };
}

export function PolicyEditor({
  workspaceId,
  agents,
}: {
  workspaceId: string;
  agents: AgentOption[];
}) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<{ kind: "ok" | "err"; text: string } | null>(null);

  const [name, setName] = useState("default-policy");
  const [agentId, setAgentId] = useState<string>("__workspace__");
  const [unit, setUnit] = useState<MoneyUnit>("sat");
  const [defaultDecision, setDefaultDecision] = useState<"allow" | "deny">("deny");
  const [perTxMax, setPerTxMax] = useState("");
  const [budgets, setBudgets] = useState<Record<BudgetWindow, string>>({
    task: "",
    hour: "",
    day: "",
    month: "",
  });
  const [allowEndpoints, setAllowEndpoints] = useState("");
  const [allowDomains, setAllowDomains] = useState("");
  const [allowLn, setAllowLn] = useState("");
  const [allowMints, setAllowMints] = useState("");
  const [denyEndpoints, setDenyEndpoints] = useState("");
  const [denyDomains, setDenyDomains] = useState("");
  const [rateMax, setRateMax] = useState("");
  const [rateWindow, setRateWindow] = useState("");
  const [approval, setApproval] = useState("");
  const [killSwitch, setKillSwitch] = useState(false);
  const [gradedState, setGradedState] = useState<GradedState>("normal");
  const [rails, setRails] = useState<Rail[]>([]);

  function buildSpec(): unknown {
    const allow = {
      endpoints: parseList(allowEndpoints),
      domains: parseList(allowDomains),
      lightningAddresses: parseList(allowLn),
      mints: parseList(allowMints),
    };
    const deny = {
      endpoints: parseList(denyEndpoints),
      domains: parseList(denyDomains),
    };
    const hasAllow = Object.values(allow).some(Boolean);
    const hasDeny = Object.values(deny).some(Boolean);
    const rateMaxN = Number(rateMax);
    const rateWinN = Number(rateWindow);

    return {
      version: 1, // server bumps to the real next version
      defaultDecision,
      perTxMax: amount(perTxMax, unit),
      budgets: WINDOWS.flatMap((w) => {
        const cap = amount(budgets[w], unit);
        return cap ? [{ window: w, cap }] : [];
      }),
      allow: hasAllow ? allow : undefined,
      deny: hasDeny ? deny : undefined,
      rateLimit:
        rateMaxN > 0 && rateWinN > 0
          ? { maxPerWindow: Math.round(rateMaxN), windowSeconds: Math.round(rateWinN) }
          : undefined,
      timeWindows: [],
      approvalThreshold: amount(approval, unit),
      killSwitch,
      gradedState,
      rails,
    };
  }

  async function save() {
    if (busy) return;
    setMsg(null);
    const raw = buildSpec();
    const parsed = PolicySpec.safeParse(raw);
    if (!parsed.success) {
      setMsg({ kind: "err", text: parsed.error.issues[0]?.message ?? "Invalid spec" });
      return;
    }

    setBusy(true);
    const res = await fetch("/api/leash/policies", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        workspaceId,
        agentId: agentId === "__workspace__" ? null : agentId,
        name,
        spec: parsed.data,
      }),
    });
    setBusy(false);
    if (!res.ok) {
      setMsg({ kind: "err", text: "Save failed." });
      return;
    }
    setMsg({ kind: "ok", text: "Policy saved and signed." });
    router.refresh();
  }

  function toggleRail(r: Rail) {
    setRails((prev) => (prev.includes(r) ? prev.filter((x) => x !== r) : [...prev, r]));
  }

  const unitLabel = unit === "sat" ? "sat" : "USD cents";

  return (
    <div className="flex flex-col gap-4">
      <Card>
        <CardHeader>
          <CardTitle className="font-mono text-base">Scope</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-4 sm:grid-cols-3">
          <Field label="Policy name" htmlFor="pol-name">
            <Input
              id="pol-name"
              className="font-mono"
              value={name}
              onChange={(e) => setName(e.target.value)}
            />
          </Field>
          <Field label="Applies to" htmlFor="pol-agent">
            <Select value={agentId} onValueChange={setAgentId}>
              <SelectTrigger id="pol-agent" className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="__workspace__">Workspace default</SelectItem>
                {agents.map((a) => (
                  <SelectItem key={a.id} value={a.id} className="font-mono">
                    {a.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </Field>
          <Field label="Amount unit" htmlFor="pol-unit">
            <Select value={unit} onValueChange={(v) => setUnit(v as MoneyUnit)}>
              <SelectTrigger id="pol-unit" className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="sat">sat</SelectItem>
                <SelectItem value="usd_cent">USD cents</SelectItem>
              </SelectContent>
            </Select>
          </Field>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="font-mono text-base">Caps</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-4 sm:grid-cols-2">
          <Field label={`Per-transaction max (${unitLabel})`} htmlFor="pol-pertx">
            <Input
              id="pol-pertx"
              inputMode="numeric"
              className="font-mono tabular-nums"
              value={perTxMax}
              onChange={(e) => setPerTxMax(e.target.value)}
              placeholder="e.g. 50000"
            />
          </Field>
          <Field label={`Approval threshold (${unitLabel})`} htmlFor="pol-approval">
            <Input
              id="pol-approval"
              inputMode="numeric"
              className="font-mono tabular-nums"
              value={approval}
              onChange={(e) => setApproval(e.target.value)}
              placeholder="above this → human approval"
            />
          </Field>
          {WINDOWS.map((w) => (
            <Field key={w} label={`${w} budget cap (${unitLabel})`} htmlFor={`pol-b-${w}`}>
              <Input
                id={`pol-b-${w}`}
                inputMode="numeric"
                className="font-mono tabular-nums"
                value={budgets[w]}
                onChange={(e) => setBudgets((b) => ({ ...b, [w]: e.target.value }))}
              />
            </Field>
          ))}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="font-mono text-base">Allowlist</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-4 sm:grid-cols-2">
          <ListField label="Endpoints" value={allowEndpoints} onChange={setAllowEndpoints} />
          <ListField label="Domains" value={allowDomains} onChange={setAllowDomains} />
          <ListField label="Lightning addresses" value={allowLn} onChange={setAllowLn} />
          <ListField label="Cashu mints" value={allowMints} onChange={setAllowMints} />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="font-mono text-base">Denylist</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-4 sm:grid-cols-2">
          <ListField label="Endpoints" value={denyEndpoints} onChange={setDenyEndpoints} />
          <ListField label="Domains" value={denyDomains} onChange={setDenyDomains} />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="font-mono text-base">Rate limit & containment</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-4 sm:grid-cols-2">
          <Field label="Max transactions per window" htmlFor="pol-ratemax">
            <Input
              id="pol-ratemax"
              inputMode="numeric"
              className="font-mono tabular-nums"
              value={rateMax}
              onChange={(e) => setRateMax(e.target.value)}
            />
          </Field>
          <Field label="Rate window (seconds)" htmlFor="pol-ratewin">
            <Input
              id="pol-ratewin"
              inputMode="numeric"
              className="font-mono tabular-nums"
              value={rateWindow}
              onChange={(e) => setRateWindow(e.target.value)}
            />
          </Field>
          <Field label="Default decision" htmlFor="pol-default">
            <Select
              value={defaultDecision}
              onValueChange={(v) => setDefaultDecision(v as "allow" | "deny")}
            >
              <SelectTrigger id="pol-default" className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="deny">deny (fail-closed)</SelectItem>
                <SelectItem value="allow">allow</SelectItem>
              </SelectContent>
            </Select>
          </Field>
          <Field label="Graded state" htmlFor="pol-graded">
            <Select value={gradedState} onValueChange={(v) => setGradedState(v as GradedState)}>
              <SelectTrigger id="pol-graded" className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="normal">normal</SelectItem>
                <SelectItem value="read_only">read_only</SelectItem>
                <SelectItem value="restricted">restricted</SelectItem>
              </SelectContent>
            </Select>
          </Field>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="font-mono text-base">Rails & kill switch</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-4">
          <div className="flex flex-col gap-2">
            <span className="font-sans text-sm">Allowed rails (priority order)</span>
            <div className="flex flex-wrap gap-4">
              {RAILS.map((r) => (
                <label
                  key={r.value}
                  className="inline-flex cursor-pointer items-center gap-2 font-sans text-sm"
                >
                  <Checkbox
                    checked={rails.includes(r.value)}
                    onCheckedChange={() => toggleRail(r.value)}
                  />
                  {r.label}
                </label>
              ))}
            </div>
          </div>
          <label className="inline-flex w-fit cursor-pointer items-center gap-2 font-sans text-sm">
            <Checkbox
              checked={killSwitch}
              onCheckedChange={(c) => setKillSwitch(c === true)}
            />
            <ShieldAlert className="size-4 text-deny" aria-hidden />
            Kill switch — block all payments
          </label>
        </CardContent>
      </Card>

      <div className="flex items-center gap-4">
        <Button className="cursor-pointer" disabled={busy} onClick={save}>
          <Save className="size-4" aria-hidden />
          {busy ? "Saving…" : "Save & sign policy"}
        </Button>
        {msg && (
          <span
            className={`font-mono text-sm ${msg.kind === "ok" ? "text-allow" : "text-deny"}`}
          >
            {msg.text}
          </span>
        )}
      </div>
    </div>
  );
}

function Field({
  label,
  htmlFor,
  children,
}: {
  label: string;
  htmlFor: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex flex-col gap-2">
      <Label htmlFor={htmlFor}>{label}</Label>
      {children}
    </div>
  );
}

function ListField({
  label,
  value,
  onChange,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
}) {
  const id = `list-${label.toLowerCase().replace(/\s+/g, "-")}`;
  return (
    <div className="flex flex-col gap-2">
      <Label htmlFor={id}>{label}</Label>
      <textarea
        id={id}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        rows={2}
        placeholder="comma or newline separated"
        className="resize-y rounded-md border border-input bg-transparent px-3 py-2 font-mono text-xs outline-none focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50 dark:bg-input/30"
      />
    </div>
  );
}
