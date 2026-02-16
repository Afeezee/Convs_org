import React from "react";
import { Link } from "react-router-dom";
import { createPageUrl } from "@/utils";
import Avatar from "../shared/Avatar";
import StanceBadge from "../shared/StanceBadge";
import CommentRating from "./CommentRating";
import { ExternalLink, Quote } from "lucide-react";
import moment from "moment";

export default function CommentItem({ comment, currentUserEmail }) {
  return (
    <div className="py-4 border-b border-[var(--convs-border)] last:border-0 animate-fade-in">
      <div className="flex gap-3">
        <Link to={createPageUrl("Profile") + `?email=${comment.author_email}`}>
          <Avatar name={comment.author_name} size="sm" />
        </Link>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <Link
              to={createPageUrl("Profile") + `?email=${comment.author_email}`}
              className="font-semibold text-sm text-[var(--convs-text)] hover:underline"
            >
              {comment.author_name}
            </Link>
            <StanceBadge stance={comment.stance} size="sm" />
            {comment.flaw_tag && (
              <span className="text-xs px-2 py-0.5 rounded-full bg-red-50 dark:bg-red-950/30 text-red-600 dark:text-red-400 border border-red-200 dark:border-red-800 font-medium">
                {comment.flaw_tag}
              </span>
            )}
            {comment.strength_tag && (
              <span className="text-xs px-2 py-0.5 rounded-full bg-emerald-50 dark:bg-emerald-950/30 text-emerald-600 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800 font-medium">
                {comment.strength_tag}
              </span>
            )}
            <span className="text-xs text-[var(--convs-text-muted)]">
              {moment(comment.created_date).fromNow()}
            </span>
          </div>

          {comment.highlighted_text && (
            <div className="mt-2 px-3 py-2 rounded-lg bg-[var(--convs-bg-tertiary)] border-l-2 border-[var(--convs-accent)] flex items-start gap-2">
              <Quote className="w-3.5 h-3.5 text-[var(--convs-accent)] mt-0.5 flex-shrink-0" />
              <p className="text-xs text-[var(--convs-text-secondary)] italic line-clamp-2">
                {comment.highlighted_text}
              </p>
            </div>
          )}

          <p className="mt-2 text-sm text-[var(--convs-text)] leading-relaxed">
            {comment.content}
          </p>

          {comment.evidence_url && (
            <a
              href={comment.evidence_url}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1 mt-2 text-xs text-[var(--convs-accent)] hover:underline"
            >
              <ExternalLink className="w-3 h-3" />
              Evidence
            </a>
          )}

          <CommentRating commentId={comment.id} currentUserEmail={currentUserEmail} />

        </div>
      </div>
    </div>
  );
}