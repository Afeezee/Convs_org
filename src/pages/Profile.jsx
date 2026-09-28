import React, { useState, useEffect } from "react";
import { api } from "@/api/client";
import { useAuth } from "@/lib/AuthContext";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { Calendar, Users, MessageSquare, BarChart3, Bookmark, Settings, Loader2, Plus, Shield } from "lucide-react";
import { Button } from "@/components/ui/button";
import Avatar from "@/components/shared/Avatar";
import ConvCard from "@/components/feed/ConvCard";
import ReconvCard from "@/components/feed/ReconvCard";
import CreateConvModal from "@/components/feed/CreateConvModal";
import EditConvModal from "@/components/feed/EditConvModal";
import ShareModal from "@/components/feed/ShareModal";
import ReconvModal from "@/components/feed/ReconvModal";
import ProfileAnalytics from "@/components/profile/ProfileAnalytics";
import moment from "moment";

export default function Profile() {
  const params = new URLSearchParams(window.location.search);
  const profileEmail = params.get("email");
  const { user: currentUser } = useAuth();
  const [activeTab, setActiveTab] = useState("convs");
  const [isFollowing, setIsFollowing] = useState(false);
  const [showCreateConv, setShowCreateConv] = useState(false);
  const [shareConv, setShareConv] = useState(null);
  const [reconvConv, setReconvConv] = useState(null);
  const [editConv, setEditConv] = useState(null);
  const [bookmarkedIds, setBookmarkedIds] = useState(new Set());
  const queryClient = useQueryClient();

  // Fetch profile from Profile entity
  const { data: profiles = [], isLoading: profileLoading } = useQuery({
    queryKey: ["profile-data", profileEmail],
    queryFn: () => api.entities.Profile.filter({ email: profileEmail }),
    enabled: !!profileEmail,
  });
  const profileUser = profiles[0];

  const { data: convs = [] } = useQuery({
    queryKey: ["profile-convs", profileEmail],
    queryFn: () => api.entities.Conv.filter({ author_email: profileEmail }, "-created_date", 50),
    enabled: !!profileEmail,
  });

  const { data: comments = [] } = useQuery({
    queryKey: ["profile-comments", profileEmail],
    queryFn: () => api.entities.Comment.filter({ author_email: profileEmail }, "-created_date", 50),
    enabled: !!profileEmail,
  });

  const { data: bookmarks = [] } = useQuery({
    queryKey: ["profile-bookmarks", profileEmail],
    queryFn: () => api.entities.Bookmark.filter({ user_email: profileEmail }, "-created_date", 50),
    enabled: !!profileEmail && activeTab === "bookmarks",
  });

  const { data: reconvs = [] } = useQuery({
    queryKey: ["profile-reconvs", profileEmail],
    queryFn: () => api.entities.Reconv.filter({ user_email: profileEmail }, "-created_date", 50),
    enabled: !!profileEmail,
  });

  const { data: allConvs = [] } = useQuery({
    queryKey: ["all-convs-for-profile"],
    queryFn: () => api.entities.Conv.list("-created_date", 200),
    enabled: reconvs.length > 0 || (activeTab === "bookmarks" && bookmarks.length > 0),
  });

  const convsById = React.useMemo(() => {
    const map = {};
    allConvs.forEach(c => { map[c.id] = c; });
    convs.forEach(c => { map[c.id] = c; });
    return map;
  }, [allConvs, convs]);

  useEffect(() => {
    if (!currentUser) return;
    api.entities.Bookmark.filter({ user_email: currentUser.email }).then(bms => {
      setBookmarkedIds(new Set(bms.map(b => b.conv_id)));
    }).catch(() => {});
  }, [currentUser]);

  const handleDelete = async (conv) => {
    if (!currentUser || conv.author_email !== currentUser.email) return;
    // eslint-disable-next-line no-alert
    if (!window.confirm("Delete this conv permanently? This cannot be undone.")) return;
    try {
      await api.entities.Conv.delete(conv.id);
    } catch (err) {
      // eslint-disable-next-line no-alert
      alert(err.message ?? "Delete failed.");
      return;
    }
    queryClient.invalidateQueries({ queryKey: ["profile-convs", profileEmail] });
    queryClient.invalidateQueries({ queryKey: ["profile-data", profileEmail] });
    queryClient.invalidateQueries({ queryKey: ["all-convs-for-profile"] });
  };

  const handleBookmark = async (conv) => {
    if (!currentUser) return;
    if (bookmarkedIds.has(conv.id)) {
      const bms = await api.entities.Bookmark.filter({ user_email: currentUser.email, conv_id: conv.id });
      if (bms[0]) await api.entities.Bookmark.delete(bms[0].id);
      setBookmarkedIds(prev => { const n = new Set(prev); n.delete(conv.id); return n; });
    } else {
      await api.entities.Bookmark.create({ conv_id: conv.id });
      setBookmarkedIds(prev => new Set(prev).add(conv.id));
    }
    queryClient.invalidateQueries({ queryKey: ["profile-bookmarks"] });
  };

  useEffect(() => {
    if (!currentUser || !profileEmail) return;
    api.entities.Follow.filter({ follower_email: currentUser.email, following_email: profileEmail })
      .then(res => setIsFollowing(res.length > 0))
      .catch(() => {});
  }, [currentUser, profileEmail]);

  // Follow counters and notifications are the server's job now. We just call
  // create/delete and refetch to pick up the new numbers.
  const handleFollow = async () => {
    if (!currentUser) return;
    if (isFollowing) {
      const follows = await api.entities.Follow.filter({
        follower_email: currentUser.email,
        following_email: profileEmail,
      });
      if (follows[0]) await api.entities.Follow.delete(follows[0].id);
      setIsFollowing(false);
    } else {
      await api.entities.Follow.create({ following_email: profileEmail });
      setIsFollowing(true);
    }
    queryClient.invalidateQueries({ queryKey: ["profile-data", profileEmail] });
  };

  const isOwnProfile = currentUser?.email === profileEmail;

  if (profileLoading) {
    return (
      <div className="flex justify-center py-20">
        <Loader2 className="w-6 h-6 animate-spin text-[var(--convs-accent)]" />
      </div>
    );
  }

  const displayName = profileUser?.full_name || profileEmail?.split("@")[0] || "User";
  const username = profileUser?.username || profileEmail?.split("@")[0];

  const tabs = [
    { key: "convs", label: "Convs", count: convs.length + reconvs.length },
    { key: "replies", label: "Replies", count: null },
    { key: "analytics", label: "Analytics", count: null },
    { key: "bookmarks", label: "Bookmarks", count: null },
  ];

  return (
    <div className="max-w-3xl mx-auto px-4 py-6">
      {/* Cover */}
      <div className="h-32 md:h-48 rounded-2xl bg-gradient-to-br from-[var(--convs-accent)] via-indigo-500 to-purple-600 relative overflow-hidden mb-[-40px]">
        {profileUser?.cover_image && (
          <img src={profileUser.cover_image} alt="" className="w-full h-full object-cover" />
        )}
      </div>

      {/* Profile Info */}
      <div className="px-4 relative">
        <div className="flex items-end justify-between">
          <Avatar
            name={displayName}
            image={profileUser?.profile_image}
            size="xl"
            className="ring-4 ring-[var(--convs-bg)] relative -mt-6"
          />
          <div className="flex gap-2 pb-2 flex-wrap">
            {isOwnProfile && (
              <button
                onClick={() => setShowCreateConv(true)}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md text-sm font-medium transition-colors"
                style={{ background: "#6366F1", color: "#FFFFFF" }}
              >
                <Plus className="w-3.5 h-3.5" />
                New Conv
              </button>
            )}
            {isOwnProfile && currentUser?.role === "admin" && (
              <Link to={createPageUrl("AdminDashboard")}>
                <Button variant="outline" size="sm" className="gap-1.5 border-[var(--convs-border)] text-[var(--convs-accent)]">
                  <Shield className="w-3.5 h-3.5" />
                  Admin
                </Button>
              </Link>
            )}
            {isOwnProfile ? (
              <Link to={createPageUrl("Settings")}>
                <Button variant="outline" size="sm" className="gap-1.5 border-[var(--convs-border)] text-[var(--convs-text)]">
                  <Settings className="w-3.5 h-3.5" />
                  Edit Profile
                </Button>
              </Link>
            ) : (
              <Button
                onClick={handleFollow}
                size="sm"
                className={isFollowing
                  ? "bg-[var(--convs-bg-tertiary)] text-[var(--convs-text)] hover:bg-red-50 hover:text-red-500 border border-[var(--convs-border)]"
                  : "bg-[var(--convs-accent)] text-white hover:bg-[var(--convs-accent-hover)]"
                }
              >
                {isFollowing ? "Following" : "Follow"}
              </Button>
            )}
          </div>
        </div>

        <div className="mt-3">
          <h1 className="text-xl font-bold text-[var(--convs-text)]">{displayName}</h1>
          <p className="text-sm text-[var(--convs-text-muted)]">@{username}</p>
          {profileUser?.bio && (
            <p className="mt-2 text-sm text-[var(--convs-text-secondary)] leading-relaxed">{profileUser.bio}</p>
          )}
          <div className="flex items-center gap-4 mt-3 text-sm text-[var(--convs-text-muted)]">
            <span className="flex items-center gap-1">
              <Calendar className="w-3.5 h-3.5" />
              Joined {moment(profileUser?.created_date || new Date()).format("MMM YYYY")}
            </span>
            <span><b className="text-[var(--convs-text)]">{profileUser?.followers_count || 0}</b> followers</span>
            <span><b className="text-[var(--convs-text)]">{profileUser?.following_count || 0}</b> following</span>
          </div>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-3 gap-3 mt-4">
          <div className="convs-card p-3 text-center">
            <p className="text-lg font-bold text-[var(--convs-text)]">{convs.length + reconvs.length}</p>
            <p className="text-[10px] text-[var(--convs-text-muted)] uppercase tracking-wider">Convs</p>
          </div>
          <div className="convs-card p-3 text-center">
            <p className="text-lg font-bold text-emerald-500">{convs.reduce((sum, c) => sum + (c.support_count || 0), 0)}</p>
            <p className="text-[10px] text-[var(--convs-text-muted)] uppercase tracking-wider">Supported</p>
          </div>
          <div className="convs-card p-3 text-center">
            <p className="text-lg font-bold text-red-500">{convs.reduce((sum, c) => sum + (c.oppose_count || 0), 0)}</p>
            <p className="text-[10px] text-[var(--convs-text-muted)] uppercase tracking-wider">Opposed</p>
          </div>
        </div>

        {/* Badges */}
        {profileUser?.badges && profileUser.badges.length > 0 && (
          <div className="flex flex-wrap gap-2 mt-3">
            {profileUser.badges.map(b => (
              <span key={b} className="px-2.5 py-1 rounded-full text-xs font-medium bg-[var(--convs-accent-light)] text-[var(--convs-accent)]">
                {b}
              </span>
            ))}
          </div>
        )}
      </div>

      {/* Tabs */}
      <div className="flex border-b border-[var(--convs-border)] mt-6">
        {tabs.map(tab => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key)}
            className={`flex-1 py-3 text-sm font-medium transition-all relative ${
              activeTab === tab.key
                ? "text-[var(--convs-accent)]"
                : "text-[var(--convs-text-muted)] hover:text-[var(--convs-text-secondary)]"
            }`}
          >
            {tab.label}
            {tab.count !== null && <span className="ml-1 text-xs">({tab.count})</span>}
            {activeTab === tab.key && (
              <span className="absolute bottom-0 left-1/2 -translate-x-1/2 w-8 h-0.5 bg-[var(--convs-accent)] rounded-full" />
            )}
          </button>
        ))}
      </div>

      {/* Content */}
      <div className="mt-4 space-y-3">
        {activeTab === "convs" && (() => {
          const items = [
            ...convs.map(c => ({ type: "conv", data: c, date: c.created_date })),
            ...reconvs.map(r => ({ type: "reconv", data: r, date: r.created_date })),
          ].sort((a, b) => new Date(b.date) - new Date(a.date));

          return items.map(item => {
            if (item.type === "reconv") {
              const origConv = convsById[item.data.original_conv_id];
              if (!origConv) return null;
              return (
                <ReconvCard
                  key={`reconv-${item.data.id}`}
                  reconv={item.data}
                  originalConv={origConv}
                  onBookmark={handleBookmark}
                  isBookmarked={bookmarkedIds.has(origConv.id)}
                  onShare={(c) => setShareConv(c)}
                  onReconv={(c) => setReconvConv(c)}
                />
              );
            }
            return (
              <ConvCard
                key={item.data.id}
                conv={item.data}
                currentUserEmail={currentUser?.email}
                onBookmark={handleBookmark}
                isBookmarked={bookmarkedIds.has(item.data.id)}
                onShare={(c) => setShareConv(c)}
                onReconv={(c) => setReconvConv(c)}
                onEdit={(c) => setEditConv(c)}
                onDelete={handleDelete}
              />
            );
          });
        })()}
        {activeTab === "replies" && comments.map(c => (
          <div key={c.id} className="convs-card p-4">
            <p className="text-xs text-[var(--convs-text-muted)] mb-2">
              Replied to a conv · {moment(c.created_date).fromNow()}
            </p>
            <p className="text-sm text-[var(--convs-text)]">{c.content}</p>
          </div>
        ))}
        {activeTab === "analytics" && (
          <ProfileAnalytics convs={convs} comments={comments} profileUser={profileUser} />
        )}
        {activeTab === "bookmarks" && (
          bookmarks.length === 0 ? (
            <div className="convs-card p-6 text-center text-[var(--convs-text-muted)] text-sm">
              <Bookmark className="w-8 h-8 mx-auto mb-2 opacity-50" />
              No bookmarks yet.
            </div>
          ) : (
            bookmarks.map(bm => {
              const conv = convsById[bm.conv_id];
              if (!conv) return null;
              return (
                <ConvCard
                  key={bm.id}
                  conv={conv}
                  currentUserEmail={currentUser?.email}
                  onBookmark={handleBookmark}
                  isBookmarked={bookmarkedIds.has(conv.id)}
                  onShare={(c) => setShareConv(c)}
                  onReconv={(c) => setReconvConv(c)}
                  onEdit={(c) => setEditConv(c)}
                  onDelete={handleDelete}
                />
              );
            })
          )
        )}
      </div>

      {currentUser && (
        <CreateConvModal
          isOpen={showCreateConv}
          onClose={() => setShowCreateConv(false)}
          user={currentUser}
          onCreated={() => queryClient.invalidateQueries({ queryKey: ["profile-convs", profileEmail] })}
        />
      )}

      <ShareModal isOpen={!!shareConv} onClose={() => setShareConv(null)} conv={shareConv} />

      <EditConvModal
        isOpen={!!editConv}
        onClose={() => setEditConv(null)}
        conv={editConv}
        onUpdated={() => queryClient.invalidateQueries({ queryKey: ["profile-convs", profileEmail] })}
      />

      <ReconvModal
        isOpen={!!reconvConv}
        onClose={() => setReconvConv(null)}
        conv={reconvConv}
        user={currentUser}
        onReconved={() => queryClient.invalidateQueries({ queryKey: ["profile-reconvs", profileEmail] })}
      />
    </div>
  );
}