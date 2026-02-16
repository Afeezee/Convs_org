import React from "react";
import { ThumbsUp, ThumbsDown, HelpCircle } from "lucide-react";

const config = {
  support: {
    icon: ThumbsUp,
    label: "Support",
    bg: "bg-emerald-50 dark:bg-emerald-950/30",
    text: "text-emerald-600 dark:text-emerald-400",
    border: "border-emerald-200 dark:border-emerald-800",
  },
  oppose: {
    icon: ThumbsDown,
    label: "Oppose",
    bg: "bg-red-50 dark:bg-red-950/30",
    text: "text-red-600 dark:text-red-400",
    border: "border-red-200 dark:border-red-800",
  },
  clarification: {
    icon: HelpCircle,
    label: "Clarify",
    bg: "bg-amber-50 dark:bg-amber-950/30",
    text: "text-amber-600 dark:text-amber-400",
    border: "border-amber-200 dark:border-amber-800",
  },
};

export default function StanceBadge({ stance, size = "sm" }) {
  const c = config[stance] || config.clarification;
  const Icon = c.icon;
  const sizeClasses = size === "sm" ? "text-xs px-2 py-0.5 gap-1" : "text-sm px-3 py-1 gap-1.5";

  return (
    <span className={`inline-flex items-center ${sizeClasses} rounded-full border font-medium ${c.bg} ${c.text} ${c.border}`}>
      <Icon className={size === "sm" ? "w-3 h-3" : "w-4 h-4"} />
      {c.label}
    </span>
  );
}