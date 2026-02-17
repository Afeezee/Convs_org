import React from "react";
import { base44 } from "@/api/base44Client";
import { useQuery } from "@tanstack/react-query";
import { PieChart, Pie, Cell, ResponsiveContainer } from "recharts";
import { BarChart3, MessageSquare, ThumbsUp, ThumbsDown, TrendingUp, Star } from "lucide-react";

export default function ProfileAnalytics({ convs = [], comments = [], profileUser }) {
  // Fetch star ratings received on this user's comments
  const commentIds = comments.map(c => c.id);
  const { data: allRatings = [] } = useQuery({
    queryKey: ["profile-comment-ratings", profileUser?.email, commentIds.join(",")],
    queryFn: async () => {
      if (commentIds.length === 0) return [];
      const results = [];
      for (const id of commentIds) {
        const ratings = await base44.entities.CommentRating.filter({ comment_id: id });
        results.push(...ratings);
      }
      return results;
    },
    enabled: comments.length > 0,
  });

  const totalStarRatings = allRatings.length;
  const avgStarRating = totalStarRatings > 0
    ? Math.round((allRatings.reduce((sum, r) => sum + (r.rating || 0), 0) / totalStarRatings) * 10) / 10
    : 0;
  const starDistribution = [5, 4, 3, 2, 1].map(star => ({
    star,
    count: allRatings.filter(r => r.rating === star).length,
  }));
  const totalConvs = convs.length;
  
  // Aggregate support/oppose across all user's convs
  const totalSupport = convs.reduce((sum, c) => sum + (c.support_count || 0), 0);
  const totalOppose = convs.reduce((sum, c) => sum + (c.oppose_count || 0), 0);
  const totalComments = convs.reduce((sum, c) => sum + (c.comment_count || 0), 0);
  const totalEngagement = totalSupport + totalOppose + totalComments;
  
  // Stance distribution from comments the user made
  const supportGiven = comments.filter(c => c.stance === "support").length;
  const opposeGiven = comments.filter(c => c.stance === "oppose").length;
  const clarifyGiven = comments.filter(c => c.stance === "clarification").length;
  const totalStances = supportGiven + opposeGiven + clarifyGiven;
  
  const stancePieData = [
    { name: "Support", value: supportGiven, color: "#10B981" },
    { name: "Oppose", value: opposeGiven, color: "#EF4444" },
    { name: "Clarify", value: clarifyGiven, color: "#F59E0B" },
  ];
  
  // Reception pie (support vs oppose received on their convs)
  const receptionTotal = totalSupport + totalOppose;
  const receptionPieData = [
    { name: "Support", value: totalSupport, color: "#10B981" },
    { name: "Oppose", value: totalOppose, color: "#EF4444" },
  ];
  
  // Topics frequency
  const topicCounts = {};
  convs.forEach(c => {
    (c.topics || []).forEach(t => {
      topicCounts[t] = (topicCounts[t] || 0) + 1;
    });
  });
  const topTopics = Object.entries(topicCounts)
    .sort(([, a], [, b]) => b - a)
    .slice(0, 5);

  // Average quality
  const qualityConvs = convs.filter(c => c.quality_score > 0);
  const avgQuality = qualityConvs.length > 0
    ? Math.round(qualityConvs.reduce((s, c) => s + c.quality_score, 0) / qualityConvs.length)
    : 0;

  return (
    <div className="space-y-4">
      {/* Overview Stats */}
      <div className="convs-card p-4">
        <div className="flex items-center gap-2 mb-4">
          <BarChart3 className="w-4 h-4 text-[var(--convs-accent)]" />
          <h3 className="font-bold text-sm text-[var(--convs-text)]">Overview</h3>
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <div className="text-center p-3 rounded-xl bg-[var(--convs-bg-secondary)]">
            <p className="text-xl font-bold text-[var(--convs-text)]">{totalConvs}</p>
            <p className="text-[10px] text-[var(--convs-text-muted)] uppercase">Convs</p>
          </div>
          <div className="text-center p-3 rounded-xl bg-[var(--convs-bg-secondary)]">
            <p className="text-xl font-bold text-[var(--convs-accent)]">{totalEngagement}</p>
            <p className="text-[10px] text-[var(--convs-text-muted)] uppercase">Engagement</p>
          </div>
          <div className="text-center p-3 rounded-xl bg-[var(--convs-bg-secondary)]">
            <p className="text-xl font-bold text-emerald-500">{totalSupport}</p>
            <p className="text-[10px] text-[var(--convs-text-muted)] uppercase">Support Received</p>
          </div>
          <div className="text-center p-3 rounded-xl bg-[var(--convs-bg-secondary)]">
            <p className="text-xl font-bold text-red-500">{totalOppose}</p>
            <p className="text-[10px] text-[var(--convs-text-muted)] uppercase">Oppose Received</p>
          </div>
        </div>
      </div>

      {/* Reception & Stance Charts */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {/* Reception */}
        <div className="convs-card p-4">
          <p className="text-xs font-semibold text-[var(--convs-text)] mb-3">Reception on Convs</p>
          {receptionTotal > 0 ? (
            <div className="flex items-center justify-center gap-4">
              <ResponsiveContainer width={90} height={90}>
                <PieChart>
                  <Pie data={receptionPieData} cx="50%" cy="50%" innerRadius={22} outerRadius={40} dataKey="value" strokeWidth={0}>
                    {receptionPieData.map((e, i) => <Cell key={i} fill={e.color} />)}
                  </Pie>
                </PieChart>
              </ResponsiveContainer>
              <div className="space-y-1.5">
                <div className="flex items-center gap-2 text-xs">
                  <span className="w-2.5 h-2.5 rounded-full bg-emerald-500" />
                  <span className="text-[var(--convs-text-secondary)]">Support</span>
                  <span className="font-bold text-[var(--convs-text)]">{((totalSupport / receptionTotal) * 100).toFixed(0)}%</span>
                </div>
                <div className="flex items-center gap-2 text-xs">
                  <span className="w-2.5 h-2.5 rounded-full bg-red-500" />
                  <span className="text-[var(--convs-text-secondary)]">Oppose</span>
                  <span className="font-bold text-[var(--convs-text)]">{((totalOppose / receptionTotal) * 100).toFixed(0)}%</span>
                </div>
              </div>
            </div>
          ) : (
            <p className="text-xs text-[var(--convs-text-muted)] text-center py-4">No engagement yet</p>
          )}
        </div>

        {/* Stances Given */}
        <div className="convs-card p-4">
          <p className="text-xs font-semibold text-[var(--convs-text)] mb-3">Stances Given</p>
          {totalStances > 0 ? (
            <div className="flex items-center justify-center gap-4">
              <ResponsiveContainer width={90} height={90}>
                <PieChart>
                  <Pie data={stancePieData} cx="50%" cy="50%" innerRadius={22} outerRadius={40} dataKey="value" strokeWidth={0}>
                    {stancePieData.map((e, i) => <Cell key={i} fill={e.color} />)}
                  </Pie>
                </PieChart>
              </ResponsiveContainer>
              <div className="space-y-1.5">
                {stancePieData.map(s => (
                  <div key={s.name} className="flex items-center gap-2 text-xs">
                    <span className="w-2.5 h-2.5 rounded-full" style={{ background: s.color }} />
                    <span className="text-[var(--convs-text-secondary)]">{s.name}</span>
                    <span className="font-bold text-[var(--convs-text)]">{s.value}</span>
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <p className="text-xs text-[var(--convs-text-muted)] text-center py-4">No comments yet</p>
          )}
        </div>
      </div>

      {/* Quality Score */}
      {avgQuality > 0 && (
        <div className="convs-card p-4">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-semibold text-[var(--convs-text)]">Avg Argument Quality</span>
            <span className="text-xs font-bold text-[var(--convs-text)]">{avgQuality}/100</span>
          </div>
          <div className="w-full h-2.5 rounded-full bg-[var(--convs-bg-tertiary)] overflow-hidden">
            <div
              className="h-full rounded-full bg-gradient-to-r from-[var(--convs-accent)] to-emerald-500"
              style={{ width: `${avgQuality}%` }}
            />
          </div>
        </div>
      )}

      {/* Top Topics */}
      {topTopics.length > 0 && (
        <div className="convs-card p-4">
          <p className="text-xs font-semibold text-[var(--convs-text)] mb-3">Top Topics</p>
          <div className="flex flex-wrap gap-2">
            {topTopics.map(([topic, count]) => (
              <span key={topic} className="px-2.5 py-1 rounded-full text-xs font-medium bg-[var(--convs-accent-light)] text-[var(--convs-accent)]">
                #{topic} ({count})
              </span>
            ))}
          </div>
        </div>
      )}

      {/* Starred Comments */}
      <div className="convs-card p-4">
        <div className="flex items-center gap-2 mb-3">
          <Star className="w-4 h-4 text-amber-400 fill-amber-400" />
          <h3 className="font-bold text-sm text-[var(--convs-text)]">Starred Comments</h3>
        </div>
        {totalStarRatings > 0 ? (
          <div className="flex items-center gap-4">
            <div className="text-center min-w-[70px]">
              <p className="text-2xl font-bold text-amber-500">{avgStarRating}</p>
              <div className="flex items-center justify-center gap-0.5 mt-1">
                {[1, 2, 3, 4, 5].map(s => (
                  <Star key={s} className={`w-3 h-3 ${s <= Math.round(avgStarRating) ? "text-amber-400 fill-amber-400" : "text-[var(--convs-text-muted)]"}`} />
                ))}
              </div>
              <p className="text-[10px] text-[var(--convs-text-muted)] mt-1">{totalStarRatings} total</p>
            </div>
            <div className="flex-1 space-y-1.5">
              {starDistribution.map(({ star, count }) => (
                <div key={star} className="flex items-center gap-2 text-xs">
                  <div className="flex items-center gap-0.5 w-12 justify-end">
                    <span className="text-[var(--convs-text-secondary)] font-medium">{star}</span>
                    <Star className="w-3 h-3 text-amber-400 fill-amber-400" />
                  </div>
                  <div className="flex-1 h-2.5 rounded-full bg-[var(--convs-bg-tertiary)] overflow-hidden">
                    <div
                      className="h-full rounded-full bg-amber-400 transition-all"
                      style={{ width: `${(count / totalStarRatings) * 100}%` }}
                    />
                  </div>
                  <span className="w-8 text-right text-[var(--convs-text-secondary)] font-medium">{count}</span>
                </div>
              ))}
            </div>
          </div>
        ) : (
          <p className="text-xs text-[var(--convs-text-muted)] text-center py-4">No comment ratings yet</p>
        )}
      </div>

      {totalConvs === 0 && totalStances === 0 && (
        <div className="convs-card p-6 text-center text-[var(--convs-text-muted)] text-sm">
          <TrendingUp className="w-8 h-8 mx-auto mb-2 opacity-50" />
          Analytics will appear as you participate in more debates.
        </div>
      )}
    </div>
  );
}