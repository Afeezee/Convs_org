import React from "react";
import { Link } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { MessageSquare, Bookmark, Share2, ThumbsUp, ThumbsDown, MoreHorizontal } from "lucide-react";
import Avatar from "../shared/Avatar";
import TopicTag from "../shared/TopicTag";
import SupportOpposeBar from "../shared/SupportOpposeBar";
import moment from "moment";

export default function ConvCard({ conv, onSupport, onOppose, onBookmark, isBookmarked }) {
  const timeAgo = moment(conv.created_date).fromNow();

  return (
    <article className="convs-card p-5 animate-fade-in">
      {/* Header */}
      <div className="flex items-start gap-3 mb-3">
        <Link to={createPageUrl("Profile") + `?email=${conv.author_email}`}>
          <Avatar name={conv.author_name} size="md" />
        </Link>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <Link
              to={createPageUrl("Profile") + `?email=${conv.author_email}`}
              className="font-semibold text-[var(--convs-text)] hover:underline truncate"
            >
              {conv.author_name}
            </Link>
            <span className="text-[var(--convs-text-muted)] text-sm">·</span>
            <span className="text-[var(--convs-text-muted)] text-sm flex-shrink-0">{timeAgo}</span>
          </div>
          {conv.type !== "short" && conv.title && (
            <h3 className="font-bold text-lg mt-1 text-[var(--convs-text)]">{conv.title}</h3>
          )}
        </div>
        <button className="p-1.5 rounded-lg hover:bg-[var(--convs-bg-tertiary)] text-[var(--convs-text-muted)] transition-colors">
          <MoreHorizontal className="w-4 h-4" />
        </button>
      </div>

      {/* Content */}
      <Link to={createPageUrl("ConvDetail") + `?id=${conv.id}`} className="block">
        {conv.type === "long" && conv.rich_content ? (
          <div
            className="text-[var(--convs-text)] leading-relaxed mb-3 prose prose-sm max-w-none line-clamp-6"
            dangerouslySetInnerHTML={{ __html: conv.rich_content }}
          />
        ) : (
          <p className="text-[var(--convs-text)] leading-relaxed mb-3 whitespace-pre-wrap">
            {conv.content}
          </p>
        )}

        {conv.media_url && conv.media_type === "image" && (
          <div className="rounded-xl overflow-hidden mb-3 border border-[var(--convs-border)]">
            <img src={conv.media_url} alt="" className="w-full object-cover max-h-96" />
          </div>
        )}
      </Link>

      {/* Topics */}
      {conv.topics && conv.topics.length > 0 && (
        <div className="flex flex-wrap gap-1.5 mb-3">
          {conv.topics.map(t => (
            <TopicTag key={t} topic={t} />
          ))}
        </div>
      )}

      {/* Support/Oppose Bar */}
      <div className="mb-3">
        <SupportOpposeBar support={conv.support_count || 0} oppose={conv.oppose_count || 0} />
      </div>

      {/* Actions */}
      <div className="flex items-center justify-between pt-2 border-t border-[var(--convs-border)]">
        <div className="flex items-center gap-1">
          <button
            onClick={(e) => { e.preventDefault(); onSupport?.(conv); }}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium text-[var(--convs-text-secondary)] hover:text-emerald-500 hover:bg-emerald-50 dark:hover:bg-emerald-950/20 transition-all"
          >
            <ThumbsUp className="w-4 h-4" />
            <span>Support</span>
          </button>
          <button
            onClick={(e) => { e.preventDefault(); onOppose?.(conv); }}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium text-[var(--convs-text-secondary)] hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-950/20 transition-all"
          >
            <ThumbsDown className="w-4 h-4" />
            <span>Oppose</span>
          </button>
        </div>
        <div className="flex items-center gap-1">
          <Link
            to={createPageUrl("ConvDetail") + `?id=${conv.id}`}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm text-[var(--convs-text-secondary)] hover:text-[var(--convs-accent)] hover:bg-[var(--convs-accent-light)] transition-all"
          >
            <MessageSquare className="w-4 h-4" />
            <span>{conv.comment_count || 0}</span>
          </Link>
          <button
            onClick={(e) => { e.preventDefault(); onBookmark?.(conv); }}
            className={`flex items-center gap-1.5 px-2 py-1.5 rounded-lg text-sm transition-all ${
              isBookmarked
                ? "text-[var(--convs-accent)]"
                : "text-[var(--convs-text-secondary)] hover:text-[var(--convs-accent)] hover:bg-[var(--convs-accent-light)]"
            }`}
          >
            <Bookmark className={`w-4 h-4 ${isBookmarked ? "fill-current" : ""}`} />
          </button>
          <button className="flex items-center gap-1.5 px-2 py-1.5 rounded-lg text-sm text-[var(--convs-text-secondary)] hover:text-[var(--convs-accent)] hover:bg-[var(--convs-accent-light)] transition-all">
            <Share2 className="w-4 h-4" />
          </button>
        </div>
      </div>
    </article>
  );
}