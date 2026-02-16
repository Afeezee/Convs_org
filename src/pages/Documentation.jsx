import React from "react";
import { Link } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { ArrowLeft, BookOpen, MessageSquare, ThumbsUp, ThumbsDown, Quote, BarChart3, Repeat2, Bookmark, Users, Bell, Settings, Shield } from "lucide-react";

const DOCS = [
  { icon: MessageSquare, title: "Creating a Conv", content: "Convs support three formats: Short (up to 500 characters for quick takes), Long (rich text articles for in-depth arguments), and Media (image-based convs). To create a conv, click the '+' button on the home feed or your profile. Add topics using comma-separated hashtags to categorise your conv and help it reach the right audience." },
  { icon: ThumbsUp, title: "Supporting a Conv", content: "When you support a conv, you're endorsing the argument's reasoning. Select the 'Support' stance and tag specific strengths: clear evidence, strong logic, original insight, or practical application. Add a detailed comment explaining why the argument succeeds, and optionally include an evidence URL or citation." },
  { icon: ThumbsDown, title: "Opposing a Conv", content: "When you oppose a conv, you're challenging its reasoning. Select the 'Oppose' stance and tag specific logical flaws: straw man, false dichotomy, circular reasoning, appeal to authority, or unsupported claim. Provide a clear explanation of why the argument fails and include counter-evidence where possible." },
  { icon: Quote, title: "Highlight-to-Debate", content: "Select any text within a conv to create a precision response tied to that specific passage. This prevents misrepresentation and keeps debates focused. The highlighted text appears as a quote in your response, providing clear context for your argument." },
  { icon: BarChart3, title: "Understanding Analytics", content: "Every conv generates live analytics including: support/oppose ratio (visualised as a bar chart), argument quality score (AI-generated 0-100), top cited flaws (which logical weaknesses are most identified), and top cited strengths. These analytics update in real-time as new responses are added." },
  { icon: Repeat2, title: "Reconving", content: "To share a conv with your followers, click the Reconv button. You can add your own thoughts (optional) or simply reconv to amplify the argument. Reconvs appear in your profile's Convs tab and in your followers' home feeds, sorted by date alongside your original convs." },
  { icon: Bookmark, title: "Bookmarking", content: "Click the bookmark icon on any conv to save it. Bookmarked convs appear in the Bookmarks tab on your profile. The bookmark icon fills in to indicate a saved conv. Click again to remove. Use bookmarks to build a personal library of arguments worth revisiting." },
  { icon: Users, title: "Following & Discovery", content: "Follow users whose reasoning you admire by visiting their profile and clicking 'Follow'. The Discover page suggests users based on activity. The Explore page lets you search convs by topic. Your home feed prioritises content from people you follow." },
  { icon: Bell, title: "Notifications", content: "You receive notifications when someone: follows you, comments on your conv, supports or opposes your conv, mentions you, or sends you a message. Access notifications via the Bell icon in the navigation bar. Unread notifications are highlighted." },
  { icon: Settings, title: "Profile & Settings", content: "Customise your profile with a username, bio, and profile image from the Settings page. Your profile displays your convs, reconvs, replies, analytics, and bookmarks. Stats show your total convs, supports received, and oppositions received." },
  { icon: Shield, title: "Moderation & Scores", content: "Every post is moderated by AI before publication. The system checks for toxicity, personal attacks, and constructiveness. If your post is flagged, you'll see a feedback message explaining why. Blocked posts can be edited and resubmitted. Quality scores help surface the best arguments." },
];

export default function Documentation() {
  return (
    <div className="min-h-screen" style={{ background: "var(--convs-bg)" }}>
      <div className="max-w-4xl mx-auto px-4 py-12">
        <Link to={createPageUrl("Landing")} className="inline-flex items-center gap-2 text-sm mb-8 hover:underline" style={{ color: "var(--convs-accent)" }}>
          <ArrowLeft className="w-4 h-4" /> Back to Home
        </Link>

        <div className="flex items-center gap-3 mb-4">
          <BookOpen className="w-8 h-8" style={{ color: "var(--convs-accent)" }} />
          <h1 className="text-4xl md:text-5xl font-bold" style={{ color: "var(--convs-text)" }}>Documentation</h1>
        </div>
        <p className="text-lg mb-12 leading-relaxed" style={{ color: "var(--convs-text-secondary)" }}>
          Everything you need to know about using Convs effectively.
        </p>

        <div className="space-y-5">
          {DOCS.map(d => (
            <div key={d.title} className="convs-card p-5">
              <div className="flex items-center gap-3 mb-3">
                <div className="w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0" style={{ background: "var(--convs-accent-light)" }}>
                  <d.icon className="w-4.5 h-4.5" style={{ color: "var(--convs-accent)" }} />
                </div>
                <h3 className="font-bold" style={{ color: "var(--convs-text)" }}>{d.title}</h3>
              </div>
              <p className="text-sm leading-relaxed pl-12" style={{ color: "var(--convs-text-secondary)" }}>{d.content}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}