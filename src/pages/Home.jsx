import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Plus, Loader2 } from "lucide-react";
import ConvCard from "@/components/feed/ConvCard";
import FeedTabs from "@/components/feed/FeedTabs";
import TrendingSidebar from "@/components/feed/TrendingSidebar";
import CreateConvModal from "@/components/feed/CreateConvModal";
import ShareModal from "@/components/feed/ShareModal";
import ReconvModal from "@/components/feed/ReconvModal";
import ReconvCard from "@/components/feed/ReconvCard";

export default function Home() {
  const [feedTab, setFeedTab] = useState("trending");
  const [showCreate, setShowCreate] = useState(false);
  const [user, setUser] = useState(null);
  const [bookmarkedIds, setBookmarkedIds] = useState(new Set());
  const [shareConv, setShareConv] = useState(null);
  const [reconvConv, setReconvConv] = useState(null);
  const queryClient = useQueryClient();

  useEffect(() => {
    base44.auth.me().then(setUser).catch(() => {});
  }, []);

  const { data: convs = [], isLoading } = useQuery({
    queryKey: ["convs", feedTab],
    queryFn: () => base44.entities.Conv.list("-created_date", 50),
  });

  const { data: users = [] } = useQuery({
    queryKey: ["suggested-users"],
    queryFn: () => base44.entities.User.list("-created_date", 10),
  });

  const { data: reconvs = [] } = useQuery({
    queryKey: ["reconvs"],
    queryFn: () => base44.entities.Reconv.list("-created_date", 50),
  });

  useEffect(() => {
    if (!user) return;
    base44.entities.Bookmark.filter({ user_email: user.email }).then(bms => {
      setBookmarkedIds(new Set(bms.map(b => b.conv_id)));
    });
  }, [user]);

  const supportMutation = useMutation({
    mutationFn: async (conv) => {
      await base44.entities.Comment.create({
        conv_id: conv.id,
        author_email: user.email,
        author_name: user.full_name,
        stance: "support",
        content: "Supported this conv",
      });
      await base44.entities.Conv.update(conv.id, {
        support_count: (conv.support_count || 0) + 1,
      });
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["convs"] }),
  });

  const opposeMutation = useMutation({
    mutationFn: async (conv) => {
      await base44.entities.Comment.create({
        conv_id: conv.id,
        author_email: user.email,
        author_name: user.full_name,
        stance: "oppose",
        content: "Opposed this conv",
      });
      await base44.entities.Conv.update(conv.id, {
        oppose_count: (conv.oppose_count || 0) + 1,
      });
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["convs"] }),
  });

  const handleBookmark = async (conv) => {
    if (!user) return;
    if (bookmarkedIds.has(conv.id)) {
      const bms = await base44.entities.Bookmark.filter({ user_email: user.email, conv_id: conv.id });
      if (bms[0]) await base44.entities.Bookmark.delete(bms[0].id);
      setBookmarkedIds(prev => { const n = new Set(prev); n.delete(conv.id); return n; });
    } else {
      await base44.entities.Bookmark.create({ user_email: user.email, conv_id: conv.id });
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
    const items = convs.map(c => ({ type: "conv", data: c, date: c.created_date }));
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
  }, [convs, reconvs, convsById, feedTab]);

  return (
    <div className="max-w-6xl mx-auto px-4 py-6">
      <div className="grid grid-cols-1 lg:grid-cols-[1fr_320px] gap-6">
        {/* Main Feed */}
        <div>
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

          {/* Conv List */}
          <div className="space-y-3 mt-4">
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
                      onSupport={(c) => user && supportMutation.mutate(c)}
                      onOppose={(c) => user && opposeMutation.mutate(c)}
                      onBookmark={handleBookmark}
                      isBookmarked={bookmarkedIds.has(origConv?.id)}
                      onShare={(c) => setShareConv(c)}
                      onReconv={(c) => setReconvConv(c)}
                    />
                  );
                }
                const conv = item.data;
                return (
                  <ConvCard
                    key={conv.id}
                    conv={conv}
                    onSupport={(c) => user && supportMutation.mutate(c)}
                    onOppose={(c) => user && opposeMutation.mutate(c)}
                    onBookmark={handleBookmark}
                    isBookmarked={bookmarkedIds.has(conv.id)}
                    onShare={(c) => setShareConv(c)}
                    onReconv={(c) => setReconvConv(c)}
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
    </div>
  );
}