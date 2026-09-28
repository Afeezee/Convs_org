import React, { useState } from "react";
import { api } from "@/api/client";
import { useAuth } from "@/lib/AuthContext";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { Search, Loader2, UserPlus, UserCheck } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import Avatar from "@/components/shared/Avatar";

export default function FollowSuggestions() {
  const { user } = useAuth();
  const [searchQuery, setSearchQuery] = useState("");
  const queryClient = useQueryClient();

  // Use Profile entity instead of User for public data
  const { data: allProfiles = [], isLoading } = useQuery({
    queryKey: ["all-profiles-search"],
    queryFn: () => api.entities.Profile.list("-created_date", 200),
    enabled: !!user,
  });

  const { data: myFollows = [] } = useQuery({
    queryKey: ["my-follows", user?.email],
    queryFn: () => api.entities.Follow.filter({ follower_email: user.email }),
    enabled: !!user,
  });

  const { data: myConvs = [] } = useQuery({
    queryKey: ["my-convs", user?.email],
    queryFn: () => api.entities.Conv.filter({ author_email: user.email }),
    enabled: !!user,
  });

  const { data: myComments = [] } = useQuery({
    queryKey: ["my-comments", user?.email],
    queryFn: () => api.entities.Comment.filter({ author_email: user.email }),
    enabled: !!user,
  });

  const followingEmails = new Set(myFollows.map(f => f.following_email));

  // Counters and notifications are the server's job now — just create/delete
  // and refetch to pick up the new totals.
  const followMutation = useMutation({
    mutationFn: (targetEmail) => api.entities.Follow.create({ following_email: targetEmail }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["my-follows"] });
      queryClient.invalidateQueries({ queryKey: ["all-profiles-search"] });
    },
  });

  const unfollowMutation = useMutation({
    mutationFn: async (targetEmail) => {
      const follows = await api.entities.Follow.filter({
        follower_email: user.email,
        following_email: targetEmail,
      });
      if (follows[0]) await api.entities.Follow.delete(follows[0].id);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["my-follows"] });
      queryClient.invalidateQueries({ queryKey: ["all-profiles-search"] });
    },
  });

  const interactedEmails = new Set([
    ...myConvs.flatMap(c => {
      const comments = myComments.filter(cm => cm.conv_id === c.id);
      return comments.map(cm => cm.author_email);
    }),
  ]);

  const otherProfiles = allProfiles.filter(p => p.email !== user?.email);

  const searchResults = searchQuery
    ? otherProfiles.filter(p =>
        p.full_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        p.email?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        p.username?.toLowerCase().includes(searchQuery.toLowerCase())
      )
    : [];

  const suggestions = otherProfiles.filter(p => 
    !followingEmails.has(p.email) &&
    interactedEmails.has(p.email)
  ).slice(0, 10);

  const popularProfiles = otherProfiles
    .sort((a, b) => (b.followers_count || 0) - (a.followers_count || 0))
    .slice(0, 20);

  if (isLoading) {
    return (
      <div className="flex justify-center py-20">
        <Loader2 className="w-6 h-6 animate-spin text-[var(--convs-accent)]" />
      </div>
    );
  }

  const renderProfileCard = (p) => {
    const isFollowingUser = followingEmails.has(p.email);
    return (
      <Link key={p.id} to={createPageUrl("Profile") + `?email=${p.email}`} className="block">
        <div className="convs-card p-4 flex items-center justify-between">
          <div className="flex items-center gap-3 min-w-0 flex-1">
            <Avatar name={p.full_name} image={p.profile_image} size="md" />
            <div className="min-w-0 flex-1">
              <p className="font-semibold text-[var(--convs-text)] truncate">{p.full_name}</p>
              <p className="text-xs text-[var(--convs-text-muted)] truncate">@{p.username || p.email?.split("@")[0]} · {p.followers_count || 0} followers</p>
              {p.bio && <p className="text-xs text-[var(--convs-text-secondary)] mt-0.5 line-clamp-1">{p.bio}</p>}
            </div>
          </div>
          <button
            onClick={(e) => { e.preventDefault(); e.stopPropagation(); isFollowingUser ? unfollowMutation.mutate(p.email) : followMutation.mutate(p.email); }}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md text-sm font-medium flex-shrink-0 transition-colors border"
            style={isFollowingUser
              ? { background: "var(--convs-bg-tertiary)", color: "var(--convs-text)", borderColor: "var(--convs-border)" }
              : { background: "#6366F1", color: "#FFFFFF", borderColor: "#6366F1" }
            }
          >
            {isFollowingUser ? <UserCheck className="w-4 h-4" /> : <UserPlus className="w-4 h-4" />}
            {isFollowingUser ? "Following" : "Follow"}
          </button>
        </div>
      </Link>
    );
  };

  return (
    <div className="max-w-2xl mx-auto px-4 py-6">
      <h1 className="text-2xl font-bold text-[var(--convs-text)] mb-6">Discover Thinkers</h1>

      <div className="relative mb-6">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[var(--convs-text-muted)]" />
        <Input
          placeholder="Search by name, username, or email..."
          value={searchQuery}
          onChange={e => setSearchQuery(e.target.value)}
          className="pl-10 bg-[var(--convs-bg-secondary)] border-[var(--convs-border)] text-[var(--convs-text)]"
        />
      </div>

      {searchQuery && (
        <div className="mb-6">
          <h2 className="text-lg font-semibold text-[var(--convs-text)] mb-3">Search Results</h2>
          {searchResults.length > 0 ? (
            <div className="space-y-2">
              {searchResults.map(p => renderProfileCard(p))}
            </div>
          ) : (
            <p className="text-sm text-[var(--convs-text-muted)] py-8 text-center">No users found matching "{searchQuery}"</p>
          )}
        </div>
      )}

      {!searchQuery && suggestions.length > 0 && (
        <div className="mb-6">
          <h2 className="text-lg font-semibold text-[var(--convs-text)] mb-3">Suggested For You</h2>
          <p className="text-sm text-[var(--convs-text-muted)] mb-3">People you've debated with</p>
          <div className="space-y-2">
            {suggestions.map(p => renderProfileCard(p))}
          </div>
        </div>
      )}

      {!searchQuery && (
        <div>
          <h2 className="text-lg font-semibold text-[var(--convs-text)] mb-3">Popular Thinkers</h2>
          <div className="space-y-2">
            {popularProfiles.map(p => renderProfileCard(p))}
          </div>
        </div>
      )}
    </div>
  );
}