import React from "react";

export default function TopicTag({ topic, onClick, active = false }) {
  return (
    <button
      onClick={() => onClick?.(topic)}
      className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-medium transition-all duration-200 ${
        active
          ? "bg-[var(--convs-accent)] text-white"
          : "bg-[var(--convs-bg-tertiary)] text-[var(--convs-text-secondary)] hover:bg-[var(--convs-accent-light)] hover:text-[var(--convs-accent)]"
      }`}
    >
      #{topic}
    </button>
  );
}