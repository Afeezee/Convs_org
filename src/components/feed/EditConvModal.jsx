import React, { useState, useEffect } from "react";
import { api } from "@/api/client";
import { X, Save, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { motion, AnimatePresence } from "framer-motion";

export default function EditConvModal({ isOpen, onClose, conv, onUpdated }) {
  const [content, setContent] = useState("");
  const [title, setTitle] = useState("");
  const [topics, setTopics] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (conv) {
      setContent(conv.content || "");
      setTitle(conv.title || "");
      setTopics((conv.topics || []).join(", "));
    }
  }, [conv]);

  if (!isOpen || !conv) return null;

  const handleSubmit = async () => {
    if (!content.trim()) return;
    setIsSubmitting(true);

    const topicsArr = topics
      .split(",")
      .map(t => t.trim().replace(/^#/, ""))
      .filter(Boolean);

    try {
      await api.entities.Conv.update(conv.id, {
        content,
        title: conv.type !== "short" ? title : undefined,
        rich_content: conv.type === "long" ? content : (conv.rich_content || undefined),
        topics: topicsArr,
      });
    } catch (err) {
      setIsSubmitting(false);
      // eslint-disable-next-line no-alert
      alert(err.message ?? "Update failed.");
      return;
    }

    setIsSubmitting(false);
    onUpdated?.();
    onClose();
  };

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-50 flex items-center justify-center p-4"
      >
        <div className="absolute inset-0 bg-black/60 backdrop-blur-md" onClick={onClose} />
        <motion.div
          initial={{ scale: 0.95, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          exit={{ scale: 0.95, opacity: 0 }}
          className="relative w-full max-w-lg bg-[var(--convs-card)] rounded-2xl shadow-2xl border border-[var(--convs-border)] flex flex-col max-h-[90vh]"
        >
          <div className="flex items-center justify-between p-4 border-b border-[var(--convs-border)]">
            <h2 className="text-lg font-bold text-[var(--convs-text)]">Edit Conv</h2>
            <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-[var(--convs-bg-tertiary)] transition-colors">
              <X className="w-5 h-5 text-[var(--convs-text-muted)]" />
            </button>
          </div>

          <div className="overflow-y-auto flex-1 p-4 space-y-3">
            {conv.type !== "short" && (
              <Input
                placeholder="Title"
                value={title}
                onChange={e => setTitle(e.target.value)}
                className="bg-[var(--convs-bg-secondary)] border-[var(--convs-border)] text-[var(--convs-text)] placeholder:text-[var(--convs-text-muted)]"
              />
            )}
            <Textarea
              placeholder="Edit your content..."
              value={content}
              onChange={e => setContent(conv.type === "short" ? e.target.value.slice(0, 500) : e.target.value)}
              rows={conv.type === "short" ? 4 : 8}
              className="bg-[var(--convs-bg-secondary)] border-[var(--convs-border)] text-[var(--convs-text)] placeholder:text-[var(--convs-text-muted)] resize-none"
            />
            {conv.type === "short" && (
              <div className="text-right text-xs text-[var(--convs-text-muted)]">{content.length}/500</div>
            )}
            <Input
              placeholder="Topics (comma separated)"
              value={topics}
              onChange={e => setTopics(e.target.value)}
              className="bg-[var(--convs-bg-secondary)] border-[var(--convs-border)] text-[var(--convs-text)] placeholder:text-[var(--convs-text-muted)]"
            />
          </div>

          <div className="flex justify-end gap-2 p-4 border-t border-[var(--convs-border)]">
            <Button variant="ghost" onClick={onClose} className="text-[var(--convs-text-secondary)]">Cancel</Button>
            <Button
              onClick={handleSubmit}
              disabled={!content.trim() || isSubmitting}
              className="bg-[var(--convs-accent)] hover:bg-[var(--convs-accent-hover)] text-white gap-2"
            >
              {isSubmitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
              Save Changes
            </Button>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}