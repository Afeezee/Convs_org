import { describe, expect, it } from "vitest";
import { _keys } from "./ledger";

describe("bucket keys", () => {
  it("minute key uses UTC minute granularity", () => {
    const at = new Date(Date.UTC(2026, 8, 26, 14, 5, 30));
    expect(_keys.minuteKey("rpm", at)).toBe("rpm:202609261405");
  });
  it("day key uses UTC day granularity", () => {
    const at = new Date(Date.UTC(2026, 8, 26, 14, 5, 30));
    expect(_keys.dayKey("tpd", at)).toBe("tpd:20260926");
  });
});
