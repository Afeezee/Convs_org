import React from "react";
import { Link } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { TrendingUp, Flame, Users } from "lucide-react";
import Avatar from "../shared/Avatar";

const TRENDING_TOPICS = [
  { topic: "AI", count: 2340 },
  { topic: "Philosophy", count: 1890 },
  { topic: "Technology", count: 1450 },
  { topic: "Politics", count: 1200 },
  { topic: "Health", count: 980 },
];

export default function TrendingSidebar({ suggestedUsers = [] }) {
  return (
    <div className="space-y-4">
      {/* Trending Topics */}
      <div className="convs-card p-4">
        <div className="flex items-center gap-2 mb-4">
          <TrendingUp className="w-4 h-4 text-[var(--convs-accent)]" />
          <h3 className="font-bold text-sm text-[var(--convs-text)]">Trending Topics</h3>
        </div>
        <div className="space-y-2.5">
          {TRENDING_TOPICS.map((t, i) => (
            <Link
              key={t.topic}
              to={createPageUrl("Explore") + `?topic=${t.topic}`}
              className="flex items-center justify-between group py-1.5"
            >
              <div className="flex items-center gap-2.5">
                <span className="text-xs font-bold text-[var(--convs-text-muted)] w-5">{i + 1}</span>
                <div>
                  <p className="text-sm font-semibold text-[var(--convs-text)] group-hover:text-[var(--convs-accent)] transition-colors">
                    #{t.topic}
                  </p>
                  <p className="text-xs text-[var(--convs-text-muted)]">{t.count.toLocaleString()} convs</p>
                </div>
              </div>
              <Flame className="w-3.5 h-3.5 text-[var(--convs-text-muted)] group-hover:text-orange-500 transition-colors" />
            </Link>
          ))}
        </div>
      </div>

      {/* Suggested Users */}
      {suggestedUsers.length > 0 && (
        <div className="convs-card p-4">
          <div className="flex items-center gap-2 mb-4">
            <Users className="w-4 h-4 text-[var(--convs-accent)]" />
            <h3 className="font-bold text-sm text-[var(--convs-text)]">Suggested Thinkers</h3>
          </div>
          <div className="space-y-3">
            {suggestedUsers.slice(0, 5).map(u => (
              <Link
                key={u.id}
                to={createPageUrl("Profile") + `?email=${u.email}`}
                className="flex items-center gap-3 group"
              >
                <Avatar name={u.full_name} image={u.profile_image} size="sm" />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-[var(--convs-text)] truncate group-hover:text-[var(--convs-accent)] transition-colors">
                    {u.full_name}
                  </p>
                  <p className="text-xs text-[var(--convs-text-muted)] truncate">
                    @{u.username || u.email?.split("@")[0]}
                  </p>
                </div>
              </Link>
            ))}
          </div>
        </div>
      )}

      {/* Footer */}
      <div className="px-4 text-xs text-[var(--convs-text-muted)] leading-relaxed">
        <p>Convs — Structured Intellectual Discourse</p>
        <p className="mt-1">© 2026 Cereus Technologies</p>
      </div>
    </div>
  );
}