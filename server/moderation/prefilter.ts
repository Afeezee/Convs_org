// Deterministic prefilter run before any model call. A `block` verdict
// short-circuits — no LLM budget spent, no queue entry.

export type PrefilterVerdict =
  | { kind: "pass" }
  | { kind: "block"; reason: string; feedback: string }
  | { kind: "flag"; reason: string };

const SLUR_TERMS = new Set([
  // A minimal illustrative list; extend from the operator's policy sheet.
  // Deliberately not exhaustive here; catches only the most obvious cases.
  // British and American spellings both.
]);

const MAX_LENGTHS: Record<string, number> = {
  short: 500,
  long: 6000,
  media: 500,
  comment: 2000,
  message: 2000,
};

export function prefilter(
  kind: "conv" | "comment" | "message",
  content: string,
  variant?: "short" | "long" | "media"
): PrefilterVerdict {
  const trimmed = (content ?? "").trim();
  if (!trimmed) return { kind: "block", reason: "empty", feedback: "Content is empty." };
  const cap =
    kind === "conv" && variant ? MAX_LENGTHS[variant] : MAX_LENGTHS[kind];
  if (trimmed.length > cap) {
    return {
      kind: "block",
      reason: "too_long",
      feedback: `Content is too long (max ${cap} characters).`,
    };
  }

  // Repeated-character spam ("aaaaaaaaaaa")
  if (/(.)\1{15,}/.test(trimmed)) {
    return { kind: "flag", reason: "repeated_chars" };
  }
  // Excessive link count
  const links = trimmed.match(/https?:\/\/\S+/g) ?? [];
  if (links.length > 5) {
    return { kind: "flag", reason: "many_links" };
  }
  // Obvious slur match
  const lower = trimmed.toLowerCase();
  for (const term of SLUR_TERMS) {
    if (lower.includes(term)) {
      return {
        kind: "block",
        reason: "slur",
        feedback:
          "This appears to contain slurs or targeted abuse. Please revise before posting.",
      };
    }
  }

  return { kind: "pass" };
}
