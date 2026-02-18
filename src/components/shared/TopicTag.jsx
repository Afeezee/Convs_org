import React from "react";
import { useNavigate } from "react-router-dom";
import { createPageUrl } from "@/utils";

export default function TopicTag({ topic, onClick, active = false, clickable = true }) {
  const navigate = useNavigate();

  const handleClick = () => {
    if (onClick) {
      onClick(topic);
    } else if (clickable) {
      navigate(createPageUrl("Explore") + `?topic=${encodeURIComponent(topic)}`);
    }
  };

  return (
    <button
      onClick={handleClick}
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