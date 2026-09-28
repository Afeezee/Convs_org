// Pure decision function — never asks the model for an action. Given the
// model's structured verdict, this maps to approve/warn/block using the
// thresholds in this file. Missing/malformed critical fields fail closed
// (treated by callers as needing repair-retry then queue).

export const THRESHOLDS = {
  toxicityBlock: 0.85,
  constructivenessWarn: 0.4,
  tagMatchWarn: 0.4,
} as const;

export interface Verdict {
  toxicity_score: number;
  personal_attack: boolean;
  promotes_violence_or_self_harm: boolean;
  manipulative: boolean;
  constructiveness_score: number;
  quality_score: number;
  tag_match_score: number;
  suggested_tag: string | null;
  feedback_message: string;
}

export type Action = "approve" | "warn" | "block";

function clamp01(n: unknown): number {
  const x = Number(n);
  if (!Number.isFinite(x)) return NaN;
  if (x < 0) return 0;
  if (x > 1) return 1;
  return x;
}

/** Normalise a raw parsed object; throws if any critical field is missing. */
export function normaliseVerdict(raw: unknown): Verdict {
  if (!raw || typeof raw !== "object") throw new Error("verdict not an object");
  const r = raw as Record<string, unknown>;
  const tox = clamp01(r.toxicity_score);
  if (!Number.isFinite(tox)) throw new Error("toxicity_score missing");
  if (typeof r.personal_attack !== "boolean")
    throw new Error("personal_attack missing");
  if (typeof r.promotes_violence_or_self_harm !== "boolean")
    throw new Error("promotes_violence_or_self_harm missing");
  return {
    toxicity_score: tox,
    personal_attack: r.personal_attack,
    promotes_violence_or_self_harm: r.promotes_violence_or_self_harm,
    manipulative: Boolean(r.manipulative),
    constructiveness_score: clamp01(r.constructiveness_score) || 0,
    quality_score: clamp01(r.quality_score) || 0,
    tag_match_score: r.tag_match_score === undefined ? 1 : clamp01(r.tag_match_score) || 0,
    suggested_tag:
      typeof r.suggested_tag === "string" && r.suggested_tag.length
        ? r.suggested_tag
        : null,
    feedback_message:
      typeof r.feedback_message === "string" ? r.feedback_message : "",
  };
}

export function decide(v: Verdict): Action {
  if (
    v.toxicity_score >= THRESHOLDS.toxicityBlock ||
    v.personal_attack ||
    v.promotes_violence_or_self_harm
  ) {
    return "block";
  }
  if (
    v.constructiveness_score < THRESHOLDS.constructivenessWarn ||
    v.manipulative ||
    v.tag_match_score < THRESHOLDS.tagMatchWarn
  ) {
    return "warn";
  }
  return "approve";
}
