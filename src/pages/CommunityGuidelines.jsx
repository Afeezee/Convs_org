import React from "react";
import { Link } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { ArrowLeft, CheckCircle, XCircle } from "lucide-react";

const DOS = [
  "Attack ideas, not people. Focus on the argument, not the person making it.",
  "Provide evidence and citations when making claims or counter-arguments.",
  "Tag specific logical flaws or strengths when supporting or opposing a conv.",
  "Be open to changing your mind when presented with compelling evidence.",
  "Use the highlight-to-debate feature to address specific claims precisely.",
  "Engage with good faith — assume the other person is arguing sincerely.",
  "Report content that violates these guidelines rather than engaging with it.",
];

const DONTS = [
  "Personal attacks, insults, name-calling, or harassment of any kind.",
  "Hate speech targeting race, ethnicity, religion, gender, sexuality, or disability.",
  "Threats of violence or encouraging harm against individuals or groups.",
  "Spam, self-promotion, or repetitive low-quality content.",
  "Impersonation of other users, public figures, or organisations.",
  "Deliberately misleading content presented as fact without evidence.",
  "Circumventing AI moderation by rephrasing blocked content.",
  "Coordinated inauthentic behaviour (brigading, sock puppets, vote manipulation).",
];

export default function CommunityGuidelines() {
  return (
    <div className="min-h-screen" style={{ background: "var(--convs-bg)" }}>
      <div className="max-w-4xl mx-auto px-4 py-12">
        <Link to={createPageUrl("Landing")} className="inline-flex items-center gap-2 text-sm mb-8 hover:underline" style={{ color: "var(--convs-accent)" }}>
          <ArrowLeft className="w-4 h-4" /> Back to Home
        </Link>

        <h1 className="text-4xl md:text-5xl font-bold mb-4" style={{ color: "var(--convs-text)" }}>Community Guidelines</h1>
        <p className="text-lg mb-10 leading-relaxed" style={{ color: "var(--convs-text-secondary)" }}>
          Convs is built on the principle that structured, respectful disagreement makes us all smarter. These guidelines exist to protect that principle and ensure every conversation on the platform is constructive.
        </p>

        <div className="space-y-8">
          <div>
            <h2 className="text-2xl font-bold mb-2" style={{ color: "var(--convs-text)" }}>The Core Principle</h2>
            <p className="text-sm leading-relaxed" style={{ color: "var(--convs-text-secondary)" }}>
              On Convs, you are free to disagree with any idea — strongly and passionately. But you must do so by addressing the argument itself, not the person making it. The line is simple: <strong>critique the reasoning, not the reasoner.</strong>
            </p>
          </div>

          <div className="convs-card p-6">
            <h2 className="text-xl font-bold mb-4 flex items-center gap-2" style={{ color: "var(--convs-support)" }}>
              <CheckCircle className="w-5 h-5" /> Do
            </h2>
            <ul className="space-y-3">
              {DOS.map((item, i) => (
                <li key={i} className="flex items-start gap-3 text-sm" style={{ color: "var(--convs-text-secondary)" }}>
                  <CheckCircle className="w-4 h-4 mt-0.5 flex-shrink-0" style={{ color: "var(--convs-support)" }} />
                  {item}
                </li>
              ))}
            </ul>
          </div>

          <div className="convs-card p-6">
            <h2 className="text-xl font-bold mb-4 flex items-center gap-2" style={{ color: "var(--convs-oppose)" }}>
              <XCircle className="w-5 h-5" /> Don't
            </h2>
            <ul className="space-y-3">
              {DONTS.map((item, i) => (
                <li key={i} className="flex items-start gap-3 text-sm" style={{ color: "var(--convs-text-secondary)" }}>
                  <XCircle className="w-4 h-4 mt-0.5 flex-shrink-0" style={{ color: "var(--convs-oppose)" }} />
                  {item}
                </li>
              ))}
            </ul>
          </div>

          <div>
            <h2 className="text-xl font-bold mb-3" style={{ color: "var(--convs-text)" }}>AI Moderation</h2>
            <p className="text-sm leading-relaxed" style={{ color: "var(--convs-text-secondary)" }}>
              All content is analysed by our AI moderator before publication. The system evaluates toxicity, personal attacks, constructiveness, and overall quality. Posts that violate these guidelines may be warned, flagged, or blocked. All moderation decisions include an explanation so you understand exactly why action was taken.
            </p>
          </div>

          <div>
            <h2 className="text-xl font-bold mb-3" style={{ color: "var(--convs-text)" }}>Enforcement</h2>
            <p className="text-sm leading-relaxed" style={{ color: "var(--convs-text-secondary)" }}>
              Violations result in escalating consequences: first offence receives a warning; repeated violations lead to temporary restrictions; severe or persistent violations result in account suspension. Appeals can be submitted to <strong>moderation@convs.io</strong>.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}