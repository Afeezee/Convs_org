import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery } from "@tanstack/react-query";
import { Search, TrendingUp, Flame, Loader2 } from "lucide-react";
import { Input } from "@/components/ui/input";
import ConvCard from "@/components/feed/ConvCard";
import TopicTag from "@/components/shared/TopicTag";

export default function Explore() {
  const params = new URLSearchParams(window.location.search);
  const initialTopic = params.get("topic") || "";
  const [searchQuery, setSearchQuery] = useState("");
  const [activeTopic, setActiveTopic] = useState(initialTopic);

  // Sync activeTopic when URL changes
  React.useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const t = urlParams.get("topic") || "";
    setActiveTopic(t);
  }, [window.location.search]);

  const { data: convs = [], isLoading } = useQuery({
    queryKey: ["explore-convs"],
    queryFn: () => base44.entities.Conv.list("-created_date", 200),
  });

  // Compute trending topics from actual data
  const trendingTopics = React.useMemo(() => {
    const counts = {};
    convs.forEach(c => (c.topics || []).forEach(t => { counts[t] = (counts[t] || 0) + 1; }));
    return Object.entries(counts)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 12)
      .map(([name]) => name);
  }, [convs]);

  const filteredConvs = convs.filter(c => {
    const matchesSearch = !searchQuery ||
      c.content?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      c.title?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      c.author_name?.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesTopic = !activeTopic ||
      c.topics?.some(t => t.toLowerCase() === activeTopic.toLowerCase());
    return matchesSearch && matchesTopic;
  });

  return (
    <div className="max-w-3xl mx-auto px-4 py-6 overflow-x-hidden">
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-[var(--convs-text)] mb-1">Explore</h1>
        <p className="text-sm text-[var(--convs-text-muted)]">Discover intellectual debates across topics</p>
      </div>

      {/* Search */}
      <div className="relative mb-4">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[var(--convs-text-muted)]" />
        <Input
          placeholder="Search convs, users, topics..."
          value={searchQuery}
          onChange={e => setSearchQuery(e.target.value)}
          className="pl-10 bg-[var(--convs-bg-secondary)] border-[var(--convs-border)] text-[var(--convs-text)] placeholder:text-[var(--convs-text-muted)] h-11 rounded-xl"
        />
      </div>

      {/* Active topic header */}
      {activeTopic && (
        <div className="mb-4 p-4 rounded-xl bg-[var(--convs-accent-light)] border border-[var(--convs-accent)]/20">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs text-[var(--convs-text-muted)] uppercase tracking-wider mb-0.5">Showing results for</p>
              <h2 className="text-lg font-bold text-[var(--convs-accent)]">#{activeTopic}</h2>
            </div>
            <span className="text-sm text-[var(--convs-text-secondary)]">
              {filteredConvs.length} conv{filteredConvs.length !== 1 ? "s" : ""}
            </span>
          </div>
        </div>
      )}

      {/* Topics */}
      <div className="flex flex-wrap gap-2 mb-6">
        <TopicTag
          topic="All"
          active={!activeTopic}
          onClick={() => setActiveTopic("")}
        />
        {trendingTopics.map(t => (
          <TopicTag
            key={t}
            topic={t}
            active={activeTopic.toLowerCase() === t.toLowerCase()}
            onClick={() => setActiveTopic(activeTopic.toLowerCase() === t.toLowerCase() ? "" : t)}
          />
        ))}
      </div>

      {/* Results */}
      <div className="space-y-3">
        {isLoading ? (
          <div className="flex justify-center py-20">
            <Loader2 className="w-6 h-6 animate-spin text-[var(--convs-accent)]" />
          </div>
        ) : filteredConvs.length === 0 ? (
          <div className="text-center py-20 text-sm text-[var(--convs-text-muted)]">
            No convs found. Try adjusting your search.
          </div>
        ) : (
          filteredConvs.map(c => <ConvCard key={c.id} conv={c} />)
        )}
      </div>
    </div>
  );
}