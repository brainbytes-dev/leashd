import { describe, it, expect } from "vitest";
import { formatAmount } from "@/lib/leash/format";

describe("formatAmount", () => {
  it("renders sats as grouped integers", () => {
    expect(formatAmount({ unit: "sat", value: 1234567 })).toBe("1,234,567 sat");
  });
  it("renders usd_cent as dollars, never as sat", () => {
    expect(formatAmount({ unit: "usd_cent", value: 400000 })).toBe("$4,000.00");
    expect(formatAmount({ unit: "usd_cent", value: 7 })).toBe("$0.07");
    expect(formatAmount({ unit: "usd_cent", value: 0 })).toBe("$0.00");
  });
  it("renders a missing amount as an em dash", () => {
    expect(formatAmount(null)).toBe("—");
    expect(formatAmount(undefined)).toBe("—");
  });
});
