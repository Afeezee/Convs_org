import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { Link } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { Search, Eye, Trash2, Ban, CheckCircle } from "lucide-react";
import { Input } from "@/components/ui/input";
import Avatar from "@/components/shared/Avatar";
import moment from "moment";
import { useQueryClient } from "@tanstack/react-query";

export default function AdminContent({ convs, comments }) {
  const [search, setSearch] = useState("");
  const [tab, setTab] = useState("convs");
  const queryClient = useQueryClient();

  const filteredConvs = convs.filter(c =>
    (c.content || "").toLowerCase().includes(search.toLowerCase()) ||
    (c.title || "").toLowerCase().includes(search.toLowerCase()) ||
    (c.author_name || "").toLowerCase().includes(search.toLowerCase())
  );

  const filteredComments = comments.filter(c =>
    (c.content || "").toLowerCase().includes(search.toLowerCase()) ||
    (c.author_name || "").toLowerCase().includes(search.toLowerCase())
  );

  const handleConvStatus = async (conv, status) => {
    await base44.entities.Conv.update(conv.id, { status });
    queryClient.invalidateQueries({ queryKey: ["admin-convs"] });
  };

  const handleDeleteConv = async (conv) => {
    if (!window.confirm("Delete this conv permanently?")) return;
    await base44.entities.Conv.delete(conv.id);
    queryClient.invalidateQueries({ queryKey: ["admin-convs"] });
  };

  const handleDeleteComment = async (comment) => {
    if (!window.confirm("Delete this comment permanently?")) return;
    await base44.entities.Comment.delete(comment.id);
    queryClient.invalidateQueries({ queryKey: ["admin-comments"] });
  };

  const statusBadge = (status) => {
    const styles = {
      published: "bg-emerald-100 text-emerald-700 dark:bg-emerald-950/30 dark:text-emerald-400",
      moderated: "bg-red-100 text-red-700 dark:bg-red-950/30 dark:text-red-400",
      draft: "bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400",
    };
    return (
      <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${styles[status] || styles.draft}`}>
        {status}
      </span>
    );
  };

  return (
    <div className="space-y-4">
      <div className="flex gap-3 items-center">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[var(--convs-text-muted)]" />
          <Input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Search content..."
            className="pl-9 bg-[var(--convs-bg-secondary)] border-[var(--convs-border)] text-[var(--convs-text)]"
          />
        </div>
        <div className="flex rounded-xl overflow-hidden border border-[var(--convs-border)]">
          {["convs", "comments"].map(t => (
            <button
              key={t}
              onClick={() => setTab(t)}
              className={`px-4 py-2 text-xs font-medium capitalize transition-colors ${
                tab === t
                  ? "bg-[var(--convs-accent)] text-white"
                  : "bg-[var(--convs-bg-secondary)] text-[var(--convs-text-secondary)]"
              }`}
            >
              {t}
            </button>
          ))}
        </div>
      </div>

      {tab === "convs" && (
        <div className="space-y-2">
          {filteredConvs.map(c => (
            <div key={c.id} className="convs-card p-4 flex items-start gap-3">
              <Avatar name={c.author_name} size="sm" />
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-sm font-medium text-[var(--convs-text)]">{c.author_name}</span>
                  {statusBadge(c.status)}
                  <span className="text-xs text-[var(--convs-text-muted)] ml-auto">{moment(c.created_date).fromNow()}</span>
                </div>
                {c.title && <p className="text-sm font-semibold text-[var(--convs-text)] mb-0.5">{c.title}</p>}
                <p className="text-sm text-[var(--convs-text-secondary)] line-clamp-2">{c.content}</p>
                <div className="flex items-center gap-1 mt-2">
                  <Link to={createPageUrl("ConvDetail") + `?convId=${c.id}`}>
                    <button className="p-1.5 rounded-lg hover:bg-[var(--convs-bg-tertiary)] text-[var(--convs-text-muted)]">
                      <Eye className="w-3.5 h-3.5" />
                    </button>
                  </Link>
                  {c.status !== "published" && (
                    <button
                      onClick={() => handleConvStatus(c, "published")}
                      className="p-1.5 rounded-lg hover:bg-emerald-50 dark:hover:bg-emerald-950/30 text-[var(--convs-text-muted)] hover:text-emerald-500"
                      title="Approve"
                    >
                      <CheckCircle className="w-3.5 h-3.5" />
                    </button>
                  )}
                  {c.status !== "moderated" && (
                    <button
                      onClick={() => handleConvStatus(c, "moderated")}
                      className="p-1.5 rounded-lg hover:bg-amber-50 dark:hover:bg-amber-950/30 text-[var(--convs-text-muted)] hover:text-amber-500"
                      title="Moderate"
                    >
                      <Ban className="w-3.5 h-3.5" />
                    </button>
                  )}
                  <button
                    onClick={() => handleDeleteConv(c)}
                    className="p-1.5 rounded-lg hover:bg-red-50 dark:hover:bg-red-950/30 text-[var(--convs-text-muted)] hover:text-red-500"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            </div>
          ))}
          {filteredConvs.length === 0 && (
            <div className="convs-card p-8 text-center text-sm text-[var(--convs-text-muted)]">No convs found</div>
          )}
        </div>
      )}

      {tab === "comments" && (
        <div className="space-y-2">
          {filteredComments.map(c => (
            <div key={c.id} className="convs-card p-4 flex items-start gap-3">
              <Avatar name={c.author_name} size="sm" />
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-sm font-medium text-[var(--convs-text)]">{c.author_name}</span>
                  <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${
                    c.stance === "support" ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-950/30 dark:text-emerald-400"
                    : c.stance === "oppose" ? "bg-red-100 text-red-700 dark:bg-red-950/30 dark:text-red-400"
                    : "bg-amber-100 text-amber-700 dark:bg-amber-950/30 dark:text-amber-400"
                  }`}>
                    {c.stance}
                  </span>
                  <span className="text-xs text-[var(--convs-text-muted)] ml-auto">{moment(c.created_date).fromNow()}</span>
                </div>
                <p className="text-sm text-[var(--convs-text-secondary)] line-clamp-2">{c.content}</p>
                <div className="flex items-center gap-1 mt-2">
                  <button
                    onClick={() => handleDeleteComment(c)}
                    className="p-1.5 rounded-lg hover:bg-red-50 dark:hover:bg-red-950/30 text-[var(--convs-text-muted)] hover:text-red-500"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            </div>
          ))}
          {filteredComments.length === 0 && (
            <div className="convs-card p-8 text-center text-sm text-[var(--convs-text-muted)]">No comments found</div>
          )}
        </div>
      )}
    </div>
  );
}