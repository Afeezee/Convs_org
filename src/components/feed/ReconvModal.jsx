import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { X, Repeat2, Loader2 } from "lucide-react";
import { Textarea } from "@/components/ui/textarea";
import Avatar from "../shared/Avatar";
import moment from "moment";

export default function ReconvModal({ isOpen, onClose, conv, user, onReconved }) {
  const [thought, setThought] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  if (!isOpen || !conv || !user) return null;

  const handleReconv = async () => {
    setIsSubmitting(true);
    await base44.entities.Reconv.create({
      user_email: user.email,
      user_name: user.full_name,
      original_conv_id: conv.id,
      original_author_email: conv.author_email,
      original_author_name: conv.author_name,
      thought: thought.trim(),
    });
    setThought("");
    setIsSubmitting(false);
    onReconved?.();
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-md p-4" onClick={onClose}>
      <div
        className="w-full max-w-lg rounded-2xl p-5"
        style={{ background: "var(--convs-card)", border: "1px solid var(--convs-border)" }}
        onClick={e => e.stopPropagation()}
      >
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-bold text-[var(--convs-text)] flex items-center gap-2">
            <Repeat2 className="w-5 h-5" style={{ color: "var(--convs-accent)" }} />
            Reconv
          </h3>
          <button onClick={onClose} className="p-1 rounded-lg hover:bg-[var(--convs-bg-tertiary)]">
            <X className="w-4 h-4" style={{ color: "var(--convs-text-muted)" }} />
          </button>
        </div>

        {/* Optional thought */}
        <Textarea
          placeholder="Add your thoughts (optional)..."
          value={thought}
          onChange={e => setThought(e.target.value)}
          rows={2}
          className="mb-4 bg-[var(--convs-bg-secondary)] border-[var(--convs-border)] text-[var(--convs-text)] placeholder:text-[var(--convs-text-muted)] resize-none"
        />

        {/* Original conv preview */}
        <div className="rounded-xl p-4 mb-4" style={{ background: "var(--convs-bg-secondary)", border: "1px solid var(--convs-border)" }}>
          <div className="flex items-center gap-2 mb-2">
            <Avatar name={conv.author_name} size="xs" />
            <span className="text-sm font-semibold" style={{ color: "var(--convs-text)" }}>{conv.author_name}</span>
            <span className="text-xs" style={{ color: "var(--convs-text-muted)" }}>· {moment(conv.created_date).fromNow()}</span>
          </div>
          {conv.title && <p className="text-sm font-bold mb-1" style={{ color: "var(--convs-text)" }}>{conv.title}</p>}
          <p className="text-sm line-clamp-4" style={{ color: "var(--convs-text-secondary)" }}>
            {conv.content}
          </p>
        </div>

        <div className="flex justify-end gap-2">
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-xl text-sm font-medium transition-colors hover:bg-[var(--convs-bg-tertiary)]"
            style={{ color: "var(--convs-text-secondary)" }}
          >
            Cancel
          </button>
          <button
            onClick={handleReconv}
            disabled={isSubmitting}
            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-sm font-medium transition-colors disabled:opacity-50"
            style={{ background: "#6366F1", color: "#FFFFFF" }}
          >
            {isSubmitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Repeat2 className="w-4 h-4" />}
            Reconv
          </button>
        </div>
      </div>
    </div>
  );
}