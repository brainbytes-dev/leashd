import { describe, it, expect } from "vitest";
import { amountToAuditColumns, auditColumnsToAmount } from "@/lib/leash/api";

describe("audit amount mapping", () => {
  it("maps sats to amount_msat", () => {
    expect(amountToAuditColumns({ unit: "sat", value: 21 })).toEqual({ amountMsat: 21, amountMinor: null, currency: "sat" });
  });
  it("maps usd_cent to amount_minor", () => {
    expect(amountToAuditColumns({ unit: "usd_cent", value: 7 })).toEqual({ amountMsat: null, amountMinor: 7, currency: "usd_cent" });
  });
  it("round-trips both units", () => {
    expect(auditColumnsToAmount({ amountMsat: 21, amountMinor: null, currency: "sat" })).toEqual({ unit: "sat", value: 21 });
    expect(auditColumnsToAmount({ amountMsat: null, amountMinor: 7, currency: "usd_cent" })).toEqual({ unit: "usd_cent", value: 7 });
    expect(auditColumnsToAmount({ amountMsat: null, amountMinor: null, currency: null })).toBeNull();
  });
});
