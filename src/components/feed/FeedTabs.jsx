import React from "react";

const TABS = [
  { key: "following", label: "Following" },
  { key: "trending", label: "Trending" },
  { key: "recommended", label: "For You" },
  { key: "debate", label: "Debate" },
];

export default function FeedTabs({ active, onChange }) {
  return (
    <div className="flex border-b border-[var(--convs-border)]">
      {TABS.map(tab => (
        <button
          key={tab.key}
          onClick={() => onChange(tab.key)}
          className={`flex-1 py-3 text-sm font-medium transition-all relative ${
            active === tab.key
              ? "text-[var(--convs-accent)]"
              : "text-[var(--convs-text-muted)] hover:text-[var(--convs-text-secondary)]"
          }`}
        >
          {tab.label}
          {active === tab.key && (
            <span className="absolute bottom-0 left-1/2 -translate-x-1/2 w-8 h-0.5 bg-[var(--convs-accent)] rounded-full" />
          )}
        </button>
      ))}
    </div>
  );
}