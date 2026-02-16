import React from "react";
import { PieChart, Pie, Cell, BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer } from "recharts";
import { BarChart3, TrendingUp } from "lucide-react";

export default function ConvAnalytics({ conv, comments = [] }) {
  const supportCount = conv.support_count || 0;
  const opposeCount = conv.oppose_count || 0;
  const total = supportCount + opposeCount;

  const pieData = [
    { name: "Support", value: supportCount, color: "#10B981" },
    { name: "Oppose", value: opposeCount, color: "#EF4444" },
  ];

  // Flaw distribution
  const flawCounts = {};
  comments.filter(c => c.flaw_tag).forEach(c => {
    flawCounts[c.flaw_tag] = (flawCounts[c.flaw_tag] || 0) + 1;
  });
  const flawData = Object.entries(flawCounts)
    .sort(([, a], [, b]) => b - a)
    .slice(0, 5)
    .map(([name, count]) => ({ name, count }));

  // Strength distribution
  const strengthCounts = {};
  comments.filter(c => c.strength_tag).forEach(c => {
    strengthCounts[c.strength_tag] = (strengthCounts[c.strength_tag] || 0) + 1;
  });
  const strengthData = Object.entries(strengthCounts)
    .sort(([, a], [, b]) => b - a)
    .slice(0, 5)
    .map(([name, count]) => ({ name, count }));

  return (
    <div className="convs-card p-4 space-y-5">
      <div className="flex items-center gap-2">
        <BarChart3 className="w-4 h-4 text-[var(--convs-accent)]" />
        <h3 className="font-bold text-sm text-[var(--convs-text)]">Live Analytics</h3>
      </div>

      {/* Pie Chart */}
      {total > 0 && (
        <div className="flex items-center justify-center gap-6">
          <ResponsiveContainer width={100} height={100}>
            <PieChart>
              <Pie data={pieData} cx="50%" cy="50%" innerRadius={25} outerRadius={45} dataKey="value" strokeWidth={0}>
                {pieData.map((entry, i) => (
                  <Cell key={i} fill={entry.color} />
                ))}
              </Pie>
            </PieChart>
          </ResponsiveContainer>
          <div className="space-y-1.5">
            <div className="flex items-center gap-2 text-xs">
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-500" />
              <span className="text-[var(--convs-text-secondary)]">Support</span>
              <span className="font-bold text-[var(--convs-text)]">{total > 0 ? ((supportCount / total) * 100).toFixed(0) : 0}%</span>
            </div>
            <div className="flex items-center gap-2 text-xs">
              <span className="w-2.5 h-2.5 rounded-full bg-red-500" />
              <span className="text-[var(--convs-text-secondary)]">Oppose</span>
              <span className="font-bold text-[var(--convs-text)]">{total > 0 ? ((opposeCount / total) * 100).toFixed(0) : 0}%</span>
            </div>
          </div>
        </div>
      )}

      {/* Quality Score */}
      {conv.quality_score > 0 && (
        <div>
          <div className="flex items-center justify-between mb-1.5">
            <span className="text-xs text-[var(--convs-text-secondary)]">Argument Quality</span>
            <span className="text-xs font-bold text-[var(--convs-text)]">{conv.quality_score}/100</span>
          </div>
          <div className="w-full h-2 rounded-full bg-[var(--convs-bg-tertiary)] overflow-hidden">
            <div
              className="h-full rounded-full bg-gradient-to-r from-[var(--convs-accent)] to-emerald-500 transition-all duration-700"
              style={{ width: `${conv.quality_score}%` }}
            />
          </div>
        </div>
      )}

      {/* Top Flaws */}
      {flawData.length > 0 && (
        <div>
          <p className="text-xs font-semibold text-[var(--convs-text)] mb-2">Top Flaws Cited</p>
          <ResponsiveContainer width="100%" height={flawData.length * 28 + 10}>
            <BarChart data={flawData} layout="vertical" margin={{ left: 0, right: 10, top: 0, bottom: 0 }}>
              <XAxis type="number" hide />
              <YAxis type="category" dataKey="name" width={120} tick={{ fontSize: 10, fill: "var(--convs-text-secondary)" }} axisLine={false} tickLine={false} />
              <Tooltip contentStyle={{ fontSize: 12 }} />
              <Bar dataKey="count" fill="#EF4444" radius={[0, 4, 4, 0]} barSize={12} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}

      {/* Top Strengths */}
      {strengthData.length > 0 && (
        <div>
          <p className="text-xs font-semibold text-[var(--convs-text)] mb-2">Top Strengths Cited</p>
          <ResponsiveContainer width="100%" height={strengthData.length * 28 + 10}>
            <BarChart data={strengthData} layout="vertical" margin={{ left: 0, right: 10, top: 0, bottom: 0 }}>
              <XAxis type="number" hide />
              <YAxis type="category" dataKey="name" width={120} tick={{ fontSize: 10, fill: "var(--convs-text-secondary)" }} axisLine={false} tickLine={false} />
              <Tooltip contentStyle={{ fontSize: 12 }} />
              <Bar dataKey="count" fill="#10B981" radius={[0, 4, 4, 0]} barSize={12} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}

      {/* Stats */}
      <div className="grid grid-cols-3 gap-2 pt-2 border-t border-[var(--convs-border)]">
        <div className="text-center">
          <p className="text-lg font-bold text-[var(--convs-text)]">{conv.comment_count || 0}</p>
          <p className="text-[10px] text-[var(--convs-text-muted)]">Arguments</p>
        </div>
        <div className="text-center">
          <p className="text-lg font-bold text-emerald-500">{supportCount}</p>
          <p className="text-[10px] text-[var(--convs-text-muted)]">Support</p>
        </div>
        <div className="text-center">
          <p className="text-lg font-bold text-red-500">{opposeCount}</p>
          <p className="text-[10px] text-[var(--convs-text-muted)]">Oppose</p>
        </div>
      </div>
    </div>
  );
}