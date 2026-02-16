import React from "react";
import { Link } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { ArrowLeft, Scale, BarChart3, Shield, Quote, Brain, Eye, Repeat2, Bookmark, MessageSquare, Users, Bell, Zap } from "lucide-react";

const FEATURES = [
  { icon: Scale, title: "Structured Support & Opposition", desc: "Every response is categorised as support, opposition, or clarification. Tag specific logical flaws (straw man, false dichotomy, appeal to authority) or strengths (clear evidence, strong logic, original insight). This creates a transparent argument map for every conv." },
  { icon: BarChart3, title: "Live Argument Analytics", desc: "Real-time visualisations show support/oppose ratios, quality scores, top cited flaws, and strength distributions. Watch how your argument holds up as the community examines it. Analytics update live as new responses come in." },
  { icon: Shield, title: "AI-Moderated Discussions", desc: "Every post is analysed for toxicity, personal attacks, and constructiveness before publication. The AI moderator assigns quality scores and flags content that attacks people instead of ideas. This keeps discourse intellectual and respectful." },
  { icon: Quote, title: "Highlight-to-Debate", desc: "Select specific text from any conv to create a precision response. This ties your argument directly to the exact claim you're addressing, preventing misrepresentation and keeping debates focused on the actual points made." },
  { icon: Brain, title: "AI Quality Scoring", desc: "Every conv receives an AI-generated quality score based on argument structure, evidence usage, logical coherence, and constructiveness. High-quality arguments are surfaced and rewarded with greater visibility." },
  { icon: Repeat2, title: "Reconv Sharing", desc: "Amplify compelling arguments by reconving them to your feed. Add your own thoughts or simply share. Your followers see reconvs alongside your original convs, creating a curated intellectual timeline." },
  { icon: Bookmark, title: "Smart Bookmarking", desc: "Save convs, comments, and highlighted passages for later. Build a personal library of the best arguments and insights you encounter on the platform." },
  { icon: MessageSquare, title: "Threaded Discussions", desc: "Comments support full threading, so debates can branch into focused sub-discussions without losing context. Reply to specific comments to create deep, structured conversation trees." },
  { icon: Users, title: "Follow & Discover", desc: "Follow thinkers whose reasoning you admire. Discover new voices through the Explore page, trending topics, and suggested users. Build an intellectual network based on quality, not clout." },
  { icon: Bell, title: "Smart Notifications", desc: "Get notified when someone supports, opposes, or replies to your convs. Mentions, follows, and debate invites are all tracked so you never miss an important discussion." },
  { icon: Eye, title: "Transparent Moderation", desc: "All moderation decisions are visible. If a post is flagged, the author sees exactly why. There are no shadow bans or opaque algorithms — just clear, explainable moderation powered by AI." },
  { icon: Zap, title: "Multiple Conv Formats", desc: "Post short takes (up to 500 characters), long-form articles with rich formatting, or media-based convs with images. Each format is optimised for different types of arguments and discussions." },
];

export default function Features() {
  return (
    <div className="min-h-screen" style={{ background: "var(--convs-bg)" }}>
      <div className="max-w-5xl mx-auto px-4 py-12">
        <Link to={createPageUrl("Landing")} className="inline-flex items-center gap-2 text-sm mb-8 hover:underline" style={{ color: "var(--convs-accent)" }}>
          <ArrowLeft className="w-4 h-4" /> Back to Home
        </Link>

        <h1 className="text-4xl md:text-5xl font-bold mb-4" style={{ color: "var(--convs-text)" }}>Features</h1>
        <p className="text-lg mb-12 leading-relaxed" style={{ color: "var(--convs-text-secondary)" }}>
          Every feature on Convs is designed to elevate discourse, expose weak reasoning, and reward constructive argumentation.
        </p>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          {FEATURES.map(f => (
            <div key={f.title} className="convs-card p-5">
              <div className="flex items-center gap-3 mb-3">
                <div className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0" style={{ background: "var(--convs-accent-light)" }}>
                  <f.icon className="w-5 h-5" style={{ color: "var(--convs-accent)" }} />
                </div>
                <h3 className="font-bold" style={{ color: "var(--convs-text)" }}>{f.title}</h3>
              </div>
              <p className="text-sm leading-relaxed" style={{ color: "var(--convs-text-secondary)" }}>{f.desc}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}