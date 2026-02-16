import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Search, Loader2, UserPlus, UserCheck } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import Avatar from "@/components/shared/Avatar";

export default function FollowSuggestions() {
  const [user, setUser] = useState(null);
  const [searchQuery, setSearchQuery] = useState("");
  const queryClient = useQueryClient();

  useEffect(() => {
    base44.auth.me().then(setUser).catch(() => {});
  }, []);

  const { data: allUsers = [], isLoading } = useQuery({
    queryKey: ["all-users-search"],
    queryFn: () => base44.entities.User.list("-created_date", 200),
    enabled: !!user,
  });

  const { data: myFollows = [] } = useQuery({
    queryKey: ["my-follows", user?.email],
    queryFn: () => base44.entities.Follow.filter({ follower_email: user.email }),
    enabled: !!user,
  });

  const { data: myConvs = [] } = useQuery({
    queryKey: ["my-convs", user?.email],
    queryFn: () => base44.entities.Conv.filter({ author_email: user.email }),
    enabled: !!user,
  });

  const { data: myComments = [] } = useQuery({
    queryKey: ["my-comments", user?.email],
    queryFn: () => base44.entities.Comment.filter({ author_email: user.email }),
    enabled: !!user,
  });

  const followingEmails = new Set(myFollows.map(f => f.following_email));

  const followMutation = useMutation({
    mutationFn: (targetEmail) => base44.entities.Follow.create({ follower_email: user.email, following_email: targetEmail }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["my-follows"] }),
  });

  const unfollowMutation = useMutation({
    mutationFn: async (targetEmail) => {
      const follows = await base44.entities.Follow.filter({ follower_email: user.email, following_email: targetEmail });
      if (follows[0]) await base44.entities.Follow.delete(follows[0].id);
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["my-follows"] }),
  });

  // Get users I've interacted with
  const interactedEmails = new Set([
    ...myConvs.flatMap(c => {
      const comments = myComments.filter(cm => cm.conv_id === c.id);
      return comments.map(cm => cm.author_email);
    }),
  ]);

  // Search results
  const searchResults = allUsers.filter(u => {
    if (u.email === user?.email) return false;
    if (!searchQuery) return false;
    return (
      u.full_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      u.email?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      u.username?.toLowerCase().includes(searchQuery.toLowerCase())
    );
  });

  // Suggestions: users I've interacted with but not following
  const suggestions = allUsers.filter(u => 
    u.email !== user?.email &&
    !followingEmails.has(u.email) &&
    interactedEmails.has(u.email)
  ).slice(0, 10);

  // Popular users (most followers)
  const popularUsers = allUsers
    .filter(u => u.email !== user?.email && !followingEmails.has(u.email))
    .sort((a, b) => (b.followers_count || 0) - (a.followers_count || 0))
    .slice(0, 5);

  if (isLoading) {
    return (
      <div className="flex justify-center py-20">
        <Loader2 className="w-6 h-6 animate-spin text-[var(--convs-accent)]" />
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto px-4 py-6">
      <h1 className="text-2xl font-bold text-[var(--convs-text)] mb-6">Discover Thinkers</h1>

      {/* Search */}
      <div className="relative mb-6">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[var(--convs-text-muted)]" />
        <Input
          placeholder="Search by name, username, or email..."
          value={searchQuery}
          onChange={e => setSearchQuery(e.target.value)}
          className="pl-10 bg-[var(--convs-bg-secondary)] border-[var(--convs-border)] text-[var(--convs-text)]"
        />
      </div>

      {/* Search Results */}
      {searchQuery && searchResults.length > 0 && (
        <div className="mb-6">
          <h2 className="text-lg font-semibold text-[var(--convs-text)] mb-3">Search Results</h2>
          <div className="space-y-2">
            {searchResults.map(u => (
              <div key={u.id} className="convs-card p-4 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <Avatar name={u.full_name} size="md" />
                  <div>
                    <p className="font-semibold text-[var(--convs-text)]">{u.full_name}</p>
                    <p className="text-xs text-[var(--convs-text-muted)]">@{u.username || u.email?.split("@")[0]}</p>
                  </div>
                </div>
                <Button
                  size="sm"
                  onClick={() => followingEmails.has(u.email) ? unfollowMutation.mutate(u.email) : followMutation.mutate(u.email)}
                  className={followingEmails.has(u.email) 
                    ? "bg-[var(--convs-bg-tertiary)] text-[var(--convs-text)] hover:bg-red-50 hover:text-red-500" 
                    : "bg-[var(--convs-accent)] text-white hover:bg-[var(--convs-accent-hover)]"
                  }
                >
                  {followingEmails.has(u.email) ? (
                    <>
                      <UserCheck className="w-4 h-4 mr-1" />
                      Following
                    </>
                  ) : (
                    <>
                      <UserPlus className="w-4 h-4 mr-1" />
                      Follow
                    </>
                  )}
                </Button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Suggestions */}
      {!searchQuery && suggestions.length > 0 && (
        <div className="mb-6">
          <h2 className="text-lg font-semibold text-[var(--convs-text)] mb-3">Suggested For You</h2>
          <p className="text-sm text-[var(--convs-text-muted)] mb-3">People you've debated with</p>
          <div className="space-y-2">
            {suggestions.map(u => (
              <div key={u.id} className="convs-card p-4 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <Avatar name={u.full_name} size="md" />
                  <div>
                    <p className="font-semibold text-[var(--convs-text)]">{u.full_name}</p>
                    <p className="text-xs text-[var(--convs-text-muted)]">@{u.username || u.email?.split("@")[0]}</p>
                  </div>
                </div>
                <Button
                  size="sm"
                  onClick={() => followMutation.mutate(u.email)}
                  className="bg-[var(--convs-accent)] text-white hover:bg-[var(--convs-accent-hover)]"
                >
                  <UserPlus className="w-4 h-4 mr-1" />
                  Follow
                </Button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Popular Users */}
      {!searchQuery && (
        <div>
          <h2 className="text-lg font-semibold text-[var(--convs-text)] mb-3">Popular Thinkers</h2>
          <div className="space-y-2">
            {popularUsers.map(u => (
              <div key={u.id} className="convs-card p-4 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <Avatar name={u.full_name} size="md" />
                  <div>
                    <p className="font-semibold text-[var(--convs-text)]">{u.full_name}</p>
                    <p className="text-xs text-[var(--convs-text-muted)]">
                      {u.followers_count || 0} followers
                    </p>
                  </div>
                </div>
                <Button
                  size="sm"
                  onClick={() => followingEmails.has(u.email) ? unfollowMutation.mutate(u.email) : followMutation.mutate(u.email)}
                  className={followingEmails.has(u.email)
                    ? "bg-[var(--convs-bg-tertiary)] text-[var(--convs-text)]"
                    : "bg-[var(--convs-accent)] text-white hover:bg-[var(--convs-accent-hover)]"
                  }
                >
                  {followingEmails.has(u.email) ? (
                    <>
                      <UserCheck className="w-4 h-4 mr-1" />
                      Following
                    </>
                  ) : (
                    <>
                      <UserPlus className="w-4 h-4 mr-1" />
                      Follow
                    </>
                  )}
                </Button>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}