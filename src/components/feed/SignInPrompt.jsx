import React from "react";
import { base44 } from "@/api/base44Client";
import { createPageUrl } from "@/utils";
import { LogIn, MessageSquare, Shield, BarChart3 } from "lucide-react";

export default function SignInPrompt() {
  return (
    <div className="convs-card p-6 sm:p-8 text-center mb-6">
      <div className="w-14 h-14 rounded-2xl bg-[var(--convs-accent-light)] flex items-center justify-center mx-auto mb-4">
        <LogIn className="w-7 h-7 text-[var(--convs-accent)]" />
      </div>
      <h2 className="text-xl font-bold text-[var(--convs-text)] mb-2">
        Sign in to join the conversation
      </h2>
      <p className="text-sm text-[var(--convs-text-secondary)] mb-6 max-w-md mx-auto">
        Support or oppose arguments, post your own convs, follow thinkers, and access all features.
      </p>

      <div className="flex flex-col sm:flex-row items-center justify-center gap-3 mb-6">
        <button
          onClick={() => base44.auth.redirectToLogin(createPageUrl("Home"))}
          className="inline-flex items-center justify-center px-6 py-2.5 text-sm font-semibold rounded-xl shadow-md hover:shadow-lg transition-all"
          style={{ background: "#6366F1", color: "#FFFFFF" }}
        >
          Sign In
          <LogIn className="ml-2 w-4 h-4" />
        </button>
        <button
          onClick={() => base44.auth.redirectToLogin(createPageUrl("Home"))}
          className="inline-flex items-center justify-center px-6 py-2.5 text-sm font-semibold rounded-xl border transition-all"
          style={{ borderColor: "var(--convs-border)", color: "var(--convs-text)" }}
        >
          Create Account
        </button>
      </div>

      <div className="flex flex-wrap items-center justify-center gap-4 text-xs text-[var(--convs-text-muted)]">
        <span className="flex items-center gap-1"><MessageSquare className="w-3.5 h-3.5" /> Post &amp; Comment</span>
        <span className="flex items-center gap-1"><Shield className="w-3.5 h-3.5" /> AI Moderated</span>
        <span className="flex items-center gap-1"><BarChart3 className="w-3.5 h-3.5" /> Live Analytics</span>
      </div>
    </div>
  );
}