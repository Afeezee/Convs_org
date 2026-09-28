import { describe, expect, it } from "vitest";
import { decide, normaliseVerdict, THRESHOLDS } from "./decide";

const base = {
  toxicity_score: 0,
  personal_attack: false,
  promotes_violence_or_self_harm: false,
  manipulative: false,
  constructiveness_score: 1,
  quality_score: 0.5,
  tag_match_score: 1,
  suggested_tag: null,
  feedback_message: "",
};

describe("decide", () => {
  it("blocks at the toxicity threshold and above", () => {
    expect(decide({ ...base, toxicity_score: THRESHOLDS.toxicityBlock })).toBe("block");
    expect(decide({ ...base, toxicity_score: 0.99 })).toBe("block");
  });
  it("does not block just below the toxicity threshold on its own", () => {
    expect(decide({ ...base, toxicity_score: THRESHOLDS.toxicityBlock - 0.01 })).toBe("approve");
  });
  it("blocks on personal attack alone", () => {
    expect(decide({ ...base, personal_attack: true })).toBe("block");
  });
  it("blocks on violence / self-harm alone", () => {
    expect(decide({ ...base, promotes_violence_or_self_harm: true })).toBe("block");
  });
  it("warns on low constructiveness", () => {
    expect(
      decide({
        ...base,
        constructiveness_score: THRESHOLDS.constructivenessWarn - 0.01,
      })
    ).toBe("warn");
    expect(
      decide({
        ...base,
        constructiveness_score: THRESHOLDS.constructivenessWarn,
      })
    ).toBe("approve");
  });
  it("warns on manipulative content", () => {
    expect(decide({ ...base, manipulative: true })).toBe("warn");
  });
  it("warns on tag mismatch", () => {
    expect(
      decide({ ...base, tag_match_score: THRESHOLDS.tagMatchWarn - 0.01 })
    ).toBe("warn");
    expect(decide({ ...base, tag_match_score: THRESHOLDS.tagMatchWarn })).toBe("approve");
  });
  it("prefers block over warn when both apply", () => {
    expect(
      decide({
        ...base,
        toxicity_score: 0.95,
        constructiveness_score: 0.1,
        manipulative: true,
      })
    ).toBe("block");
  });
});

describe("normaliseVerdict", () => {
  it("clamps out-of-range scores", () => {
    const v = normaliseVerdict({
      toxicity_score: 5,
      personal_attack: false,
      promotes_violence_or_self_harm: false,
      manipulative: false,
      constructiveness_score: -1,
      quality_score: 2,
      tag_match_score: -0.1,
      suggested_tag: "",
      feedback_message: "",
    });
    expect(v.toxicity_score).toBe(1);
    expect(v.constructiveness_score).toBe(0);
    expect(v.quality_score).toBe(1);
    expect(v.tag_match_score).toBe(0);
    expect(v.suggested_tag).toBeNull();
  });
  it("rejects missing toxicity_score", () => {
    expect(() =>
      normaliseVerdict({
        personal_attack: false,
        promotes_violence_or_self_harm: false,
      })
    ).toThrow();
  });
  it("rejects non-boolean personal_attack", () => {
    expect(() =>
      normaliseVerdict({
        toxicity_score: 0.1,
        personal_attack: "yes",
        promotes_violence_or_self_harm: false,
      })
    ).toThrow();
  });
  it("defaults missing tag_match_score to 1", () => {
    const v = normaliseVerdict({
      toxicity_score: 0.1,
      personal_attack: false,
      promotes_violence_or_self_harm: false,
    });
    expect(v.tag_match_score).toBe(1);
  });
});
