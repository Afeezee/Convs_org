import React from "react";
import { Link } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { ArrowLeft, Code, Database, Lock, Zap, Globe, FileJson } from "lucide-react";

const API_SECTIONS = [
  { icon: Globe, title: "Overview", content: "The Convs API allows developers to integrate with the Convs platform programmatically. Access convs, comments, analytics, user profiles, and more through a RESTful JSON API. All endpoints require authentication via Bearer tokens." },
  { icon: Lock, title: "Authentication", content: "All API requests must include a valid Bearer token in the Authorization header. Tokens are issued upon login and expire after 24 hours. Use the /auth/token endpoint to refresh expired tokens. Rate limiting applies: 100 requests per minute for standard accounts, 1000 for verified developers." },
  { icon: Database, title: "Core Endpoints", content: "GET /api/convs — List all convs (supports pagination, sorting, filtering by topic)\nGET /api/convs/:id — Get a single conv with full analytics\nPOST /api/convs — Create a new conv (subject to AI moderation)\nGET /api/convs/:id/comments — List all comments for a conv\nPOST /api/convs/:id/comments — Add a comment (support, oppose, or clarification)\nGET /api/users/:email — Get user profile and stats\nGET /api/analytics/:conv_id — Get live analytics for a conv" },
  { icon: FileJson, title: "Response Format", content: "All responses are returned in JSON format with consistent structure: { data: <result>, meta: { total, page, per_page } } for list endpoints, and { data: <result> } for single-resource endpoints. Errors follow: { error: { code, message, details } }." },
  { icon: Zap, title: "Webhooks", content: "Subscribe to real-time events via webhooks. Supported events: conv.created, conv.updated, comment.created, user.followed, moderation.flagged. Configure webhook URLs in your developer settings. All webhook payloads include an HMAC signature for verification." },
  { icon: Code, title: "SDKs & Libraries", content: "Official SDKs are available for JavaScript/TypeScript. Community SDKs for Python and Go are maintained by contributors. All SDKs handle authentication, pagination, and error handling automatically. Install via npm: npm install @convs/sdk" },
];

export default function ApiPage() {
  return (
    <div className="min-h-screen" style={{ background: "var(--convs-bg)" }}>
      <div className="max-w-4xl mx-auto px-4 py-12">
        <Link to={createPageUrl("Landing")} className="inline-flex items-center gap-2 text-sm mb-8 hover:underline" style={{ color: "var(--convs-accent)" }}>
          <ArrowLeft className="w-4 h-4" /> Back to Home
        </Link>

        <div className="flex items-center gap-3 mb-4">
          <Code className="w-8 h-8" style={{ color: "var(--convs-accent)" }} />
          <h1 className="text-4xl md:text-5xl font-bold" style={{ color: "var(--convs-text)" }}>API Reference</h1>
        </div>
        <p className="text-lg mb-4 leading-relaxed" style={{ color: "var(--convs-text-secondary)" }}>
          Build on top of Convs with our developer API.
        </p>
        <div className="inline-block px-3 py-1 rounded-lg text-xs font-mono mb-12" style={{ background: "var(--convs-bg-tertiary)", color: "var(--convs-text-muted)" }}>
          Base URL: https://api.convs.io/v1
        </div>

        <div className="space-y-5">
          {API_SECTIONS.map(s => (
            <div key={s.title} className="convs-card p-5">
              <div className="flex items-center gap-3 mb-3">
                <div className="w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0" style={{ background: "var(--convs-accent-light)" }}>
                  <s.icon className="w-4.5 h-4.5" style={{ color: "var(--convs-accent)" }} />
                </div>
                <h3 className="font-bold" style={{ color: "var(--convs-text)" }}>{s.title}</h3>
              </div>
              <div className="text-sm leading-relaxed pl-12 whitespace-pre-line" style={{ color: "var(--convs-text-secondary)" }}>{s.content}</div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}