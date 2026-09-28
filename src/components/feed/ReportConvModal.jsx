import React, { useState } from "react";
import { api } from "@/api/client";
import { X, Flag, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { motion, AnimatePresence } from "framer-motion";

const REASONS = [
  { key: "hate_speech", label: "Hate Speech" },
  { key: "harassment", label: "Harassment" },
  { key: "misinformation", label: "Misinformation" },
  { key: "spam", label: "Spam" },
  { key: "inappropriate", label: "Inappropriate Content" },
  { key: "other", label: "Other" },
];

export default function ReportConvModal({ isOpen, onClose, conv, user }) {
  const [reason, setReason] = useState("");
  const [details, setDetails] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  if (!isOpen || !conv) return null;

  const handleSubmit = async () => {
    if (!reason) return;
    setIsSubmitting(true);

    try {
      await api.entities.Report.create({
        conv_id: conv.id,
        conv_title: conv.title || conv.content?.slice(0, 100),
        conv_author_name: conv.author_name,
        conv_author_email: conv.author_email,
        reason,
        details: details || undefined,
      });
    } catch (err) {
      setIsSubmitting(false);
      // eslint-disable-next-line no-alert
      alert(err.message ?? "Report failed.");
      return;
    }

    setIsSubmitting(false);
    setSubmitted(true);
  };

  const handleClose = () => {
    setReason("");
    setDetails("");
    setSubmitted(false);
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
        <div className="absolute inset-0 bg-black/60 backdrop-blur-md" onClick={handleClose} />
        <motion.div
          initial={{ scale: 0.95, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          exit={{ scale: 0.95, opacity: 0 }}
          className="relative w-full max-w-md bg-[var(--convs-card)] rounded-2xl shadow-2xl border border-[var(--convs-border)]"
        >
          <div className="flex items-center justify-between p-4 border-b border-[var(--convs-border)]">
            <div className="flex items-center gap-2">
              <Flag className="w-4 h-4 text-red-500" />
              <h2 className="text-lg font-bold text-[var(--convs-text)]">Report Post</h2>
            </div>
            <button onClick={handleClose} className="p-1.5 rounded-lg hover:bg-[var(--convs-bg-tertiary)] transition-colors">
              <X className="w-5 h-5 text-[var(--convs-text-muted)]" />
            </button>
          </div>

          {submitted ? (
            <div className="p-8 text-center">
              <div className="w-12 h-12 rounded-full bg-emerald-100 dark:bg-emerald-950/30 flex items-center justify-center mx-auto mb-3">
                <Flag className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
              </div>
              <h3 className="font-semibold text-[var(--convs-text)] mb-1">Report Submitted</h3>
              <p className="text-sm text-[var(--convs-text-muted)] mb-4">Thank you. Our team will review this report.</p>
              <Button onClick={handleClose} className="bg-[var(--convs-accent)] text-white">Done</Button>
            </div>
          ) : (
            <>
              <div className="p-4 space-y-4">
                <div>
                  <p className="text-sm font-medium text-[var(--convs-text)] mb-2">Why are you reporting this post?</p>
                  <div className="grid grid-cols-2 gap-2">
                    {REASONS.map(r => (
                      <button
                        key={r.key}
                        onClick={() => setReason(r.key)}
                        className={`px-3 py-2 rounded-xl text-xs font-medium transition-all border ${
                          reason === r.key
                            ? "bg-red-50 dark:bg-red-950/30 text-red-600 dark:text-red-400 border-red-300 dark:border-red-800"
                            : "bg-[var(--convs-bg-secondary)] text-[var(--convs-text-secondary)] border-transparent hover:border-[var(--convs-border)]"
                        }`}
                      >
                        {r.label}
                      </button>
                    ))}
                  </div>
                </div>
                <Textarea
                  placeholder="Additional details (optional)..."
                  value={details}
                  onChange={e => setDetails(e.target.value)}
                  rows={3}
                  className="bg-[var(--convs-bg-secondary)] border-[var(--convs-border)] text-[var(--convs-text)] placeholder:text-[var(--convs-text-muted)] resize-none"
                />
              </div>
              <div className="flex justify-end gap-2 p-4 border-t border-[var(--convs-border)]">
                <Button variant="ghost" onClick={handleClose} className="text-[var(--convs-text-secondary)]">Cancel</Button>
                <Button
                  onClick={handleSubmit}
                  disabled={!reason || isSubmitting}
                  className="bg-red-500 hover:bg-red-600 text-white gap-2"
                >
                  {isSubmitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Flag className="w-4 h-4" />}
                  Submit Report
                </Button>
              </div>
            </>
          )}
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}