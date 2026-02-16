import React from "react";
import { Link } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { ArrowLeft } from "lucide-react";

export default function TermsOfService() {
  return (
    <div className="min-h-screen" style={{ background: "var(--convs-bg)" }}>
      <div className="max-w-4xl mx-auto px-4 py-12">
        <Link to={createPageUrl("Landing")} className="inline-flex items-center gap-2 text-sm mb-8 hover:underline" style={{ color: "var(--convs-accent)" }}>
          <ArrowLeft className="w-4 h-4" /> Back to Home
        </Link>

        <h1 className="text-4xl md:text-5xl font-bold mb-2" style={{ color: "var(--convs-text)" }}>Terms of Service</h1>
        <p className="text-sm mb-10" style={{ color: "var(--convs-text-muted)" }}>Last updated: February 2026</p>

        <div className="space-y-8">
          <Section title="1. Acceptance of Terms">
            By accessing or using Convs, you agree to be bound by these Terms of Service. If you do not agree to these terms, you may not use the platform. Convs is operated by Cereus Technologies.
          </Section>

          <Section title="2. Account Registration">
            You must provide accurate and complete information when creating an account. You are responsible for maintaining the security of your account credentials. You must be at least 16 years of age to use Convs. One person may not maintain more than one account.
          </Section>

          <Section title="3. Acceptable Use">
            You agree to use Convs for intellectual discourse and constructive debate. You may not: post content that constitutes harassment, hate speech, or threats; impersonate other individuals; attempt to circumvent AI moderation; use automated systems to create content or interact with the platform; or engage in any activity that disrupts the platform's operation.
          </Section>

          <Section title="4. Content Ownership">
            You retain ownership of content you create on Convs. By posting content, you grant Convs a non-exclusive, worldwide, royalty-free licence to display, distribute, and promote your content within the platform. You may delete your content at any time, subject to reasonable retention for discussion integrity.
          </Section>

          <Section title="5. AI Moderation">
            All content posted to Convs is subject to AI moderation. The moderation system analyses posts for toxicity, personal attacks, constructiveness, and quality. Content that violates our Community Guidelines may be flagged, restricted, or removed. Moderation decisions are transparent — you will be informed of the reason for any action taken.
          </Section>

          <Section title="6. Intellectual Property">
            The Convs platform, including its design, code, branding, and AI moderation systems, is the intellectual property of Cereus Technologies. You may not copy, modify, or reverse-engineer any part of the platform.
          </Section>

          <Section title="7. Disclaimer of Warranties">
            Convs is provided "as is" without warranties of any kind. We do not guarantee the accuracy, completeness, or reliability of any content posted by users. AI moderation scores are indicative and should not be treated as definitive assessments of argument quality.
          </Section>

          <Section title="8. Limitation of Liability">
            Cereus Technologies shall not be liable for any indirect, incidental, special, or consequential damages arising from your use of Convs. Our total liability shall not exceed the amount you have paid to us in the twelve months preceding the claim.
          </Section>

          <Section title="9. Account Termination">
            We reserve the right to suspend or terminate your account if you violate these Terms of Service or our Community Guidelines. You may delete your account at any time by contacting support@convs.io.
          </Section>

          <Section title="10. Changes to Terms">
            We may modify these Terms of Service at any time. We will provide notice of material changes through the platform or via email. Continued use of Convs after changes constitutes acceptance of the updated terms.
          </Section>

          <Section title="11. Governing Law">
            These terms shall be governed by and construed in accordance with applicable law. Any disputes shall be resolved through good-faith negotiation or, failing that, through binding arbitration.
          </Section>

          <Section title="12. Contact">
            For questions about these Terms of Service, contact us at: <strong>legal@convs.io</strong>
          </Section>
        </div>
      </div>
    </div>
  );
}

function Section({ title, children }) {
  return (
    <div>
      <h2 className="text-xl font-bold mb-3" style={{ color: "var(--convs-text)" }}>{title}</h2>
      <div className="text-sm leading-relaxed" style={{ color: "var(--convs-text-secondary)" }}>{children}</div>
    </div>
  );
}