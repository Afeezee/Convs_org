import React from "react";
import { Link } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { ArrowLeft } from "lucide-react";

export default function PrivacyPolicy() {
  return (
    <div className="min-h-screen" style={{ background: "var(--convs-bg)" }}>
      <div className="max-w-4xl mx-auto px-4 py-12">
        <Link to={createPageUrl("Landing")} className="inline-flex items-center gap-2 text-sm mb-8 hover:underline" style={{ color: "var(--convs-accent)" }}>
          <ArrowLeft className="w-4 h-4" /> Back to Home
        </Link>

        <h1 className="text-4xl md:text-5xl font-bold mb-2" style={{ color: "var(--convs-text)" }}>Privacy Policy</h1>
        <p className="text-sm mb-10" style={{ color: "var(--convs-text-muted)" }}>Last updated: February 2026</p>

        <div className="prose-style space-y-8">
          <PolicySection title="1. Introduction">
            Convs ("we", "our", "us") is operated by Cereus Technologies. This Privacy Policy explains how we collect, use, disclose, and safeguard your information when you use the Convs platform. By using Convs, you agree to the collection and use of information in accordance with this policy.
          </PolicySection>

          <PolicySection title="2. Information We Collect">
            <strong>Account Information:</strong> When you create an account, we collect your name, email address, and profile information you choose to provide (username, biography, profile image).
            <br /><br />
            <strong>Content Data:</strong> We store the convs, comments, bookmarks, follows, and messages you create on the platform.
            <br /><br />
            <strong>Usage Data:</strong> We collect analytics data including page views, interactions (supports, opposes, bookmarks), and engagement patterns to improve the platform.
            <br /><br />
            <strong>AI Moderation Data:</strong> Content you submit is processed by our AI moderation system to assess toxicity, constructiveness, and quality. These scores are stored alongside your content.
          </PolicySection>

          <PolicySection title="3. How We Use Your Information">
            We use your information to: provide and maintain the Convs platform; moderate content using AI to ensure constructive discourse; generate analytics and argument quality scores; send notifications about activity relevant to you; improve and personalise your experience; and comply with legal obligations.
          </PolicySection>

          <PolicySection title="4. Information Sharing">
            Your public profile, convs, comments, and analytics are visible to other users on the platform. We do not sell your personal data to third parties. We may share data with: service providers who assist in operating the platform; law enforcement when required by law; and in connection with a merger, acquisition, or sale of assets.
          </PolicySection>

          <PolicySection title="5. Data Security">
            We implement industry-standard security measures to protect your data, including encryption in transit and at rest, secure authentication, and regular security audits. However, no method of transmission over the internet is 100% secure.
          </PolicySection>

          <PolicySection title="6. Data Retention">
            We retain your account data for as long as your account is active. Content you create (convs, comments) is retained to maintain discussion integrity. You may request deletion of your account and associated data by contacting us at privacy@convs.io.
          </PolicySection>

          <PolicySection title="7. Your Rights">
            You have the right to: access, correct, or delete your personal data; withdraw consent for data processing; export your data in a portable format; and object to automated decision-making. To exercise these rights, contact privacy@convs.io.
          </PolicySection>

          <PolicySection title="8. Cookies">
            We use essential cookies to maintain your session and preferences (such as theme selection). We do not use third-party tracking cookies for advertising.
          </PolicySection>

          <PolicySection title="9. Changes to This Policy">
            We may update this Privacy Policy from time to time. We will notify you of any changes by posting the new policy on this page and updating the "Last updated" date.
          </PolicySection>

          <PolicySection title="10. Contact Us">
            If you have questions about this Privacy Policy, contact us at: <strong>privacy@convs.io</strong>
          </PolicySection>
        </div>
      </div>
    </div>
  );
}

function PolicySection({ title, children }) {
  return (
    <div>
      <h2 className="text-xl font-bold mb-3" style={{ color: "var(--convs-text)" }}>{title}</h2>
      <div className="text-sm leading-relaxed" style={{ color: "var(--convs-text-secondary)" }}>{children}</div>
    </div>
  );
}