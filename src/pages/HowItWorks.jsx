import React from "react";
import { Link } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { ArrowLeft, MessageSquare, Target, TrendingUp, ThumbsUp, ThumbsDown, Quote, Shield, BarChart3, Repeat2 } from "lucide-react";

const STEPS = [
  { icon: MessageSquare, step: "1", title: "Post a Conv", desc: "Share your claim, argument, or thesis. You can post a short take (up to 500 characters), a long-form article with rich formatting, or a media-based conv with images. Add topics/hashtags so your conv reaches the right audience." },
  { icon: ThumbsUp, step: "2", title: "Support with Evidence", desc: "Agree with a conv? Support it by tagging its strengths — clear evidence, strong logic, original insight, or practical application. Add citations and evidence links to bolster the argument." },
  { icon: ThumbsDown, step: "3", title: "Oppose with Reasoning", desc: "Disagree? Oppose the conv by tagging specific logical flaws — straw man, false dichotomy, circular reasoning, or unsupported claims. Explain why the argument fails and provide counter-evidence." },
  { icon: Quote, step: "4", title: "Highlight & Debate", desc: "Select specific text from any conv to create a precision response. This creates a micro-thread tied directly to the exact claim you're addressing, keeping debates focused and evidence-based." },
  { icon: Shield, step: "5", title: "AI Moderation", desc: "Before any post goes live, our AI moderator analyses it for toxicity, personal attacks, and constructiveness. Posts that attack people instead of ideas are flagged or blocked. This ensures the platform stays intellectually honest." },
  { icon: BarChart3, step: "6", title: "Live Analytics", desc: "Every conv generates real-time analytics: support/oppose ratios, argument quality scores, flaw distributions, and strength rankings. See exactly how your argument holds up under scrutiny." },
  { icon: Repeat2, step: "7", title: "Reconv & Share", desc: "Found a compelling argument? Reconv it to your feed so your followers see it. Add your own thoughts or simply amplify the original. Share convs externally via Twitter, Facebook, LinkedIn, or a direct link." },
];

export default function HowItWorks() {
  return (
    <div className="min-h-screen" style={{ background: "var(--convs-bg)" }}>
      <div className="max-w-4xl mx-auto px-4 py-12">
        <Link to={createPageUrl("Landing")} className="inline-flex items-center gap-2 text-sm mb-8 hover:underline" style={{ color: "var(--convs-accent)" }}>
          <ArrowLeft className="w-4 h-4" /> Back to Home
        </Link>

        <h1 className="text-4xl md:text-5xl font-bold mb-4" style={{ color: "var(--convs-text)" }}>How Convs Works</h1>
        <p className="text-lg mb-12 leading-relaxed" style={{ color: "var(--convs-text-secondary)" }}>
          Convs transforms unstructured debate into transparent, evidence-based discourse. Here's how every step works.
        </p>

        <div className="space-y-6">
          {STEPS.map(s => (
            <div key={s.step} className="convs-card p-6 flex gap-5">
              <div className="flex-shrink-0 w-12 h-12 rounded-xl flex items-center justify-center" style={{ background: "var(--convs-accent-light)" }}>
                <s.icon className="w-6 h-6" style={{ color: "var(--convs-accent)" }} />
              </div>
              <div>
                <p className="text-xs font-bold uppercase tracking-wider mb-1" style={{ color: "var(--convs-accent)" }}>Step {s.step}</p>
                <h3 className="text-lg font-bold mb-2" style={{ color: "var(--convs-text)" }}>{s.title}</h3>
                <p className="text-sm leading-relaxed" style={{ color: "var(--convs-text-secondary)" }}>{s.desc}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}