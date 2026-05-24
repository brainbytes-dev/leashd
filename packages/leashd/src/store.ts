import { DatabaseSync } from "node:sqlite";
import { mkdirSync } from "node:fs";
import { dirname } from "node:path";
import type { Amount, AuditEvent, EvalState, MoneyUnit } from "@repo/leash-core";

/**
 * Local log of record for leashd: spend ledger, append-only signed audit log,
 * rate counters, and cached signed policy. Uses Node's built-in `node:sqlite`
 * (DatabaseSync) so the sidecar has ZERO native build step — important for an
 * OSS tool installed across machines. The API is synchronous, which keeps the
 * two-phase commit straightforward and atomic via an explicit transaction.
 */

const SCHEMA = `
CREATE TABLE IF NOT EXISTS spend (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  agent_id TEXT NOT NULL,
  unit TEXT NOT NULL,
  value INTEGER NOT NULL,
  task_ref TEXT,
  occurred_at INTEGER NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_spend_agent ON spend(agent_id, unit, occurred_at);

CREATE TABLE IF NOT EXISTS audit (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  agent_id TEXT NOT NULL,
  seq INTEGER NOT NULL,
  event_json TEXT NOT NULL,
  signature TEXT NOT NULL,
  pushed INTEGER NOT NULL DEFAULT 0,
  occurred_at INTEGER NOT NULL,
  UNIQUE(agent_id, seq)
);
CREATE INDEX IF NOT EXISTS idx_audit_pushed ON audit(pushed);

CREATE TABLE IF NOT EXISTS policy_cache (
  agent_id TEXT PRIMARY KEY,
  version INTEGER NOT NULL,
  spec_json TEXT NOT NULL,
  signature TEXT NOT NULL,
  updated_at INTEGER NOT NULL
);
`;

const HOUR_MS = 3_600_000;
const DAY_MS = 86_400_000;
const MONTH_MS = 30 * DAY_MS;

export interface StoredPolicy {
  version: number;
  specJson: string;
  signature: string;
}

export interface PersistedAudit {
  id: number;
  event: AuditEvent;
  signature: string;
}

export interface Store {
  computeEvalState(
    agentId: string,
    unit: MoneyUnit,
    now: number,
    rateWindowSeconds: number,
    taskRef?: string
  ): EvalState;
  /** Atomically record committed spend + its signed audit event. */
  commit(input: {
    agentId: string;
    amount: Amount;
    taskRef?: string;
    event: AuditEvent;
    signature: string;
  }): void;
  /** Write a signed audit event without recording spend (denials etc.). */
  recordAudit(agentId: string, event: AuditEvent, signature: string): void;
  /** Next monotonic per-agent sequence number. */
  nextSeq(agentId: string): number;
  getPolicy(agentId: string): StoredPolicy | undefined;
  putPolicy(agentId: string, p: StoredPolicy): void;
  unpushedAudit(limit: number): PersistedAudit[];
  markPushed(ids: number[]): void;
  close(): void;
}

export function openStore(dbPath: string): Store {
  if (dbPath !== ":memory:") mkdirSync(dirname(dbPath), { recursive: true });
  const db = new DatabaseSync(dbPath);
  db.exec("PRAGMA journal_mode = WAL;");
  db.exec(SCHEMA);

  const sumSpend = db.prepare(
    `SELECT COALESCE(SUM(value), 0) AS total FROM spend
     WHERE agent_id = ? AND unit = ? AND occurred_at >= ?`
  );
  const sumTask = db.prepare(
    `SELECT COALESCE(SUM(value), 0) AS total FROM spend
     WHERE agent_id = ? AND unit = ? AND task_ref = ?`
  );
  const countRecent = db.prepare(
    `SELECT COUNT(*) AS n FROM spend WHERE agent_id = ? AND occurred_at >= ?`
  );
  const insertSpend = db.prepare(
    `INSERT INTO spend (agent_id, unit, value, task_ref, occurred_at)
     VALUES (?, ?, ?, ?, ?)`
  );
  const insertAudit = db.prepare(
    `INSERT INTO audit (agent_id, seq, event_json, signature, occurred_at)
     VALUES (?, ?, ?, ?, ?)`
  );
  const maxSeq = db.prepare(
    `SELECT COALESCE(MAX(seq), -1) AS m FROM audit WHERE agent_id = ?`
  );
  const selPolicy = db.prepare(
    `SELECT version, spec_json AS specJson, signature FROM policy_cache WHERE agent_id = ?`
  );
  const upPolicy = db.prepare(
    `INSERT INTO policy_cache (agent_id, version, spec_json, signature, updated_at)
     VALUES (?, ?, ?, ?, ?)
     ON CONFLICT(agent_id) DO UPDATE SET
       version = excluded.version,
       spec_json = excluded.spec_json,
       signature = excluded.signature,
       updated_at = excluded.updated_at`
  );
  const selUnpushed = db.prepare(
    `SELECT id, event_json AS eventJson, signature FROM audit
     WHERE pushed = 0 ORDER BY id ASC LIMIT ?`
  );

  function nextSeq(agentId: string): number {
    const row = maxSeq.get(agentId) as { m: number };
    return row.m + 1;
  }

  return {
    computeEvalState(agentId, unit, now, rateWindowSeconds, taskRef) {
      const task = taskRef
        ? (sumTask.get(agentId, unit, taskRef) as { total: number }).total
        : 0;
      const hour = (sumSpend.get(agentId, unit, now - HOUR_MS) as { total: number }).total;
      const day = (sumSpend.get(agentId, unit, now - DAY_MS) as { total: number }).total;
      const month = (sumSpend.get(agentId, unit, now - MONTH_MS) as { total: number }).total;
      const recentCount = (
        countRecent.get(agentId, now - rateWindowSeconds * 1000) as { n: number }
      ).n;
      return { spend: { task, hour, day, month }, recentCount };
    },

    commit({ agentId, amount, taskRef, event, signature }) {
      db.exec("BEGIN");
      try {
        insertSpend.run(
          agentId,
          amount.unit,
          amount.value,
          taskRef ?? null,
          event.occurredAt
        );
        insertAudit.run(
          agentId,
          event.seq,
          JSON.stringify(event),
          signature,
          event.occurredAt
        );
        db.exec("COMMIT");
      } catch (e) {
        db.exec("ROLLBACK");
        throw e;
      }
    },

    recordAudit(agentId, event, signature) {
      insertAudit.run(
        agentId,
        event.seq,
        JSON.stringify(event),
        signature,
        event.occurredAt
      );
    },

    nextSeq,

    getPolicy(agentId) {
      return selPolicy.get(agentId) as StoredPolicy | undefined;
    },

    putPolicy(agentId, p) {
      upPolicy.run(agentId, p.version, p.specJson, p.signature, Date.now());
    },

    unpushedAudit(limit) {
      const rows = selUnpushed.all(limit) as Array<{
        id: number;
        eventJson: string;
        signature: string;
      }>;
      return rows.map((r) => ({
        id: r.id,
        event: JSON.parse(r.eventJson) as AuditEvent,
        signature: r.signature,
      }));
    },

    markPushed(ids) {
      if (ids.length === 0) return;
      const stmt = db.prepare(
        `UPDATE audit SET pushed = 1 WHERE id IN (${ids.map(() => "?").join(",")})`
      );
      stmt.run(...ids);
    },

    close() {
      db.close();
    },
  };
}
