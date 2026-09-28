import { describe, expect, it } from "vitest";
import { prefilter } from "./prefilter";

describe("prefilter", () => {
  it("blocks empty content", () => {
    expect(prefilter("comment", "").kind).toBe("block");
    expect(prefilter("comment", "   ").kind).toBe("block");
  });
  it("blocks over-length content", () => {
    const long = "a".repeat(2001);
    expect(prefilter("comment", long).kind).toBe("block");
  });
  it("respects per-conv-type caps", () => {
    const shortCap = "a".repeat(501);
    const longOK = "a".repeat(500); // within short cap
    const longCap = "a".repeat(6001);
    expect(prefilter("conv", shortCap, "short").kind).toBe("block");
    expect(prefilter("conv", longOK, "short").kind).toBe("pass");
    expect(prefilter("conv", "a".repeat(6000), "long").kind).toBe("pass");
    expect(prefilter("conv", longCap, "long").kind).toBe("block");
  });
  it("flags repeated-char spam", () => {
    expect(prefilter("comment", "aaaaaaaaaaaaaaaaaaa").kind).toBe("flag");
  });
  it("flags excessive links", () => {
    const links = "https://a.example ".repeat(6);
    expect(prefilter("comment", links).kind).toBe("flag");
  });
  it("passes an ordinary comment", () => {
    expect(prefilter("comment", "This argument lacks evidence.").kind).toBe("pass");
  });
});
