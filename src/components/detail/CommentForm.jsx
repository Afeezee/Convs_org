import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Send, Loader2, ThumbsUp, ThumbsDown, HelpCircle, Link as LinkIcon } from "lucide-react";

const FLAWS = [
  "Ad Hominem", "Strawman", "False Dilemma", "Slippery Slope", "Circular Reasoning",
  "Hasty Generalisation", "Appeal to Authority", "Appeal to Emotion", "Post Hoc", "Red Herring",
  "No Evidence", "Weak Evidence", "Anecdotal", "Misinterpreted Data", "Unverified Source",
  "Oversimplification", "Unsupported Assumption", "Internal Contradiction", "Ambiguity",
  "Off-topic", "Non Sequitur",
];

const STRENGTHS = [
  "Strong Evidence", "Empirical Support", "Clear Logical Flow",
  "Balanced Perspective", "Credible Source", "Nuanced Analysis",
];

export default function CommentForm({ convId, user, highlightedText, onCommented, parentCommentId }) {
  const [stance, setStance] = useState("");
  const [content, setContent] = useState("");
  const [flawTag, setFlawTag] = useState("");
  const [strengthTag, setStrengthTag] = useState("");
  const [evidenceUrl, setEvidenceUrl] = useState("");
  const [showEvidence, setShowEvidence] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [moderationMsg, setModerationMsg] = useState(null);

  const handleSubmit = async () => {
    if (!stance || !content.trim()) return;
    setIsSubmitting(true);
    setModerationMsg(null);

    // Moderate
    const mod = await base44.integrations.Core.InvokeLLM({
      prompt: `Moderate this debate comment: "${content}"
Stance: ${stance}
${flawTag ? `Flaw tag: ${flawTag}` : ""}
Rate constructiveness 0-1, detect personal attacks, check if flaw tag matches content.`,
      response_json_schema: {
        type: "object",
        properties: {
          constructiveness_score: { type: "number" },
          has_personal_attack: { type: "boolean" },
          flaw_match: { type: "boolean" },
          action: { type: "string", enum: ["approve", "warn", "block"] },
          feedback: { type: "string" },
        },
      },
    });

    if (mod.action === "block") {
      setModerationMsg(mod.feedback);
      setIsSubmitting(false);
      return;
    }

    await base44.entities.Comment.create({
      conv_id: convId,
      parent_comment_id: parentCommentId || "",
      author_email: user.email,
      author_name: user.full_name,
      stance,
      content,
      highlighted_text: highlightedText || "",
      flaw_tag: stance === "oppose" ? flawTag : "",
      strength_tag: stance === "support" ? strengthTag : "",
      evidence_url: evidenceUrl,
      constructiveness_score: mod.constructiveness_score || 0.5,
      status: "published",
    });

    setContent("");
    setStance("");
    setFlawTag("");
    setStrengthTag("");
    setEvidenceUrl("");
    setShowEvidence(false);
    setIsSubmitting(false);
    onCommented?.();
  };

  return (
    <div className="space-y-3">
      {highlightedText && (
        <div className="px-3 py-2 rounded-lg bg-[var(--convs-accent-light)] border-l-2 border-[var(--convs-accent)] text-sm text-[var(--convs-text-secondary)] italic">
          "{highlightedText}"
        </div>
      )}

      {/* Stance Selector */}
      <div className="flex gap-2">
        {[
          { key: "support", icon: ThumbsUp, label: "Support", color: "emerald" },
          { key: "oppose", icon: ThumbsDown, label: "Oppose", color: "red" },
          { key: "clarification", icon: HelpCircle, label: "Clarify", color: "amber" },
        ].map(s => (
          <button
            key={s.key}
            onClick={() => setStance(s.key)}
            className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-sm font-medium border transition-all ${
              stance === s.key
                ? s.color === "emerald"
                  ? "bg-emerald-50 dark:bg-emerald-950/30 text-emerald-600 dark:text-emerald-400 border-emerald-300"
                  : s.color === "red"
                  ? "bg-red-50 dark:bg-red-950/30 text-red-600 dark:text-red-400 border-red-300"
                  : "bg-amber-50 dark:bg-amber-950/30 text-amber-600 dark:text-amber-400 border-amber-300"
                : "bg-[var(--convs-bg-secondary)] text-[var(--convs-text-secondary)] border-[var(--convs-border)] hover:border-[var(--convs-text-muted)]"
            }`}
          >
            <s.icon className="w-4 h-4" />
            {s.label}
          </button>
        ))}
      </div>

      {/* Flaw / Strength Tag */}
      {stance === "oppose" && (
        <Select value={flawTag} onValueChange={setFlawTag}>
          <SelectTrigger className="bg-[var(--convs-bg-secondary)] border-[var(--convs-border)] text-[var(--convs-text)]">
            <SelectValue placeholder="Select a flaw..." />
          </SelectTrigger>
          <SelectContent>
            {FLAWS.map(f => (
              <SelectItem key={f} value={f}>{f}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      )}
      {stance === "support" && (
        <Select value={strengthTag} onValueChange={setStrengthTag}>
          <SelectTrigger className="bg-[var(--convs-bg-secondary)] border-[var(--convs-border)] text-[var(--convs-text)]">
            <SelectValue placeholder="Select a strength..." />
          </SelectTrigger>
          <SelectContent>
            {STRENGTHS.map(s => (
              <SelectItem key={s} value={s}>{s}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      )}

      {/* Content */}
      <Textarea
        placeholder="Write your argument..."
        value={content}
        onChange={e => setContent(e.target.value)}
        rows={3}
        className="bg-[var(--convs-bg-secondary)] border-[var(--convs-border)] text-[var(--convs-text)] placeholder:text-[var(--convs-text-muted)] resize-none"
      />

      {/* Evidence */}
      {showEvidence && (
        <div className="flex items-center gap-2">
          <LinkIcon className="w-4 h-4 text-[var(--convs-text-muted)]" />
          <Input
            placeholder="Evidence URL"
            value={evidenceUrl}
            onChange={e => setEvidenceUrl(e.target.value)}
            className="bg-[var(--convs-bg-secondary)] border-[var(--convs-border)] text-[var(--convs-text)]"
          />
        </div>
      )}

      {moderationMsg && (
        <div className="p-3 rounded-lg bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-800 text-red-700 dark:text-red-300 text-sm">
          {moderationMsg}
        </div>
      )}

      {/* Actions */}
      <div className="flex items-center justify-between">
        <button
          onClick={() => setShowEvidence(!showEvidence)}
          className="text-xs text-[var(--convs-text-muted)] hover:text-[var(--convs-accent)] transition-colors"
        >
          + Add evidence
        </button>
        <Button
          onClick={handleSubmit}
          disabled={!stance || !content.trim() || isSubmitting}
          size="sm"
          className="bg-[var(--convs-accent)] hover:bg-[var(--convs-accent-hover)] text-white gap-1.5"
        >
          {isSubmitting ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Send className="w-3.5 h-3.5" />}
          Post
        </Button>
      </div>
    </div>
  );
}