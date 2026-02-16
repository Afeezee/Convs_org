import React from "react";
import { X, Twitter, Facebook, Linkedin, Link as LinkIcon, Check } from "lucide-react";

export default function ShareModal({ isOpen, onClose, conv }) {
  const [copied, setCopied] = React.useState(false);

  if (!isOpen || !conv) return null;

  const convUrl = `${window.location.origin}/ConvDetail?id=${conv.id}`;
  const text = conv.title || conv.content?.slice(0, 120) || "Check out this conv";

  const shareLinks = [
    {
      name: "Twitter / X",
      icon: Twitter,
      url: `https://twitter.com/intent/tweet?text=${encodeURIComponent(text)}&url=${encodeURIComponent(convUrl)}`,
    },
    {
      name: "Facebook",
      icon: Facebook,
      url: `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(convUrl)}`,
    },
    {
      name: "LinkedIn",
      icon: Linkedin,
      url: `https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(convUrl)}`,
    },
  ];

  const handleCopyLink = () => {
    navigator.clipboard.writeText(convUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4" onClick={onClose}>
      <div
        className="w-full max-w-sm rounded-2xl p-5"
        style={{ background: "var(--convs-card)", border: "1px solid var(--convs-border)" }}
        onClick={e => e.stopPropagation()}
      >
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-bold text-[var(--convs-text)]">Share Conv</h3>
          <button onClick={onClose} className="p-1 rounded-lg hover:bg-[var(--convs-bg-tertiary)]">
            <X className="w-4 h-4" style={{ color: "var(--convs-text-muted)" }} />
          </button>
        </div>

        <div className="space-y-2">
          {shareLinks.map(link => (
            <a
              key={link.name}
              href={link.url}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-3 w-full px-4 py-3 rounded-xl text-sm font-medium transition-colors hover:bg-[var(--convs-bg-tertiary)]"
              style={{ color: "var(--convs-text)" }}
            >
              <link.icon className="w-5 h-5" style={{ color: "var(--convs-accent)" }} />
              {link.name}
            </a>
          ))}

          <button
            onClick={handleCopyLink}
            className="flex items-center gap-3 w-full px-4 py-3 rounded-xl text-sm font-medium transition-colors hover:bg-[var(--convs-bg-tertiary)]"
            style={{ color: "var(--convs-text)" }}
          >
            {copied ? (
              <>
                <Check className="w-5 h-5 text-emerald-500" />
                <span className="text-emerald-500">Link copied!</span>
              </>
            ) : (
              <>
                <LinkIcon className="w-5 h-5" style={{ color: "var(--convs-accent)" }} />
                Copy link
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}