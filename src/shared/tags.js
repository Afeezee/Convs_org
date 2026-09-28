// Fixed vocabularies for comment flaw/strength tags. Shared between the UI
// (CommentForm) and the server validation so a change in one place propagates.
// Text is unchanged from the original CommentForm.jsx.

export const FLAWS = Object.freeze([
  "Ad Hominem",
  "Strawman",
  "False Dilemma",
  "Slippery Slope",
  "Circular Reasoning",
  "Hasty Generalisation",
  "Appeal to Authority",
  "Appeal to Emotion",
  "Post Hoc",
  "Red Herring",
  "No Evidence",
  "Weak Evidence",
  "Anecdotal",
  "Misinterpreted Data",
  "Unverified Source",
  "Oversimplification",
  "Unsupported Assumption",
  "Internal Contradiction",
  "Ambiguity",
  "Off-topic",
  "Non Sequitur",
]);

export const STRENGTHS = Object.freeze([
  "Strong Evidence",
  "Empirical Support",
  "Clear Logical Flow",
  "Balanced Perspective",
  "Credible Source",
  "Nuanced Analysis",
]);

export const FLAWS_SET = new Set(FLAWS);
export const STRENGTHS_SET = new Set(STRENGTHS);
