import React, { useState, useEffect, useCallback } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { ArrowLeft, Loader2, Bookmark, Share2 } from "lucide-react";
import Avatar from "@/components/shared/Avatar";
import TopicTag from "@/components/shared/TopicTag";
import SupportOpposeBar from "@/components/shared/SupportOpposeBar";
import CommentForm from "@/components/detail/CommentForm";
import CommentItem from "@/components/detail/CommentItem";
import ConvAnalytics from "@/components/detail/ConvAnalytics";
import ShareModal from "@/components/feed/ShareModal";
import moment from "moment";

export default function ConvDetail() {
  const params = new URLSearchParams(window.location.search);
  const convId = params.get("id");
  const [user, setUser] = useState(null);
  const [highlightedText, setHighlightedText] = useState("");
  const [isBookmarked, setIsBookmarked] = useState(false);
  const [showShare, setShowShare] = useState(false);
  const queryClient = useQueryClient();

  useEffect(() => {
    base44.auth.me().then(u => {
      setUser(u);
      if (u && convId) {
        base44.entities.Bookmark.filter({ user_email: u.email, conv_id: convId })
          .then(bms => setIsBookmarked(bms.length > 0));
      }
    }).catch(() => {});
  }, [convId]);

  const { data: convs = [], isLoading: convLoading } = useQuery({
    queryKey: ["conv", convId],
    queryFn: () => base44.entities.Conv.filter({ id: convId }),
    enabled: !!convId,
  });
  const conv = convs[0];

  const { data: comments = [], isLoading: commentsLoading } = useQuery({
    queryKey: ["comments", convId],
    queryFn: () => base44.entities.Comment.filter({ conv_id: convId }, "-created_date", 100),
    enabled: !!convId,
  });

  const handleTextSelection = useCallback(() => {
    const selection = window.getSelection();
    const text = selection?.toString()?.trim();
    if (text && text.length > 5) {
      setHighlightedText(text);
    }
  }, []);

  const handleBookmark = async () => {
    if (!user || !conv) return;
    if (isBookmarked) {
      const bms = await base44.entities.Bookmark.filter({ user_email: user.email, conv_id: conv.id });
      if (bms[0]) await base44.entities.Bookmark.delete(bms[0].id);
      setIsBookmarked(false);
    } else {
      await base44.entities.Bookmark.create({ user_email: user.email, conv_id: conv.id });
      setIsBookmarked(true);
    }
  };

  const handleCommented = () => {
    queryClient.invalidateQueries({ queryKey: ["comments", convId] });
    queryClient.invalidateQueries({ queryKey: ["conv", convId] });
    // Update comment count
    if (conv) {
      base44.entities.Conv.update(conv.id, { comment_count: (conv.comment_count || 0) + 1 });
    }
  };

  if (convLoading) {
    return (
      <div className="flex justify-center py-20">
        <Loader2 className="w-6 h-6 animate-spin text-[var(--convs-accent)]" />
      </div>
    );
  }

  if (!conv) {
    return (
      <div className="max-w-3xl mx-auto px-4 py-20 text-center">
        <p className="text-[var(--convs-text-muted)]">Conv not found</p>
        <Link to={createPageUrl("Home")} className="text-[var(--convs-accent)] text-sm mt-2 inline-block hover:underline">
          ← Back to feed
        </Link>
      </div>
    );
  }

  const supportComments = comments.filter(c => c.stance === "support");
  const opposeComments = comments.filter(c => c.stance === "oppose");
  const clarifyComments = comments.filter(c => c.stance === "clarification");

  return (
    <div className="max-w-6xl mx-auto px-4 py-6">
      <div className="grid grid-cols-1 lg:grid-cols-[1fr_320px] gap-6">
        {/* Main */}
        <div>
          {/* Back */}
          <Link
            to={createPageUrl("Home")}
            className="inline-flex items-center gap-1.5 text-sm text-[var(--convs-text-secondary)] hover:text-[var(--convs-text)] transition-colors mb-4"
          >
            <ArrowLeft className="w-4 h-4" />
            Back
          </Link>

          {/* Conv Content */}
          <article className="convs-card p-6">
            <div className="flex items-start gap-3 mb-4">
              <Link to={createPageUrl("Profile") + `?email=${conv.author_email}`}>
                <Avatar name={conv.author_name} size="lg" />
              </Link>
              <div>
                <Link
                  to={createPageUrl("Profile") + `?email=${conv.author_email}`}
                  className="font-bold text-[var(--convs-text)] hover:underline"
                >
                  {conv.author_name}
                </Link>
                <p className="text-sm text-[var(--convs-text-muted)]">{moment(conv.created_date).format("MMM D, YYYY · h:mm A")}</p>
              </div>
              <div className="ml-auto flex items-center gap-2">
                <button
                  onClick={handleBookmark}
                  className={`p-2 rounded-lg transition-colors ${
                    isBookmarked
                      ? "text-[var(--convs-accent)]"
                      : "text-[var(--convs-text-muted)] hover:bg-[var(--convs-bg-tertiary)]"
                  }`}
                >
                  <Bookmark className={`w-4 h-4 ${isBookmarked ? "fill-current" : ""}`} />
                </button>
                <button
                  onClick={() => setShowShare(true)}
                  className="p-2 rounded-lg hover:bg-[var(--convs-bg-tertiary)] text-[var(--convs-text-muted)]"
                >
                  <Share2 className="w-4 h-4" />
                </button>
              </div>
            </div>

            {conv.title && (
              <h1 className="text-2xl font-bold text-[var(--convs-text)] mb-3">{conv.title}</h1>
            )}

            <div
              onMouseUp={handleTextSelection}
              className="text-[var(--convs-text)] leading-relaxed text-[15px] whitespace-pre-wrap selection:bg-[var(--convs-accent)]/20 cursor-text"
            >
              {conv.type === "long" && conv.rich_content ? (
                <div dangerouslySetInnerHTML={{ __html: conv.rich_content }} className="prose prose-sm max-w-none" />
              ) : (
                conv.content
              )}
            </div>

            {conv.media_url && conv.media_type === "image" && (
              <div className="mt-4 rounded-xl overflow-hidden border border-[var(--convs-border)]">
                <img src={conv.media_url} alt="" className="w-full" />
              </div>
            )}

            {conv.topics && conv.topics.length > 0 && (
              <div className="flex flex-wrap gap-1.5 mt-4">
                {conv.topics.map(t => <TopicTag key={t} topic={t} />)}
              </div>
            )}

            <div className="mt-4 pt-4 border-t border-[var(--convs-border)]">
              <SupportOpposeBar support={supportComments.length} oppose={opposeComments.length} height="h-2" />
            </div>
          </article>

          {/* Highlight Prompt */}
          {highlightedText && (
            <div className="mt-3 p-3 convs-card bg-[var(--convs-accent-light)] border-[var(--convs-accent)] text-sm flex items-center justify-between">
              <span className="text-[var(--convs-text-secondary)] italic truncate mr-3">
                "{highlightedText.slice(0, 80)}..."
              </span>
              <div className="flex gap-2 flex-shrink-0">
                <button
                  onClick={() => {}}
                  className="text-xs px-2 py-1 rounded-lg bg-emerald-100 text-emerald-700 font-medium"
                >
                  Support this
                </button>
                <button
                  onClick={() => {}}
                  className="text-xs px-2 py-1 rounded-lg bg-red-100 text-red-700 font-medium"
                >
                  Oppose this
                </button>
                <button
                  onClick={() => setHighlightedText("")}
                  className="text-xs text-[var(--convs-text-muted)]"
                >
                  ×
                </button>
              </div>
            </div>
          )}

          {/* Comment Form */}
          {user && (
            <div className="mt-4 convs-card p-5">
              <h3 className="font-semibold text-sm text-[var(--convs-text)] mb-3">Add your argument</h3>
              <CommentForm
                convId={convId}
                user={user}
                highlightedText={highlightedText}
                onCommented={handleCommented}
              />
            </div>
          )}

          {/* Comments */}
          <div className="mt-4 convs-card px-5">
            <div className="py-4 border-b border-[var(--convs-border)]">
              <h3 className="font-bold text-[var(--convs-text)]">
                Arguments ({comments.length})
              </h3>
              <div className="flex gap-3 mt-2 text-xs text-[var(--convs-text-muted)]">
                <span className="text-emerald-500 font-medium">{supportComments.length} supporting</span>
                <span>·</span>
                <span className="text-red-500 font-medium">{opposeComments.length} opposing</span>
                <span>·</span>
                <span>{clarifyComments.length} clarifying</span>
              </div>
            </div>
            {commentsLoading ? (
              <div className="py-10 flex justify-center">
                <Loader2 className="w-5 h-5 animate-spin text-[var(--convs-accent)]" />
              </div>
            ) : comments.length === 0 ? (
              <div className="py-10 text-center text-sm text-[var(--convs-text-muted)]">
                No arguments yet. Be the first to respond.
              </div>
            ) : (
              comments.map(c => <CommentItem key={c.id} comment={c} />)
            )}
          </div>
        </div>

        {/* Sidebar Analytics */}
        <aside className="hidden lg:block">
          <div className="sticky top-20">
            <ConvAnalytics conv={conv} comments={comments} />
          </div>
        </aside>
      </div>
      <ShareModal isOpen={showShare} onClose={() => setShowShare(false)} conv={conv} />
    </div>
  );
}