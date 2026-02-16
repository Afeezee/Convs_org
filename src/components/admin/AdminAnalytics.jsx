import React from "react";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from "recharts";
import moment from "moment";

const COLORS = ["#6366F1", "#10B981", "#F59E0B", "#EF4444", "#8B5CF6", "#EC4899"];

export default function AdminAnalytics({ users, convs, comments }) {
  // Convs per day (last 7 days)
  const last7Days = [...Array(7)].map((_, i) => {
    const date = moment().subtract(6 - i, "days");
    const count = convs.filter(c => moment(c.created_date).isSame(date, "day")).length;
    return { day: date.format("ddd"), count };
  });

  // Stance distribution
  const stanceCounts = comments.reduce((acc, c) => {
    acc[c.stance] = (acc[c.stance] || 0) + 1;
    return acc;
  }, {});
  const stanceData = Object.entries(stanceCounts).map(([name, value]) => ({ name, value }));

  // Top topics
  const topicCounts = {};
  convs.forEach(c => (c.topics || []).forEach(t => { topicCounts[t] = (topicCounts[t] || 0) + 1; }));
  const topTopics = Object.entries(topicCounts)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 6)
    .map(([name, count]) => ({ name, count }));

  // Top contributors
  const authorCounts = {};
  convs.forEach(c => { authorCounts[c.author_name] = (authorCounts[c.author_name] || 0) + 1; });
  const topAuthors = Object.entries(authorCounts)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5);

  const tooltipStyle = {
    contentStyle: {
      background: "var(--convs-card)",
      border: "1px solid var(--convs-border)",
      borderRadius: "8px",
      color: "var(--convs-text)",
      fontSize: "12px",
    },
  };

  return (
    <div className="space-y-6">
      {/* Convs per day chart */}
      <div className="convs-card p-5">
        <h3 className="text-sm font-semibold text-[var(--convs-text)] mb-4">Convs (Last 7 Days)</h3>
        <ResponsiveContainer width="100%" height={200}>
          <BarChart data={last7Days}>
            <XAxis dataKey="day" tick={{ fill: "var(--convs-text-muted)", fontSize: 12 }} axisLine={false} tickLine={false} />
            <YAxis tick={{ fill: "var(--convs-text-muted)", fontSize: 12 }} axisLine={false} tickLine={false} allowDecimals={false} />
            <Tooltip {...tooltipStyle} />
            <Bar dataKey="count" fill="#6366F1" radius={[6, 6, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Stance Distribution */}
        <div className="convs-card p-5">
          <h3 className="text-sm font-semibold text-[var(--convs-text)] mb-4">Stance Distribution</h3>
          {stanceData.length > 0 ? (
            <ResponsiveContainer width="100%" height={180}>
              <PieChart>
                <Pie data={stanceData} cx="50%" cy="50%" outerRadius={70} dataKey="value" label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}>
                  {stanceData.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                </Pie>
                <Tooltip {...tooltipStyle} />
              </PieChart>
            </ResponsiveContainer>
          ) : (
            <p className="text-sm text-[var(--convs-text-muted)] text-center py-8">No comment data yet</p>
          )}
        </div>

        {/* Top Topics */}
        <div className="convs-card p-5">
          <h3 className="text-sm font-semibold text-[var(--convs-text)] mb-4">Top Topics</h3>
          {topTopics.length > 0 ? (
            <div className="space-y-3">
              {topTopics.map((t, i) => (
                <div key={t.name} className="flex items-center gap-3">
                  <span className="text-xs font-bold text-[var(--convs-text-muted)] w-4">{i + 1}</span>
                  <span className="text-sm font-medium text-[var(--convs-text)] flex-1">#{t.name}</span>
                  <span className="text-xs text-[var(--convs-text-muted)] px-2 py-0.5 rounded-full bg-[var(--convs-bg-tertiary)]">{t.count}</span>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-sm text-[var(--convs-text-muted)] text-center py-8">No topics yet</p>
          )}
        </div>
      </div>

      {/* Top Contributors */}
      <div className="convs-card p-5">
        <h3 className="text-sm font-semibold text-[var(--convs-text)] mb-4">Top Contributors</h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-5 gap-3">
          {topAuthors.map(([name, count]) => (
            <div key={name} className="flex items-center gap-2 p-2 rounded-xl bg-[var(--convs-bg-secondary)]">
              <div className="w-8 h-8 rounded-full bg-[var(--convs-accent-light)] flex items-center justify-center text-xs font-bold text-[var(--convs-accent)]">
                {name.charAt(0).toUpperCase()}
              </div>
              <div className="min-w-0">
                <p className="text-xs font-medium text-[var(--convs-text)] truncate">{name}</p>
                <p className="text-[10px] text-[var(--convs-text-muted)]">{count} convs</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}