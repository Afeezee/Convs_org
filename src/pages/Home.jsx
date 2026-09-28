import React, { useState, useEffect, useRef, useCallback } from "react";
import { api } from "@/api/client";
import { useAuth } from "@/lib/AuthContext";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Plus, Loader2, RefreshCw } from "lucide-react";
import ConvCard from "@/components/feed/ConvCard";
import FeedTabs from "@/components/feed/FeedTabs";
import TrendingSidebar from "@/components/feed/TrendingSidebar";
import CreateConvModal from "@/components/feed/CreateConvModal";
import EditConvModal from "@/components/feed/EditConvModal";
import ReportConvModal from "@/components/feed/ReportConvModal";
import ShareModal from "@/components/feed/ShareModal";
import ReconvModal from "@/components/feed/ReconvModal";
import ReconvCard from "@/components/feed/ReconvCard";
import SignInPrompt from "@/components/feed/SignInPrompt";

export default function Home() {
  const [feedTab, setFeedTab] = useState("trending");
  const [showCreate, setShowCreate] = useState(false);
  const { user } = useAuth();
  const [bookmarkedIds, setBookmarkedIds] = useState(new Set());
  const [shareConv, setShareConv] = useState(null);
  const [reconvConv, setReconvConv] = useState(null);
  const [editConv, setEditConv] = useState(null);
  const [reportConv, setReportConv] = useState(null);
  const [hiddenIds, setHiddenIds] = useState(new Set());
  const [isPulling, setIsPulling] = useState(false);
  const [pullDistance, setPullDistance] = useState(0);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const feedRef = useRef(null);
  const touchStartY = useRef(0);
  const queryClient = useQueryClient();

  // Pull-to-refresh
  const handleTouchStart = useCallback((e) => {
    if (window.scrollY === 0) {
      touchStartY.current = e.touches[0].clientY;
      setIsPulling(true);
    }
  }, []);

  const handleTouchMove = useCallback((e) => {
    if (!isPulling) return;
    const diff = e.touches[0].clientY - touchStartY.current;
    if (diff > 0 && window.scrollY === 0) {
      setPullDistance(Math.min(diff * 0.5, 80));
    }
  }, [isPulling]);

  const handleTouchEnd = useCallback(async () => {
    if (pullDistance > 60) {
      setIsRefreshing(true);
      setPullDistance(60);
      await queryClient.refetchQueries({ queryKey: ["convs"] });
      await queryClient.refetchQueries({ queryKey: ["reconvs"] });
      setIsRefreshing(false);
    }
    setPullDistance(0);
    setIsPulling(false);
  }, [pullDistance, queryClient]);

  const { data: convs = [], isLoading } = useQuery({
    queryKey: ["convs", feedTab],
    queryFn: () => api.entities.Conv.list("-created_date", 50),
  });

  const { data: users = [] } = useQuery({
    queryKey: ["suggested-profiles"],
    queryFn: () => api.entities.Profile.list("-created_date", 10),
  });

  const { data: reconvs = [] } = useQuery({
    queryKey: ["reconvs"],
    queryFn: () => api.entities.Reconv.list("-created_date", 50),
  });

  useEffect(() => {
    if (!user) return;
    api.entities.Bookmark.filter({ user_email: user.email }).then(bms => {
      setBookmarkedIds(new Set(bms.map(b => b.conv_id)));
    }).catch(() => {});
  }, [user]);

  // Quick-vote is a single Comment.create with a fixed content. Counters,
  // notifications and moderation are the server's job now.
  const quickVote = async (conv, stance) => {
    await api.entities.Comment.create({
      conv_id: conv.id,
      stance,
      content: stance === "support" ? "Supported this conv" : "Opposed this conv",
    });
  };

  const supportMutation = useMutation({
    mutationFn: (conv) => quickVote(conv, "support"),
    onMutate: async (conv) => {
      await queryClient.cancelQueries({ queryKey: ["convs", feedTab] });
      const prev = queryClient.getQueryData(["convs", feedTab]);
      queryClient.setQueryData(["convs", feedTab], (old = []) =>
        old.map(c => c.id === conv.id ? { ...c, support_count: (c.support_count || 0) + 1 } : c)
      );
      return { prev };
    },
    onError: (_err, _conv, context) => {
      if (context?.prev) queryClient.setQueryData(["convs", feedTab], context.prev);
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ["convs"] });
      queryClient.invalidateQueries({ queryKey: ["profile-convs"] });
    },
  });

  const opposeMutation = useMutation({
    mutationFn: (conv) => quickVote(conv, "oppose"),
    onMutate: async (conv) => {
      await queryClient.cancelQueries({ queryKey: ["convs", feedTab] });
      const prev = queryClient.getQueryData(["convs", feedTab]);
      queryClient.setQueryData(["convs", feedTab], (old = []) =>
        old.map(c => c.id === conv.id ? { ...c, oppose_count: (c.oppose_count || 0) + 1 } : c)
      );
      return { prev };
    },
    onError: (_err, _conv, context) => {
      if (context?.prev) queryClient.setQueryData(["convs", feedTab], context.prev);
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ["convs"] });
      queryClient.invalidateQueries({ queryKey: ["profile-convs"] });
    },
  });

  const handleDelete = async (conv) => {
    if (!user || conv.author_email !== user.email) return;
    // eslint-disable-next-line no-alert
    if (!window.confirm("Delete this conv permanently? This cannot be undone.")) return;
    try {
      await api.entities.Conv.delete(conv.id);
    } catch (err) {
      // eslint-disable-next-line no-alert
      alert(err.message ?? "Delete failed.");
      return;
    }
    // Hide immediately from the current feed; refetch picks up authoritative state.
    setHiddenIds(prev => new Set(prev).add(conv.id));
    queryClient.invalidateQueries({ queryKey: ["convs"] });
    queryClient.invalidateQueries({ queryKey: ["reconvs"] });
  };

  const handleBookmark = async (conv) => {
    if (!user) return;
    if (bookmarkedIds.has(conv.id)) {
      const bms = await api.entities.Bookmark.filter({ user_email: user.email, conv_id: conv.id });
      if (bms[0]) await api.entities.Bookmark.delete(bms[0].id);
      setBookmarkedIds(prev => { const n = new Set(prev); n.delete(conv.id); return n; });
    } else {
      await api.entities.Bookmark.create({ conv_id: conv.id });
      setBookmarkedIds(prev => new Set(prev).add(conv.id));
    }
  };

  // Build a merged feed: convs + reconvs, sorted by date
  const convsById = React.useMemo(() => {
    const map = {};
    convs.forEach(c => { map[c.id] = c; });
    return map;
  }, [convs]);

  const feedItems = React.useMemo(() => {
    const items = convs.filter(c => !hiddenIds.has(c.id) && c.status !== "moderated").map(c => ({ type: "conv", data: c, date: c.created_date }));
    reconvs.forEach(r => {
      if (convsById[r.original_conv_id]) {
        items.push({ type: "reconv", data: r, date: r.created_date });
      }
    });

    if (feedTab === "debate") {
      return items.filter(i => i.type === "conv").sort((a, b) => {
        const bScore = (b.data.oppose_count || 0) / Math.max((b.data.support_count || 0) + (b.data.oppose_count || 0), 1);
        const aScore = (a.data.oppose_count || 0) / Math.max((a.data.support_count || 0) + (a.data.oppose_count || 0), 1);
        return bScore - aScore;
      });
    }
    if (feedTab === "trending") {
      return items.filter(i => i.type === "conv").sort((a, b) => {
        const bEngagement = (b.data.comment_count || 0) + (b.data.support_count || 0) + (b.data.oppose_count || 0);
        const aEngagement = (a.data.comment_count || 0) + (a.data.support_count || 0) + (a.data.oppose_count || 0);
        return bEngagement - aEngagement;
      });
    }
    // "latest" tab - show everything merged by date
    return items.sort((a, b) => new Date(b.date) - new Date(a.date));
  }, [convs, reconvs, convsById, feedTab, hiddenIds]);

  return (
    <div
      className="max-w-6xl mx-auto px-4 py-6 overflow-x-hidden"
      ref={feedRef}
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
    >
      {/* Pull-to-refresh indicator */}
      <div
        className="flex justify-center items-center overflow-hidden transition-all"
        style={{ height: pullDistance, opacity: pullDistance / 60 }}
      >
        <RefreshCw className={`w-5 h-5 text-[var(--convs-accent)] ${isRefreshing ? "animate-spin" : ""}`}
          style={{ transform: `rotate(${pullDistance * 3}deg)` }}
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-[1fr_320px] gap-6">
        {/* Main Feed */}
        <div>
          {!user && <SignInPrompt />}

          {user && (
            <>
              {/* Create Button */}
              <div className="mb-4">
                <button
                  onClick={() => setShowCreate(true)}
                  className="w-full convs-card p-4 flex items-center gap-3 text-left group"
                >
                  <div className="w-10 h-10 rounded-full bg-[var(--convs-accent-light)] flex items-center justify-center">
                    <Plus className="w-5 h-5 text-[var(--convs-accent)]" />
                  </div>
                  <span className="text-[var(--convs-text-muted)] text-sm group-hover:text-[var(--convs-text-secondary)] transition-colors">
                    Start a new Conv — share your claim...
                  </span>
                </button>
              </div>

              <FeedTabs active={feedTab} onChange={setFeedTab} />
            </>
          )}

          {/* Conv List */}
          <div className={`space-y-3 ${user ? "mt-4" : "mt-0"}`}>
            {isLoading ? (
              <div className="flex justify-center py-20">
                <Loader2 className="w-6 h-6 animate-spin text-[var(--convs-accent)]" />
              </div>
            ) : feedItems.length === 0 ? (
              <div className="text-center py-20">
                <p className="text-[var(--convs-text-muted)] text-sm">No convs yet. Start the conversation.</p>
              </div>
            ) : (
              feedItems.map(item => {
                if (item.type === "reconv") {
                  const rc = item.data;
                  const origConv = convsById[rc.original_conv_id];
                  return (
                    <ReconvCard
                      key={`reconv-${rc.id}`}
                      reconv={rc}
                      originalConv={origConv}
                      onSupport={user ? (c) => supportMutation.mutate(c) : undefined}
                      onOppose={user ? (c) => opposeMutation.mutate(c) : undefined}
                      onBookmark={user ? handleBookmark : undefined}
                      isBookmarked={bookmarkedIds.has(origConv?.id)}
                      onShare={user ? (c) => setShareConv(c) : undefined}
                      onReconv={user ? (c) => setReconvConv(c) : undefined}
                    />
                  );
                }
                const conv = item.data;
                return (
                  <ConvCard
                    key={conv.id}
                    conv={conv}
                    currentUserEmail={user?.email}
                    onSupport={user ? (c) => supportMutation.mutate(c) : undefined}
                    onOppose={user ? (c) => opposeMutation.mutate(c) : undefined}
                    onBookmark={user ? handleBookmark : undefined}
                    isBookmarked={bookmarkedIds.has(conv.id)}
                    onShare={user ? (c) => setShareConv(c) : undefined}
                    onReconv={user ? (c) => setReconvConv(c) : undefined}
                    onEdit={user ? (c) => setEditConv(c) : undefined}
                    onHide={user ? (c) => setHiddenIds(prev => new Set(prev).add(c.id)) : undefined}
                    onReport={user ? (c) => setReportConv(c) : undefined}
                    onDelete={user ? handleDelete : undefined}
                    readOnly={!user}
                  />
                );
              })
            )}
          </div>
        </div>

        {/* Sidebar */}
        <aside className="hidden lg:block">
          <div className="sticky top-20">
            <TrendingSidebar suggestedUsers={users} />
          </div>
        </aside>
      </div>

      <CreateConvModal
        isOpen={showCreate}
        onClose={() => setShowCreate(false)}
        user={user}
        onCreated={() => queryClient.invalidateQueries({ queryKey: ["convs"] })}
      />

      <ShareModal
        isOpen={!!shareConv}
        onClose={() => setShareConv(null)}
        conv={shareConv}
      />

      <ReconvModal
        isOpen={!!reconvConv}
        onClose={() => setReconvConv(null)}
        conv={reconvConv}
        user={user}
        onReconved={() => queryClient.invalidateQueries({ queryKey: ["reconvs"] })}
      />

      <EditConvModal
        isOpen={!!editConv}
        onClose={() => setEditConv(null)}
        conv={editConv}
        onUpdated={() => queryClient.invalidateQueries({ queryKey: ["convs"] })}
      />

      <ReportConvModal
        isOpen={!!reportConv}
        onClose={() => setReportConv(null)}
        conv={reportConv}
        user={user}
      />
    </div>
  );
}
