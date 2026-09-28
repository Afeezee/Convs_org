import React, { useState, useRef } from "react";
import { api } from "@/api/client";
import { X, Image, Type, FileText, Send, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { motion, AnimatePresence } from "framer-motion";

const TYPES = [
  { key: "short", icon: Type, label: "Short", desc: "Up to 500 characters" },
  { key: "long", icon: FileText, label: "Long", desc: "Rich text article" },
  { key: "media", icon: Image, label: "Media", desc: "Image or video" },
];

export default function CreateConvModal({ isOpen, onClose, user, onCreated }) {
  const [type, setType] = useState("short");
  const [content, setContent] = useState("");
  const [title, setTitle] = useState("");
  const [topics, setTopics] = useState("");
  const [mediaFile, setMediaFile] = useState(null);
  const [mediaPreview, setMediaPreview] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [moderationFeedback, setModerationFeedback] = useState(null);
  const fileRef = useRef();

  if (!isOpen) return null;

  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      setMediaFile(file);
      setMediaPreview(URL.createObjectURL(file));
    }
  };

  const handleSubmit = async () => {
    if (!content.trim()) return;
    setIsSubmitting(true);
    setModerationFeedback(null);

    let mediaUrl = "";
    if (mediaFile) {
      try {
        const upload = await api.integrations.UploadFile({ file: mediaFile });
        mediaUrl = upload.file_url;
      } catch (err) {
        setModerationFeedback(err.message ?? "Upload failed.");
        setIsSubmitting(false);
        return;
      }
    }

    const topicsArr = topics
      .split(",")
      .map(t => t.trim().replace(/^#/, ""))
      .filter(Boolean);

    let conv;
    try {
      conv = await api.entities.Conv.create({
        type,
        title: type !== "short" ? title : undefined,
        content,
        rich_content: type === "long" ? content : undefined,
        media_url: mediaUrl || undefined,
        media_type: mediaFile ? "image" : "none",
        topics: topicsArr,
      });
    } catch (err) {
      // Server-enforced moderation returns 422 with a human-readable message.
      setModerationFeedback(err.message ?? "Something went wrong. Please try again.");
      setIsSubmitting(false);
      return;
    }

    if (conv?._warning) {
      // Convs warn still publishes — surface the note in the same amber box
      // and close as today.
      setModerationFeedback(conv._warning);
    }
    if (conv?._queued) {
      setModerationFeedback(
        "Your conv is queued for review and will be visible once approved."
      );
    }

    setContent("");
    setTitle("");
    setTopics("");
    setMediaFile(null);
    setMediaPreview(null);
    setIsSubmitting(false);
    onCreated?.(conv);
    if (!conv?._warning && !conv?._queued) onClose();
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
          {/* Header */}
          <div className="flex items-center justify-between p-4 border-b border-[var(--convs-border)] flex-shrink-0">
            <h2 className="text-lg font-bold text-[var(--convs-text)]">Create Conv</h2>
            <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-[var(--convs-bg-tertiary)] transition-colors">
              <X className="w-5 h-5 text-[var(--convs-text-muted)]" />
            </button>
          </div>

          {/* Scrollable Content */}
          <div className="overflow-y-auto flex-1">
            {/* Type Selector */}
            <div className="flex gap-2 p-4 pb-0">
            {TYPES.map(t => (
              <button
                key={t.key}
                onClick={() => setType(t.key)}
                className={`flex-1 flex flex-col items-center gap-1 py-2.5 px-3 rounded-xl text-xs font-medium transition-all border ${
                  type === t.key
                    ? "bg-[var(--convs-accent-light)] text-[var(--convs-accent)] border-[var(--convs-accent)]"
                    : "bg-[var(--convs-bg-secondary)] text-[var(--convs-text-secondary)] border-transparent hover:border-[var(--convs-border)]"
                }`}
              >
                <t.icon className="w-4 h-4" />
                {t.label}
              </button>
            ))}
          </div>

          {/* Form */}
          <div className="p-4 space-y-3">
            {type !== "short" && (
              <Input
                placeholder="Title"
                value={title}
                onChange={e => setTitle(e.target.value)}
                className="bg-[var(--convs-bg-secondary)] border-[var(--convs-border)] text-[var(--convs-text)] placeholder:text-[var(--convs-text-muted)]"
              />
            )}
            <Textarea
              placeholder={type === "short" ? "What's your claim? (500 chars)" : "Write your argument..."}
              value={content}
              onChange={e => setContent(type === "short" ? e.target.value.slice(0, 500) : e.target.value)}
              rows={type === "short" ? 4 : 8}
              className="bg-[var(--convs-bg-secondary)] border-[var(--convs-border)] text-[var(--convs-text)] placeholder:text-[var(--convs-text-muted)] resize-none"
            />
            {type === "short" && (
              <div className="text-right text-xs text-[var(--convs-text-muted)]">
                {content.length}/500
              </div>
            )}

            {type === "media" && (
              <div>
                {mediaPreview ? (
                  <div className="relative rounded-xl overflow-hidden">
                    <img src={mediaPreview} alt="" className="w-full max-h-48 object-cover" />
                    <button
                      onClick={() => { setMediaFile(null); setMediaPreview(null); }}
                      className="absolute top-2 right-2 p-1 bg-black/60 rounded-full text-white"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                ) : (
                  <button
                    onClick={() => fileRef.current?.click()}
                    className="w-full py-8 border-2 border-dashed border-[var(--convs-border)] rounded-xl text-[var(--convs-text-muted)] hover:border-[var(--convs-accent)] hover:text-[var(--convs-accent)] transition-colors text-sm"
                  >
                    Click to upload image
                  </button>
                )}
                <input ref={fileRef} type="file" accept="image/*" onChange={handleFileChange} className="hidden" />
              </div>
            )}

            <Input
              placeholder="Topics (comma separated, e.g. AI, Philosophy)"
              value={topics}
              onChange={e => setTopics(e.target.value)}
              className="bg-[var(--convs-bg-secondary)] border-[var(--convs-border)] text-[var(--convs-text)] placeholder:text-[var(--convs-text-muted)]"
            />

            {moderationFeedback && (
              <div className="p-3 rounded-xl bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800 text-amber-700 dark:text-amber-300 text-sm whitespace-pre-line">
                {moderationFeedback}
              </div>
            )}
          </div>

          </div>

          {/* Footer */}
          <div className="flex justify-end gap-2 p-4 border-t border-[var(--convs-border)] flex-shrink-0 bg-[var(--convs-card)]">
            <Button variant="ghost" onClick={onClose} className="text-[var(--convs-text-secondary)]">
              Cancel
            </Button>
            <Button
              onClick={handleSubmit}
              disabled={!content.trim() || isSubmitting}
              className="bg-[var(--convs-accent)] hover:bg-[var(--convs-accent-hover)] text-white gap-2"
            >
              {isSubmitting ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Send className="w-4 h-4" />
              )}
              Publish
            </Button>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}
