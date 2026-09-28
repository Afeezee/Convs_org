import { describe, expect, it } from "vitest";
import { inputs } from "./inputs";
import { FLAWS } from "../src/shared/tags.js";

describe("Conv inputs", () => {
  const s = inputs.Conv!.create!;
  it("caps short at 500 chars", () => {
    expect(s.safeParse({ type: "short", content: "a".repeat(501) }).success).toBe(false);
    expect(s.safeParse({ type: "short", content: "a".repeat(500) }).success).toBe(true);
  });
  it("caps long at 6000 chars", () => {
    expect(s.safeParse({ type: "long", content: "a".repeat(6001) }).success).toBe(false);
    expect(s.safeParse({ type: "long", content: "a".repeat(6000) }).success).toBe(true);
  });
  it("rejects invalid media_type enum", () => {
    expect(
      s.safeParse({ type: "media", content: "x", media_type: "audio" }).success
    ).toBe(false);
  });
});

describe("Comment inputs", () => {
  const s = inputs.Comment!.create!;
  it("rejects unknown flaw_tag", () => {
    const r = s.safeParse({
      conv_id: "00000000-0000-0000-0000-000000000000",
      stance: "oppose",
      content: "x",
      flaw_tag: "Made Up Tag",
    });
    expect(r.success).toBe(false);
  });
  it("accepts a real flaw_tag", () => {
    const r = s.safeParse({
      conv_id: "00000000-0000-0000-0000-000000000000",
      stance: "oppose",
      content: "x",
      flaw_tag: FLAWS[0],
    });
    expect(r.success).toBe(true);
  });
  it("rejects a non-uuid conv_id", () => {
    const r = s.safeParse({
      conv_id: "not-a-uuid",
      stance: "support",
      content: "x",
    });
    expect(r.success).toBe(false);
  });
});

describe("Message inputs", () => {
  const s = inputs.Message!.create!;
  it("requires a valid email as receiver", () => {
    expect(
      s.safeParse({
        conversation_id: "c",
        receiver_email: "not-email",
        content: "hi",
      }).success
    ).toBe(false);
  });
});
