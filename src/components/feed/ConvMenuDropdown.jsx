import React, { useState, useRef, useEffect } from "react";
import { MoreHorizontal, Pencil, EyeOff, Flag, Trash2 } from "lucide-react";

export default function ConvMenuDropdown({ conv, isAuthor, onEdit, onHide, onReport, onDelete }) {
  const [open, setOpen] = useState(false);
  const ref = useRef();

  useEffect(() => {
    const handler = (e) => {
      if (ref.current && !ref.current.contains(e.target)) setOpen(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  return (
    <div className="relative" ref={ref}>
      <button
        onClick={(e) => { e.preventDefault(); setOpen(!open); }}
        className="p-1.5 rounded-lg hover:bg-[var(--convs-bg-tertiary)] text-[var(--convs-text-muted)] transition-colors"
      >
        <MoreHorizontal className="w-4 h-4" />
      </button>

      {open && (
        <>
          <div className="fixed inset-0 bg-black/30 backdrop-blur-sm z-40" onClick={() => setOpen(false)} />
          <div
            className="absolute right-0 top-full mt-1 w-44 rounded-xl border shadow-lg z-50 py-1"
            style={{ background: "var(--convs-card)", borderColor: "var(--convs-border)" }}
          >
          {isAuthor && (
            <button
              onClick={() => { setOpen(false); onEdit?.(conv); }}
              className="w-full flex items-center gap-2.5 px-3 py-2 text-sm text-[var(--convs-text)] hover:bg-[var(--convs-bg-tertiary)] transition-colors"
            >
              <Pencil className="w-3.5 h-3.5" />
              Edit Post
            </button>
          )}
          {isAuthor && (
            <button
              onClick={() => { setOpen(false); onDelete?.(conv); }}
              className="w-full flex items-center gap-2.5 px-3 py-2 text-sm text-red-500 hover:bg-red-50 dark:hover:bg-red-950/20 transition-colors"
            >
              <Trash2 className="w-3.5 h-3.5" />
              Delete Post
            </button>
          )}
          <button
            onClick={() => { setOpen(false); onHide?.(conv); }}
            className="w-full flex items-center gap-2.5 px-3 py-2 text-sm text-[var(--convs-text)] hover:bg-[var(--convs-bg-tertiary)] transition-colors"
          >
            <EyeOff className="w-3.5 h-3.5" />
            Hide Post
          </button>
          {!isAuthor && (
            <button
              onClick={() => { setOpen(false); onReport?.(conv); }}
              className="w-full flex items-center gap-2.5 px-3 py-2 text-sm text-red-500 hover:bg-red-50 dark:hover:bg-red-950/20 transition-colors"
            >
              <Flag className="w-3.5 h-3.5" />
              Report Post
            </button>
          )}
        </div>
        </>
      )}
    </div>
  );
}