"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Save, ShieldAlert, Pencil, Trash2, Check, X, FilePlus, Plus } from "lucide-react";
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
const DAYS: { value: number; label: string }[] = [
  { value: 0, label: "Sun" },
  { value: 1, label: "Mon" },
  { value: 2, label: "Tue" },
  { value: 3, label: "Wed" },
  { value: 4, label: "Thu" },
  { value: 5, label: "Fri" },
  { value: 6, label: "Sat" },
];

// Comprehensive fallback if the runtime lacks Intl.supportedValuesOf. Being a
// fixed list keeps server and client identical (no hydration mismatch) even on
// a reduced-ICU runtime, while still offering real worldwide coverage.
const FALLBACK_TZ = [
  "UTC",
  "America/Anchorage", "America/Los_Angeles", "America/Denver", "America/Chicago",
  "America/New_York", "America/Toronto", "America/Mexico_City", "America/Bogota",
  "America/Lima", "America/Sao_Paulo", "America/Argentina/Buenos_Aires",
  "Atlantic/Reykjavik", "Europe/London", "Europe/Lisbon", "Europe/Madrid",
  "Europe/Paris", "Europe/Berlin", "Europe/Zurich", "Europe/Rome",
  "Europe/Amsterdam", "Europe/Stockholm", "Europe/Warsaw", "Europe/Athens",
  "Europe/Helsinki", "Europe/Kyiv", "Europe/Istanbul", "Europe/Moscow",
  "Africa/Casablanca", "Africa/Lagos", "Africa/Johannesburg", "Africa/Nairobi",
  "Africa/Cairo", "Asia/Jerusalem", "Asia/Riyadh", "Asia/Dubai",
  "Asia/Tehran", "Asia/Karachi", "Asia/Kolkata", "Asia/Dhaka",
  "Asia/Bangkok", "Asia/Jakarta", "Asia/Shanghai", "Asia/Hong_Kong",
  "Asia/Singapore", "Asia/Taipei", "Asia/Tokyo", "Asia/Seoul",
  "Australia/Perth", "Australia/Sydney", "Pacific/Auckland", "Pacific/Honolulu",
];

// All IANA zones from the runtime, else the worldwide fallback above.
function allTimezones(): string[] {
  try {
    const fn = (Intl as { supportedValuesOf?: (k: string) => string[] })
      .supportedValuesOf;
    const list = fn ? fn("timeZone") : [];
    if (list.length > FALLBACK_TZ.length) return list;
  } catch {
    /* fall through */
  }
  return FALLBACK_TZ;
}
const TIMEZONES = allTimezones();

function browserTz(): string {
  try {
    return Intl.DateTimeFormat().resolvedOptions().timeZone || "UTC";
  } catch {
    return "UTC";
  }
}

type WindowRow = { days: number[]; start: string; end: string };

function hhmmToMin(v: string): number | null {
  const m = /^(\d{1,2}):(\d{2})$/.exec(v.trim());
  if (!m) return null;
  const h = Number(m[1]);
  const min = Number(m[2]);
  if (h > 24 || min > 59) return null;
  const total = h * 60 + min;
  return total >= 0 && total <= 1440 ? total : null;
}

function minToHHMM(min: number): string {
  const h = Math.floor(min / 60) % 24;
  const m = min % 60;
  return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
}
const RAILS: { value: Rail; label: string }[] = [
  { value: "lightning_nwc", label: "Lightning / NWC" },
  { value: "cashu", label: "Cashu" },
];

type AgentOption = { id: string; name: string };

export type ExistingPolicy = {
  id: string;
  name: string;
  agentId: string | null;
  version: number;
  signed: boolean;
  spec: unknown;
};

const EMPTY_BUDGETS: Record<BudgetWindow, string> = {
  task: "",
  hour: "",
  day: "",
  month: "",
};

function fmtAmount(a: { unit: MoneyUnit; value: number } | undefined): string {
  return a ? String(a.value) : "";
}

function joinList(arr: string[] | undefined): string {
  return arr?.join(", ") ?? "";
}

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
  existing,
}: {
  workspaceId: string;
  agents: AgentOption[];
  existing: ExistingPolicy[];
}) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<{ kind: "ok" | "err"; text: string } | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingVersion, setEditingVersion] = useState<number | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const [name, setName] = useState("default-policy");
  const [agentId, setAgentId] = useState<string>("__workspace__");
  // Bitcoin-only: all amounts are sats.
  const unit: MoneyUnit = "sat";
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
  // Deterministic default ("UTC") so SSR and client match; the user picks their
  // zone from the full list, and resetForm seeds the browser zone client-side.
  const [timezone, setTimezone] = useState<string>("UTC");
  const [windows, setWindows] = useState<WindowRow[]>([]);

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
      timezone,
      timeWindows: windows.flatMap((w) => {
        const startMinute = hhmmToMin(w.start);
        const endMinute = hhmmToMin(w.end);
        if (w.days.length === 0 || startMinute === null || endMinute === null) return [];
        return [{ days: [...w.days].sort((a, b) => a - b), startMinute, endMinute }];
      }),
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
    setMsg({ kind: "ok", text: editingId ? "Policy updated and re-signed." : "Policy saved and signed." });
    router.refresh();
  }

  function toggleRail(r: Rail) {
    setRails((prev) => (prev.includes(r) ? prev.filter((x) => x !== r) : [...prev, r]));
  }

  function addWindow() {
    setWindows((prev) => [
      ...prev,
      { days: [1, 2, 3, 4, 5], start: "09:00", end: "17:00" },
    ]);
  }

  function removeWindow(i: number) {
    setWindows((prev) => prev.filter((_, idx) => idx !== i));
  }

  function toggleWindowDay(i: number, day: number) {
    setWindows((prev) =>
      prev.map((w, idx) =>
        idx === i
          ? {
              ...w,
              days: w.days.includes(day)
                ? w.days.filter((d) => d !== day)
                : [...w.days, day],
            }
          : w
      )
    );
  }

  function setWindowTime(i: number, field: "start" | "end", value: string) {
    setWindows((prev) =>
      prev.map((w, idx) => (idx === i ? { ...w, [field]: value } : w))
    );
  }

  function resetForm() {
    setName("default-policy");
    setAgentId("__workspace__");
    setDefaultDecision("deny");
    setPerTxMax("");
    setBudgets({ ...EMPTY_BUDGETS });
    setAllowEndpoints("");
    setAllowDomains("");
    setAllowLn("");
    setAllowMints("");
    setDenyEndpoints("");
    setDenyDomains("");
    setRateMax("");
    setRateWindow("");
    setApproval("");
    setKillSwitch(false);
    setGradedState("normal");
    setRails([]);
    setTimezone(browserTz());
    setWindows([]);
  }

  function newPolicy() {
    setEditingId(null);
    setEditingVersion(null);
    setMsg(null);
    resetForm();
  }

  function loadPolicy(p: ExistingPolicy) {
    const parsed = PolicySpec.safeParse(p.spec);
    if (!parsed.success) {
      setMsg({ kind: "err", text: "Could not read this policy's spec." });
      return;
    }
    const s = parsed.data;
    const byWindow: Record<BudgetWindow, string> = { ...EMPTY_BUDGETS };
    for (const b of s.budgets) byWindow[b.window] = String(b.cap.value);

    setEditingId(p.id);
    setEditingVersion(p.version);
    setName(p.name);
    setAgentId(p.agentId ?? "__workspace__");
    setDefaultDecision(s.defaultDecision);
    setPerTxMax(fmtAmount(s.perTxMax));
    setBudgets(byWindow);
    setAllowEndpoints(joinList(s.allow?.endpoints));
    setAllowDomains(joinList(s.allow?.domains));
    setAllowLn(joinList(s.allow?.lightningAddresses));
    setAllowMints(joinList(s.allow?.mints));
    setDenyEndpoints(joinList(s.deny?.endpoints));
    setDenyDomains(joinList(s.deny?.domains));
    setRateMax(s.rateLimit ? String(s.rateLimit.maxPerWindow) : "");
    setRateWindow(s.rateLimit ? String(s.rateLimit.windowSeconds) : "");
    setApproval(fmtAmount(s.approvalThreshold));
    setKillSwitch(s.killSwitch);
    setGradedState(s.gradedState);
    setRails(s.rails);
    setTimezone(s.timezone || "UTC");
    setWindows(
      s.timeWindows.map((w) => ({
        days: w.days,
        start: minToHHMM(w.startMinute),
        end: minToHHMM(w.endMinute),
      }))
    );
    setMsg(null);
    setDeletingId(null);
    if (typeof window !== "undefined") window.scrollTo({ top: 0, behavior: "smooth" });
  }

  async function deletePolicy(id: string) {
    const res = await fetch(`/api/leash/policies/${id}`, { method: "DELETE" });
    if (!res.ok) {
      setMsg({ kind: "err", text: "Delete failed." });
      return;
    }
    setDeletingId(null);
    if (editingId === id) newPolicy();
    router.refresh();
  }

  const unitLabel = "sat";

  return (
    <div className="flex flex-col gap-4">
      {existing.length > 0 && (
        <Card>
          <CardHeader className="flex flex-row items-center justify-between gap-3 space-y-0">
            <CardTitle className="font-mono text-base">Active policies</CardTitle>
            {editingId && (
              <Button
                variant="outline"
                size="sm"
                className="cursor-pointer"
                onClick={newPolicy}
              >
                <FilePlus className="size-4" aria-hidden />
                New policy
              </Button>
            )}
          </CardHeader>
          <CardContent className="flex flex-col gap-1">
            {existing.map((p) => (
              <div
                key={p.id}
                className={`flex items-center justify-between gap-3 rounded-md px-2 py-2 ${
                  editingId === p.id ? "bg-secondary/40" : ""
                }`}
              >
                <div className="flex min-w-0 items-center gap-3">
                  <span className="truncate font-mono text-sm">{p.name}</span>
                  <span className="font-mono text-xs text-muted-foreground">
                    {p.agentId ? "agent" : "workspace"}
                  </span>
                  <span className="font-mono text-xs text-muted-foreground">
                    v{p.version}
                  </span>
                  <span
                    className={`font-mono text-xs ${p.signed ? "text-allow" : "text-capped"}`}
                  >
                    {p.signed ? "signed" : "unsigned"}
                  </span>
                </div>
                <div className="flex shrink-0 items-center gap-2">
                  {deletingId === p.id ? (
                    <>
                      <span className="font-sans text-xs text-muted-foreground">
                        Delete?
                      </span>
                      <Button
                        size="icon-sm"
                        variant="secondary"
                        aria-label="Confirm delete policy"
                        className="cursor-pointer"
                        onClick={() => deletePolicy(p.id)}
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
                      <Button
                        size="icon-sm"
                        variant="secondary"
                        aria-label="Edit policy"
                        className="cursor-pointer"
                        onClick={() => loadPolicy(p)}
                      >
                        <Pencil className="size-4" aria-hidden />
                      </Button>
                      <Button
                        size="icon-sm"
                        variant="secondary"
                        aria-label="Delete policy"
                        className="cursor-pointer"
                        onClick={() => setDeletingId(p.id)}
                      >
                        <Trash2 className="size-4 text-deny" aria-hidden />
                      </Button>
                    </>
                  )}
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader>
          <CardTitle className="font-mono text-base">Scope</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-4 sm:grid-cols-2">
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
        <CardHeader className="flex flex-row items-center justify-between gap-3 space-y-0">
          <CardTitle className="font-mono text-base">Time windows</CardTitle>
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="cursor-pointer"
            onClick={addWindow}
          >
            <Plus className="size-4" aria-hidden />
            Add window
          </Button>
        </CardHeader>
        <CardContent className="flex flex-col gap-4">
          <Field label="Timezone" htmlFor="pol-tz">
            <select
              id="pol-tz"
              value={timezone}
              onChange={(e) => setTimezone(e.target.value)}
              className="h-9 w-full max-w-sm rounded-md border border-input bg-transparent px-3 font-mono text-sm outline-none focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50 dark:bg-input/30"
            >
              {(TIMEZONES.includes(timezone) ? TIMEZONES : [timezone, ...TIMEZONES]).map(
                (tz) => (
                  <option key={tz} value={tz}>
                    {tz}
                  </option>
                )
              )}
            </select>
          </Field>

          {windows.length === 0 ? (
            <p className="font-sans text-sm text-muted-foreground">
              No windows: the agent may spend at any time. Add one to restrict
              spending to specific days and hours (evaluated in the timezone
              above).
            </p>
          ) : (
            <ul className="flex flex-col gap-3">
              {windows.map((w, i) => (
                <li
                  key={i}
                  className="flex flex-wrap items-center gap-3 rounded-md border border-border p-3"
                >
                  <div className="flex flex-wrap gap-1">
                    {DAYS.map((d) => {
                      const on = w.days.includes(d.value);
                      return (
                        <button
                          key={d.value}
                          type="button"
                          aria-pressed={on}
                          onClick={() => toggleWindowDay(i, d.value)}
                          className={`cursor-pointer rounded-md border px-2 py-1 font-mono text-xs transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-background ${
                            on
                              ? "border-primary bg-primary/15 text-foreground"
                              : "border-border text-muted-foreground hover:text-foreground"
                          }`}
                        >
                          {d.label}
                        </button>
                      );
                    })}
                  </div>
                  <div className="flex items-center gap-2">
                    <Input
                      type="time"
                      aria-label="Start time"
                      className="w-32 font-mono tabular-nums"
                      value={w.start}
                      onChange={(e) => setWindowTime(i, "start", e.target.value)}
                    />
                    <span className="font-mono text-xs text-muted-foreground">to</span>
                    <Input
                      type="time"
                      aria-label="End time"
                      className="w-32 font-mono tabular-nums"
                      value={w.end}
                      onChange={(e) => setWindowTime(i, "end", e.target.value)}
                    />
                  </div>
                  <Button
                    type="button"
                    size="icon-sm"
                    variant="secondary"
                    aria-label="Remove window"
                    className="ml-auto cursor-pointer"
                    onClick={() => removeWindow(i)}
                  >
                    <Trash2 className="size-4 text-deny" aria-hidden />
                  </Button>
                </li>
              ))}
            </ul>
          )}
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

      <div className="flex flex-wrap items-center gap-4">
        <Button className="cursor-pointer" disabled={busy} onClick={save}>
          <Save className="size-4" aria-hidden />
          {busy
            ? "Saving…"
            : editingId
              ? "Update & re-sign policy"
              : "Save & sign policy"}
        </Button>
        {editingId && (
          <Button
            variant="outline"
            className="cursor-pointer"
            disabled={busy}
            onClick={newPolicy}
          >
            <FilePlus className="size-4" aria-hidden />
            New policy
          </Button>
        )}
        {editingId && editingVersion != null && (
          <span className="font-mono text-xs text-muted-foreground">
            editing v{editingVersion}, saves as v{editingVersion + 1}
          </span>
        )}
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
