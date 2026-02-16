import React from "react";
import { Link } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { ArrowLeft, Brain, Scale, Shield, BarChart3, Users, Lightbulb } from "lucide-react";

export default function AboutConvs() {
  return (
    <div className="min-h-screen" style={{ background: "var(--convs-bg)" }}>
      <div className="max-w-4xl mx-auto px-4 py-12">
        <Link to={createPageUrl("Landing")} className="inline-flex items-center gap-2 text-sm mb-8 hover:underline" style={{ color: "var(--convs-accent)" }}>
          <ArrowLeft className="w-4 h-4" /> Back to Home
        </Link>

        <h1 className="text-4xl md:text-5xl font-bold mb-6" style={{ color: "var(--convs-text)" }}>About Convs</h1>
        <p className="text-lg mb-10 leading-relaxed" style={{ color: "var(--convs-text-secondary)" }}>
          Convs is a next-generation intellectual social network built for people who believe discourse should be structured, transparent, and respectful. We're not another social media platform — we're an arena for ideas.
        </p>

        <div className="space-y-10">
          <Section icon={Brain} title="Our Mission">
            The internet is full of opinions but short on reasoning. Convs exists to change that. Our mission is to create a space where claims are examined, arguments are structured, and the quality of reasoning matters more than the volume of the crowd. We believe that disagreement — when done constructively — is one of the most powerful tools for collective intelligence.
          </Section>

          <Section icon={Scale} title="What Makes Us Different">
            Unlike traditional social media where engagement is driven by outrage, Convs rewards intellectual honesty. Every response is categorised as support, opposition, or clarification. Logical flaws and argument strengths are tagged explicitly. AI moderation ensures discussions stay constructive, and live analytics provide transparency into the quality and structure of every debate.
          </Section>

          <Section icon={Shield} title="Our Values">
            <ul className="list-disc pl-5 space-y-2 mt-2">
              <li><strong>Intellectual Integrity</strong> — We value truth-seeking over winning arguments.</li>
              <li><strong>Structured Discourse</strong> — Every claim deserves a fair hearing, and every opposition deserves a clear basis.</li>
              <li><strong>Transparency</strong> — Analytics, moderation scores, and argument data are open for all to see.</li>
              <li><strong>Respect</strong> — Attack ideas, not people. Personal attacks are moderated and flagged.</li>
              <li><strong>Constructiveness</strong> — AI moderation ensures that contributions elevate the conversation.</li>
            </ul>
          </Section>

          <Section icon={Users} title="Who Is Convs For?">
            Convs is for thinkers, debaters, writers, researchers, students, policy makers, and anyone who craves meaningful conversation. Whether you're exploring philosophy, debating economics, analysing current events, or testing startup ideas — Convs gives your thinking the structure it deserves.
          </Section>

          <Section icon={Lightbulb} title="The Vision">
            We envision a world where intellectual debate is accessible, transparent, and constructive. Where the best arguments rise based on merit, not popularity. Where AI serves as a fair moderator, not a censor. Convs is the courtroom of the internet — and every idea gets its day in court.
          </Section>
        </div>
      </div>
    </div>
  );
}

function Section({ icon: Icon, title, children }) {
  return (
    <div className="convs-card p-6">
      <div className="flex items-center gap-3 mb-3">
        <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ background: "var(--convs-accent-light)" }}>
          <Icon className="w-5 h-5" style={{ color: "var(--convs-accent)" }} />
        </div>
        <h2 className="text-xl font-bold" style={{ color: "var(--convs-text)" }}>{title}</h2>
      </div>
      <div className="text-sm leading-relaxed" style={{ color: "var(--convs-text-secondary)" }}>{children}</div>
    </div>
  );
}