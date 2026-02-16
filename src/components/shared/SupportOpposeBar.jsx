import React from "react";

export default function SupportOpposeBar({ support = 0, oppose = 0, height = "h-1.5" }) {
  const total = support + oppose;
  const supportPct = total > 0 ? (support / total) * 100 : 50;
  const opposePct = total > 0 ? (oppose / total) * 100 : 50;

  return (
    <div className="flex items-center gap-2 w-full">
      <span className="text-xs font-medium text-emerald-500 min-w-[28px]">{support}</span>
      <div className={`flex-1 flex ${height} rounded-full overflow-hidden bg-[var(--convs-bg-tertiary)]`}>
        {total > 0 && (
          <>
            <div
              className="bg-emerald-500 transition-all duration-500 ease-out"
              style={{ width: `${supportPct}%` }}
            />
            <div
              className="bg-red-500 transition-all duration-500 ease-out"
              style={{ width: `${opposePct}%` }}
            />
          </>
        )}
      </div>
      <span className="text-xs font-medium text-red-500 min-w-[28px] text-right">{oppose}</span>
    </div>
  );
}